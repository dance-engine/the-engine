import os
import json
import boto3
import uuid

s3_client = boto3.client('s3')

def generate_presigned_post(event, context):
    try:
        BUCKET_NAME = os.environ["BUCKET_NAME"]  # Read from function-scoped env

        data = json.loads(event["body"])
        file_type = data.get("fileType", "image/jpeg")

        key = f"uploads/{uuid.uuid4()}"

        presigned_post = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=key,
            Fields={"Content-Type": file_type},
            Conditions=[{"Content-Type": file_type}], # Only allow upload of specified filetype
            ExpiresIn=3600 # 1hr
        )

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"url": presigned_post["url"], "fields": presigned_post["fields"]})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
