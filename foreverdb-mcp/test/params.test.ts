// Target parity: every fixture URL must come out of the TypeScript builder
// byte for byte, including the wire quirks and the encoding rules.

import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { TOOLS } from "../src/server.ts";
import { urlOf } from "../src/target.ts";
import {
  BASE_URL,
  ENCODING_CASES,
  TOOL_PARAMETERS,
  URL_CASES,
  type UrlCase,
} from "./parity.fixtures.ts";

const builders = new Map(
  TOOLS.flatMap((tool) => (tool.build === undefined ? [] : [[tool.name as string, tool.build]])),
);
const schemas = new Map(
  TOOLS.flatMap((tool) =>
    tool.schema === undefined ? [] : [[tool.name as string, z.object(tool.schema)]],
  ),
);

function urlFor(entry: UrlCase): string {
  const build = builders.get(entry.tool);
  if (build === undefined) throw new Error(`no builder for ${entry.tool}`);
  return urlOf(build(entry.args), BASE_URL);
}

describe("target builders", () => {
  test("brokers the same URL for every fixture case", () => {
    for (const entry of URL_CASES) {
      expect(urlFor(entry), `${entry.tool} ${entry.branch}`).toBe(entry.url);
    }
  });

  test("never lets a value escape its path position", () => {
    for (const entry of ENCODING_CASES) {
      const url = urlFor(entry);
      expect(url, `${entry.tool} ${entry.branch}`).toBe(entry.url);
      // The encoded path must not resolve outside its own segment.
      expect(new URL(url).pathname.split("/")).not.toContain("..");
    }
  });

  test("encodes query values instead of terminating the query", () => {
    const url = urlFor({
      tool: "fdb_items",
      branch: "query-encoding",
      args: { q: "thunder fury&x" },
      url: "",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("q")).toBe("thunder fury&x");
    expect(parsed.search).toBe("?q=thunder+fury%26x");
  });

  test("covers every API-backed tool with a fixture route", () => {
    const destinations = new Set(URL_CASES.map((entry) => `${entry.tool}${entry.url}`));
    for (const tool of TOOLS) {
      if (tool.name === "fdb_credit") continue;
      const covered = [...destinations].some((entry) => entry.startsWith(tool.name));
      expect(covered, `${tool.name} has no route fixture`).toBe(true);
    }
  });

  test("exposes exactly the fixture parameter names", () => {
    for (const tool of TOOLS) {
      const names = tool.schema === undefined ? [] : Object.keys(tool.schema);
      expect(names, tool.name).toEqual(TOOL_PARAMETERS[tool.name] ?? []);
    }
  });

  test("rejects invalid closed enums and out-of-range numbers before network call", () => {
    expect(() => schemas.get("fdb_bis")?.parse({ spec: "mage-fire", side: "alliance" })).toThrow();
    expect(() => schemas.get("fdb_bis")?.parse({ spec: "mage-fire", mode: "arena" })).toThrow();
    expect(() => schemas.get("fdb_bis")?.parse({ spec: "mage-fire", level: 0 })).toThrow();
    expect(() => schemas.get("fdb_bis")?.parse({ spec: "mage-fire", level: 61 })).toThrow();
    expect(() => schemas.get("fdb_items")?.parse({ limit: 0 })).toThrow();
    expect(() => schemas.get("fdb_items")?.parse({ limit: 101 })).toThrow();
    expect(() => schemas.get("fdb_items")?.parse({ quality: 6 })).toThrow();
    expect(() => schemas.get("fdb_builds")?.parse({ build: "latest", type: "quest" })).toThrow();
    expect(() =>
      schemas.get("fdb_builds")?.parse({ build: "latest", change: "modified" }),
    ).toThrow();
    expect(() => schemas.get("fdb_buffs_nerfs")?.parse({ direction: "rework" })).toThrow();
  });
});
