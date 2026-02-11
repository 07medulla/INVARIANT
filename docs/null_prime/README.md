# Null Prime Corpus

This directory mirrors the governing corpus of Null Prime (formerly ACE):

- `protocols/` – Protocol Zero plus Protocols 1-11. Each file is a verbatim transcript of the authoritative text from the secured ACE archive. Formatting, equations, and glyphs are preserved; do not edit in-place. Proposed changes must originate from the owner-only source and pass ARC review.
- `prisms/` – Reserved for the Micro Prism Structure (SDL → CCL). These documents remain patent-sensitive and are not yet mirrored here; only derived interfaces will be added after owner approval.

When extending the runtime, import definitions from `src/null_prime/protocols` rather than parsing the raw documents directly. This keeps executable code in sync with the authenticated corpus.

## Micro Prism Structure (SDL → CCL)

The twelve micro prisms (Structural Drift Lock through CCL) are mirrored in `docs/null_prime/prisms/` for reference. These files are **patent-sensitive** and inherit the owner-only policy: do not edit in place, distribute, or quote outside secured channels. Any code referencing prism logic must do so through the typed interfaces in `src/null_prime/prisms/` to preserve confidentiality and ensure gating runs in the correct order.
