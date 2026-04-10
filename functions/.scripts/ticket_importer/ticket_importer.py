from __future__ import annotations

import csv
import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest

from rich.text import Text
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical, VerticalScroll
from textual.widgets import Button, DataTable, Footer, Header, Input, Select, Static


DE_LOGO_ASCII = r"""
██████╗  █████╗ ███╗   ██╗ ██████╗███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗
██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝
██║  ██║███████║██╔██╗ ██║██║     █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗
██║  ██║██╔══██║██║╚██╗██║██║     ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝
██████╔╝██║  ██║██║ ╚████║╚██████╗███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
""".strip("\n")


# ---------------------------------------------------------------------------
# Editable configuration
# ---------------------------------------------------------------------------

# CSV headers
CSV_EMAIL_COLUMN = "Customer Email"
CSV_NAME_COLUMN = "Card Name"
CSV_CREATION_KEY_COLUMN = "Checkout Session ID"
CSV_LINE_ITEM_KSUID_COLUMN = "Line Item KSUID"
CSV_LINE_ITEM_TYPE_COLUMN = "Line Item Type"
CSV_LINE_ITEM_NAME_COLUMN = "Line Item Name"


# raw CSV table
RAW_TABLE_COLUMNS = [
    ("Row", "row_number"),
    ("Ignored", "ignored"),
    ("Email", "customer_email"),
    ("Name", "name_on_ticket"),
    ("Line Item", "line_item_label"),
    ("Creation Key", "ticket_creation_key"),
]


# preview table
PREVIEW_TABLE_COLUMNS = [
    ("Row", "index"),
    ("Ticket Name", "ticket_name_preview"),
    ("Email", "customer_email"),
    ("Name", "name_on_ticket"),
    ("Line Item", "line_items"),
    ("Issues", "issues"),
    ("Duplicate", "duplicate"),
    ("Potential Duplicate", "potential_duplicate"),
]

ITEM_LABEL_PREFIX = "ITEM"
BUNDLE_LABEL_PREFIX = "BUNDLE"

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class ImporterConfig:
    csv_path: str = str(Path("/Users/connormonaghan/Downloads/unified_payments-2.csv"))
    api_base_url: str = os.environ.get("DE_API") or os.environ.get("NEXT_PUBLIC_DANCE_ENGINE_API") or "http://localhost:3001"
    api_key: str = os.environ.get("DE_API_KEY", "")
    organisation: str = os.environ.get("CURRENT_ORG", "")
    event_ksuid: str = os.environ.get("CURRENT_EVENT", "")
    parent_event_ksuid: str = ""


@dataclass
class ImporterState:
    rows: list["ImportRow"] = field(default_factory=list)
    catalog: list["CatalogEntry"] = field(default_factory=list)
    selected_row_index: int = 0
    preview_response: dict[str, Any] = field(default_factory=dict)
    last_preview_signature: str | None = None


@dataclass(frozen=True)
class CatalogEntry:
    label: str
    ksuid: str
    entity_type: str
    includes: tuple[str, ...] = ()

    @property
    def select_value(self) -> str:
        return f"{self.entity_type}:{self.ksuid}"


@dataclass
class ImportRow:
    row_number: int
    source: dict[str, str]
    customer_email: str
    name_on_ticket: str
    ticket_creation_key: str
    line_item: CatalogEntry | None = None
    ignored: bool = False


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def build_line_items_from_catalog(entry: CatalogEntry | None) -> list[dict[str, Any]]:
    """
    Convert the selected event item or bundle into the API line_items format.
    """
    if entry is None:
        return []

    return [
        {
            "ksuid": entry.ksuid,
            "entity_type": entry.entity_type,
            "name": entry.label.split(" · ", 1)[-1],
            "includes": list(entry.includes),
        }
    ]


def build_ticket_from_import_row(row: ImportRow) -> dict[str, Any]:
    """
    Convert one editable import row into one ticket object for the bulk import API.
    """
    return {
        "customer_email": row.customer_email.strip(),
        "name_on_ticket": row.name_on_ticket.strip(),
        "ticket_creation_key": row.ticket_creation_key.strip() or f"row-{row.row_number}",
        "line_items": build_line_items_from_catalog(row.line_item),
    }


def read_csv_rows(csv_path: str) -> list[dict[str, str]]:
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def get_json(base_url: str, path: str, api_key: str) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{path}"
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urlrequest.Request(url, headers=headers, method="GET")

    try:
        with urlrequest.urlopen(request, timeout=30) as response:
            content = response.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urlerror.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API error {exc.code}: {error_body}") from exc
    except urlerror.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def load_event_catalog(base_url: str, organisation: str, event_ksuid: str, api_key: str) -> list[CatalogEntry]:
    event_response = get_json(base_url, f"/{organisation}/events/{event_ksuid}", api_key)
    event_data = event_response.get("event", {}) if isinstance(event_response, dict) else {}

    entries: list[CatalogEntry] = []

    for item in event_data.get("items", []):
        entries.append(CatalogEntry(
            label=f"{ITEM_LABEL_PREFIX} · {item.get('name', '(unnamed item)')}",
            ksuid=str(item.get("ksuid") or ""),
            entity_type="ITEM",
        ))

    for bundle in event_data.get("bundles", []):
        entries.append(CatalogEntry(
            label=f"{BUNDLE_LABEL_PREFIX} · {bundle.get('name', '(unnamed bundle)')}",
            ksuid=str(bundle.get("ksuid") or ""),
            entity_type="BUNDLE",
            includes=tuple(str(value) for value in (bundle.get("includes") or []) if value),
        ))

    return sorted(entries, key=lambda entry: entry.label.lower())


def find_catalog_entry_for_csv_row(row: dict[str, str], catalog: list[CatalogEntry]) -> CatalogEntry | None:
    csv_ksuid = (row.get(CSV_LINE_ITEM_KSUID_COLUMN) or "").strip()
    csv_entity_type = (row.get(CSV_LINE_ITEM_TYPE_COLUMN) or "").strip().upper()

    for entry in catalog:
        if csv_ksuid and csv_entity_type and entry.ksuid == csv_ksuid and entry.entity_type == csv_entity_type:
            return entry

    return None


def build_import_rows(csv_rows: list[dict[str, str]], catalog: list[CatalogEntry]) -> list[ImportRow]:
    rows: list[ImportRow] = []
    for row_number, csv_row in enumerate(csv_rows, start=1):
        rows.append(ImportRow(
            row_number=row_number,
            source=csv_row,
            customer_email=(csv_row.get(CSV_EMAIL_COLUMN) or "").strip(),
            name_on_ticket=(csv_row.get(CSV_NAME_COLUMN) or "").strip(),
            ticket_creation_key=(csv_row.get(CSV_CREATION_KEY_COLUMN) or "").strip() or f"row-{row_number}",
            line_item=find_catalog_entry_for_csv_row(csv_row, catalog),
        ))
    return rows


def build_request_body(rows: list[ImportRow], parent_event_ksuid: str, preview: bool) -> dict[str, Any]:
    tickets = [
        build_ticket_from_import_row(row)
        for row in rows
        if not row.ignored
    ]

    body = {
        "preview": preview,
        "tickets": tickets,
    }
    if parent_event_ksuid.strip():
        body["parent_event_ksuid"] = parent_event_ksuid.strip()
    return body


def post_json(base_url: str, path: str, body: dict[str, Any], api_key: str) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{path}"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urlrequest.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urlrequest.urlopen(request, timeout=30) as response:
            content = response.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urlerror.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API error {exc.code}: {error_body}") from exc
    except urlerror.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def payload_signature(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True)


# ---------------------------------------------------------------------------
# Table helpers
# ---------------------------------------------------------------------------

def raw_table_value(ticket: dict[str, Any], row_number: int, key: str) -> str:
    if key == "row_number":
        return str(row_number)
    return str(ticket.get(key) or "")


def import_row_table_value(row: ImportRow, key: str) -> str:
    if key == "row_number":
        return str(row.row_number)
    if key == "ignored":
        return "yes" if row.ignored else "no"
    if key == "line_item_label":
        return row.line_item.label if row.line_item else ""
    return str(getattr(row, key, "") or "")


def render_row_cell(row: ImportRow, value: str) -> Text:
    if row.ignored:
        return Text(value, style="dim")
    return Text(value)


def preview_table_value(ticket: dict[str, Any], key: str) -> str:
    ticket_data = ticket.get("ticket", {})

    if key == "index":
        return str((ticket.get("index") or 0) + 1)
    if key == "ticket_name_preview":
        return str(ticket_data.get("ticket_name_preview") or "")
    if key == "customer_email":
        return str(ticket_data.get("customer_email") or "")
    if key == "name_on_ticket":
        return str(ticket_data.get("name_on_ticket") or "")
    if key == "line_items":
        line_items = ticket_data.get("line_items") or []
        names = [str(item.get("name") or "") for item in line_items if item.get("name")]
        return ", ".join(names)
    if key == "issues":
        issues = ticket.get("issues") or []
        return str(len(issues))
    if key == "duplicate":
        return "yes" if ticket.get("duplicate") else "no"
    if key == "potential_duplicate":
        return "yes" if ticket.get("potential_duplicate") else "no"
    return str(ticket.get(key) or "")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

class TicketImporterApp(App):
    CSS_PATH = "ticket_importer.tcss"
    TITLE = "Dance Engine — Ticket Importer"
    SUB_TITLE = "Bulk import preview and submit"
    BINDINGS = [("q", "quit", "Quit")]

    def __init__(self) -> None:
        super().__init__()
        self.config = ImporterConfig()
        self.state = ImporterState()

    # ------------------------------------------------------------------
    # Layout
    # ------------------------------------------------------------------

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)

        with Container(id="landing"):
            with VerticalScroll(id="landing_column"):
                yield Static(DE_LOGO_ASCII, id="logo_ascii")
                yield Static("Ticket importer for the Dance Engine bulk import API", id="landing_title")
                yield Button("Load CSV", id="load_csv", variant="primary")
                yield Static("Load your CSV first, then use preview before import.", id="landing_hint")
                yield Input(value=self.config.csv_path, placeholder="Path to CSV file", id="csv_path")
                yield Input(value=self.config.api_base_url, placeholder="Dance Engine API base URL", id="api_base_url")
                yield Input(value=self.config.api_key, placeholder="Dance Engine API key", id="api_key")
                yield Input(value=self.config.organisation, placeholder="Organisation slug", id="organisation")
                yield Input(value=self.config.event_ksuid, placeholder="Event ksuid", id="event_ksuid")
                yield Input(value=self.config.parent_event_ksuid, placeholder="Parent event ksuid (optional)", id="parent_event_ksuid")
                yield Static("Status: waiting", id="landing_status")
                with VerticalScroll(id="landing_debug_scroll"):
                    yield Static("", id="landing_debug")

        with Container(id="workspace", classes="hidden"):
            with Vertical(id="workspace_root"):
                with Horizontal(id="top_bar"):
                    yield Button("Back To Config", id="back_to_config")
                    yield Button("Reload Event Data", id="reload_event_data")
                    yield Button("Copy Request Body", id="copy_request_body")
                    yield Button("Preview Import", id="preview_import", variant="primary")
                    yield Button("Submit Import", id="submit_import")

                with Horizontal(id="body_row"):
                    with Vertical(id="left_panel"):
                        with VerticalScroll(id="left_panel_scroll"):
                            # yield Static("Configuration", classes="panel_title")
                            # yield Static("", id="config_summary", classes="panel_body")
                            yield Static("Status", classes="panel_title")
                            yield Static("", id="status_line")
                            yield Static("Selected Row", classes="panel_title")
                            yield Static("", id="selected_row_label", classes="panel_body")
                            with Vertical(id="row_editor_buttons"):
                                yield Button("Previous Row", id="previous_row")
                                yield Button("Next Row", id="next_row")
                                yield Button("Toggle Ignore", id="toggle_ignore")
                            yield Input(placeholder="Customer email", id="edit_customer_email")
                            yield Input(placeholder="Name on ticket", id="edit_name_on_ticket")
                            yield Input(placeholder="Ticket creation key", id="edit_ticket_creation_key")
                            yield Select([], prompt="Select item or bundle", id="edit_line_item", allow_blank=True)
                            yield Button("Apply Row Changes", id="apply_row_changes")
                            yield Static("Bulk Line Item", classes="panel_title")
                            yield Select([], prompt="Select item or bundle for active rows", id="bulk_line_item", allow_blank=True)
                            yield Button("Apply To Active Rows", id="apply_bulk_line_item")
                            yield Static("Latest Response", classes="panel_title")
                            with VerticalScroll(id="response_scroll"):
                                yield Static("", id="response_body", classes="panel_body")

                    with Vertical(id="right_panel"):
                        yield Static("CSV Rows", classes="panel_title")
                        yield DataTable(id="rows_table")                        
                        yield Static("Preview", classes="panel_title")
                        yield DataTable(id="preview_table")

        yield Footer()

    def on_mount(self) -> None:
        self.setup_table(self.query_one("#rows_table", DataTable), RAW_TABLE_COLUMNS)
        self.setup_table(self.query_one("#preview_table", DataTable), PREVIEW_TABLE_COLUMNS)
        # self.refresh_config_summary()
        self.refresh_row_editor()
        self.set_status("Enter configuration details and load a CSV.")

    # ------------------------------------------------------------------
    # Small UI helpers
    # ------------------------------------------------------------------

    def setup_table(self, table: DataTable, columns: list[tuple[str, str]]) -> None:
        table.clear(columns=True)
        table.cursor_type = "row"
        table.add_columns(*[label for label, _ in columns])

    def set_status(self, text: str) -> None:
        try:
            self.query_one("#status_line", Static).update(text)
        except Exception:
            pass

        try:
            self.query_one("#landing_status", Static).update(f"Status: {text}")
        except Exception:
            pass

    def set_response_body(self, value: Any) -> None:
        if isinstance(value, (dict, list)):
            text = json.dumps(value, indent=2)
        else:
            text = str(value)
        self.query_one("#response_body", Static).update(text)

    def set_landing_debug(self, value: Any) -> None:
        if isinstance(value, (dict, list)):
            text = json.dumps(value, indent=2)
        else:
            text = str(value)

        try:
            self.query_one("#landing_debug", Static).update(text)
        except Exception:
            pass

    def show_workspace(self) -> None:
        self.query_one("#landing").add_class("hidden")
        self.query_one("#workspace").remove_class("hidden")

    def show_landing(self) -> None:
        self.query_one("#workspace").add_class("hidden")
        self.query_one("#landing").remove_class("hidden")

    def get_input_value(self, widget_id: str) -> str:
        return self.query_one(f"#{widget_id}", Input).value.strip()

    def read_config_from_inputs(self) -> None:
        self.config.csv_path = self.get_input_value("csv_path")
        self.config.api_base_url = self.get_input_value("api_base_url")
        self.config.api_key = self.get_input_value("api_key")
        self.config.organisation = self.get_input_value("organisation")
        self.config.event_ksuid = self.get_input_value("event_ksuid")
        self.config.parent_event_ksuid = self.get_input_value("parent_event_ksuid")

    def refresh_config_summary(self) -> None:
        summary = "\n".join([
            f"CSV: {self.config.csv_path or '-'}",
            f"API: {self.config.api_base_url or '-'}",
            f"Organisation: {self.config.organisation or '-'}",
            f"Event: {self.config.event_ksuid or '-'}",
            f"Parent Event: {self.config.parent_event_ksuid or '-'}",
            f"Loaded Rows: {len(self.state.rows)}",
            f"Catalog Entries: {len(self.state.catalog)}",
        ])
        self.query_one("#config_summary", Static).update(summary)

    def refresh_rows_table(self) -> None:
        rows_table = self.query_one("#rows_table", DataTable)
        self.setup_table(rows_table, RAW_TABLE_COLUMNS)

        for row in self.state.rows:
            rows_table.add_row(*[
                render_row_cell(row, import_row_table_value(row, key))
                for _, key in RAW_TABLE_COLUMNS
            ])

    def refresh_line_item_select(self) -> None:
        options = [(entry.label, entry.select_value) for entry in self.state.catalog]
        self.query_one("#edit_line_item", Select).set_options(options)
        self.query_one("#bulk_line_item", Select).set_options(options)

    def selected_catalog_entry(self, select_id: str) -> CatalogEntry | None:
        selected_value = self.query_one(f"#{select_id}", Select).value
        return next(
            (entry for entry in self.state.catalog if entry.select_value == selected_value),
            None,
        )

    def refresh_row_editor(self) -> None:
        if not self.state.rows:
            self.query_one("#selected_row_label", Static).update("No row selected.")
            self.query_one("#edit_customer_email", Input).value = ""
            self.query_one("#edit_name_on_ticket", Input).value = ""
            self.query_one("#edit_ticket_creation_key", Input).value = ""
            self.refresh_line_item_select()
            self.query_one("#edit_line_item", Select).clear()
            return

        self.state.selected_row_index = max(0, min(self.state.selected_row_index, len(self.state.rows) - 1))
        row = self.state.rows[self.state.selected_row_index]

        self.query_one("#selected_row_label", Static).update(
            f"Row {row.row_number} {'(ignored)' if row.ignored else ''}"
        )
        self.query_one("#edit_customer_email", Input).value = row.customer_email
        self.query_one("#edit_name_on_ticket", Input).value = row.name_on_ticket
        self.query_one("#edit_ticket_creation_key", Input).value = row.ticket_creation_key
        self.refresh_line_item_select()

        select = self.query_one("#edit_line_item", Select)
        if row.line_item:
            select.value = row.line_item.select_value
        else:
            select.clear()

    # ------------------------------------------------------------------
    # Validation and request builders
    # ------------------------------------------------------------------

    def require_basic_config(self) -> None:
        if not self.config.csv_path:
            raise RuntimeError("CSV path is required.")
        if not self.config.api_base_url:
            raise RuntimeError("API base URL is required.")
        if not self.config.organisation:
            raise RuntimeError("Organisation slug is required.")
        if not self.config.event_ksuid:
            raise RuntimeError("Event ksuid is required.")

    def require_rows_ready_for_import(self) -> None:
        active_rows = [row for row in self.state.rows if not row.ignored]
        if not active_rows:
            raise RuntimeError("There are no active rows to import.")

        for row in active_rows:
            if not row.customer_email:
                raise RuntimeError(f"Row {row.row_number} is missing a customer email.")
            if not row.name_on_ticket:
                raise RuntimeError(f"Row {row.row_number} is missing a name on ticket.")
            if row.line_item is None:
                raise RuntimeError(f"Row {row.row_number} does not have a selected item or bundle.")

    def current_api_path(self) -> str:
        return f"/{self.config.organisation}/{self.config.event_ksuid}/tickets/import"

    def current_payload(self, preview: bool) -> dict[str, Any]:
        return build_request_body(
            self.state.rows,
            self.config.parent_event_ksuid,
            preview=preview,
        )

    def copy_text_to_clipboard(self, text: str) -> None:
        try:
            subprocess.run(["pbcopy"], input=text, text=True, check=True)
            return
        except Exception:
            pass

        try:
            subprocess.run(["xclip", "-selection", "clipboard"], input=text, text=True, check=True)
            return
        except Exception:
            pass

        try:
            subprocess.run(["xsel", "--clipboard", "--input"], input=text, text=True, check=True)
            return
        except Exception:
            pass

        raise RuntimeError("Could not copy to clipboard. No clipboard command was available.")

    # ------------------------------------------------------------------
    # Main actions
    # ------------------------------------------------------------------

    def load_csv(self) -> None:
        self.read_config_from_inputs()
        self.require_basic_config()
        self.set_status("Loading CSV and event data...")
        self.set_landing_debug({
            "step": "load_csv_start",
            "csv_path": self.config.csv_path,
            "api_base_url": self.config.api_base_url,
            "organisation": self.config.organisation,
            "event_ksuid": self.config.event_ksuid,
            "parent_event_ksuid": self.config.parent_event_ksuid,
            "api_key_present": bool(self.config.api_key),
        })

        csv_rows = read_csv_rows(self.config.csv_path)
        self.state.catalog = load_event_catalog(
            self.config.api_base_url,
            self.config.organisation,
            self.config.event_ksuid,
            self.config.api_key,
        )
        self.state.rows = build_import_rows(csv_rows, self.state.catalog)
        self.state.selected_row_index = 0
        self.state.preview_response = {}
        self.state.last_preview_signature = None

        self.refresh_rows_table()
        self.refresh_row_editor()
        preview_table = self.query_one("#preview_table", DataTable)
        self.setup_table(preview_table, PREVIEW_TABLE_COLUMNS)
        self.set_response_body("")
        self.set_landing_debug({
            "step": "load_csv_complete",
            "loaded_rows": len(self.state.rows),
            "catalog_entries": len(self.state.catalog),
            "api_path": self.current_api_path(),
        })
        # self.refresh_config_summary()
        self.show_workspace()
        self.set_status(f"Loaded {len(self.state.rows)} rows and {len(self.state.catalog)} event line items. Run preview before import.")

    def reload_event_data(self) -> None:
        self.state.catalog = load_event_catalog(
            self.config.api_base_url,
            self.config.organisation,
            self.config.event_ksuid,
            self.config.api_key,
        )
        self.refresh_row_editor()
        # self.refresh_config_summary()
        self.set_status(f"Reloaded {len(self.state.catalog)} event line items.")

    def apply_row_changes(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")

        row = self.state.rows[self.state.selected_row_index]
        row.customer_email = self.get_input_value("edit_customer_email")
        row.name_on_ticket = self.get_input_value("edit_name_on_ticket")
        row.ticket_creation_key = self.get_input_value("edit_ticket_creation_key")

        row.line_item = self.selected_catalog_entry("edit_line_item")

        self.state.last_preview_signature = None
        self.refresh_rows_table()
        self.refresh_row_editor()
        self.set_status(f"Updated row {row.row_number}. Run preview again before importing.")

    def apply_bulk_line_item(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")

        entry = self.selected_catalog_entry("bulk_line_item")
        if entry is None:
            raise RuntimeError("Select a bulk item or bundle first.")

        updated_rows = 0
        for row in self.state.rows:
            if row.ignored:
                continue
            row.line_item = entry
            updated_rows += 1

        self.state.last_preview_signature = None
        self.refresh_rows_table()
        self.refresh_row_editor()
        self.set_status(f"Applied {entry.label} to {updated_rows} active rows. Run preview again before importing.")

    def copy_request_body(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")

        body_text = json.dumps(self.current_payload(preview=True), indent=2)
        self.copy_text_to_clipboard(body_text)
        self.set_status("Copied preview request body to clipboard.")

    def move_selected_row(self, direction: int) -> None:
        if not self.state.rows:
            return
        self.state.selected_row_index = max(0, min(self.state.selected_row_index + direction, len(self.state.rows) - 1))
        self.refresh_row_editor()

    def toggle_ignore_for_selected_row(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")

        row = self.state.rows[self.state.selected_row_index]
        row.ignored = not row.ignored
        self.state.last_preview_signature = None
        self.refresh_rows_table()
        self.refresh_row_editor()
        self.set_status(f"Row {row.row_number} {'ignored' if row.ignored else 'included'} in import.")

    def run_preview(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")
        self.require_rows_ready_for_import()

        payload = self.current_payload(preview=True)
        response = post_json(
            self.config.api_base_url,
            self.current_api_path(),
            payload,
            self.config.api_key,
        )

        self.state.preview_response = response
        self.state.last_preview_signature = payload_signature(payload)

        preview_table = self.query_one("#preview_table", DataTable)
        self.setup_table(preview_table, PREVIEW_TABLE_COLUMNS)

        for ticket in response.get("tickets", []):
            preview_table.add_row(*[
                preview_table_value(ticket, key)
                for _, key in PREVIEW_TABLE_COLUMNS
            ])

        # self.refresh_config_summary()
        self.set_response_body(response)
        self.set_status("Preview completed. Review the API response, then submit import if it looks correct.")

    def run_import(self) -> None:
        if not self.state.rows:
            raise RuntimeError("Load a CSV first.")
        self.require_rows_ready_for_import()

        current_preview_payload = self.current_payload(preview=True)
        if self.state.last_preview_signature != payload_signature(current_preview_payload):
            raise RuntimeError("Run preview again before importing.")

        response = post_json(
            self.config.api_base_url,
            self.current_api_path(),
            self.current_payload(preview=False),
            self.config.api_key,
        )

        # self.refresh_config_summary()
        self.set_response_body(response)
        self.set_status("Import request submitted.")

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def on_button_pressed(self, event: Button.Pressed) -> None:
        try:
            if event.button.id == "load_csv":
                self.load_csv()
            elif event.button.id == "back_to_config":
                self.show_landing()
                self.set_status("Returned to configuration screen.")
            elif event.button.id == "reload_event_data":
                self.reload_event_data()
            elif event.button.id == "copy_request_body":
                self.copy_request_body()
            elif event.button.id == "previous_row":
                self.move_selected_row(-1)
            elif event.button.id == "next_row":
                self.move_selected_row(1)
            elif event.button.id == "toggle_ignore":
                self.toggle_ignore_for_selected_row()
            elif event.button.id == "apply_row_changes":
                self.apply_row_changes()
            elif event.button.id == "apply_bulk_line_item":
                self.apply_bulk_line_item()
            elif event.button.id == "preview_import":
                self.run_preview()
            elif event.button.id == "submit_import":
                self.run_import()
        except Exception as exc:
            self.set_landing_debug({
                "error_type": type(exc).__name__,
                "error": str(exc),
                "csv_path": self.get_input_value("csv_path") if self.is_mounted else self.config.csv_path,
                "api_base_url": self.get_input_value("api_base_url") if self.is_mounted else self.config.api_base_url,
                "organisation": self.get_input_value("organisation") if self.is_mounted else self.config.organisation,
                "event_ksuid": self.get_input_value("event_ksuid") if self.is_mounted else self.config.event_ksuid,
            })
            self.set_status(str(exc))


if __name__ == "__main__":
    TicketImporterApp().run()
