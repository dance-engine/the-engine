import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { NextResponse } from "next/server";
import { aggregateSurveyResults } from "../../../lib/survey-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tableName = process.env.SURVEY_RESULTS_DYNAMODB_TABLE_NAME;
  const roleArn = process.env.AWS_RESULTS_ROLE_ARN;
  if (!tableName || !roleArn) {
    console.error("Survey results storage is not configured", {
      hasResultsTable: Boolean(tableName),
      hasResultsRole: Boolean(roleArn),
    });
    return NextResponse.json({ error: "Survey results storage is not configured." }, { status: 500 });
  }

  try {
    // Results always use their dedicated OIDC role. This prevents the read
    // endpoint from inheriting the submission route's write credentials.
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: awsCredentialsProvider({ roleArn }),
    }));
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
