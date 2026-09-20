/** Minimal KV-like interface (Cloudflare KV or in-memory for tests). */
export type KvPutOptions = {
  expirationTtl?: number;
  metadata?: unknown;
};

export type KvListKey = {
  name: string;
  metadata?: unknown;
};

export type KvListResult = {
  keys: KvListKey[];
  list_complete: boolean;
  cursor?: string;
};

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KvPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<KvListResult>;
}

type Row = {
  value: string;
  expiresAt?: number;
  metadata?: unknown;
};

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, Row>();

  async get(key: string): Promise<string | null> {
    const row = this.map.get(key);
    if (!row) return null;
    if (row.expiresAt != null && Date.now() >= row.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return row.value;
  }

  async put(key: string, value: string, options?: KvPutOptions): Promise<void> {
    const expiresAt =
      options?.expirationTtl != null
        ? Date.now() + options.expirationTtl * 1000
        : undefined;
    this.map.set(key, {
      value,
      expiresAt,
      metadata: options?.metadata,
    });
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<KvListResult> {
    const prefix = options?.prefix ?? "";
    const limit = options?.limit ?? 1000;
    const names = [...this.map.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort();
    const start = options?.cursor ? Number(options.cursor) || 0 : 0;
    const slice = names.slice(start, start + limit);
    const next = start + slice.length;
    const list_complete = next >= names.length;
    return {
      keys: slice.map((name) => ({
        name,
        metadata: this.map.get(name)?.metadata,
      })),
      list_complete,
      cursor: list_complete ? undefined : String(next),
    };
  }
}

export function kvFromBinding(binding: KVNamespace): KeyValueStore {
  return {
    get: (key) => binding.get(key),
    put: (key, value, options) => binding.put(key, value, options),
    delete: (key) => binding.delete(key),
    list: async (options) => {
      const page = await binding.list(options);
      return {
        keys: page.keys.map((key) => ({
          name: key.name,
          metadata: key.metadata,
        })),
        list_complete: page.list_complete,
        cursor: "cursor" in page ? page.cursor : undefined,
      };
    },
  };
}
