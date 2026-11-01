// Launch contract: the key comes from `--key` or the environment, argv wins,
// a blank value counts as absent, and the informational flags exit cleanly
// without opening a transport.

import { describe, expect, test } from "bun:test";

import { openSession } from "./harness.ts";

function stub() {
  const keys: Array<string | null> = [];
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      keys.push(request.headers.get("X-API-Key"));
      return Response.json({ data: [], meta: {} });
    },
  });
  return { server, keys, baseUrl: `http://127.0.0.1:${server.port}/api/v1` };
}

function callMeta(session: ReturnType<typeof openSession>) {
  return session.request("tools/call", { name: "fdb_meta", arguments: {} }) as Promise<{
    result: { content: Array<{ text: string }>; isError?: boolean };
  }>;
}

describe("launch flags", () => {
  test("--version and --help exit 0 without a transport or a key", () => {
    const version = Bun.spawnSync(["bun", "src/main.ts", "--version"], {
      env: { ...Bun.env, FOREVERDB_API_KEY: undefined },
    });
    expect(version.exitCode).toBe(0);
    expect(version.stdout.toString()).toMatch(/^foreverdb \d+\.\d+\.\d+\n$/);

    const help = Bun.spawnSync(["bun", "src/main.ts", "--help"], {
      env: { ...Bun.env, FOREVERDB_API_KEY: undefined },
    });
    expect(help.exitCode).toBe(0);
    expect(help.stdout.toString()).toContain("Usage:");
    expect(help.stdout.toString()).toContain("--key");
  });

  test("an unknown argument exits non-zero without a transport", () => {
    const bad = Bun.spawnSync(["bun", "src/main.ts", "--nope"], {
      env: { ...Bun.env, FOREVERDB_API_KEY: undefined },
    });
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr.toString()).toContain("--nope");
  });

  test("--key wins over the environment", async () => {
    const { server, keys, baseUrl } = stub();
    const session = openSession(["--key", "fdb_from_argv", "--base-url", baseUrl], {
      FOREVERDB_API_KEY: "fdb_from_env",
    });
    try {
      await session.initialize();
      await callMeta(session);
      expect(keys).toEqual(["fdb_from_argv"]);
    } finally {
      session.stop();
      server.stop(true);
    }
  }, 30_000);

  test("a blank --key counts as absent and the environment is used", async () => {
    const { server, keys, baseUrl } = stub();
    const session = openSession(["--key", "   ", "--base-url", baseUrl], {
      FOREVERDB_API_KEY: "fdb_from_env",
    });
    try {
      await session.initialize();
      await callMeta(session);
      expect(keys).toEqual(["fdb_from_env"]);
    } finally {
      session.stop();
      server.stop(true);
    }
  }, 30_000);

  test("no key at all reports both supply paths and makes no request", async () => {
    const { server, keys, baseUrl } = stub();
    const session = openSession(["--key", "", "--base-url", baseUrl], {
      FOREVERDB_API_KEY: undefined,
    });
    try {
      await session.initialize();
      const reply = await callMeta(session);
      expect(reply.result.isError).toBe(true);
      const text = reply.result.content[0]?.text ?? "";
      expect(text).toContain("--key");
      expect(text).toContain("FOREVERDB_API_KEY");
      expect(keys.length).toBe(0);
    } finally {
      session.stop();
      server.stop(true);
    }
  }, 30_000);
});
