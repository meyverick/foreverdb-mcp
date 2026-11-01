// The parity snapshot in one place: the entry point `parity.test.ts` reads.
// FIXTURE_DIGEST seals the whole snapshot, so editing a description, a URL or a
// code string without re-snapshotting fails the suite.

import { createHash } from "node:crypto";

import { ERROR_CASES, type ErrorCase } from "./fixtures/errors";
import {
  ATTRIBUTION,
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
} from "./fixtures/tool-surface";
import { BASE_URL, ENCODING_CASES, URL_CASES, type UrlCase } from "./fixtures/wire";

export type { ErrorCase, UrlCase };
export {
  ATTRIBUTION,
  BASE_URL,
  ENCODING_CASES,
  ERROR_CASES,
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
  URL_CASES,
};

/** sha256 over the canonical form of the whole snapshot. */
export const FIXTURE_DIGEST = "21bbe1cb3a2195cde0a4bc26f1d34c6d62c7c1547dff3071988b2f75527d9630";

export function fixtureDigest(): string {
  const canonical = JSON.stringify({
    server: { name: SERVER_NAME, instructions: SERVER_INSTRUCTIONS, attribution: ATTRIBUTION },
    descriptions: TOOL_DESCRIPTIONS,
    parameters: TOOL_PARAMETERS,
    urlCases: URL_CASES,
    encodingCases: ENCODING_CASES,
    errorCases: ERROR_CASES,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
