type CacheEntry = {
  value: string;
  expiresAt: number;
};

class InMemoryKV {
  private store = new Map<string, CacheEntry>();

  constructor() {
    // Sweep expired entries every 5 minutes to prevent unbounded memory growth
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.expiresAt) this.store.delete(key);
      }
    }, 5 * 60 * 1000).unref();
  }

  async get<T>(key: string, _type: "json"): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async put(key: string, value: string, opts: { expirationTtl: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + opts.expirationTtl * 1000,
    });
  }
}

const tokenKV = new InMemoryKV();
const responseKV = new InMemoryKV();

export function getKV(): InMemoryKV {
  return tokenKV;
}

export function getResponseKV(): InMemoryKV {
  return responseKV;
}
