// stdout belongs to the protocol. A stray `console.log` corrupts the handshake
// silently, so this test spawns the real entrypoint and inspects both streams.

import { describe, expect, test } from "bun:test";

const ENTRY = "src/main.ts";

const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1" },
  },
});

const LIST_TOOLS = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

interface Run {
  stdout: string;
  stderr: string;
  code: number;
}

async function runServer(frames: string[], env: Record<string, string | undefined>): Promise<Run> {
  const proc = Bun.spawn(["bun", ENTRY], {
    cwd: `${import.meta.dir}/..`,
    stdin: new Blob([`${frames.join("\n")}\n`]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...Bun.env, ...env },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

describe("stdio discipline", () => {
  test("stdout carries only JSON-RPC replies", async () => {
    const run = await runServer([INITIALIZE, LIST_TOOLS], { FOREVERDB_API_KEY: "fdb_smoke" });
    const emitted = lines(run.stdout);
    expect(emitted.length).toBeGreaterThanOrEqual(2);
    for (const line of emitted) {
      const frame = JSON.parse(line) as { jsonrpc?: string };
      expect(frame.jsonrpc, `non-protocol line on stdout: ${line}`).toBe("2.0");
    }
    const init = JSON.parse(emitted[0] as string) as {
      result: { serverInfo: { name: string } };
    };
    expect(init.result.serverInfo.name).toBe("foreverdb");
  }, 30_000);

  test("diagnostics go to stderr, never stdout", async () => {
    const run = await runServer([INITIALIZE, LIST_TOOLS], { FOREVERDB_API_KEY: undefined });
    for (const line of lines(run.stdout)) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(run.stderr).toContain("FOREVERDB_API_KEY");
    expect(run.stdout).not.toContain("FOREVERDB_API_KEY");
  }, 30_000);

  test("--version exits 0 without opening the transport", async () => {
    const version = Bun.spawnSync(["bun", ENTRY, "--version"], { cwd: `${import.meta.dir}/..` });
    expect(version.exitCode).toBe(0);
    expect(version.stdout.toString()).toMatch(/^foreverdb \d+\.\d+\.\d+\n$/);
  }, 30_000);
});
