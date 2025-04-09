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

Scaffolding a lambda (e.g. `events`) creates:

```
/functions/
  ├── serverless.yml    # Serverless config
  ├── _layers/          # layers for lambdas
  ├── _shared/          # shared code added to lambdas
  ├── .scripts/         # scripts like the cli tool described here
  ├── .serverless/      # file managed by serverless
  └── functions/            # The actual lambdas
        └── events/         # A lambda function
            ├── handler_events.py             # Main router
            ├── lambda_events_get.py          # handles get requests (could be one type or multiple)
            ├── lambda_events_post.py         # same as before
            ├── sls.events.function.yml       # function config
            ├── sls.events.doc.yml            # Doc definition
            ├── sls.events.models.yml         # models for the doc
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
        return get(event)
    elif http_method == "POST":
        return post(event)
    else:
        return {
            "statusCode": 405,
            "body": json.dumps({ "message": "Method not allowed." })
        }
```

---

### `lambda_{name}_{method}.py`

Handles each route’s logic.

```python
def get(data):
    return {
        "statusCode": 200,
        "headers": { "Content-Type": "application/json" },
        "body": json.dumps({ "message": "GET success" })
    }
```

---

### `sls.{name}.function.yml`

Serverless fucntion config created at:

```text
.config/functions/sls.{name}.function.yml
```

and appended to `serverless.yml`:

```yaml
functions:
  {Name}: ${file(.config/functions/sls.{name}.function.yml):{name}}
```

---

### `sls.{name}.doc.yml`

OpenAPI (serverless-openapi-documenter) created at:

```text
.config/docs/sls.{name}.doc.yml
```

Includes:
- Summary & description
- Tags
- 200, 405, and 500 status codes

---

### `sls.{name}.models.yml`

Place to put models created as placeholder:

```text
.config/models/sls.{name}.models.yml
```

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
