Anything in ./aws/s3 should be synced to the stage config bucket:

`s3://<stage>-danceengine-config`

The old `serverless-s3-sync` plugin is no longer used. Sync this folder with:

`pnpm --filter @dance-engine/api-deployment-scripts sync-config-assets --stage <preview|prod>`

Useful variants:

- `pnpm --filter @dance-engine/api-deployment-scripts sync-config-assets:preview`
- `pnpm --filter @dance-engine/api-deployment-scripts sync-config-assets:prod`

Deploy now runs this automatically via a Serverless lifecycle hook:

- `cd functions && serverless deploy --stage preview`

If you deploy via pnpm scripts, pass serverless args after `--`:

- `pnpm --filter @dance-engine/api-deployment-scripts deploy -- --stage preview`

Or use the aliases:

- `pnpm --filter @dance-engine/api-deployment-scripts deploy:preview`
- `pnpm --filter @dance-engine/api-deployment-scripts deploy:prod`

The deploy script first checks for changes with a dry run and only uploads when files in `aws/s3` differ from the target bucket.

On first deploy, if the config bucket does not exist yet, pre-deploy sync is skipped and retried automatically after the stack deploys.

If you need to bypass this behavior, set:

- `SLS_SKIP_CONFIG_SYNC=true`

By default, sync failures are treated as warnings so deploy can continue. To enforce hard failure on sync errors, set:

- `SLS_CONFIG_SYNC_STRICT=true`

cloudformation/organisation.yaml
This template is used to deploy new organisations

This can be used to test it via the Organista

aws events put-events --entries '[
  {
    "Source": "app.organisation",
    "DetailType": "CreateOrganisation",
    "Detail": "{\"OrganisationId\": \"acme-inc\", \"Stage\": \"preview\"}"
  }
]'

or in windows

$entriesJson = @(
  @{
    Source = "app.organisation"
    DetailType = "CreateOrganisation"
    Detail = '{"OrganisationSlug":"demo","Stage":"preview"}'
  }
) | ConvertTo-Json -Compress | ConvertTo-Json -Compress

aws events put-events --entries "$entriesJson" --profile "AdministratorAccess-717279731911"


We can get all resources against tags using
aws resourcegroupstaggingapi get-resources --tag-filters Key=DanceEngineVersion  --query 'ResourceTagMappingList[].ResourceARN' --profile "AdministratorAccess-717279731911" 
--output text

Powershell

'''
$response = aws resourcegroupstaggingapi get-resources `
  --tag-filters Key=DanceEngineVersion `
  --profile "AdministratorAccess-717279731911" `
  --output json | ConvertFrom-Json

$response.ResourceTagMappingList |
  ForEach-Object {
    $arn = $_.ResourceARN
    $version = ($_.Tags | Where-Object { $_.Key -eq "DanceEngineVersion" }).Value
    [PSCustomObject]@{ Version = $version; ARN = $arn }
  } | Sort-Object ARN | Format-Table -AutoSize

'''

Test Eventbridge
---
$entriesJson = @(
  @{
    Source = "dance-engine.test"
    DetailType = "TestEvent"
    Detail = '{"OrganisationSlug":"test","Stage":"preview"}'
  }
) | ConvertTo-Json -Compress | ConvertTo-Json -Compress

aws events put-events --entries "$entriesJson" --profile "AdministratorAccess-717279731911"