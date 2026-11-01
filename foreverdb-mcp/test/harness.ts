// Drives the real entrypoint over stdio, the way an MCP client would.

const ENTRY = "src/main.ts";
const ROOT = `${import.meta.dir}/..`;

export interface Session {
  /** Sends one JSON-RPC request and resolves with the reply frame. */
  request: (method: string, params?: unknown) => Promise<Record<string, unknown>>;
  /** Completes the handshake so the server accepts other requests. */
  initialize: () => Promise<void>;
  /** stderr captured so far. */
  stderr: () => string;
  /** Wide events parsed from stderr. */
  events: () => Array<Record<string, unknown>>;
  /** Every frame the server wrote to stdout. */
  stdout: () => string;
  stop: () => void;
}

export function openSession(
  argv: string[] = [],
  env: Record<string, string | undefined> = {},
): Session {
  const proc = Bun.spawn(["bun", ENTRY, ...argv], {
    cwd: ROOT,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...Bun.env, FOREVERDB_API_KEY: undefined, ...env },
  });

  const pending = new Map<number, (frame: Record<string, unknown>) => void>();
  let nextId = 1;
  let out = "";
  let err = "";
  const read = async (stream: ReadableStream<Uint8Array>, sink: (text: string) => void) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) sink(decoder.decode(chunk, { stream: true }));
  };

  let buffered = "";
  const dispatch = (line: string) => {
    if (line.trim().length === 0) return;
    const frame = JSON.parse(line) as { id?: number };
    if (frame.id === undefined) return;
    const resolve = pending.get(frame.id);
    if (resolve) {
      pending.delete(frame.id);
      resolve(frame);
    }
  };
  void (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      const text = decoder.decode(value, { stream: true });
      out += text;
      buffered += text;
      let index = buffered.indexOf("\n");
      while (index >= 0) {
        dispatch(buffered.slice(0, index));
        buffered = buffered.slice(index + 1);
        index = buffered.indexOf("\n");
      }
    }
  })();
  void read(proc.stderr, (text) => {
    err += text;
  });

  const request = (method: string, params: unknown = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      proc.stdin.flush();
    });

  const initialize = async () => {
    await request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    proc.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    proc.stdin.flush();
  };

  return {
    request,
    initialize,
    stdout: () => out,
    stderr: () => err,
    events: () =>
      err
        .split("\n")
        .filter((line) => line.startsWith("{") && line.includes('"tool"'))
        .map((line) => JSON.parse(line) as Record<string, unknown>),
    stop: () => {
      proc.kill();
    },
  };
}
