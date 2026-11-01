#!/usr/bin/env bash
# Push local main to github.com/elnojj/CRB_NJR_26 (Google AI Studio).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required (fine-grained PAT: Contents read/write on elnojj/CRB_NJR_26)." >&2
  exit 1
fi

REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/elnojj/CRB_NJR_26.git"
CLEAN_URL="https://github.com/elnojj/CRB_NJR_26.git"
EXPECTED="$(git rev-parse main)"

cleanup() {
  git remote set-url github "$CLEAN_URL" 2>/dev/null || true
  unset GH_TOKEN GITHUB_TOKEN || true
}
trap cleanup EXIT

git remote get-url github >/dev/null 2>&1 || git remote add github "$CLEAN_URL"
git remote set-url github "$REMOTE_URL"

export GIT_TERMINAL_PROMPT=0
export GITHUB_TOKEN="$GH_TOKEN"

# Identity probe (no token printed)
gh api user --jq .login >/dev/null
gh api repos/elnojj/CRB_NJR_26 --jq .permissions.push | grep -qx true

# Fast-forward first; lease-force if histories diverged
if ! git push github main:main 2> >(tee /tmp/aistudio-push.err >&2); then
  if grep -qiE 'non-fast-forward|fetch first|rejected' /tmp/aistudio-push.err; then
    git push --force-with-lease=main:$(git ls-remote "$REMOTE_URL" refs/heads/main | awk '{print $1}') github main:main
  else
    exit 1
  fi
fi

git remote set-url github "$CLEAN_URL"
ACTUAL="$(git ls-remote "$CLEAN_URL" refs/heads/main | awk '{print $1}')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "GitHub main is $ACTUAL, expected $EXPECTED" >&2
  exit 1
fi
echo "AI Studio GitHub main -> $ACTUAL"
