import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import KSUID from "ksuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || typeof body.location?.countryFrom !== "string") {
      return NextResponse.json({ error: "Invalid survey response." }, { status: 400 });
    }
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) return NextResponse.json({ error: "Survey storage is not configured." }, { status: 500 });

    const id = (await KSUID.random()).string;
    await client.send(new PutCommand({
      TableName: tableName,
      Item: { id, submittedAt: new Date().toISOString(), schemaVersion: 1, ...body },
      ConditionExpression: "attribute_not_exists(id)",
    }));
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Survey submission failed", error);
    return NextResponse.json({ error: "We couldn't save your response. Please try again." }, { status: 500 });
  }
}
