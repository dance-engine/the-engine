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

const SURVEY_ORGANISATION = "dance-engine";

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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
        { error: "Survey storage is not configured." },
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
    const hasCustomer = Boolean(email);

    if (hasCustomer && !email.includes("@")) {
      return invalidResponse("Please enter a valid email address.");
    }

    const ksuid = (await KSUID.random()).string;
    const submittedAt = new Date().toISOString();
    const surveyKey = `SURVEY#${ksuid}`;
    const customerKey = hasCustomer ? `CUSTOMER#${email}` : undefined;
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
            SK: customerKey ?? surveyKey,
            ksuid,
            entity_type: "SURVEY_RESPONSE",
            wantsUpdates,
            submittedAt,
            schemaVersion: 2,
          },
          ConditionExpression:
            "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        },
      },
    ];

    if (customerKey) {
      const customerUpdates = [
        "#entityType = if_not_exists(#entityType, :entityType)",
        "#email = if_not_exists(#email, :email)",
        "#gsi1PK = if_not_exists(#gsi1PK, :gsi1PK)",
        "#gsi1SK = if_not_exists(#gsi1SK, :gsi1SK)",
        "#ksuid = if_not_exists(#ksuid, :ksuid)",
        "#createdAt = if_not_exists(#createdAt, :createdAt)",
        "#updatedAt = if_not_exists(#updatedAt, :updatedAt)",
        "#organisation = if_not_exists(#organisation, :organisation)",
        "#orgSlug = if_not_exists(#orgSlug, :orgSlug)",
      ];
      const customerNames: Record<string, string> = {
        "#entityType": "entity_type",
        "#email": "email",
        "#gsi1PK": "gsi1PK",
        "#gsi1SK": "gsi1SK",
        "#ksuid": "ksuid",
        "#createdAt": "created_at",
        "#updatedAt": "updated_at",
        "#organisation": "organisation",
        "#orgSlug": "org_slug",
      };
      const customerValues: Record<string, string> = {
        ":entityType": "CUSTOMER",
        ":email": email,
        ":gsi1PK": `CUSTOMERLIST#${SURVEY_ORGANISATION}`,
        ":gsi1SK": customerKey,
        ":ksuid": ksuid,
        ":createdAt": submittedAt,
        ":updatedAt": submittedAt,
        ":organisation": SURVEY_ORGANISATION,
        ":orgSlug": SURVEY_ORGANISATION,
      };

      if (name) {
        customerUpdates.push(
          "#name = if_not_exists(#name, :name)",
          "#nameSlug = if_not_exists(#nameSlug, :nameSlug)",
        );
        customerNames["#name"] = "name";
        customerNames["#nameSlug"] = "name_slug";
        customerValues[":name"] = name;
        customerValues[":nameSlug"] = slugify(name);
      }

      if (phone) {
        customerUpdates.push("#phone = if_not_exists(#phone, :phone)");
        customerNames["#phone"] = "phone";
        customerValues[":phone"] = phone;
      }

      transactItems.push({
        Update: {
          TableName: coreTableName,
          Key: {
            PK: customerKey,
            SK: customerKey,
          },
          UpdateExpression: `SET ${customerUpdates.join(", ")}`,
          ExpressionAttributeNames: customerNames,
          ExpressionAttributeValues: customerValues,
        },
      });
    }

    await client.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      }),
    );

    return NextResponse.json({ ok: true, ksuid }, { status: 201 });
  } catch (error) {
    console.error("Survey submission failed", error);
    return NextResponse.json(
      { error: "We couldn't save your response. Please try again." },
      { status: 500 },
    );
  }
}
