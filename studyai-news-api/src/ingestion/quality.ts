import type { TrustTier } from './types';

const BASIC_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#x')) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      if (entity.startsWith('#')) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      return BASIC_ENTITIES[entity.toLowerCase()] ?? ' ';
    });
}

export function htmlToPlainText(value: string): string {
  const decoded = decodeHtmlEntities(decodeHtmlEntities(value));
  return decoded
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countContentWords(value: string): number {
  return value.match(/[A-Za-z0-9]+|[\u3400-\u9fff]/g)?.length ?? 0;
}

export interface QualityInput {
  title: string;
  canonicalUrl: string;
  publishedAt: string | null;
  author: string | null;
  contentText: string;
  trustTier: TrustTier;
  now?: Date;
}

export interface QualityAssessment {
  score: number;
  flags: string[];
  wordCount: number;
}

export function assessFeedItemQuality(input: QualityInput): QualityAssessment {
  const flags: string[] = [];
  const wordCount = countContentWords(input.contentText);
  let score = 0;

  if (input.title.length >= 8 && input.title.length <= 240) score += 15;
  else flags.push('invalid_title_length');

  if (input.canonicalUrl.startsWith('https://')) score += 15;
  else flags.push('invalid_canonical_url');

  if (input.publishedAt) score += 15;
  else flags.push('missing_publish_date');

  if (input.author) score += 10;
  else flags.push('missing_author');

  if (input.contentText.length >= 80) score += 10;
  else flags.push('thin_summary');

  if (wordCount >= 400) score += 25;
  else if (wordCount >= 120) score += 20;
  else if (wordCount >= 40) score += 10;
  else flags.push('thin_content');

  score += { A: 10, B: 7, C: 3, D: 0 }[input.trustTier];

  if (input.publishedAt) {
    const ageMs = (input.now ?? new Date()).getTime() - Date.parse(input.publishedAt);
    if (ageMs < -24 * 60 * 60 * 1000) {
      flags.push('future_publish_date');
      score -= 15;
    } else if (ageMs > 366 * 24 * 60 * 60 * 1000) {
      flags.push('stale_content');
      score -= 5;
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    flags,
    wordCount,
  };
}
