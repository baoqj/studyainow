import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { sha256Hex } from './hash';
import { assessFeedItemQuality, htmlToPlainText } from './quality';
import type { IngestionSource, ParsedFeed, ParsedFeedItem } from './types';
import { canonicalizeArticleUrl } from './url';

const PARSER_VERSION = 'rss_atom_v2';

type XmlValue = string | number | boolean | null | XmlValue[] | { [key: string]: XmlValue };

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  trimValues: true,
});

function collectText(value: XmlValue | undefined): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';

  return Object.entries(value)
    .filter(([key]) => !key.startsWith('@_'))
    .map(([, child]) => collectText(child))
    .filter(Boolean)
    .join(' ');
}

function extractLink(value: XmlValue | undefined): string {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;

    const relation = collectText(candidate['@_rel']);
    const href = collectText(candidate['@_href'] ?? candidate['#text']);
    if (href && (!relation || relation === 'alternate')) return href;
  }
  return '';
}

function normalizeDate(value: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function asEntries(document: Record<string, XmlValue>): Record<string, XmlValue>[] {
  const rss = document.rss as Record<string, XmlValue> | undefined;
  const channel = rss?.channel as Record<string, XmlValue> | undefined;
  const atom = document.feed as Record<string, XmlValue> | undefined;
  const rdf = document.RDF as Record<string, XmlValue> | undefined;
  const rawEntries = channel?.item ?? atom?.entry ?? rdf?.item ?? [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  return entries.filter((entry): entry is Record<string, XmlValue> => (
    Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  ));
}

function extractContent(entry: Record<string, XmlValue>): string {
  return collectText(
    entry.encoded
    ?? entry.content
    ?? entry.description
    ?? entry.summary,
  );
}

export async function parseFeedDocument(
  source: IngestionSource,
  documentText: string,
  now = new Date(),
): Promise<ParsedFeed> {
  const normalizedDocument = documentText.replace(/^\uFEFF/, '').trimStart();
  const documentWithoutCdata = normalizedDocument.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');
  if (/<!DOCTYPE|<!ENTITY/i.test(documentWithoutCdata)) throw new Error('unsafe_xml_declaration');

  const validation = XMLValidator.validate(normalizedDocument);
  if (validation !== true) throw new Error('invalid_xml');

  const document = parser.parse(normalizedDocument) as Record<string, XmlValue>;
  const rawEntries = asEntries(document);
  if (rawEntries.length === 0) throw new Error('feed_has_no_entries');

  const consideredEntries = rawEntries.slice(0, source.maxItemsPerPoll);
  const items: ParsedFeedItem[] = [];
  const seenCanonicalUrls = new Set<string>();
  let itemsRejected = 0;

  for (const entry of consideredEntries) {
    try {
      const title = htmlToPlainText(collectText(entry.title)).slice(0, 500);
      const rawLink = extractLink(entry.link) || collectText(entry.guid) || collectText(entry.id);
      const canonicalUrl = canonicalizeArticleUrl(rawLink, source.fetchUrl, source.allowedHosts);
      if (!title || seenCanonicalUrls.has(canonicalUrl)) throw new Error('invalid_or_duplicate_entry');
      seenCanonicalUrls.add(canonicalUrl);

      const externalId = (collectText(entry.guid) || collectText(entry.id) || canonicalUrl).slice(0, 1000);
      const publishedAt = normalizeDate(
        collectText(entry.pubDate) || collectText(entry.published) || collectText(entry.updated),
      );
      const author = htmlToPlainText(
        collectText(entry.creator) || collectText(entry.author),
      ).slice(0, 300) || null;
      const contentText = htmlToPlainText(extractContent(entry));
      const assessment = assessFeedItemQuality({
        title,
        canonicalUrl,
        publishedAt,
        author,
        contentText,
        trustTier: source.trustTier,
        now,
      });
      const summary = contentText ? contentText.slice(0, 1000) : null;
      const contentHash = await sha256Hex([
        PARSER_VERSION,
        title,
        canonicalUrl,
        author ?? '',
        publishedAt ?? '',
        contentText,
      ].join('\n'));

      items.push({
        externalId,
        canonicalUrl,
        title,
        author,
        language: source.language,
        publishedAt,
        summary,
        contentHash,
        qualityScore: assessment.score,
        qualityFlags: assessment.flags,
      });
    } catch {
      itemsRejected += 1;
    }
  }

  if (items.length === 0) throw new Error('feed_has_no_valid_entries');

  return {
    items,
    itemsSeen: consideredEntries.length,
    itemsRejected,
  };
}

export { PARSER_VERSION };
