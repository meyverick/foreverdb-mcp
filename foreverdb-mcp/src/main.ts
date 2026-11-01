#!/usr/bin/env bun

// CLI entrypoint: parse argv, resolve the key, start the stdio transport.
// MCP owns stdout, so every diagnostic here goes to stderr.

import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.ts";
import { DEFAULT_BASE_URL, normalizeKey, Upstream } from "./upstream.ts";
import { VERSION } from "./version.ts";

const HELP = `foreverdb - ForeverDB MCP server

Usage:
  foreverdb                   run the MCP server over stdio
  foreverdb --key <key>       supply the API key as an argument
  foreverdb --base-url <url>  override the API root (tests only)
  foreverdb --version, -V     print the version
  foreverdb --help, -h        print this help

Environment:
  FOREVERDB_API_KEY    ForeverDB API key. Ask for one at
                       https://foreverdb.net/join?next=%2Fdevelopers
  FOREVERDB_BASE_URL   API root; for tests only

--key wins over FOREVERDB_API_KEY when both are set. The environment is the
safer choice: arguments are visible in process listings.

Point your MCP client at the package runner:

  {
    "mcpServers": {
      "foreverdb": {
        "command": "bunx",
        "args": ["foreverdb-mcp", "--key", "fdb_your-key"]
      }
    }
  }

Credit ForeverDB.net with a link to https://foreverdb.net wherever you show
its data; the API revokes keys used without credit.
`;

interface Options {
  key?: string;
  baseUrl?: string;
}

async function main(argv: string[]): Promise<number> {
  let parsed: Options & { help?: boolean; version?: boolean };
  try {
    const { values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        key: { type: "string" },
        "base-url": { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "V" },
      },
    });
    parsed = {
      key: values.key,
      baseUrl: values["base-url"],
      help: values.help,
      version: values.version,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`foreverdb: ${detail} (try --help)`);
    return 1;
  }

  if (parsed.help === true) {
    process.stdout.write(HELP);
    return 0;
  }
  if (parsed.version === true) {
    process.stdout.write(`foreverdb ${VERSION}\n`);
    return 0;
  }

  const apiKey = normalizeKey(parsed.key) ?? normalizeKey(process.env.FOREVERDB_API_KEY);
  const baseUrl = parsed.baseUrl ?? process.env.FOREVERDB_BASE_URL ?? DEFAULT_BASE_URL;

  const upstream = new Upstream({ baseUrl, apiKey });
  if (apiKey === undefined) {
    console.error(
      "foreverdb: no API key: pass --key <value> or set FOREVERDB_API_KEY; tool calls will report it until one is set.",
    );
  }

  const server = createServer(upstream);
  await server.connect(new StdioServerTransport());
  return 0;
}

if (import.meta.main) {
  const code = await main(Bun.argv.slice(2));
  // The transport keeps the process alive while connected; only standalone
  // exits (help, version, bad argv) reach this point.
  if (code !== 0) process.exitCode = code;
}
