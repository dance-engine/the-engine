import json
import jwt
import requests
import time
import logging

from jwt.exceptions import InvalidTokenError

# Initialize logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# WorkOS JWKS URL
JWKS_URL = "https://api.workos.com/sso/jwks/client_01JPA9NTHF31ZETB8AW9X697ET"
ISSUER = "https://api.workos.com"
AUDIENCE = "client_01JPA9NTHF31ZETB8AW9X697ET"  # Your WorkOS Client ID

# Cache WorkOS JWKS keys
jwks_cache = {"keys": [], "last_refresh": 0}
JWKS_CACHE_TTL = 3600  # Refresh JWKS every 1 hour

def fetch_jwks():
    """Download and cache JWKS from WorkOS."""
    global jwks_cache
    try:
        response = requests.get(JWKS_URL, timeout=5)
        response.raise_for_status()
        jwks_cache["keys"] = response.json()["keys"]
        jwks_cache["last_refresh"] = time.time()
        logger.info("Successfully fetched JWKS from WorkOS.")
    except requests.RequestException as e:
        logger.error(f"Error fetching JWKS: {e}")

def get_cached_jwks():
    """Return cached JWKS keys, refreshing if needed."""
    if time.time() - jwks_cache["last_refresh"] > JWKS_CACHE_TTL or not jwks_cache["keys"]:
        fetch_jwks()
    return jwks_cache["keys"]

def get_signing_key(kid):
    """Retrieve the signing key from cached JWKS."""
    jwks = get_cached_jwks()
    for key in jwks:
        if key["kid"] == kid:
            return key
    return None

def inspect_jwt(token):
    """Extract JWT header & payload without verifying the signature."""
    try:
        decoded_payload = jwt.decode(token, options={"verify_signature": False})
        logger.info(f"JWT Inspection - Payload: {json.dumps(decoded_payload, indent=2)}")
        return decoded_payload
    except Exception as e:
        logger.error(f"Failed to inspect JWT: {e}")
        return None


def validate_jwt(token):
    """Validate WorkOS JWT using cached JWKS."""
    try:
        header = jwt.get_unverified_header(token)
        key = get_signing_key(header["kid"])
        
        if not key:
            logger.warning("Invalid signing key: No matching key found in JWKS.")
            raise InvalidTokenError("Invalid signing key")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
        
        inspect_jwt(token)

        decoded = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            # audience=AUDIENCE,
            issuer=ISSUER,
        )

        # Log key JWT details
        logger.info(f"JWT Details: Issuer={decoded.get('iss', 'N/A')}, "
                    f"Audience={decoded.get('aud', 'N/A')}, "
                    f"Subject (User ID)={decoded.get('sub', 'N/A')}, "
                    f"Expires At={decoded.get('exp', 'N/A')}, "
                    f"Email={decoded.get('email', 'N/A')}")

        return decoded
    except InvalidTokenError as e:
        logger.warning(f"JWT validation failed: {e}")
        return str(e)
    except Exception as e:
        logger.error(f"Unexpected error validating JWT: {e}")
        return str(e)

def generate_iam_policy(principal_id, effect, resource, claims=None):
    """Generate an IAM policy for API Gateway."""
    policy = {
        "principalId": principal_id,  # Use WorkOS `sub` (User ID) or "unauthorized" if invalid
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

    if claims:
        policy["context"] = {
            "email": claims.get("email", ""),
            "org_id": claims.get("org_id", ""),
            "roles": ",".join(claims.get("roles", [])),
        }

    return policy

def auth_handler(event, context):
    """AWS Lambda entry point for API Gateway Authorizer."""
    route_arn = event.get("routeArn", "arn:aws:execute-api:unknown")
    auth_header = event.get("headers", {}).get("authorization", "")  # Handling lowercase header

    logger.info(f"Processing request for routeArn: {route_arn}")
    
    if not auth_header:
        logger.warning("No authorization header provided.")
        return generate_iam_policy("unauthorized", "Deny", route_arn)

    if not auth_header.startswith("Bearer "):
        logger.warning("Authorization header is malformed.")
        return generate_iam_policy("unauthorized", "Deny", route_arn)

    token = auth_header.split(" ")[1]  # Extract token

    # Validate JWT
    validation_result = validate_jwt(token)

    if isinstance(validation_result, str):  # If error message, return Deny policy
        logger.warning(f"JWT validation failed: {validation_result}")
        return generate_iam_policy("unauthorized", "Deny", route_arn)

    # Extract claims
    claims = validation_result
    principal_id = claims.get("sub", "unauthorized")

    logger.info(f"Authorized request for principalId: {principal_id}")
    
    # Generate IAM policy with Allow
    return generate_iam_policy(principal_id, "Allow", route_arn, claims)

# Preload JWKS cache on cold start
fetch_jwks()
