import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import KSUID from "ksuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const hasVercelOidcToken = Boolean(
  process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN,
);

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: hasVercelOidcToken
      ? awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN!,
        })
      : undefined,
  }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  },
);

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function invalidResponse(message = "Invalid survey response.") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !isJsonObject(body) ||
      !isJsonObject(body.location) ||
      !stringValue(body.location.countryFrom)
    ) {
      return invalidResponse();
    }

    const surveyTableName = process.env.DYNAMODB_TABLE_NAME;
    const coreTableName = process.env.CORE_DYNAMODB_TABLE_NAME;

    if (!surveyTableName || !coreTableName) {
      console.error("Survey storage is not configured", {
        hasSurveyTable: Boolean(surveyTableName),
        hasCoreTable: Boolean(coreTableName),
      });
      return NextResponse.json(
        { error: "Survey storage is not configured.", hasSurveyTable: Boolean(surveyTableName),  hasCoreTable: Boolean(coreTableName),},
        { status: 500 },
      );
    }

    const contact = isJsonObject(body.contact) ? body.contact : {};
    const wantsUpdates = stringValue(contact.wantsUpdates);

    if (wantsUpdates !== "Yes" && wantsUpdates !== "No") {
      return invalidResponse("Please choose whether you would like updates.");
    }

    const name = stringValue(contact.name);
    const email = stringValue(contact.email).toLowerCase();
    const phone = stringValue(contact.phone);
    const hasContact = wantsUpdates === "Yes";

    if (hasContact && (!name || !email || !email.includes("@"))) {
      return invalidResponse("A name and valid email address are required for updates.");
    }

    const id = (await KSUID.random()).string;
    const submittedAt = new Date().toISOString();
    const surveyKey = `SURVEY#${id}`;
    const { contact: _contact, ...surveyAnswers } = body;

    const transactItems: NonNullable<
      TransactWriteCommandInput["TransactItems"]
    > = [
      {
        Put: {
          TableName: surveyTableName,
          Item: {
            ...surveyAnswers,
            PK: surveyKey,
            SK: surveyKey,
            id,
            entity_type: "sbk_survey_response",
            wantsUpdates,
            submittedAt,
            schemaVersion: 2,
          },
          ConditionExpression:
            "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        },
      },
    ];

    if (hasContact) {
      const contactKey = `SBK_SURVEY_CONTACT#${id}`;

      transactItems.push({
        Put: {
          TableName: coreTableName,
          Item: {
            PK: contactKey,
            SK: contactKey,
            id,
            surveyResponseId: id,
            entity_type: "sbk_survey_contact",
            name,
            email,
            ...(phone ? { phone } : {}),
            createdAt: submittedAt,
            source: "sbk_survey",
          },
          ConditionExpression:
            "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        },
      });
    }

    await client.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      }),
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Survey submission failed", error);
    return NextResponse.json(
      { error: "We couldn't save your response. Please try again." },
      { status: 500 },
    );
  }
}