---
id: setup-venv
title: Virtual Environment Setup
sidebar_label:  Virtual Environment Setup
description: How to setup and activate a Python virtual environment
---
# Virtual Environment Setup

We use Python 3.11 in our lambdas and so a virtual environment to manage all dependencies is setup. 
The setup process ensures consistency across systems and includes a custom fork of a key dependency.
Dependencies are packaged up into layers and then attached to lambdas manually in the `functions/_layers` folder.

---

## Run Setup

```bash
bash functions/.scripts/create-venv.sh
```

- Requires Python 3.11.
- Creates venv at `functions/.venv/`.
- Installs from `functions/requirements.txt`.

---

## How It Works

- Script checks for `python3.11` in PATH.
- Isolates project dependencies in `.venv`.
- Uses pip to install packages.

---

## Using the Virtual Environment

### Activate (Unix/macOS)

```bash
source functions/.venv/bin/activate
```

### Activate (Windows, PowerShell)

```powershell
functions\.venv\Scripts\Activate.ps1
```

- Use `deactivate` to exit the venv.

---

## Custom Dependency

- This project uses a [custom fork of `datamodel-code-generator`](https://github.com/connorkm2/datamodel-code-generator).
- Adds support for `x-internal-group` schema splitting.
- Fork is installed automatically via `venv.requirements.txt`.
