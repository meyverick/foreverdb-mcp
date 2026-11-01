// Guards the port: the snapshot in `parity.fixtures.ts` is the contract the
// TypeScript rewrite must reproduce. A drift here means either the port changed
// behavior or someone edited the snapshot instead of re-taking it.

import { describe, expect, test } from "bun:test";

import {
  ENCODING_CASES,
  ERROR_CASES,
  FIXTURE_DIGEST,
  fixtureDigest,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
  URL_CASES,
} from "./parity.fixtures";

describe("parity snapshot", () => {
  test("snapshot is unchanged since it was taken", () => {
    expect(fixtureDigest()).toBe(FIXTURE_DIGEST);
  });

  test("describes exactly the fifteen domain tools", () => {
    expect(Object.keys(TOOL_DESCRIPTIONS).sort()).toEqual([
      "fdb_battlegrounds",
      "fdb_changes",
      "fdb_classes",
      "fdb_content",
      "fdb_disenchant",
      "fdb_dungeons",
      "fdb_gathering",
      "fdb_items",
      "fdb_itemsets",
      "fdb_meta",
      "fdb_poisons",
      "fdb_professions",
      "fdb_quests",
      "fdb_spells",
      "fdb_vendors",
    ]);
    expect(Object.keys(TOOL_PARAMETERS).sort()).toEqual(Object.keys(TOOL_DESCRIPTIONS).sort());
  });

  test("every description is present and non-empty", () => {
    for (const [tool, description] of Object.entries(TOOL_DESCRIPTIONS)) {
      expect(description.trim().length, tool).toBeGreaterThan(0);
    }
    expect(SERVER_NAME).toBe("foreverdb");
  });

  test("every tool has at least one wire case", () => {
    const covered = new Set(URL_CASES.map((entry) => entry.tool));
    for (const tool of Object.keys(TOOL_DESCRIPTIONS)) {
      expect(covered, `${tool} has no URL case`).toContain(tool);
    }
    expect(ENCODING_CASES.length).toBeGreaterThan(0);
  });

  test("the code table covers every documented code", () => {
    const codes = new Set(ERROR_CASES.map((entry) => entry.code));
    for (const code of [
      "missing_api_key",
      "timeout",
      "network_error",
      "upstream_unavailable",
      "upstream_error",
      "rate_limit",
    ]) {
      expect(codes, `missing code ${code}`).toContain(code);
    }
  });
});
