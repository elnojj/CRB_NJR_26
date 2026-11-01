# Agent notes — CEREBRO / CRB_NJR_26

## Standing sync rule (AI Studio)

**Always publish `main` to Google AI Studio’s GitHub remote.**

- Target: `https://github.com/elnojj/CRB_NJR_26.git` branch `main`
- AI Studio pulls from that GitHub `main` tip — Origin-only pushes do not appear in Studio (“Nothing to pull”).
- After every commit meant for the user / Studio: push Origin **and** GitHub `main`.
- Prefer: `./scripts/sync-aistudio-main.sh` (requires `GH_TOKEN`).
- Histories may diverge; use `git push --force-with-lease github main:main` when a normal fast-forward is rejected, then scrub any token from the remote URL.
- Never paste PATs into chat or leave them in `git remote -v`. Use the `GH_TOKEN` environment secret.

## Remotes

| Remote  | Purpose                                      |
|---------|----------------------------------------------|
| `origin`| Cursor Origin (writable with cloud token)    |
| `github`| `elnojj/CRB_NJR_26` — AI Studio + Firebase CI |
