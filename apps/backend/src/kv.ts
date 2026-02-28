let _kv: KVNamespace | undefined;

export function initKV(kv: KVNamespace | undefined): void {
  _kv = kv;
}

export function getKV(): KVNamespace | undefined {
  return _kv;
}
