import os
import json
import boto3
import uuid

s3_client = boto3.client("s3")
BUCKET_NAME = os.environ["BUCKET_NAME"]

def generate_presigned_url(event, context):
    try:
        data = json.loads(event["body"])
        action = data.get("action", "upload")  # Determines upload or download
        file_key = data.get("fileKey", "")
        data["organisation"] = event.get("pathParameters", {}).get("organisation","unknown")

        if action == "POST":
            return generate_presigned_post(data)

        elif action == "GET":
            return generate_presigned_get(file_key)

        else:
            return {"statusCode": 400, "body": json.dumps({"error": "Invalid action"})}

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

def generate_presigned_post(data):
    """Generate a presigned URL for file upload."""
    file_type = data.get("fileType", "image/jpeg")
    field_name = data.get("fieldName", "")
    organisation = data.get("organisation", "unknown")

    key = f"uploads/{organisation}/{field_name}/{uuid.uuid4()}"

    presigned_post = s3_client.generate_presigned_post(
        Bucket=BUCKET_NAME,
        Key=key,
        Fields={"Content-Type": file_type},
        Conditions=[{"Content-Type": file_type}],
        ExpiresIn=3600,  # URL valid for 1 hour
    )

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "url": presigned_post["url"],
            "fields": presigned_post["fields"],
            "fileKey": key  # Send back the file key
        }),
    }

def generate_presigned_get(file_key):
    """Generate a presigned URL for file retrieval."""
    if not file_key:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing fileKey"})}

    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": file_key},
        ExpiresIn=3600,  # URL valid for 1 hour
    )

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"presignedUrl": presigned_url}),
    }
