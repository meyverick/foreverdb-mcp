// Flow control: a token bucket that paces requests before they leave, and a
// counting semaphore that bounds how many are in flight.

/** Monotonic milliseconds; wall-clock changes must not refill the bucket. */
const now = (): number => performance.now();

export interface TokenBucketOptions {
  /** Tokens added per millisecond, e.g. 60 per minute is 0.001. */
  refillPerMs: number;
  /**
   * Tokens held for a burst. Defaults to 1: strictly paced, never over budget.
   * 0.1.3 used a GCRA burst of 60, which could put ~119 requests in a rolling
   * minute; the spec's "fewer than 61" wording only holds with a burst of 1.
   */
  capacity?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Monotonic clock; injectable so pacing can be tested without waiting. */
  now?: () => number;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Waits until a token is available, then spends it. Waiting before the send is
 * what keeps the forbidden request from ever leaving.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;
  private readonly refillPerMs: number;
  private readonly capacity: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly clock: () => number;

  constructor(options: TokenBucketOptions) {
    this.refillPerMs = options.refillPerMs;
    this.capacity = options.capacity ?? 1;
    this.tokens = this.capacity;
    this.clock = options.now ?? now;
    this.last = this.clock();
    this.sleep = options.sleep ?? realSleep;
  }

  async take(): Promise<void> {
    for (;;) {
      const current = this.clock();
      this.tokens = Math.min(this.capacity, this.tokens + (current - this.last) * this.refillPerMs);
      this.last = current;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await this.sleep(Math.ceil((1 - this.tokens) / this.refillPerMs));
    }
  }
}

/** Bounded concurrency; `use` always releases, including on throw. */
export class Semaphore {
  private available: number;
  private readonly waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.available = permits;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return;
    }
    await new Promise<void>((resolve) => {
      // `release` hands this waiter the permit it just freed, so the count must
      // not move here; decrementing leaks one permit per handoff and deadlocks
      // the queue once the count drifts negative.
      this.waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
      return;
    }
    this.available += 1;
  }

  async use<T>(work: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await work();
    } finally {
      this.release();
    }
  }
}
