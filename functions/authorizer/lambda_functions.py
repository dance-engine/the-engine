import jwt
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

# Hardcoded WorkOS Public Key (Replace this with your actual WorkOS public key)
WORKOS_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIICvjCCAaagAwIBAgISQAAAZWUmukSKxJ5YbXzGPi5+MA0GCSqGSIb3DQEBBQUAMBoxGDAWBgNVBAMTD2F1dGgud29ya29zLmNvbTAeFw0yNTAzMTQxMjIyMTRaFw0zMDAzMTQxMjIyMTRaMBoxGDAWBgNVBAMTD2F1dGgud29ya29zLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJWCbAnpbD0DojShwCpjHcXXimkJzaTOzcnBTAaI8COmKfBZ3R/yBfE02cHdwsLAh7mDEmRzyBtn+iFqTsoFz87KlUOn/VkGsTFFxpqthgX7bKJK+uEa+blYm9+rXkMdIlHQgdJARhPUs+cd4wfb0DLE/z6C4Hlv3gv98STUuFTokyfWn8khH2H+xmLRMZhEw4m+B0vV1CMA3vBkCkLKT7gv+neNm6/e/bu3iNbNpDK7tZotyANGW4yWJES7+8iFal9iwPiy60/MLBZUjnntQLmgaf5AR8vdbstU6FW17fZBZzqXz8uV96iPzCZk+7PVqiqEmHhP9Bc2g5pfYkAmO3MCAwEAATANBgkqhkiG9w0BAQUFAAOCAQEARHPLHvpaV7z3pGauzATXprgI6k8jkSJa4alOyFY14o/xmQKknXH37u/S9aISn6WiDjULggimh0CWjt50h8+gmbO7E6TcadvlfDYuKa3WeRuyG+IQlrLg49IWE1mk18HvdI7i1y7avZB2HtSz3BDf/QAaYvy/mEpI4t801BGB+Af37lSxQq0XCay1kohuRwuoZPIHEKu9ACFm68OnFzN85kUGQTx8RvVsmD5eBJPfWSYE7emscDWjnmMD+6KH0T1v0P90LZ0A+ZXdjENctiHMqJLza/76TnhCEEp4PNG40F+4T5buevo5YM490b0iXVuzypyQU8g3BqqL66cah9OADA==
-----END PUBLIC KEY-----
"""

WORKOS_AUDIENCE = "your-workos-api-audience"  # Replace with your actual WorkOS audience

reserved_values = ["admin", "superuser", "internal", "danceengine", "dance-engine", "public"]

def auth_handler(event, context):
    logger.info(f"{event},{context}")

    customer = event.get("pathParameters", {}).get("customer")
    authorization_header = event.get("headers", {}).get("authorization")
    
    if not authorization_header:
        logger.error("No authorization header")
        return generatePolicy(None, "*", "Deny", event["routeArn"])

    token = authorization_header.split(" ")[1]
    logger.info(f"CUSTOMER: {customer}\nTOKEN: {token}")

    if customer in reserved_values:
        logger.error("Reserved customer area")
        return generatePolicy(None, "*", "Deny", event["routeArn"])

    try:
        claims = jwt.decode(
            token,
            WORKOS_PUBLIC_KEY,
            algorithms=["RS256"],
            audience=WORKOS_AUDIENCE
        )
        logger.info(f"CLAIMS: {claims}")
    
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        return generatePolicy(None, "*", "Deny", event["routeArn"])
    
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        return generatePolicy(None, "*", "Deny", event["routeArn"])

    # Extract roles from WorkOS JWT
    user_roles = claims.get("role", [])
    if isinstance(user_roles, str):  
        user_roles = [user_roles]  # Convert to list if single role

    logger.info(f"User Roles: {user_roles}")

    # Allow if the user has an admin or authorized role
    allowed_roles = ["admin", "superuser"]  # Define allowed roles
    if any(role in allowed_roles for role in user_roles):
        logger.info("Allowed to use API")
        return generatePolicy(claims, claims["sub"], "Allow", event["routeArn"])

    logger.error("Unauthorized login attempt")
    return generatePolicy(None, claims["sub"], "Deny", event["routeArn"])

def generatePolicy(metadata, principalId, effect, resource):
    authResponse = {
        "principalId": principalId,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource,
                }
            ],
        },
    }

    if metadata:
        authResponse["context"] = metadata

    return authResponse
