#!/bin/sh
# End-to-end check for scripts/install.sh against a fake local release.
set -eu

here=$(unset CDPATH; cd -- "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
server=""
cleanup() {
    if [ -n "$server" ]; then
        kill "$server" 2>/dev/null || true
        wait "$server" 2>/dev/null || true
    fi
    rm -rf "$tmp"
}
trap cleanup EXIT

case "$(uname -sm)" in
"Darwin arm64") target="aarch64-apple-darwin" ;;
"Darwin x86_64") target="x86_64-apple-darwin" ;;
"Linux x86_64") target="x86_64-unknown-linux-gnu" ;;
"Linux aarch64") target="aarch64-unknown-linux-gnu" ;;
*)
    echo "install_test: unsupported host, skipping"
    exit 0
    ;;
esac

name="foreverdb-mcp-$target"
mkdir -p "$tmp/$name"
printf '#!/bin/sh\necho fake-foreverdb\n' >"$tmp/$name/foreverdb"
chmod 755 "$tmp/$name/foreverdb"
tar -C "$tmp" -czf "$tmp/$name.tgz" "$name"
(cd "$tmp" && shasum -a 256 "$name.tgz" >SHA256SUMS)

port=$(python3 -c 'import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()')
python3 -m http.server --bind 127.0.0.1 --directory "$tmp" "$port" \
    >/dev/null 2>&1 &
server=$!
sleep 1

FOREVERDB_BASE_URL="http://127.0.0.1:$port" \
    FOREVERDB_BIN_DIR="$tmp/bin" \
    sh "$here/scripts/install.sh" >"$tmp/out.txt"

test -x "$tmp/bin/foreverdb"
"$tmp/bin/foreverdb" | grep -q fake-foreverdb
grep -q "foreverdb" "$tmp/out.txt"
grep -q '"command"' "$tmp/out.txt"

echo "install_test: OK ($target)"
