import jwt from 'jsonwebtoken'

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtnBAijofwYzYAfLqF/Zb
aaBqzdoVVi15M6xhnyyT8eRej0lPn0jw+S0DKzGzf61YqZBjLzcFNRJwwWEXwPtU
iwKFvJqgoovyIodJxjnqp3r1ZqTbJSYgzZTebLYuhGlKXdUX+vsiW4Q9wrlcAD7q
t0OSBLfzQ8crdFkW/9VcTpbdG7K2HxKxuBSMP5a5ZuU9QMAuWiP6KSgsbQFCs5RQ
wzredqJj3SiRDrY5L1RSNL9vsZov1yzCWmcysOx78ITobpWtEdP52x3jcaXkeCez
9beH+tKx8jBI0ly1tmzxbrm5JkJaaECgnnPNvT9MLFIUnfcdPKI8xRKM6Nqqdo6X
YwIDAQAB
-----END PUBLIC KEY-----
`

export async function handler(event, context, callback) {
  // Extract the token from the Authorization header
  console.log("EVENT",event);
  const token = event.headers.authorization.split(' ')[1]

  // Verifies and decodes the JWT
  try {
    const claims = jwt.verify(token, publicKey)
    console.log("claims",claims);
    console.log("admin?", claims.metadata.admin)
    // Check if the user is an admin
    if (claims.metadata.admin) {
      console.log("Allowed in")
      callback(null, generatePolicy(claims.metadata, claims.sub, 'Allow', event.routeArn))
    } else {
      console.error("Go 'way")
      callback(null, generatePolicy(null, claims.sub, 'Deny', event.routeArn))
    }
  } catch(err) {
    console.error("JWT Error",err);
    callback(null, generatePolicy(null, null, 'Deny', event.routeArn))
  }
  

}

function generatePolicy(metadata, principalId, effect, resource) {
  const authResponse = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  }
  if (metadata) {
    authResponse.context = metadata
  }
  return authResponse
}