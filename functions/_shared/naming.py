import os

ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")

def getOrganisationTableName(organisationSlug):
  return ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug) 