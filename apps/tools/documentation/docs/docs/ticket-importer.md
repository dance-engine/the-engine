# Ticket Importer

## Overview

The Ticket Importer is a small Textual app for preparing and submitting bulk ticket imports into Dance Engine through the bulk import API.

It is designed to let you:

- load a CSV file
- choose or edit the ticket line item for each row
- ignore rows you do not want to import
- run a preview request first
- submit the final import only after preview
- copy the raw request body to the clipboard for testing elsewhere

The app lives in:

- `functions/.scripts/ticket_importer/ticket_importer.py`

Its stylesheet lives in:

- `functions/.scripts/ticket_importer/ticket_importer.tcss`

---

## Requirements

You need:

- Python 3 available on your machine
- a virtual environment for the `functions` area
- the dependencies from `functions/.scripts/venv.requirements.txt`
- `textual`

Depending on your machine and Python setup, you may already have the virtual environment at:

- `functions/.venv`

If not, create one first.

---

## Install The Requirements

From the repository root:

```bash
cd /Volumes/PhD_SSD/Projects/the-engine
```

Create a virtual environment if you do not already have one:

```bash
python3 -m venv functions/.venv
```

Activate the virtual environment:

```bash
source functions/.venv/bin/activate
```

Upgrade `pip`:

```bash
python -m pip install --upgrade pip
```

Install the shared script requirements:

```bash
pip install -r functions/.scripts/venv.requirements.txt
```

Install Textual:

```bash
pip install textual
```

If you want exact versions recorded for this app later, you can add `textual` to the shared requirements file, but at the moment the app only needs it installed in the active environment.

---

## Activate The Virtual Environment

Whenever you want to run the app, activate the venv first:

```bash
cd /Volumes/PhD_SSD/Projects/the-engine
source functions/.venv/bin/activate
```

If activation worked, your shell prompt should usually show something like:

```bash
(.venv) ...
```

You can verify Python is coming from the venv with:

```bash
which python
```

It should point somewhere under:

- `functions/.venv/bin/python`

---

## Run The App

From the repository root with the venv activated:

```bash
python functions/.scripts/ticket_importer/ticket_importer.py
```

If you want to check the file compiles before running it:

```bash
python -m py_compile functions/.scripts/ticket_importer/ticket_importer.py
```

---

## Configuration Inputs

When the app opens, the landing screen asks for:

- `CSV path`
  - Path to the CSV file you want to import.
- `Dance Engine API base URL`
  - For example a local URL or a production API URL.
- `Dance Engine API key`
  - Optional if your environment does not require it, required if the API is protected.
- `Organisation slug`
  - The organisation used in the API path.
- `Event ksuid`
  - The event used in the API path.
- `Parent event ksuid`
  - Optional. Only include this when needed for the import request.

The landing page also includes:

- a status line
- a debug panel

These are useful when the app fails before opening the workspace, for example:

- bad API base URL
- missing API key
- wrong organisation slug
- wrong event ksuid
- missing CSV file

---

## How The App Works

The importer uses these API calls:

1. `GET /:organisation/events/:ksuid`
   - Loads the event and reads `items` and `bundles` from the returned event object.
2. `POST /:organisation/:event/tickets/import` with `preview: true`
   - Runs preview and returns validation and duplicate information.
3. `POST /:organisation/:event/tickets/import` with `preview: false`
   - Submits the actual import request.

The app always expects you to preview before import.

---

## User Guide

### 1. Open the app

Run:

```bash
python functions/.scripts/ticket_importer/ticket_importer.py
```

### 2. Fill in the landing screen

Enter:

- CSV path
- API base URL
- API key if needed
- organisation slug
- event ksuid
- optional parent event ksuid

Then press:

- `Load CSV`

### 3. Check the landing status/debug area if load fails

If the workspace does not open, read:

- the landing status line
- the landing debug panel

These should tell you what the app was trying to do and the exact error that occurred.

### 4. Review the workspace

After loading:

- the left panel contains the row editor and latest response
- the right panel shows the row table and preview table

The event catalog is loaded from the selected event, and each row can use one of that event’s items or bundles.

### 5. Edit a row

Use:

- `Previous Row`
- `Next Row`

to move between rows.

For the selected row you can edit:

- customer email
- name on ticket
- ticket creation key
- selected item or bundle

Then press:

- `Apply Row Changes`

### 6. Ignore a row

To exclude a row from preview/import:

- select the row
- press `Toggle Ignore`

Ignored rows are dimmed in the table and are not included in the API request body.

### 7. Bulk set the line item

If many active rows should use the same item or bundle:

- choose a value in `Bulk Line Item`
- press `Apply To Active Rows`

This updates all non-ignored rows.

### 8. Copy the raw request body

If you want to inspect or test the request in another tool:

- press `Copy Request Body`

This copies the current preview request JSON body to your clipboard.

The copied body reflects:

- edited rows
- ignored rows being omitted
- current selected items/bundles
- current parent event ksuid

### 9. Run preview

Press:

- `Preview Import`

This sends the current request body with:

```json
{
  "preview": true
}
```

The preview table is populated from the API response.

### 10. Review preview results

The preview table shows information from the preview response for each ticket, including:

- row number
- ticket name preview
- email
- name on ticket
- line item name
- issue count
- duplicate flag
- potential duplicate flag

If preview shows problems, go back to the row editor and fix them.

### 11. Submit the import

When the preview looks correct, press:

- `Submit Import`

The app only allows import when the current rows still match the last previewed request.

If you change rows after preview, run preview again before import.

---

## Common Problems

### The app does not move past the landing screen

Check:

- the landing status
- the landing debug panel

Common causes:

- wrong API base URL
- wrong organisation slug
- wrong event ksuid
- missing or invalid API key
- CSV path does not exist

### The preview table is empty

Possible causes:

- the API returned no tickets
- all rows are ignored
- active rows are missing required fields
- active rows do not have a selected item or bundle

### Import is blocked

This usually means one of these is true:

- you did not run preview first
- you changed rows after preview
- one or more active rows are missing required values

### Clipboard copy does not work

The app tries clipboard tools in this order:

- `pbcopy`
- `xclip`
- `xsel`

On macOS, `pbcopy` is normally the one that should work.

---

## Developer Notes

The easiest places to edit are near the top of `ticket_importer.py`:

- CSV column names
- raw table columns
- preview table columns
- catalog label prefixes

The most important logic sections are:

- `build_import_rows(...)`
- `build_request_body(...)`
- `load_event_catalog(...)`
- `apply_row_changes(...)`
- `apply_bulk_line_item(...)`
- `run_preview(...)`
- `run_import(...)`

If you need to change how a CSV row becomes a ticket request, start with:

- `build_ticket_from_import_row(...)`

If you need to change how preview rows are displayed, update:

- `PREVIEW_TABLE_COLUMNS`
- `preview_table_value(...)`
