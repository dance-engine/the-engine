# Dance Community Survey

A multi-stage Next.js survey styled with Tailwind CSS. Draft answers are saved to `localStorage` after every change and final responses are written to DynamoDB through a server-side Vercel API route. Each response receives a time-sortable KSUID as its `id`.

The submission and results endpoints use separate DynamoDB tables and IAM roles. This allows a local dashboard to query live results without giving local survey submissions production write access.

## Run locally

1. Link the survey Vercel project and pull a short-lived development OIDC token.
2. Configure the submission variables (`DYNAMODB_TABLE_NAME`, `CORE_DYNAMODB_TABLE_NAME`, and `AWS_ROLE_ARN`).
3. Configure the independent results variables (`SURVEY_RESULTS_DYNAMODB_TABLE_NAME` and `AWS_RESULTS_ROLE_ARN`).
4. Run `pnpm dev`.

## Deploy to Vercel

Import this directory into Vercel and configure `AWS_REGION` plus the submission and results variables listed above. Vercel OIDC supplies short-lived credentials; do not add persistent AWS access keys.
