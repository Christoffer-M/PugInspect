let _tokenKV: KVNamespace | undefined;
let _responseKV: KVNamespace | undefined;

export function initKV(token: KVNamespace | undefined, response: KVNamespace | undefined): void {
  _tokenKV = token;
  _responseKV = response;
}

export function getKV(): KVNamespace | undefined {
  return _tokenKV;
}

export function getResponseKV(): KVNamespace | undefined {
  return _responseKV;
}
