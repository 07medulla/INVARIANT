# INVARIANT System Code Schema

This repository implements the canonical INVARIANT geometry in a GitHub-friendly layout. It adapts the Firebase Studio blueprint documented in Notion (Reference 1) and the JSON/Zod envelope specification (Reference 2) without changing the system intent:

- **ACE gate** and **FLUIDINTEL execution** remain the immutable Cloud Functions defined in `functions/src/index.ts`.
- **Invariant envelopes** (VAR → TRUTH → ACE → FLUIDINTEL) are enforced through the Zod schemas in `functions/src/schema.ts` and orchestrated in `functions/src/orchestration.ts`.
- **Audit, silence, and geometry constraints** are embedded at every layer.

## Repository layout

```
/ (repo root)
├── .firebaserc                  # Firebase alias placeholder
├── firebase.json                # Functions + hosting configuration
├── firestore.rules              # Canonical Firestore security rules
├── firestore.indexes.json       # Index placeholder
├── hosting/                     # Minimal console for envelope testing
│   ├── index.html
│   ├── style.css
│   └── script.ts
├── functions/
│   ├── package.json             # Node 20 + Firebase Functions deps
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # invariantPipeline + fluidintelExecute + router
│       ├── orchestration.ts     # Reference‑2 JSON envelope handling
│       ├── schema.ts            # Zod definitions for every envelope block
│       ├── models.ts            # Shared TypeScript interfaces
│       ├── llm_integrations.ts  # Gemini / Perplexity / Claude wrappers
│       ├── business_integrations.ts # RecruitCRM + Sheets placeholders
│       ├── firestore_service.ts # Structured Firestore helpers
│       └── secrets_service.ts   # Secret Manager + env fallback
├── docs/                        # Reserved for architecture notes
└── src/                         # Reserved for future clients/libraries
```

## Getting started

1. **Install deps**
   ```bash
   cd functions
   npm install
   ```

2. **Configure secrets**
   - In Firebase: store LLM/API tokens in Secret Manager (`GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `CLAUDE_API_KEY`, `RECRUITCRM_API_TOKEN`, etc.).
   - For local development you can export env vars with the same names.

3. **Deploy / emulate**
   ```bash
   npm run build
   firebase deploy --only functions
   # or
   firebase emulators:start --only functions
   ```

4. **Test the envelope**
   - `firebase serve --only hosting` (or deploy hosting) and open the console UI.
   - POST envelopes directly to the function: `functions/src/index.ts` exposes `invariantEnvelopeHandler` at `/invariantEnvelopeHandler`.

## Notes

- The `schema_checksum` field expects a SHA‑256 hash; the orchestrator currently validates shape only. Wire this to your checksum oracle when available.
- `llm_integrations.ts` and `business_integrations.ts` ship with placeholders. Add the production adapters—but keep the substrate separation intact (no runtime role blending).
- `invariantPipeline` and `fluidintelExecute` must remain unchanged unless the Notion reference is updated—only wrappers/orchestration layers should evolve.

The repository is now ready to accept additional modules (Notion sync, RecruitCRM jobs, etc.) while staying faithful to the locked architecture. Commit changes as you iterate so the GitHub project mirrors the canonical blueprint.
