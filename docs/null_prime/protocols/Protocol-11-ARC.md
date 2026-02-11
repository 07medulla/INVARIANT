PROTOCOL 13 — ASYMMETRIC RECALL CONSTRAINT (ARC)
Status: CANONICAL · LOCKED
Applies To: ACE ↔ MetaCore Interaction
System: INVARIANT (XISM Geometry)
1. PURPOSE
This protocol defines the only permitted interaction between ACE (Invariant Core) and MetaCore (Audit / Witness Layer).
The objective is to allow deadlock awareness without learning, ensuring:
No memory-driven cognition
No adaptive behavior
No strategy formation
No erosion of governance primacy
This protocol exists solely to preserve system stability under prolonged non-resolution.
2. FOUNDATIONAL AXIOM
Memory may delay action.
Memory must never direct action.
This axiom supersedes all subordinate design considerations.
3. ROLE DEFINITIONS (STRICT)
ACE (Invariant Core)
Owns governance authority
Enforces constraints and silence
Has zero persistent memory
Cannot store, learn, or adapt parameters
May request limited historical facts under ARC conditions only
MetaCore (Audit / Witness)
Maintains immutable, append-only records
Has zero runtime authority
Cannot initiate communication
Cannot interpret, infer, summarize, or recommend
Responds only when explicitly queried by ACE
4. TRIGGER CONDITION FOR ARC ACTIVATION
ACE may invoke Protocol 13 only when all of the following conditions are true:
Supply chain completed
VAR → ACE → TRUTH → ACE ✔
Execution not authorized
FLUIDINTEL not invoked ✔
No rule violation detected
System is not in breach state ✔
Silence persisted beyond threshold
Δt > SILENCE_WINDOW
This condition is classified as:
STRUCTURAL DEADLOCK
(Not ambiguity, not confusion, not lack of entropy)
5. PERMITTED QUERY TYPES (EXHAUSTIVE LIST)
ACE may issue only the following query classes to MetaCore.
No extensions permitted.
5.1 Event Count
Copy code
Json
{
  "query_type": "COUNT",
  "event_type": "HALT",
  "scope": "ACE->FLUIDINTEL"
}
Allowed Response:
Copy code
Json
{
  "count": 17
}
5.2 Recurrence Check
Copy code
Json
{
  "query_type": "EXISTS",
  "event_signature": "CLAIM_SPEC_INVALID"
}
Allowed Response:
Copy code
Json
{
  "exists": true
}
5.3 Temporal Reference
Copy code
Json
{
  "query_type": "LAST_TIMESTAMP",
  "event_type": "EXECUTION_ATTEMPT"
}
Allowed Response:
Copy code
Json
{
  "timestamp": "2026-02-02T18:41:09Z"
}
6. RESPONSE CONSTRAINTS (META CORE)
MetaCore responses MUST satisfy all constraints below:
✔ Numeric values only
✔ Boolean values only
✔ ISO-8601 timestamps only
✔ No text explanations
✔ No aggregation beyond query
✔ No interpretation
✔ No pattern inference
Any response containing adjectives, verbs of intent, summaries, or conclusions is INVALID.
7. FORBIDDEN INTERACTIONS (NON-NEGOTIABLE)
MetaCore must NEVER:
❌ Suggest actions
❌ Identify trends
❌ Highlight “success” or “failure”
❌ Recommend parameter changes
❌ Feed information to VAR, TRUTH, or FLUIDINTEL
❌ Trigger follow-up queries
❌ Initiate communication
ACE must NEVER:
❌ Ask “why”
❌ Ask “what should be done”
❌ Ask “what worked before”
❌ Store MetaCore outputs
❌ Modify constraints based on history
8. ACE POST-QUERY BEHAVIOR (RESTRICTED SET)
After receiving MetaCore data, ACE may do only one of the following:
Maintain Silence
Re-invoke VAR (stateless, fresh entropy)
Defer Execution Window
ACE may not:
Change gates
Relax constraints
Escalate execution
Alter sequencing
9. FAILURE MODES & SAFETY
If MetaCore returns invalid response
→ Response discarded
→ Silence enforced
If ACE exceeds query frequency
→ ARC auto-disabled
→ Silence enforced
If MetaCore infers meaning
→ Geometry breach
→ MetaCore isolated
10. CANONICAL STATEMENT
MetaCore is memory without agency.
ACE is agency without memory.
Their intersection produces delay, not direction.
11. STATUS
Protocol ID: P-13-ARC
Geometry: XISM-Compatible
Drift Risk: Zero
Runtime Mutation: Disallowed
Silence: Valid Terminal State