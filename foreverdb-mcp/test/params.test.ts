// Target parity: every fixture URL must come out of the TypeScript builder
// byte for byte, including the wire quirks and the encoding rules.

import { describe, expect, test } from "bun:test";

import { TOOLS } from "../src/server.ts";
import { urlOf } from "../src/target.ts";
import {
  BASE_URL,
  ENCODING_CASES,
  TOOL_PARAMETERS,
  URL_CASES,
  type UrlCase,
} from "./parity.fixtures.ts";

const builders = new Map(TOOLS.map((tool) => [tool.name as string, tool.build]));

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

  test("covers every parameter with a fixture route", () => {
    const destinations = new Set(URL_CASES.map((entry) => `${entry.tool}${entry.url}`));
    for (const tool of TOOLS) {
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
});
