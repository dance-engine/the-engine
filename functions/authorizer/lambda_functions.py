import jwt
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtnBAijofwYzYAfLqF/Zb
aaBqzdoVVi15M6xhnyyT8eRej0lPn0jw+S0DKzGzf61YqZBjLzcFNRJwwWEXwPtU
iwKFvJqgoovyIodJxjnqp3r1ZqTbJSYgzZTebLYuhGlKXdUX+vsiW4Q9wrlcAD7q
t0OSBLfzQ8crdFkW/9VcTpbdG7K2HxKxuBSMP5a5ZuU9QMAuWiP6KSgsbQFCs5RQ
wzredqJj3SiRDrY5L1RSNL9vsZov1yzCWmcysOx78ITobpWtEdP52x3jcaXkeCez
9beH+tKx8jBI0ly1tmzxbrm5JkJaaECgnnPNvT9MLFIUnfcdPKI8xRKM6Nqqdo6X
YwIDAQAB
-----END PUBLIC KEY-----
"""

reserved_values = ["admin", "superuser", "internal","danceengine","dance-engine","public"]

def auth_handler(event, context):
    logger.info(f"{event},{context}")

    #TODO Change customer to organisation
    customer = event.get("pathParameters", {}).get("customer")
    authorization_header = event.get("headers", {}).get("authorization")
    token = authorization_header.split(' ')[1]
    logger.info(f"CUSTOMER: {customer}\nAUTH HEADER: {authorization_header}\nTOKEN: {token}")
    if not authorization_header:
      logger.error("No authorization Header")
      return generatePolicy(None,"*",'Deny',event['routeArn'])

    if customer in reserved_values:
      logger.error("Reserved customer area")
      return generatePolicy(None,"*",'Deny',event['routeArn'])
  
    # Looks like might be valid
    claims = jwt.decode(token,PUBLIC_KEY,algorithms=["RS256"],audience="ClerkJwtAuthorizer") #TODO Should recover from error and Deny with malformed token
    logger.info(f"CLAIMS: {claims}")

    if (claims.get("metadata",{}).get("admin")):
      logger.info("Allowed to use API")
      admin_on = claims['metadata']['admin']
      if not customer:
        return generatePolicy(claims['metadata'], claims['sub'], 'Allow', event['routeArn']) 
      elif customer in admin_on or "*" in admin_on:
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