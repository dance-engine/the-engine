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
    Detail = '{"OrganisationId":"demo","Stage":"preview"}'
  }
) | ConvertTo-Json -Compress | ConvertTo-Json -Compress

aws events put-events --entries "$entriesJson" --profile "AdministratorAccess-717279731911"