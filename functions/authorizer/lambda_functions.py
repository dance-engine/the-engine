import os
import jwt
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

PUBLIC_KEY = os.environ.get("CLERK_KEY")

reserved_values = ["admin", "superuser", "internal","danceengine","dance-engine","public"]

def auth_handler(event, context):
    logger.info(f"{event},{context}")

    organisation = event.get("pathParameters", {}).get("org_slug")
    authorization_header = event.get("headers", {}).get("authorization")
    token = authorization_header.split(' ')[1]
    logger.info(f"ORG: {organisation}\nAUTH HEADER: {authorization_header}\nTOKEN: {token}")
    if not authorization_header or token == 'null':
      logger.error("No authorization Header")
      return generatePolicy(None,"*",'Deny',event['routeArn'])

    if organisation in reserved_values:
      logger.error("Reserved organisation name")
      return generatePolicy(None,"*",'Deny',event['routeArn'])
  
    # Looks like might be valid
    try:
        claims = jwt.decode(token,PUBLIC_KEY,algorithms=["RS256"],audience="ClerkJwtAuthorizer")
    except Exception as error:
       logger.error(f"Exception: {error}")
       return generatePolicy(None,"*",'Deny',event['routeArn'])
    
    logger.info(f"CLAIMS: {claims}")

    if (claims.get("metadata",{}).get("admin")):
      logger.info("Allowed to use API")
      admin_on = [*claims['metadata']['organisations']] # Unpack keys of orgsanisations which means you ahve some role
      if not organisation or organisation == 'public':
        return generatePolicy(claims['metadata'], claims['sub'], 'Allow', event['routeArn']) 
      elif organisation in admin_on or "*" in admin_on:
        return generatePolicy(claims['metadata'], claims['sub'], 'Allow', event['routeArn']) 
      else:
        return generatePolicy(None,"*",'Deny',event['routeArn'])
         
    else:
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