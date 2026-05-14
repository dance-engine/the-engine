import os
import jwt
import logging
import secrets

logger = logging.getLogger()
logger.setLevel("INFO")

PUBLIC_KEY = os.environ.get("CLERK_KEY")
SERVICE_BEARER_TOKEN = os.environ.get("SERVICE_BEARER_TOKEN", "")
SERVICE_ALLOWED_ORGS = {
  org.strip()
  for org in os.environ.get("SERVICE_ALLOWED_ORGS", "").split(",")
  if org.strip()
}
SERVICE_ALLOWED_ROUTES = {
  "POST /{organisation}/customers",
  "GET /{organisation}/settings",
}

reserved_values = ["admin", "superuser", "internal","danceengine","dance-engine","public"]


def extract_bearer_token(headers):
  if not headers:
    return None, None

  authorization_header = headers.get("authorization") or headers.get("Authorization")
  if not authorization_header:
    return None, None

  parts = authorization_header.split(" ", 1)
  if len(parts) != 2 or parts[0].lower() != "bearer":
    return authorization_header, None

  return authorization_header, parts[1].strip()


def is_service_route_allowed(event, organisation):
  route_key = event.get("routeKey", "")
  if route_key not in SERVICE_ALLOWED_ROUTES:
    return False

  if not organisation:
    return False

  if not SERVICE_ALLOWED_ORGS:
    return False

  return "*" in SERVICE_ALLOWED_ORGS or organisation in SERVICE_ALLOWED_ORGS


def is_valid_service_token(token):
  if not token or not SERVICE_BEARER_TOKEN:
    return False

  return secrets.compare_digest(token, SERVICE_BEARER_TOKEN)


def auth_handler(event, context):
  logger.info(f"{event},{context}")

  organisation = event.get("pathParameters", {}).get("organisation")
  authorization_header, token = extract_bearer_token(event.get("headers", {}))
  logger.info(f"ORG: {organisation}\nAUTH HEADER: {authorization_header}\nTOKEN: {token}")
  if not authorization_header or not token:
    logger.error("No authorization Header")
    return generatePolicy(None, "*", 'Deny', event['routeArn'])

  if organisation in reserved_values:
    logger.error("Reserved organisation name")
    return generatePolicy(None, "*", 'Deny', event['routeArn'])

  if is_valid_service_token(token):
    if is_service_route_allowed(event, organisation):
      logger.info("Allowed to use API with service token")
      return generatePolicy({"internal": "true", "service": "join-api"}, "service-token", 'Allow', event['routeArn'])

    logger.error("Service token used on route or organisation that is not allowed")
    return generatePolicy(None, "*", 'Deny', event['routeArn'])

  # Looks like might be valid Clerk token
  try:
    claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="ClerkJwtAuthorizer")
  except Exception as error:
    logger.error(f"Exception: {error}")
    return generatePolicy(None, "*", 'Deny', event['routeArn'])

  logger.info(f"CLAIMS: {claims}")

  if claims.get("metadata", {}).get("admin"):
    logger.info("Allowed to use API")
    admin_on = [*claims['metadata']['organisations']]  # Unpack keys of organisations which means you have some role
    if not organisation or organisation == 'public':
      return generatePolicy(claims['metadata'], claims['sub'], 'Allow', event['routeArn'])
    elif organisation in admin_on or "*" in admin_on:
      return generatePolicy(claims['metadata'], claims['sub'], 'Allow', event['routeArn'])
    else:
      return generatePolicy(None, "*", 'Deny', event['routeArn'])

  logger.error("Unauthorised login attempt")
  return generatePolicy(None, claims['sub'], 'Deny', event['routeArn'])

def generatePolicy(metadata, principalId, effect, resource):
    authResponse = {
      'principalId': principalId,
      'policyDocument': {
        'Version': '2012-10-17',
        'Statement': [
          {
            'Action': 'execute-api:Invoke',
            'Effect': effect,
            'Resource': resource,
          },
        ],
      },
    }
  
    if (metadata):
      authResponse['context'] = metadata
  
    return authResponse