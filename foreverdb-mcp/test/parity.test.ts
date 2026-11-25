// Guards the v1 contract: the snapshot in `parity.fixtures.ts` seals the
// 22-tool surface, wire URLs, and error classification table.

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

describe("contract snapshot", () => {
  test("snapshot is unchanged since it was taken", () => {
    expect(fixtureDigest()).toBe(FIXTURE_DIGEST);
  });

  test("describes exactly the twenty-two read-only tools", () => {
    expect(Object.keys(TOOL_DESCRIPTIONS).sort()).toEqual([
      "fdb_battlegrounds",
      "fdb_bis",
      "fdb_buffs_nerfs",
      "fdb_builds",
      "fdb_changes",
      "fdb_classes",
      "fdb_content",
      "fdb_credit",
      "fdb_disenchant",
      "fdb_dungeons",
      "fdb_endgame",
      "fdb_gathering",
      "fdb_items",
      "fdb_itemsets",
      "fdb_merchants_favor",
      "fdb_meta",
      "fdb_poisons",
      "fdb_professions",
      "fdb_quests",
      "fdb_spells",
      "fdb_vendors",
      "fdb_zones",
    ]);
    expect(Object.keys(TOOL_PARAMETERS).sort()).toEqual(Object.keys(TOOL_DESCRIPTIONS).sort());
  });

  test("every description is present and non-empty", () => {
    for (const [tool, description] of Object.entries(TOOL_DESCRIPTIONS)) {
      expect(description.trim().length, tool).toBeGreaterThan(0);
    }
    expect(SERVER_NAME).toBe("foreverdb");
  });

  test("every API-backed tool has at least one wire case", () => {
    const covered = new Set(URL_CASES.map((entry) => entry.tool));
    for (const tool of Object.keys(TOOL_DESCRIPTIONS)) {
      if (tool === "fdb_credit") continue;
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
      "subscription_required",
    ]) {
      expect(codes, `missing code ${code}`).toContain(code);
    }
  });
});
