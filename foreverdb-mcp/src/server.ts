//! MCP tool surface: fifteen named domain tools over one upstream client.
//! Every tool goes through `run`, so attribution, error shape and the wide
//! event are identical across the surface.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { TOOL_DESCRIPTIONS } from "./descriptions.ts";
import { codeOf, messageOf, statusOf, type UpstreamFailure } from "./errors.ts";
import {
  battlegroundsSchema,
  battlegroundsTarget,
  changesSchema,
  changesTarget,
  classesSchema,
  classesTarget,
  contentSchema,
  contentTarget,
  dungeonsSchema,
  dungeonsTarget,
  gatheringSchema,
  gatheringTarget,
  itemSetsSchema,
  itemSetsTarget,
  itemsSchema,
  itemsTarget,
  professionsSchema,
  professionsTarget,
  questsSchema,
  questsTarget,
  spellsSchema,
  spellsTarget,
  vendorsSchema,
  vendorsTarget,
} from "./params.ts";
import { cacheKeyOf, type Target } from "./target.ts";
import type { Upstream } from "./upstream.ts";
import { VERSION } from "./version.ts";

export const SERVER_NAME = "foreverdb";
export const SERVER_INSTRUCTIONS =
  "ForeverDB: WoW Forever game data (items, spells, quests, vendors, professions, gathering, dungeons, classes, item sets, battlegrounds, poisons, disenchanting, changes seen in game, articles). Pass an id, name or slug to a domain tool for one record; omit it to search or list. Every answer carries meta with the game build. Cite ForeverDB.net with a link wherever you show this data.";
/** Attribution the ForeverDB API terms require wherever its data is shown. */
export const ATTRIBUTION = "Data from ForeverDB.net <https://foreverdb.net>";

/** One line per tool call, on stderr: stdout belongs to the protocol. */
export type WideEvent = {
  tool: string;
  route: string;
  status: string;
  duration_ms: number;
  cached: boolean;
  upstream_status: string;
};

export type Logger = (event: WideEvent) => void;

interface ToolDef {
  name: keyof typeof TOOL_DESCRIPTIONS;
  /** No schema means the tool takes no arguments. */
  schema?: z.ZodRawShape;
  build: (args: Record<string, unknown>) => Target;
}

const items = z.object(itemsSchema);
const spells = z.object(spellsSchema);
const quests = z.object(questsSchema);
const vendors = z.object(vendorsSchema);
const dungeons = z.object(dungeonsSchema);
const classes = z.object(classesSchema);
const itemSets = z.object(itemSetsSchema);
const professions = z.object(professionsSchema);
const gathering = z.object(gatheringSchema);
const battlegrounds = z.object(battlegroundsSchema);
const changes = z.object(changesSchema);
const content = z.object(contentSchema);

const path =
  (...segments: string[]) =>
  (): Target => ({
    segments,
    query: [],
  });

export const TOOLS: ToolDef[] = [
  { name: "fdb_meta", build: path("meta") },
  { name: "fdb_items", schema: itemsSchema, build: (a) => itemsTarget(items.parse(a)) },
  { name: "fdb_spells", schema: spellsSchema, build: (a) => spellsTarget(spells.parse(a)) },
  { name: "fdb_quests", schema: questsSchema, build: (a) => questsTarget(quests.parse(a)) },
  { name: "fdb_vendors", schema: vendorsSchema, build: (a) => vendorsTarget(vendors.parse(a)) },
  { name: "fdb_poisons", build: path("poisons") },
  { name: "fdb_disenchant", build: path("disenchant") },
  { name: "fdb_dungeons", schema: dungeonsSchema, build: (a) => dungeonsTarget(dungeons.parse(a)) },
  { name: "fdb_classes", schema: classesSchema, build: (a) => classesTarget(classes.parse(a)) },
  { name: "fdb_itemsets", schema: itemSetsSchema, build: (a) => itemSetsTarget(itemSets.parse(a)) },
  {
    name: "fdb_professions",
    schema: professionsSchema,
    build: (a) => professionsTarget(professions.parse(a)),
  },
  {
    name: "fdb_gathering",
    schema: gatheringSchema,
    build: (a) => gatheringTarget(gathering.parse(a)),
  },
  {
    name: "fdb_battlegrounds",
    schema: battlegroundsSchema,
    build: (a) => battlegroundsTarget(battlegrounds.parse(a)),
  },
  { name: "fdb_changes", schema: changesSchema, build: (a) => changesTarget(changes.parse(a)) },
  { name: "fdb_content", schema: contentSchema, build: (a) => contentTarget(content.parse(a)) },
];

const stderrLogger: Logger = (event) => {
  console.error(JSON.stringify(event));
};

/** Builds the MCP server: registration only, no transport. */
export function createServer(upstream: Upstream, log: Logger = stderrLogger): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );
  for (const tool of TOOLS) {
    const description = TOOL_DESCRIPTIONS[tool.name];
    const handler = (args: Record<string, unknown>) => run(tool, args, upstream, log);
    if (tool.schema === undefined) {
      server.registerTool(tool.name, { description }, handler);
    } else {
      server.registerTool(tool.name, { description, inputSchema: tool.schema }, handler);
    }
  }
  return server;
}

/** One tool call: fetch, emit the wide event, wrap the result. */
export async function run(
  tool: ToolDef,
  args: Record<string, unknown>,
  upstream: Upstream,
  log: Logger = stderrLogger,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const target = tool.build(args);
  const route = cacheKeyOf(target);
  const started = performance.now();
  let fetched: Awaited<ReturnType<Upstream["get"]>> | undefined;
  let failure: UpstreamFailure | undefined;
  try {
    fetched = await upstream.get(target);
  } catch (error) {
    failure = isFailure(error) ? error : { kind: "network", detail: String(error) };
  }

  const status = failure === undefined ? "ok" : codeOf(failure);
  const upstreamStatus = failure === undefined ? fetched?.upstreamStatus : statusOf(failure);
  log({
    tool: tool.name,
    route,
    status,
    duration_ms: Math.round(performance.now() - started),
    cached: fetched?.cached ?? false,
    upstream_status: upstreamStatus === undefined ? "none" : String(upstreamStatus),
  });

  if (failure !== undefined) return errorResult(failure);
  return dataResult(fetched?.body ?? "");
}

export function dataResult(body: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: `${ATTRIBUTION}\n${body}` }] };
}

export function errorResult(failure: UpstreamFailure): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const payload = { error: { code: codeOf(failure), message: messageOf(failure) } };
  return { content: [{ type: "text", text: JSON.stringify(payload) }], isError: true };
}

function isFailure(value: unknown): value is UpstreamFailure {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "missing_key" ||
    kind === "timeout" ||
    kind === "network" ||
    kind === "response" ||
    kind === "api"
  );
}
