// In-memory response cache bounded by the API's documented cacheability.

/** Entries kept before a sweep of expired values runs on insert. */
export const MAX_ENTRIES = 512;

interface Entry {
  expires: number;
  body: string;
}

export class TtlCache {
  private readonly ttlMs: number;
  private readonly entries = new Map<string, Entry>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string): string | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expires > Date.now()) return entry.body;
    this.entries.delete(key);
    return undefined;
  }

  insert(key: string, body: string): void {
    if (this.entries.size >= MAX_ENTRIES) this.sweep();
    this.entries.set(key, { expires: Date.now() + this.ttlMs, body });
  }

  private sweep(): void {
    const current = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expires <= current) this.entries.delete(key);
    }
  }
}
