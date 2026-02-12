#!/usr/bin/env python3
"""Normalize candidate and interview data from Google Sheets."""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import gspread
import pandas as pd
from dateutil import parser
from google.oauth2.service_account import Credentials
from notion_client import Client

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_PATH = BASE_DIR / "cache"
CACHE_FILE = CACHE_PATH / "sheets_ingest.json"
CANDIDATE_SHEET_ID = "1mKTtcHapxnhA6k9xbULwi49inFUIPWMFnu-b_xQ2a24"
INTERVIEW_SHEET_ID = "1Z1zfT6lFjbGf-1WQ_jmMzENWjX73UIUkbF3jVGzVbWI"
CREDENTIALS_FILE = Path.home() / ".openclaw" / "workspace" / "creds" / "proqruit-sheets.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
NOTION_PAGE_ID = "3050b8be-2c62-8179-b202-fd95d53d89d3"


def normalize_header(header: str) -> str:
    return header.strip().lower().replace("-", "_").replace("/", "_").replace(".", "").replace(" ", "_")


def match_column(header: str, keywords: Tuple[str, ...]) -> bool:
    normalized = normalize_header(header)
    return any(keyword in normalized for keyword in keywords)


def extract_common_fields(row: Dict[str, str]) -> Dict[str, str]:
    data = {}
    for key, value in row.items():
        if value is None:
            continue
        row[key] = value.strip()

    def pick(keywords: Tuple[str, ...], fallback: str = ""):
        for header, value in row.items():
            if match_column(header, keywords) and value:
                return value
        return fallback

    data["name"] = pick(("name",))
    data["phone"] = pick(("phone", "contact", "number"))
    data["email"] = pick(("mail", "email"))
    data["location"] = pick(("location", "city"))
    data["current_ctc"] = pick(("current_ctc", "current_in_hand", "current_ctc_in_hand"))
    data["expected_ctc"] = pick(("expected_ctc", "expected_in_hand"))
    data["notice_period"] = pick(("notice_period",))
    data["total_experience"] = pick(("total_experience", "total_exp"))
    data["status"] = pick(("status",))
    data["remarks"] = pick(("remarks",))
    data["screening"] = pick(("screening",))
    data["current_org"] = pick(("current_organization", "current_organisation"))
    data["language_en"] = pick(("proficiency_in_english", "profiencincy_in_english"))
    data["language_local"] = pick(("proficiency_in_regional", "proficiency_in_tamil"))
    data["domain_experience"] = pick(("experience_in_bpo", "experience_in_bulk"))

    extras = {}
    for header, value in row.items():
        norm = normalize_header(header)
        if norm and norm not in {
            "name",
            "phone",
            "mail_id",
            "email",
            "location",
            "city",
            "current_ctc",
            "current_in_hand",
            "expected_ctc",
            "expected_in_hand",
            "notice_period",
            "total_experience",
            "status",
            "remarks",
            "screening",
            "current_organization",
            "current_organisation",
            "proficiency_in_english",
            "profiencincy_in_english",
            "proficiency_in_regional_language",
            "proficiency_in_tamil",
            "experience_in_bpo_industry",
            "experience_in_bulk_hiring",
            "experience_in_field",
        }:
            extras[norm] = value
    data["extras"] = extras
    return data


def extract_interview_fields(row: Dict[str, str]) -> Dict[str, str]:
    data = {}
    for key, value in row.items():
        if value is None:
            continue
        row[key] = value.strip()

    def pick(keywords: Tuple[str, ...], fallback: str = ""):
        for header, value in row.items():
            if match_column(header, keywords) and value:
                return value
        return fallback

    data["name"] = pick(("name",))
    data["phone"] = pick(("phone", "contact"))
    data["email"] = pick(("mail", "email"))
    raw_date = pick(("interview_date", "date"))
    if raw_date:
        try:
            data["interview_date"] = parser.parse(raw_date, dayfirst=True).isoformat()
        except Exception:
            data["interview_date"] = raw_date
    else:
        data["interview_date"] = ""
    data["mail_confirmation"] = pick(("mail_confirmation",))
    data["remarks"] = pick(("remarks",))
    data["feedback"] = pick(("feedback",))
    data["recruiter"] = pick(("recruiter",))
    data["updates"] = pick(("updates", "status"))

    extras = {}
    for header, value in row.items():
        norm = normalize_header(header)
        if norm not in {
            "name",
            "contact",
            "phone",
            "mail_id",
            "email",
            "interview_date",
            "mail_confirmation",
            "remarks",
            "feedback",
            "recruiter",
            "updates",
            "status",
        }:
            extras[norm] = value
    data["extras"] = extras
    return data


def load_sheet_records(sheet_id: str) -> gspread.Spreadsheet:
    creds = Credentials.from_service_account_file(str(CREDENTIALS_FILE), scopes=SCOPES)
    client = gspread.authorize(creds)
    return client.open_by_key(sheet_id)


def fetch_candidates() -> List[Dict[str, str]]:
    spreadsheet = load_sheet_records(CANDIDATE_SHEET_ID)
    records = []
    for ws in spreadsheet.worksheets():
        values = ws.get_all_values()
        if len(values) < 2:
            continue
        headers = values[0]
        df = pd.DataFrame(values[1:], columns=headers)
        for _, row in df.iterrows():
            row_dict = {header: str(value).strip() if value else "" for header, value in row.items()}
            if not any(row_dict.values()):
                continue
            record = extract_common_fields(row_dict)
            record["sheet_tab"] = ws.title
            records.append(record)
    return records


def fetch_interviews() -> List[Dict[str, str]]:
    spreadsheet = load_sheet_records(INTERVIEW_SHEET_ID)
    records = []
    for ws in spreadsheet.worksheets():
        values = ws.get_all_values()
        if len(values) < 2:
            continue
        headers = values[0]
        df = pd.DataFrame(values[1:], columns=headers)
        for _, row in df.iterrows():
            row_dict = {header: str(value).strip() if value else "" for header, value in row.items()}
            if not any(row_dict.values()):
                continue
            record = extract_interview_fields(row_dict)
            record["sheet_tab"] = ws.title
            records.append(record)
    return records


def summarize_candidates(records: List[Dict[str, str]]) -> Dict[str, int]:
    summary: Dict[str, int] = {}
    for record in records:
        tab = record.get("sheet_tab", "unknown")
        summary[tab] = summary.get(tab, 0) + 1
    return summary


def summarize_interviews(records: List[Dict[str, str]]) -> Dict[str, int]:
    summary: Dict[str, int] = {}
    for record in records:
        date = record.get("interview_date") or "unscheduled"
        summary[date] = summary.get(date, 0) + 1
    return summary


def validation_report(records: List[Dict[str, str]]) -> Dict[str, Dict[str, int]]:
    report: Dict[str, Dict[str, int]] = {}
    for record in records:
        tab = record.get("sheet_tab", "unknown")
        stats = report.setdefault(tab, {"missing_location": 0, "missing_phone": 0, "missing_email": 0})
        if not record.get("location"):
            stats["missing_location"] += 1
        if not record.get("phone"):
            stats["missing_phone"] += 1
        if not record.get("email"):
            stats["missing_email"] += 1
    return report


def load_notion_client() -> Client | None:
    token = os.environ.get("NOTION_API_TOKEN") or os.environ.get("NOTION_API_KEY")
    if not token:
        env_file = Path.home() / ".openclaw" / "workspace" / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("NOTION_API_TOKEN=") or line.startswith("NOTION_API_KEY="):
                    token = line.split("=", 1)[1].strip()
                    break
    if not token:
        return None
    return Client(auth=token, notion_version="2022-06-28")


def log_to_notion(total_candidates: int, interviews_upcoming: int, validation: Dict[str, Dict[str, int]]) -> None:
    client = load_notion_client()
    if not client:
        print("[warn] Notion token missing; skipping Notion log")
        return

    validation_notes = []
    for tab, stats in validation.items():
        parts = []
        if stats["missing_location"]:
            parts.append(f"loc:{stats['missing_location']}")
        if stats["missing_phone"]:
            parts.append(f"phone:{stats['missing_phone']}")
        if stats["missing_email"]:
            parts.append(f"mail:{stats['missing_email']}")
        if parts:
            validation_notes.append(f"{tab} ({', '.join(parts)})")
    validation_text = ", ".join(validation_notes) if validation_notes else "no missing critical fields"

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%MZ")
    text = (
        f"{timestamp} · Sheets ingest — candidates: {total_candidates}, upcoming interviews: {interviews_upcoming}. "
        f"Validation: {validation_text}."
    )
    client.blocks.children.append(
        block_id=NOTION_PAGE_ID,
        children=[
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [
                        {"type": "text", "text": {"content": text}}
                    ]
                },
            }
        ],
    )


def main() -> None:
    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    candidates = fetch_candidates()
    interviews = fetch_interviews()
    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "candidate_records": candidates,
        "interview_records": interviews,
        "candidate_summary": summarize_candidates(candidates),
        "interview_summary": summarize_interviews(interviews),
        "validation": validation_report(candidates),
    }
    CACHE_FILE.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {len(candidates)} candidate records and {len(interviews)} interview records to {CACHE_FILE}")
    upcoming = sum(1 for record in interviews if record.get("interview_date") not in ("", "unscheduled"))
    log_to_notion(len(candidates), upcoming, payload["validation"])


if __name__ == "__main__":
    main()
