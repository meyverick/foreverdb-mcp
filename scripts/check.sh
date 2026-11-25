#!/usr/bin/env bash
# Codebase Submodule Pre-Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"
PKG="foreverdb-mcp"

# Slot 1: Format, lint and type checking
echo "== 1/6 format, lint, types =="
(cd "$PKG" && bun install --frozen-lockfile)
echo "  lockfile: OK"
(cd "$PKG" && bunx biome check .)
echo "  format + lint: OK"
(cd "$PKG" && bunx tsc --noEmit)
echo "  types: OK"

# Slot 2: Unit and integration tests
echo "== 2/6 tests =="
(cd "$PKG" && bun test)
echo "  tests: OK"

# Slot 3: Bundle verification
echo "== 3/6 bundle =="
(cd "$PKG" && bun build src/main.ts --target=bun --outdir=/tmp/foreverdb-mcp-build >/dev/null)
echo "  bundle: OK"

# Slot 4: Tracked assets and documentation
echo "== 4/6 tracked assets and documentation =="
untracked_leaks="$(git ls-files --others --exclude-standard | grep -iE '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*)$' || true)"
if [ -n "$untracked_leaks" ]; then
    echo "$untracked_leaks" | sed 's/^/  X sensitive untracked: /'
    echo "FAIL: sensitive untracked files found"
    exit 1
fi
echo "  asset tracking: OK"

# Documentation topology: spotlight READMEs stay non-technical, wiki tiers exist.
docs_fail=0
while IFS= read -r readme; do
    if grep -qE '^[[:space:]]*```' "$readme"; then
        echo "  X $readme has fenced code blocks (spotlight must stay non-technical)"
        docs_fail=1
    fi
done < <(git ls-files '*README.md')
for page in wiki/index.md wiki/01-getting-started.md wiki/02-guides-and-workflows.md \
    wiki/03-architecture-and-internals.md wiki/04-mastery-and-extension.md; do
    if [ ! -f "$page" ]; then
        echo "  X missing wiki page: $page"
        docs_fail=1
    fi
done
if [ ! -d wiki/adr ] || [ -z "$(ls wiki/adr/*.md 2>/dev/null)" ]; then
    echo "  X wiki/adr holds no architecture decision records"
    docs_fail=1
fi
if ! grep -q 'okf_version: "0.2"' wiki/index.md 2>/dev/null; then
    echo "  X wiki/index.md lacks OKF v0.2 frontmatter"
    docs_fail=1
fi
if [ "$docs_fail" -ne 0 ]; then
    echo "FAIL: documentation topology is incomplete"
    exit 1
fi
echo "  docs topology: OK"

# --- Fast Loop Exit Boundary ---
if [ "$QUICK" = "--quick" ]; then
    echo "fast checks passed; clean-clone and smoke tests skipped (--quick)"
    exit 0
fi

# Slot 5: Hermetic clean-clone sandbox
echo "== 5/6 clean-clone sandbox =="
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone -q . "$tmp/clone"
(
    cd "$tmp/clone/$PKG"
    [ -f "README.md" ] || { echo "FAIL: README.md missing in clean clone"; exit 1; }
    bun install --frozen-lockfile >/dev/null
    bunx tsc --noEmit
    bun test >/dev/null
)
echo "clean clone installs, typechecks and tests: OK"

# Slot 6: Smoke / runtime test
echo "== 6/6 smoke / runtime test =="
initialize='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}'
reply="$(printf '%s\n' "$initialize" | (cd "$PKG" && FOREVERDB_API_KEY=smoke bun src/main.ts) 2>/dev/null | head -n 1)"
case "$reply" in
    *'"serverInfo":{"name":"foreverdb"'*) ;;
    *) echo "FAIL: unexpected initialize reply: $reply"; exit 1 ;;
esac
echo "smoke test: OK"

echo "lane: OK"
