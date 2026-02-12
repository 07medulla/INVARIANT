#!/usr/bin/env python3
"""Normalize Airtable Applicants data to match Sheets schema."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List

import requests

BASE_ID = "appqmq2ixVM7antHF"
TABLE_ID = "tblpdl8tBk8jHOElr"  # "Applicants" table
TOKEN_PATH = Path.home() / ".openclaw" / "workspace" / "creds" / "airtable_token"
CACHE_PATH = Path(__file__).resolve().parent.parent / "cache"
CACHE_FILE = CACHE_PATH / "airtable_applicants.json"


def load_token() -> str:
    token = TOKEN_PATH.read_text().strip()
    if not token:
        raise RuntimeError("Airtable token missing")
    return token


def normalize_record(record: Dict[str, str]) -> Dict[str, str]:
    fields = record.get("fields", {})
    data = {
        "id": record.get("id"),
        "name": fields.get("Name", ""),
        "stage": fields.get("Stage", ""),
        "applying_for": fields.get("Applying for", []),
        "email": fields.get("Email address", ""),
        "phone": fields.get("Phone", ""),
        "phone_interview_date": fields.get("Phone interview", ""),
        "phone_interviewer": fields.get("Phone interviewer", []),
        "phone_score": fields.get("Phone interview score", ""),
        "phone_notes": fields.get("Phone interview notes", ""),
        "onsite_date": fields.get("Onsite interview", ""),
        "onsite_interviewer": fields.get("Onsite interviewer", []),
        "onsite_score": fields.get("Onsite interview score", ""),
        "onsite_notes": fields.get("Onsite interview notes", ""),
        "attachments": fields.get("Attachments", []),
    }
    return data


def fetch_applicants() -> List[Dict[str, str]]:
    token = load_token()
    headers = {"Authorization": f"Bearer {token}"}
    records: List[Dict[str, str]] = []
    offset = None
    while True:
        params = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()
        payload = resp.json()
        for record in payload.get("records", []):
            records.append(normalize_record(record))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def main() -> None:
    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    records = fetch_applicants()
    CACHE_FILE.write_text(json.dumps({"records": records}, indent=2))
    print(f"Fetched {len(records)} applicants from Airtable -> {CACHE_FILE}")


if __name__ == "__main__":
    main()
