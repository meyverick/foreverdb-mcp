# Installs the foreverdb MCP server for Windows from GitHub releases.
# Usage: irm .../scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"

$repo = if ($env:FOREVERDB_REPO) {
    $env:FOREVERDB_REPO
} else {
    "meyverick/foreverdb-mcp"
}
$base = "https://github.com/$repo/releases/latest/download"

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
switch ($arch) {
    "X64" { $target = "x86_64-pc-windows-msvc" }
    default {
        throw "foreverdb: unsupported Windows architecture: $arch. " +
            "Build from source with 'cargo install foreverdb-mcp'."
    }
}

$asset = "foreverdb-mcp-$target.zip"
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("foreverdb-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
    $zip = Join-Path $tmp $asset
    $sums = Join-Path $tmp "SHA256SUMS"
    Invoke-WebRequest "$base/$asset" -OutFile $zip
    Invoke-WebRequest "$base/SHA256SUMS" -OutFile $sums

    $pattern = "\s$([regex]::Escape($asset))$"
    $line = Get-Content $sums | Where-Object { $_ -match $pattern } | Select-Object -First 1
    if (-not $line) { throw "foreverdb: no checksum published for $asset" }
    $want = ($line -split "\s+")[0].ToLower()
    $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($got -ne $want) { throw "foreverdb: checksum mismatch for $asset" }

    Expand-Archive -Path $zip -DestinationPath $tmp
    $dest = Join-Path $env:LOCALAPPDATA "Programs\foreverdb"
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $exe = Join-Path $dest "foreverdb.exe"
    Copy-Item (Join-Path $tmp "foreverdb-mcp-$target\foreverdb.exe") $exe -Force

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$dest*") {
        [Environment]::SetEnvironmentVariable(
            "Path", "$userPath;$dest", "User"
        )
        Write-Host "foreverdb: added $dest to your user PATH (restart the client)"
    }

    Write-Host "foreverdb: installed $exe ($target)"
    Write-Host ""
    Write-Host "Add to your MCP client config:"
    Write-Host ""
    Write-Host "{"
    Write-Host '  "mcpServers": {'
    Write-Host '    "foreverdb": {'
    Write-Host "      `"command`": `"$($exe -replace '\\', '\\')`","
    Write-Host '      "env": { "FOREVERDB_API_KEY": "fdb_your-key" }'
    Write-Host "    }"
    Write-Host "  }"
    Write-Host "}"
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
