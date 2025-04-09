Anything in ./aws/s3 will be synced to the config bucket for this stage

cloudformation/customer.yaml
This template will be used to deploy new organisations

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