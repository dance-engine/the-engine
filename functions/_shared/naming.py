import os
import re

def getOrganisationTableName(organisationSlug):
  """Generate the organisation table name based on the provided slug.

  Parameters
  ----------
  organisationSlug : str
    The slug of the organisation to be used in the table name.

  Returns
  -------
  str
    The formatted organisation table name.
  """
  ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")
  return ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)

def generateSlug(name):
  """
  Generates a slug based on the name.

  Parameters
  ----------
  name : str
    The input string from which the slug will be generated.

  Returns
  -------
  str
    A slugified version of the input string.
  """
  base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
  return f"{base_slug}"
