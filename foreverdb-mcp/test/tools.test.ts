// Tool surface contract: twenty-two read-only tools, verbatim JSON passthrough,
// read-only annotations, `fdb_credit` tier detection, and wide-event telemetry.

import { afterEach, describe, expect, test } from "bun:test";

import { CREDIT_NOTICE, READ_ONLY_ANNOTATIONS, run, TOOLS } from "../src/server.ts";
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

const BODY =
  '{"data":[{"id":19019}],"meta":{"build":"1.15.0","total":1,"attributionRequired":true}}';

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

  test("serves exactly the twenty-two read-only tools with fixture schemas and annotations", async () => {
    session = openSession(["--key", "fdb_test"]);
    await session.initialize();
    const reply = (await session.request("tools/list")) as {
      result: {
        tools: Array<{
          name: string;
          description: string;
          inputSchema: unknown;
          annotations?: Record<string, unknown>;
        }>;
      };
    };
    const tools = reply.result.tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual(Object.keys(TOOL_DESCRIPTIONS).sort());

    for (const tool of tools) {
      expect(tool.description, tool.name).toBe(TOOL_DESCRIPTIONS[tool.name] ?? "");
      const schema = tool.inputSchema as { properties?: Record<string, unknown> };
      expect(Object.keys(schema.properties ?? {}), tool.name).toEqual(
        TOOL_PARAMETERS[tool.name] ?? [],
      );
      expect(tool.annotations, `${tool.name} annotations`).toEqual(READ_ONLY_ANNOTATIONS);
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
  test("routes, labels every API tool, and returns verbatim JSON", async () => {
    const { server, hits, baseUrl } = stub();
    const events: Array<Record<string, unknown>> = [];
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_test", perMinute: 600_000 });
    const apiTools = TOOLS.filter((tool) => tool.name !== "fdb_credit");
    try {
      for (const tool of apiTools) {
        const entry = firstCase(tool.name);
        const result = await run(tool, entry.args, upstream, (event) => events.push({ ...event }));
        const expected = new URL(entry.url);
        expect(hits.at(-1)?.path, entry.tool).toBe(`${expected.pathname}${expected.search}`);
        expect(result.isError, entry.tool).toBeUndefined();
        expect(result.content[0]?.text, entry.tool).toBe(BODY);
        expect(() => JSON.parse(result.content[0]?.text ?? ""), entry.tool).not.toThrow();
      }

      expect(hits.length).toBe(apiTools.length);
      for (const [index, event] of events.entries()) {
        const tool = apiTools[index];
        if (tool === undefined || tool.build === undefined) throw new Error("event without a tool");
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

  test("records upstream HTTP status on JSON API errors (e.g. 402)", async () => {
    const { server, baseUrl } = stub(
      () =>
        new Response(
          '{"error":{"code":"subscription_required","message":"Free tier daily limit reached."}}',
          { status: 402 },
        ),
    );
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
            code: "subscription_required",
            message: "Free tier daily limit reached.",
          },
        }),
      );
      expect(events[0]?.status).toBe("subscription_required");
      expect(events[0]?.upstream_status).toBe("402");
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("returns the documented error document on an upstream 500", async () => {
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
        const args = tool.name === "fdb_credit" ? {} : firstCase(tool.name).args;
        const result = await run(tool, args, upstream, (event) => events.push({ ...event }));
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
      if (meta === undefined || meta.build === undefined) throw new Error("no tools");
      await run(meta, {}, upstream, () => {});
      expect(hits[0]?.path).toBe("/api/v1/meta");
      expect(hits[0]?.apiKey).toBe("fdb_super_secret");
      expect(urlOf(meta.build({}), BASE_URL)).not.toContain("fdb_");
    } finally {
      server.stop(true);
    }
  }, 30_000);
});

describe("fdb_credit", () => {
  const creditTool = () => {
    const tool = TOOLS.find((candidate) => candidate.name === "fdb_credit");
    if (tool === undefined) throw new Error("fdb_credit missing");
    return tool;
  };

  test("lazily fetches /meta on cold start and reuses observed tier without a second call", async () => {
    const { server, hits, baseUrl } = stub(
      () =>
        new Response('{"data":{},"meta":{"attributionRequired":true}}', {
          status: 200,
          headers: { "X-RateLimit-Limit": "60", "X-Api-Plan": "free" },
        }),
    );
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_test", perMinute: 600_000 });
    try {
      const first = await run(creditTool(), {}, upstream, () => {});
      expect(hits.length).toBe(1);
      expect(hits[0]?.path).toBe("/api/v1/meta");
      expect(first.content[0]?.text).toBe(`${CREDIT_NOTICE} You're on free tier.`);

      const second = await run(creditTool(), {}, upstream, () => {});
      expect(hits.length).toBe(1);
      expect(second.content[0]?.text).toBe(`${CREDIT_NOTICE} You're on free tier.`);
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("reports paid tier when attributionRequired is false", async () => {
    const { server, baseUrl } = stub(
      () =>
        new Response('{"data":{},"meta":{"attributionRequired":false}}', {
          status: 200,
          headers: { "X-RateLimit-Limit": "60", "X-Api-Plan": "paid" },
        }),
    );
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_test", perMinute: 600_000 });
    try {
      const result = await run(creditTool(), {}, upstream, () => {});
      expect(result.content[0]?.text).toBe(`${CREDIT_NOTICE} You're not on free tier.`);
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("fetches /meta when prior non-2xx only provided X-RateLimit-Limit (grandfathered free key)", async () => {
    const { server, hits, baseUrl } = stub((hit) => {
      if (hit.path === "/api/v1/items/999999") {
        return new Response('{"error":{"code":"not_found","message":"No such item."}}', {
          status: 404,
          headers: { "X-RateLimit-Limit": "60" },
        });
      }
      return new Response('{"data":{},"meta":{"attributionRequired":true}}', {
        status: 200,
        headers: { "X-RateLimit-Limit": "60" },
      });
    });
    const upstream = new Upstream({ baseUrl, apiKey: "fdb_test", perMinute: 600_000 });
    try {
      const items = TOOLS.find((candidate) => candidate.name === "fdb_items");
      if (items === undefined) throw new Error("fdb_items missing");
      await run(items, { id: 999999 }, upstream, () => {});
      const result = await run(creditTool(), {}, upstream, () => {});
      expect(hits.map((hit) => hit.path)).toEqual(["/api/v1/items/999999", "/api/v1/meta"]);
      expect(result.content[0]?.text).toBe(`${CREDIT_NOTICE} You're on free tier.`);
    } finally {
      server.stop(true);
    }
  }, 30_000);

  test("returns missing_api_key without a network request when unauthenticated", async () => {
    const { server, hits, baseUrl } = stub();
    const upstream = new Upstream({ baseUrl, perMinute: 600_000 });
    try {
      const result = await run(creditTool(), {}, upstream, () => {});
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("missing_api_key");
      expect(hits.length).toBe(0);
    } finally {
      server.stop(true);
    }
  }, 30_000);
});
