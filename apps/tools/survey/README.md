# Dance Community Survey

A multi-stage Next.js survey styled with Tailwind CSS. Draft answers are saved to `localStorage` after every change and final responses are written to DynamoDB through a server-side Vercel API route. Each response receives a time-sortable KSUID as its `id`.

## Run locally

1. Copy `.env.example` to `.env.local` and add AWS credentials with `dynamodb:PutItem` permission.
2. Create a DynamoDB table whose partition key is `id` (String).
3. Run `npm install`, then `npm run dev`.

## Deploy to Vercel

Import this directory into Vercel and add `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `DYNAMODB_TABLE_NAME` as environment variables. For production, use a narrowly scoped IAM user/role that can only write to this table.
