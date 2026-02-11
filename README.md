# INVARIANT System Code Schema

The canonical INVARIANT geometry now ships as a Cloudflare Worker. Reference 1 (filesystem layout) and Reference 2 (JSON/Zod envelope) are preserved exactly—only the deployment surface changed. The ACE gate, FLUIDINTEL execution, and invariant envelope rules all remain untouched.

## Repository layout

```
/ (repo root)
├── package.json            # root scripts: dev/build/deploy via Wrangler
├── tsconfig.json           # shared config for Worker + runtime modules
├── wrangler.toml           # Cloudflare Worker definition (editable)
├── worker/                 # Worker entry + adapters
│   ├── src/index.ts        # fetch handler exposing /pipeline, /fluidintel, /envelope
│   ├── src/runtime.ts      # canonical ACE/FLUIDINTEL behavior (schema validated)
│   └── src/llmClients.ts   # wraps Gemini / Perplexity / Claude using env secrets
├── functions/              # Reference-locked orchestration + schemas (not a Firebase app anymore)
│   └── src/
│       ├── index.ts        # immutable invariantPipeline + fluidintelExecute exports
│       ├── orchestration.ts# JSON envelope flow (VAR/TRUTH/FLUIDINTEL)
│       ├── schema.ts       # Zod definitions for meta/context/query/gates/etc.
│       ├── models.ts       # Shared TS interfaces
│       ├── llm_integrations.ts, business_integrations.ts, firestore_service.ts
│       └── secrets_service.ts (retained for future multi-platform integrations)
├── docs/                   # Null Prime corpus (protocols + prisms)
└── src/                    # Reserved for higher-level clients (empty for now)
└── ui/                     # Neon console (Vite + React) front-end for human ops
```

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Cloudflare credentials
- Create an API token with **Account → Workers Scripts (Edit/Read)** permissions (already done).
- Keep the token private. When running Wrangler locally you can either:
  ```bash
  export CLOUDFLARE_API_TOKEN="<token>"
  export CLOUDFLARE_ACCOUNT_ID="1ecd0bdf6fa115e7f6adc9850abc375c"
  ```
  or run `npx wrangler login` and follow the browser auth.

### 3. Provide runtime secrets
Cloudflare Workers expect environment variables for the LLM substrates:
- `GEMINI_API_KEY`
- `PERPLEXITY_API_KEY`
- `CLAUDE_API_KEY`
- (future) `RECRUITCRM_API_TOKEN`, `GOOGLE_SHEETS_SERVICE_ACCOUNT`, etc.

Set them via Wrangler once you’re ready:
```bash
npx wrangler secret put GEMINI_API_KEY
# repeat for the others
```

### 4. Build / develop / deploy
```bash
npm run build       # tsup bundles worker → dist/
npm run dev         # wrangler dev (local testing)
npm run deploy      # wrangler deploy (after you approve)
```
The default subdomain is `https://<worker-name>.proqruit.workers.dev`. Routes:
- `POST /pipeline` → ACE gate check
- `POST /fluidintel` → FLUIDINTEL execution placeholder
- `POST /envelope` → Full invariant envelope orchestration (VAR/TRUTH/FLUIDINTEL)

## Notes
- `worker/src/index.ts` injects LLM clients into `functions/src/orchestration.ts`, keeping that module platform-agnostic.
- The `schema_checksum` field is still shape-validated only; wire it to a SHA-256 oracle when available.
- Business-system adapters (`business_integrations.ts`, `firestore_service.ts`) remain as placeholders for future connectors (RecruitCRM, Sheets, etc.).
- Do **not** modify the ACE/FLUIDINTEL implementations unless the Notion references change. All new behavior should live in wrappers or separate modules.

## Neural console UI (chrome/mobile friendly)
A neon “Neural Gate Console” now lives in `/ui` (Vite + React). It gives you a chatbox-like interface with:
- Endpoint presets (`/pipeline`, `/fluidintel`, `/envelope`).
- Employee code + password inputs with tier selection (headers: `X-Employee-Code`, `X-User-Password`, `X-Access-Tier`). Credentials optionally persist in localStorage.
- Optional bearer token header.
- Role-aware personas (candidate, client, recruiter, founder, admin) with tier-specific UI + guardrails.
- Dry-humor security gate: after 3 failed attempts users are asked to email medulla@proqruit.com.
- Message composer that syncs into the canonical JSON envelope editor (hidden for visitor tiers).
- Activity log + response viewer (suppressed for public lanes).
- Placeholder “future integration” buttons (RecruitCRM, Sheets, multi-LLM mesh) ready for wiring hooks later.

### Run locally
```bash
cd ui
npm install        # first run
npm run dev        # opens http://localhost:5173 (use --host for LAN/mobile tests)
```
Use the “Worker endpoint” input to point at any deployment (default is `https://invariant-worker.proqruit.workers.dev`).

### Build & ship to Cloudflare Pages
1. `cd ui && npm run build` → emits static assets in `ui/dist`.
2. Either:
   - **Pages (recommended):** In the Cloudflare dashboard, create a Pages project pointing to this repo. Build command `npm run build`, output directory `ui/dist`, root directory `ui`.
   - **Manual hosting:** Serve `ui/dist` from any static host.
3. The UI talks directly to the Worker; no extra secrets are needed in the front-end.

> ⚠️ Access credentials are stored only in the browser (localStorage). Do not enable persistence on shared devices.

The repo is now ready for Cloudflare deployment while remaining faithful to the INVARIANT governance geometry. Review and authorize before running `npm run deploy`.
