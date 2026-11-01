// Tool surface contract: exactly fifteen tools, every call through one `run`
// path, attribution on data, the documented error document on failure, and one
// wide event per call labelled with the tool that was actually invoked.

import { afterEach, describe, expect, test } from "bun:test";

import { ATTRIBUTION, run, TOOLS } from "../src/server.ts";
import { cacheKeyOf, urlOf } from "../src/target.ts";
import { Upstream } from "../src/upstream.ts";
import { openSession, type Session } from "./harness.ts";
import {
  BASE_URL,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
  URL_CASES,
} from "./parity.fixtures.ts";

const BODY = '{"data":[{"id":19019}],"meta":{"build":"1.15.0","total":1}}';

interface Hit {
  path: string;
  apiKey: string | null;
}

function stub(handler?: (hit: Hit) => Response) {
  const hits: Hit[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      const hit = {
        path: `${url.pathname}${url.search}`,
        apiKey: request.headers.get("X-API-Key"),
      };
      hits.push(hit);
      return handler ? handler(hit) : Response.json(JSON.parse(BODY));
    },
  });
  return { server, hits, baseUrl: `http://127.0.0.1:${server.port}/api/v1` };
}

/** The first fixture route for a tool, which is also its arguments. */
function firstCase(tool: string) {
  const entry = URL_CASES.find((candidate) => candidate.tool === tool);
  if (entry === undefined) throw new Error(`no fixture for ${tool}`);
  return entry;
}

describe("tools/list", () => {
  let session: Session | undefined;
  afterEach(() => session?.stop());

  test("serves exactly the fifteen domain tools with fixture schemas", async () => {
    session = openSession(["--key", "fdb_test"]);
    await session.initialize();
    const reply = (await session.request("tools/list")) as {
      result: { tools: Array<{ name: string; description: string; inputSchema: unknown }> };
    };
    const tools = reply.result.tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual(Object.keys(TOOL_DESCRIPTIONS).sort());

    for (const tool of tools) {
      expect(tool.description, tool.name).toBe(TOOL_DESCRIPTIONS[tool.name] ?? "");
      const schema = tool.inputSchema as { properties?: Record<string, unknown> };
      expect(Object.keys(schema.properties ?? {}), tool.name).toEqual(
        TOOL_PARAMETERS[tool.name] ?? [],
      );
    }
  }, 30_000);

  test("reports the server name the spec names", async () => {
    session = openSession(["--key", "fdb_test"]);
    const reply = (await session.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    })) as { result: { serverInfo: { name: string } } };
    expect(reply.result.serverInfo.name).toBe(SERVER_NAME);
  }, 30_000);
});

describe("run path", () => {
  test("routes and labels every tool with its own name", async () => {
    const { server, hits, baseUrl } = stub();
    const events: Array<Record<string, unknown>> = [];
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_test", perMinute: 600_000 });
    try {
      for (const tool of TOOLS) {
        const entry = firstCase(tool.name);
        const result = await run(tool, entry.args, upstream, (event) => events.push({ ...event }));
        const expected = new URL(entry.url);
        expect(hits.at(-1)?.path, entry.tool).toBe(`${expected.pathname}${expected.search}`);
        expect(result.isError, entry.tool).toBeUndefined();
        expect(result.content[0]?.text.startsWith(`${ATTRIBUTION}\n`), entry.tool).toBe(true);
        expect(result.content[0]?.text.endsWith(BODY), entry.tool).toBe(true);
      }

      expect(hits.length).toBe(TOOLS.length);
      for (const [index, event] of events.entries()) {
        const tool = TOOLS[index];
        if (tool === undefined) throw new Error("event without a tool");
        const entry = firstCase(tool.name);
        expect(event.tool, `event ${index}`).toBe(tool.name);
        expect(event.route, `${tool.name} route`).toBe(cacheKeyOf(tool.build(entry.args)));
        expect(event.status).toBe("ok");
        expect(event.cached).toBe(false);
        expect(event.upstream_status).toBe("200");
        expect(Object.keys(event).sort()).toEqual([
          "cached",
          "duration_ms",
          "route",
          "status",
          "tool",
          "upstream_status",
        ]);
      }
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("returns the documented error document on an upstream failure", async () => {
    const { server, baseUrl } = stub(() => new Response("", { status: 500 }));
    const events: Array<Record<string, unknown>> = [];
    const upstream = new Upstream({
      baseUrl,
      apiKey: "fdb_test",
      perMinute: 600_000,
      cacheTtlMs: 0,
    });
    try {
      const meta = TOOLS[0];
      if (meta === undefined) throw new Error("no tools");
      const result = await run(meta, {}, upstream, (event) => events.push({ ...event }));
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toBe(
        JSON.stringify({
          error: {
            code: "upstream_unavailable",
            message: "The ForeverDB API answered HTTP 500.",
          },
        }),
      );
      expect(events[0]?.status).toBe("upstream_unavailable");
      expect(events[0]?.upstream_status).toBe("500");
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("names both key sources without a network request", async () => {
    const { server, hits, baseUrl } = stub();
    const events: Array<Record<string, unknown>> = [];
    const upstream = new Upstream({ baseUrl, perMinute: 600_000 });
    try {
      const items = TOOLS[1];
      if (items === undefined) throw new Error("no items tool");
      const result = await run(items, { q: "sword" }, upstream, (event) =>
        events.push({ ...event }),
      );
      const text = result.content[0]?.text ?? "";
      expect(result.isError).toBe(true);
      expect(text).toContain("--key");
      expect(text).toContain("FOREVERDB_API_KEY");
      expect(text).toContain("missing_api_key");
      expect(hits.length).toBe(0);
      expect(events[0]?.status).toBe("missing_api_key");
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("never leaks the key into a result or a log line", async () => {
    const { server, baseUrl } = stub();
    const events: Array<Record<string, unknown>> = [];
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_super_secret", perMinute: 600_000 });
    try {
      const texts: string[] = [];
      for (const tool of TOOLS) {
        const entry = firstCase(tool.name);
        const result = await run(tool, entry.args, upstream, (event) => events.push({ ...event }));
        texts.push(result.content[0]?.text ?? "");
      }
      const everything = `${texts.join("\n")}\n${JSON.stringify(events)}`;
      expect(everything).not.toContain("fdb_super_secret");
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("the request URL never carries the key", async () => {
    const { server, hits, baseUrl } = stub();
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_super_secret", perMinute: 600_000 });
    try {
      const meta = TOOLS[0];
      if (meta === undefined) throw new Error("no tools");
      await run(meta, {}, upstream, () => {});
      expect(hits[0]?.path).toBe("/api/v1/meta");
      expect(hits[0]?.apiKey).toBe("fdb_super_secret");
      expect(urlOf(meta.build({}), BASE_URL)).not.toContain("fdb_");
    } finally {
      server.stop(true);
    }
  }, 30_000);
});
