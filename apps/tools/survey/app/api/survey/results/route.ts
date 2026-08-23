import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { NextResponse } from "next/server";
import { aggregateSurveyResults } from "../../../lib/survey-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VERCEL can be set locally even when the project is not linked and no OIDC
// token is available. Fall back to the standard AWS credential chain locally.
const useVercelOidc = Boolean(
  process.env.VERCEL_OIDC_TOKEN &&
  process.env.AWS_ROLE_ARN,
);
const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: useVercelOidc
    ? awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN! })
    : undefined,
}));

export async function GET() {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    return NextResponse.json({ error: "Survey storage is not configured." }, { status: 500 });
  }

  try {
    const items: Record<string, unknown>[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await client.send(new QueryCommand({
        TableName: tableName,
        IndexName: "typeIDX",
        KeyConditionExpression: "#entityType = :entityType",
        ExpressionAttributeValues: { ":entityType": "SURVEY_RESPONSE" },
        ProjectionExpression: "submittedAt, #location, styles, learning, favourites",
        ExpressionAttributeNames: {
          "#entityType": "entity_type",
          "#location": "location",
        },
        ExclusiveStartKey: exclusiveStartKey,
      }));
      items.push(...(response.Items ?? []));
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return NextResponse.json(aggregateSurveyResults(items), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Survey results query failed", error);
    return NextResponse.json({ error: "We couldn't load the survey results." }, { status: 500 });
  }
}
