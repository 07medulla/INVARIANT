# Airtable Status Logging Schema

Base: `Simple applicant tracker` (`appqmq2ixVM7antHF`)

## New Table: `Status Logs`

| Field Name        | Type               | Notes |
|-------------------|--------------------|-------|
| `Recruiter`       | Linked record       | Link to `Interviewers` (or new `Recruiters` table if preferred). Marks quien triggered the status change. |
| `Action`          | Single select       | Options: `Login`, `Logout`, `Break start`, `Break end`, `Away`, `Return`. |
| `Timestamp`       | Created time        | Auto, captures exact submission time. |
| `Channel`         | Single select       | (Optional) `Airtable`, `WhatsApp`, `CLI` to show origin. |
| `Notes`           | Long text           | Optional comment (reason for break, etc.). |
| `Active flag`     | Formula             | `IF(Action = 'Login', 1, IF(Action = 'Logout', -1, 0))` for aggregates. |

## Interface Button Blueprint

1. Create an Interface (e.g., `Recruiter Console`).
2. Add buttons for each action:
   - Button `Start shift`: creates a record with Action=`Login`, Channel=`Interface`.
   - Button `End shift`: Action=`Logout`.
   - Button `Break start`: Action=`Break start`.
   - Button `Break end`: Action=`Break end`.
3. Interface filters `Recruiter` defaults to the logged-in user. Each button auto-fills their name.

## Automation idea

Trigger: `When a record is created in Status Logs`.
Actions:
1. `Update record` on Recruiters table to set `last_status` and `last_action_time`.
2. Optional: send Slack/Email if `Login` occurs after a threshold or if `Logout` missing.

## Monitoring

- Create views:
  - `Currently Active`: filter `Status Logs` to latest record per recruiter with action in {Login, Break end} and no later Logout.
  - `Overdue Logout`: triggers when last action was Login more than N hours ago.
- Extend ingestion script (`airtable_ingest.py`) to pull Status Logs table for daily summaries.

## Identified Gaps from Architecture Probing
(Use this section to track unresolved risks)
- Need property-based/invariant tests proving "no token → no execution".
- Biggest risk: dependency fragility (Sheets/Airtable). Mitigation plan required.
- Pure deterministic tests for ACE (LLM-free) to ensure governance isolation.
- Declare optimization priorities (correctness/auditability > latency) in README.
