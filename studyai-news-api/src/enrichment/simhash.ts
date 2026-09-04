const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'new',
  'of', 'on', 'or', 'our', 'the', 'to', 'with', 'your', '与', '了', '在', '的', '及', '和',
]);

export function normalizedTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/\s*(?:\||–|—)\s*[\p{Letter}\p{Number} .]{1,40}$/u, '')
    .replace(/[^\p{Letter}\p{Number}\p{Script=Han}]+/gu, ' ')
    .trim();
}

export function textTokens(value: string): string[] {
  const normalized = normalizedTitle(value);
  const tokens = normalized.match(/[a-z0-9]+|[\p{Script=Han}]+/gu) ?? [];
  const expanded: string[] = [];
  for (const token of tokens) {
    if (/^[\p{Script=Han}]+$/u.test(token) && token.length > 1) {
      for (let index = 0; index < token.length - 1; index += 1) {
        expanded.push(token.slice(index, index + 2));
      }
    } else if (!STOP_WORDS.has(token) && token.length > 1) {
      const stemmed = token.endsWith('ies') && token.length > 4
        ? `${token.slice(0, -3)}y`
        : token.endsWith('s') && !token.endsWith('ss') && token.length > 3
          ? token.slice(0, -1)
          : token;
      expanded.push(stemmed);
    }
  }
  return [...new Set(expanded)];
}

function fnv1a64(value: string): bigint {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash;
}

export function simHashHex(value: string): string {
  const weights = Array.from({ length: 64 }, () => 0);
  const tokens = textTokens(value);
  for (const token of tokens.length > 0 ? tokens : [normalizedTitle(value)]) {
    const hash = fnv1a64(token);
    for (let bit = 0; bit < 64; bit += 1) {
      weights[bit] = (weights[bit] ?? 0) + ((hash & (1n << BigInt(bit))) === 0n ? -1 : 1);
    }
  }
  let result = 0n;
  for (let bit = 0; bit < 64; bit += 1) {
    if ((weights[bit] ?? 0) >= 0) result |= 1n << BigInt(bit);
  }
  return result.toString(16).padStart(16, '0');
}

export function hammingDistance(left: string, right: string): number {
  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (difference > 0n) {
    distance += Number(difference & 1n);
    difference >>= 1n;
  }
  return distance;
}

export function tokenJaccard(left: string, right: string): number {
  const leftTokens = new Set(textTokens(left));
  const rightTokens = new Set(textTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

export function areLikelyDuplicates(left: string, right: string): boolean {
  if (normalizedTitle(left) === normalizedTitle(right)) return true;
  return hammingDistance(simHashHex(left), simHashHex(right)) <= 8 && tokenJaccard(left, right) >= 0.62;
}
