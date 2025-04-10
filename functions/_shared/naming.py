import os
import re


ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")

def getOrganisationTableName(organisationSlug):
  return ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug) 

def generateSlug(name):
    """
    Generates a slug based on the name
    """
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
    return f"{base_slug}"