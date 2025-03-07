import json
import jwt
from random import randint
import logging
from decimal import Decimal

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

def auth_handler(event, context):
    logger.info(f"{event},{context}")
    token = event['headers']['authorization'].split(' ')[1]
    logger.info(f"TOKEN: {token}")
    claims = jwt.decode(token,PUBLIC_KEY,algorithms=["RS256"])
    logger.info(f"CLAIMS: {claims}")

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