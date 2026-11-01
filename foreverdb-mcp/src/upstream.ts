//! ForeverDB API client: key handling, rate budget, cache, bounded concurrency.
//! The key is held privately and never appears in a URL, log line or result.

import { TtlCache } from "./cache.ts";
import { classify, type UpstreamFailure } from "./errors.ts";
import { Semaphore, TokenBucket } from "./limiter.ts";
import { cacheKeyOf, type Target, urlOf } from "./target.ts";

/** The API allows 60 requests a minute and 10,000 a day per key. */
export const REQUESTS_PER_MINUTE = 60;
export const DEFAULT_BASE_URL = "https://foreverdb.net/api/v1";
export const MAX_IN_FLIGHT = 8;
export const TIMEOUT_MS = 15_000;
export const CACHE_TTL_MS = 60_000;

export interface Config {
  baseUrl: string;
  apiKey?: string;
  perMinute?: number;
  maxInFlight?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
}

/** One answered lookup: the body plus what the cache and the API contributed. */
export interface Fetched {
  body: string;
  cached: boolean;
  upstreamStatus?: number;
}

export interface UpstreamDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Monotonic clock for the rate bucket; injectable for tests. */
  now?: () => number;
}

export class Upstream {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly bucket: TokenBucket;
  private readonly semaphore: Semaphore;
  private readonly cache: TtlCache;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(config: Config, deps: UpstreamDeps = {}) {
    this.baseUrl = config.baseUrl;
    this.apiKey = normalizeKey(config.apiKey);
    const perMinute = config.perMinute ?? REQUESTS_PER_MINUTE;
    this.bucket = new TokenBucket({
      refillPerMs: perMinute / 60_000,
      sleep: deps.sleep,
      now: deps.now,
    });
    this.semaphore = new Semaphore(config.maxInFlight ?? MAX_IN_FLIGHT);
    this.cache = new TtlCache(config.cacheTtlMs ?? CACHE_TTL_MS);
    this.timeoutMs = config.timeoutMs ?? TIMEOUT_MS;
    this.fetchImpl = deps.fetch ?? fetch;
    this.sleep = deps.sleep ?? ((ms) => Bun.sleep(ms));
  }

  /** Fetches a target, honoring the API contract for key, budget, and caching. */
  async get(target: Target): Promise<Fetched> {
    const apiKey = this.apiKey;
    if (apiKey === undefined) throw missingKey();
    const url = urlOf(target, this.baseUrl);
    const cacheKey = cacheKeyOf(target);

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return { body: cached, cached: true };

    await this.bucket.take();
    return this.semaphore.use(() => this.attempt(url, cacheKey));
  }

  private async attempt(url: string, cacheKey: string): Promise<Fetched> {
    let first: { failure: UpstreamFailure; retryAfter?: number } | undefined;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await this.send(url);
      if (response.kind === "failure") throw response.failure;
      const { status, retryAfter, body } = response;
      if (status >= 200 && status < 300) {
        this.cache.insert(cacheKey, body);
        return { body, cached: false, upstreamStatus: status };
      }
      const failure = classify(status, retryAfter, body);
      if (attempt === 1 && (status === 429 || status >= 500)) {
        first = { failure, retryAfter };
        if (retryAfter !== undefined) await this.sleep(retryAfter * 1000);
        continue;
      }
      throw failure;
    }
    throw first?.failure ?? { kind: "response", status: 502 };
  }

  private async send(
    url: string,
  ): Promise<
    | { kind: "response"; status: number; retryAfter?: number; body: string }
    | { kind: "failure"; failure: UpstreamFailure }
  > {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { "X-API-Key": this.apiKey ?? "" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return { kind: "failure", failure: transportFailure(error) };
    }
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      return { kind: "failure", failure: transportFailure(error) };
    }
    return retryAfter === undefined
      ? { kind: "response", status: response.status, body }
      : { kind: "response", status: response.status, retryAfter, body };
  }
}

/** An empty or whitespace-only key is treated as absent, never sent. */
export function normalizeKey(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const key = raw.trim();
  return key.length === 0 ? undefined : key;
}

export function missingKey(): UpstreamFailure {
  return { kind: "missing_key" };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number.parseInt(header.trim(), 10);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function transportFailure(error: unknown): UpstreamFailure {
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") return { kind: "timeout" };
  const detail = error instanceof Error ? error.message : String(error);
  return { kind: "network", detail };
}
