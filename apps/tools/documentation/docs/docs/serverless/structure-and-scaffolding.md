---
id: lambda-structure
title: Lambda Function Structure & CLI Scaffolder
sidebar_label: Lambda Functions
description: How Dance Engine structures and scaffolds serverless Lambda functions.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 🧱 Lambda Function Structure & Scaffolding

Each logical group of endpoints (e.g. `events`, `tickets`) is handled by **one Lambda function**. This function supports multiple routes (like `GET`, `POST`, etc.). 

A central `handler_{name}.py` file routes **multiple HTTP methods and routes** requests to specific method files.

You can generate a starting point using a CLI tool.

---

## 🗂 Folder Structure

```
/functions/
├── serverless.yml                # Serverless config
├── _layers/                      # Layers for lambdas
├── _shared/                      # Shared code added to lambdas
├── .scripts/                     # Internal tools and scripts
│   └── scaffold.py               #     CLI tool for scaffolding new Lambda functions
├── .serverless/                  # Auto-generated directory used by the Serverless Framework
└── functions/                    # Main directory for all Lambda functions
    ├── priviledged/              # Privileged Lambdas (e.g. provisioning, elevated IAM permissions)
    │   └── organisations/        #     Privileged lambda: organisation provisioning
    │       ├── # see 'events' lambda below

    ├── utils/                    # Utility-related Lambdas
    │   └── s3/                   #     S3 utilities group
    │       └── generate_presigned/     # Lambda for generating S3 pre-signed URLs
    │           ├── # see 'events' lambda below

    └── events/                   # Events lambda example
        ├── handler_events.py            # Routes by HTTP method
        ├── lambda_events.py             # Function logic
        ├── sls.events.function.yml      # Serverless function definition
        ├── sls.events.doc.yml           # OpenAPI documentation

```

---

## 🚀 CLI Tool

### Basic Usage

```bash
python scaffold.py create-lambda --name events
```

Creates routes:
- `GET /events`
- `POST /events`

:::tip
Command is also availabe through pnpm as long as your virtual environment is accessible at `functions/.venv/bin/activate`.
```bash
pnpm create-lambda --name=events
```
:::

### With Custom Routes

```bash
python scaffold.py create-lambda --name tickets --routes "GET /tickets" "POST /tickets" "GET /tickets/{id}"
```

Creates routes:
- `GET /tickets`
- `POST /tickets`
- `GET /tickets/{id}`

---

## 📄 Generated Files 

### `handler_{name}.py`

Main entrypoint for the Lambda.

```python
def lambda_handler(event, context):
    http_method = event['requestContext']["http"]["method"]

    if http_method == "GET":
        # TODO: implement
        return 
    elif http_method == "POST":
        return 
    else:
        return {{
            "statusCode": 405, 
            "headers": {{ "Content-Type": "application/json" }}, 
            "body": json.dumps({{
                    "message": "Method not allowed."
                    }}, cls=DecimalEncoder)
            }}
```

---

### `lambda_{name}.py` or `lambda_{name}_{method}.py`

Handles each route’s logic.

```python
def get(data):
    # TODO: implement
    return {{
        "statusCode": 200, 
        "headers": {{ "Content-Type": "application/json" }}, 
        "body": json.dumps(events, cls=DecimalEncoder)
        }}
```

---

### `sls.{name}.function.yml`

Serverless fucntion config created at:

```text
functions/{name}/sls.{name}.function.yml
```

and appended to `serverless.yml`:

```yaml
functions:
  {Name}: ${file(functions/{name}/sls.{name}.function.yml):{Name}}
```

---

### `sls.{name}.doc.yml`

OpenAPI (serverless-openapi-documenter) created at:

```text
functions/{name}/sls.{name}.doc.yml
```

Includes:
- Summary & description
- Tags
- 200, 405, and 500 status codes

---

## 🧪 Example Workflow

```bash
python scaffold.py create-lambda --name users --routes "GET /users" "POST /users" "GET /users/{id}"
```

Creates:
- `handler_users.py`
- `lambda_users_get.py`, `lambda_users_post.py`
- Configs in `.config/`
- Adds to `serverless.yml`

---

## ✅ Summary

| Feature           | Description                                 |
|-------------------|---------------------------------------------|
| One Lambda per group | e.g. `events`, `tickets`                  |
| Route handling    | Based on HTTP method in `handler.py`        |
| Logic per route   | In `lambda_{name}_{method}.py` files        |
| Config structure  | Inside `.config/functions`, `docs`, `models`|
| CLI tool       | `scaffold.py create-lambda`                 |
