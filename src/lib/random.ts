// Rejection sampling avoids modulo bias, including when the bound is not a power of two.
export function randomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 2 ** 32) {
    throw new RangeError("随机数范围无效。");
  }
  const limit = 2 ** 32 - (2 ** 32 % maxExclusive);
  const buffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

export type RandomIntSource = (maxExclusive: number) => number;
/** Local deterministic source for tests/development only. Production still uses crypto. */
export function seededRandomInt(seed: number): RandomIntSource {
  let state = seed >>> 0;
  return (maxExclusive) => {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 2 ** 32) throw new RangeError("随机数范围无效。");
    const limit = 2 ** 32 - (2 ** 32 % maxExclusive);
    let value: number;
    do {
      state = (state + 0x6D2B79F5) >>> 0;
      let x = state;
      x = Math.imul(x ^ x >>> 15, x | 1);
      x ^= x + Math.imul(x ^ x >>> 7, x | 61);
      value = (x ^ x >>> 14) >>> 0;
    } while (value >= limit);
    return value % maxExclusive;
  };
}
