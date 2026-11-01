// Upstream client contract: key handling, budget, concurrency, cache, retry.
// The rate tests use a virtual clock so pacing is proven without waiting.

import { describe, expect, test } from "bun:test";

import { TtlCache } from "../src/cache.ts";
import { classify, codeOf, messageOf, type UpstreamFailure } from "../src/errors.ts";
import { Semaphore } from "../src/limiter.ts";
import { targetPath } from "../src/target.ts";
import { Upstream } from "../src/upstream.ts";
import { ERROR_CASES } from "./parity.fixtures.ts";

function virtualClock(start = 0) {
  let time = start;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
    advance: (ms: number) => {
      time += ms;
    },
    get time() {
      return time;
    },
  };
}

interface Reply {
  status: number;
  body?: string;
  retryAfter?: string;
}

function scriptedFetch(replies: Reply[]) {
  const calls: string[] = [];
  const impl = (async (input: string | URL) => {
    calls.push(String(input));
    const reply = replies.length > 1 ? replies.shift() : replies[0];
    if (reply === undefined) throw new Error("no reply scripted");
    const headers = new Headers();
    if (reply.retryAfter !== undefined) headers.set("Retry-After", reply.retryAfter);
    return new Response(reply.body ?? "", { status: reply.status, headers });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("key handling", () => {
  test("sends the key and makes no request without one", async () => {
    let hits = 0;
    const observed = { key: null as string | null };
    const stub = Bun.serve({
      port: 0,
      fetch(request) {
        hits += 1;
        observed.key = request.headers.get("X-API-Key");
        return Response.json({ data: [], meta: {} });
      },
    });
    const base = `http://127.0.0.1:${stub.port}/api/v1`;
    try {
      const keyed = new Upstream({ baseUrl: base, apiKey: "fdb_test_key" });
      await keyed.get(targetPath("meta"));
      expect(hits).toBe(1);
      expect(observed.key).toBe("fdb_test_key");

      for (const apiKey of [undefined, "", "   "]) {
        const keyless = new Upstream({ baseUrl: base, apiKey });
        const failure = await keyless.get(targetPath("meta")).catch((error) => error);
        expect(codeOf(failure as UpstreamFailure)).toBe("missing_api_key");
      }
      expect(hits, "a request escaped without a key").toBe(1);
    } finally {
      stub.stop(true);
    }
  });

  test("reports a timeout as its own code", async () => {
    const timeout = (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as unknown as typeof fetch;
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k" },
      { fetch: timeout },
    );
    const failure = await upstream.get(targetPath("meta")).catch((error) => error);
    expect(codeOf(failure as UpstreamFailure)).toBe("timeout");
  });
});

describe("rate budget", () => {
  test("paces a burst of 120 calls to 60 per minute", async () => {
    const clock = virtualClock();
    const { impl } = scriptedFetch([{ status: 200, body: "{}" }]);
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k", perMinute: 60 },
      { fetch: impl, sleep: clock.sleep, now: clock.now },
    );

    const sentAt: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      await upstream.get(targetPath("items", String(index)));
      sentAt.push(clock.time);
    }

    expect(sentAt[0]).toBe(0);
    expect(sentAt[1]).toBe(1000);
    expect(sentAt[59]).toBe(59_000);
    expect(sentAt[119]).toBe(119_000);

    for (let start = 0; start < sentAt.length; start += 1) {
      const from = sentAt[start] as number;
      const inWindow = sentAt.filter((time) => time >= from && time < from + 60_000);
      expect(inWindow.length, `window at ${from}`).toBeLessThanOrEqual(60);
    }
  });
});

describe("concurrency", () => {
  test("never exceeds the permit count in flight", async () => {
    let peak = 0;
    let inFlight = 0;
    const stub = Bun.serve({
      port: 0,
      async fetch() {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Bun.sleep(5);
        inFlight -= 1;
        return Response.json({ data: [] });
      },
    });
    const base = `http://127.0.0.1:${stub.port}/api/v1`;
    try {
      // Effectively no pacing, so only the semaphore can bound the burst.
      const upstream = new Upstream({ baseUrl: base, apiKey: "k", perMinute: 600_000 });
      await Promise.all(
        Array.from({ length: 40 }, (_, index) => upstream.get(targetPath("items", String(index)))),
      );
      expect(peak).toBeLessThanOrEqual(8);
      expect(peak).toBeGreaterThan(1);
    } finally {
      stub.stop(true);
    }
  });

  test("releases a permit when the work throws", async () => {
    const semaphore = new Semaphore(1);
    await expect(
      semaphore.use(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(semaphore.use(async () => "next")).resolves.toBe("next");
  });
});

describe("cache", () => {
  test("serves a repeat from cache and re-fetches after the TTL", async () => {
    const { impl, calls } = scriptedFetch([{ status: 200, body: '{"data":[]}' }]);
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k", cacheTtlMs: 40 },
      { fetch: impl },
    );

    await upstream.get(targetPath("spells"));
    const again = await upstream.get(targetPath("spells"));
    expect(calls.length).toBe(1);
    expect(again.cached).toBe(true);

    await Bun.sleep(60);
    await upstream.get(targetPath("spells"));
    expect(calls.length).toBe(2);
  });

  test("sweeps expired entries instead of growing past the bound", async () => {
    const cache = new TtlCache(1);
    for (let index = 0; index < 600; index += 1) cache.insert(`key-${index}`, "body");
    await Bun.sleep(5);
    cache.insert("fresh", "body");
    expect(cache.size).toBeLessThanOrEqual(512);
  });
});

describe("retry and classification", () => {
  test("honours Retry-After once, then returns the data", async () => {
    const clock = virtualClock();
    const { impl, calls } = scriptedFetch([
      { status: 429, retryAfter: "2", body: "slow down" },
      { status: 200, body: '{"data":[]}' },
    ]);
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k" },
      { fetch: impl, sleep: clock.sleep, now: clock.now },
    );
    const fetched = await upstream.get(targetPath("meta"));
    expect(calls.length).toBe(2);
    expect(clock.time).toBe(2000);
    expect(fetched.body).toBe('{"data":[]}');
  });

  test("reports rate_limit on a second 429", async () => {
    const clock = virtualClock();
    const { impl, calls } = scriptedFetch([
      { status: 429, retryAfter: "1" },
      { status: 429, retryAfter: "1" },
    ]);
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k" },
      { fetch: impl, sleep: clock.sleep, now: clock.now },
    );
    const failure = await upstream.get(targetPath("meta")).catch((error) => error);
    expect(calls.length).toBe(2);
    expect(codeOf(failure as UpstreamFailure)).toBe("rate_limit");
  });

  test("retries a 5xx once and reports upstream_unavailable", async () => {
    const { impl, calls } = scriptedFetch([{ status: 500 }, { status: 500 }]);
    const upstream = new Upstream(
      { baseUrl: "https://x.test/api/v1", apiKey: "k" },
      { fetch: impl, sleep: async () => {} },
    );
    const failure = await upstream.get(targetPath("meta")).catch((error) => error);
    expect(calls.length).toBe(2);
    expect(codeOf(failure as UpstreamFailure)).toBe("upstream_unavailable");
    expect(messageOf(failure as UpstreamFailure)).toBe("The ForeverDB API answered HTTP 500.");
  });
});

describe("error table", () => {
  test("reproduces every code and message in the snapshot", () => {
    for (const entry of ERROR_CASES) {
      const failure = failureFor(entry);
      expect(codeOf(failure), `${entry.code} code`).toBe(entry.code);
      expect(messageOf(failure), `${entry.code} message`).toBe(entry.message);
    }
  });
});

function failureFor(entry: (typeof ERROR_CASES)[number]): UpstreamFailure {
  switch (entry.kind) {
    case "missing_key":
      return { kind: "missing_key" };
    case "timeout":
      return { kind: "timeout" };
    case "network":
      return { kind: "network", detail: "connection refused" };
    case "response":
      return classify(entry.status, entry.retryAfter, entry.body ?? "");
  }
}
