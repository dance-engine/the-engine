---
id: running-tests
title: Running Python Tests
sidebar_label: Running Tests
description: How to set up a local environment and run the Python test suite for the functions package.
---

# Running Python Tests

The `functions/` package uses [pytest](https://docs.pytest.org/) and mocks all AWS and Stripe calls — no live credentials or deployed infrastructure are needed.

---

## Prerequisites

- Python 3.11

---

## Install Dependencies

A `requirements-dev.txt` file mirrors the Lambda layer dependencies that are normally injected at runtime, plus `pytest`:

```bash
cd functions
pip install -r requirements-dev.txt
```

This installs:

| Package | Source |
|---|---|
| `svix-ksuid` | `_layers/utils` |
| `pydantic[email,timezone]` | `_layers/pydantic` |
| `stripe` | `_layers/stripe` |
| `pyjwt`, `pyjwt[crypto]` | `_layers/auth` |
| `boto3` | Lambda runtime (needed locally) |
| `pytest` | Test tooling |

:::caution
Use `svix-ksuid`, **not** the generic `ksuid` package — they both install as `ksuid` but only `svix-ksuid` exports `KsuidMs`, which is what the codebase uses.
:::

---

## Run Tests

From the `functions/` directory:

```bash
# All tests
python -m pytest tests/ -v

# Specific file
python -m pytest tests/shared/test_event_capacity.py -v
```

---

## Test Layout

```
functions/tests/
  pydantic/
    test_dynamodb.py          # DynamoDB model and transact_upsert behaviour
    test_EventBridge.py
    test_models_extended.py
  shared/
    test_helpers.py           # make_response helper
    test_naming.py
    test_parser.py
    test_DecimalEncoder.py
    test_event_capacity.py          # Shared atomic capacity mutation helper
    test_checkout_capacity_mapping.py   # checkout Lambda response codes
    test_event_update_capacity_mapping.py  # events Lambda capacity update paths
```

---

## How Mocking Works

Lambda dependencies (DynamoDB, Stripe, EventBridge) are patched with `unittest.mock` — no AWS credentials or `.env` files are required. Environment variables that the handlers read at import time are set directly in the test file:

```python
import os
os.environ.setdefault("STAGE_NAME", "test")
os.environ.setdefault("ORG_TABLE_NAME_TEMPLATE", "test-org_name-table")
```
