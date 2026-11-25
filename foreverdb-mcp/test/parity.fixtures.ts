// The v1 contract snapshot in one place: `parity.test.ts` reads this.
// `FIXTURE_DIGEST` seals the snapshot so editing a description, URL, or error
// string without updating the digest fails the suite.

import { createHash } from "node:crypto";

import { ERROR_CASES, type ErrorCase } from "./fixtures/errors";
import {
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
} from "./fixtures/tool-surface";
import { BASE_URL, ENCODING_CASES, URL_CASES, type UrlCase } from "./fixtures/wire";

export type { ErrorCase, UrlCase };
export {
  BASE_URL,
  ENCODING_CASES,
  ERROR_CASES,
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  TOOL_DESCRIPTIONS,
  TOOL_PARAMETERS,
  URL_CASES,
};

export function fixtureDigest(): string {
  const canonical = JSON.stringify({
    server: { name: SERVER_NAME, instructions: SERVER_INSTRUCTIONS },
    descriptions: TOOL_DESCRIPTIONS,
    parameters: TOOL_PARAMETERS,
    urlCases: URL_CASES,
    encodingCases: ENCODING_CASES,
    errorCases: ERROR_CASES,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** sha256 over the canonical form of the whole snapshot. */
export const FIXTURE_DIGEST = "f76e3312c4796cff4e91c51eb6d8fe4cf70a9d921a81d2b31bf1674e372de6d8";
