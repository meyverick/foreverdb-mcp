#!/bin/sh
# Installs the foreverdb MCP server for macOS or Linux from GitHub releases.
# Usage: curl -fsSL .../scripts/install.sh | sh
set -eu

repo="${FOREVERDB_REPO:-meyverick/foreverdb-mcp}"
# FOREVERDB_BASE_URL exists so scripts/install_test.sh can serve a fake release.
base="${FOREVERDB_BASE_URL:-https://github.com/${repo}/releases/latest/download}"

os="$(uname -s)"
machine="$(uname -m)"

case "$os" in
Darwin)
    case "$machine" in
    arm64 | aarch64) target="aarch64-apple-darwin" ;;
    x86_64) target="x86_64-apple-darwin" ;;
    *)
        echo "foreverdb: unsupported macOS architecture: $machine" >&2
        exit 1
        ;;
    esac
    ;;
Linux)
    case "$machine" in
    x86_64 | amd64) target="x86_64-unknown-linux-gnu" ;;
    aarch64 | arm64) target="aarch64-unknown-linux-gnu" ;;
    *)
        echo "foreverdb: unsupported Linux architecture: $machine" >&2
        echo "foreverdb: build from source with 'cargo install foreverdb-mcp'" >&2
        exit 1
        ;;
    esac
    ;;
*)
    echo "foreverdb: unsupported OS: $os" >&2
    echo "foreverdb: on Windows run scripts/install.ps1 instead" >&2
    exit 1
    ;;
esac

asset="foreverdb-mcp-${target}.tgz"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "$base/$asset" -o "$tmp/$asset"
curl -fsSL "$base/SHA256SUMS" -o "$tmp/SHA256SUMS"

awk -v want="$asset" '$2 == want' "$tmp/SHA256SUMS" >"$tmp/sums"
if [ ! -s "$tmp/sums" ]; then
    echo "foreverdb: no checksum published for $asset" >&2
    exit 1
fi
if command -v sha256sum >/dev/null 2>&1; then
    (cd "$tmp" && sha256sum -c sums) >/dev/null
else
    (cd "$tmp" && shasum -a 256 -c sums) >/dev/null
fi

tar -C "$tmp" -xzf "$tmp/$asset"

dest="${FOREVERDB_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$dest"
install -m 755 "$tmp/foreverdb-mcp-$target/foreverdb" "$dest/foreverdb"

echo "foreverdb: installed $dest/foreverdb ($target)"
case ":$PATH:" in
*":$dest:"*) ;;
*)
    echo "foreverdb: $dest is not on this shell's PATH."
    echo "           add: export PATH=\"$dest:\$PATH\""
    ;;
esac

cat <<EOF

Add to your MCP client config, using the absolute path because GUI
clients do not inherit your shell PATH:

{
  "mcpServers": {
    "foreverdb": {
      "command": "$dest/foreverdb",
      "env": { "FOREVERDB_API_KEY": "fdb_your-key" }
    }
  }
}
EOF
