/** Minimal KV-like interface (Cloudflare KV or in-memory for tests). */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const row = this.map.get(key);
    if (!row) return null;
    if (row.expiresAt != null && Date.now() >= row.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return row.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const expiresAt =
      options?.expirationTtl != null
        ? Date.now() + options.expirationTtl * 1000
        : undefined;
    this.map.set(key, { value, expiresAt });
  }
}

export function kvFromBinding(binding: KVNamespace): KeyValueStore {
  return {
    get: (key) => binding.get(key),
    put: (key, value, options) => binding.put(key, value, options),
  };
}
