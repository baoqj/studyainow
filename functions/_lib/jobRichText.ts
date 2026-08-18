/**
 * The public job-description format deliberately has a very small surface:
 * no HTML, classes, inline styles, media, or executable attributes are ever
 * persisted.  Plain text generated here is the canonical search and evidence
 * coordinate system, so do not change its separators without a data migration.
 */
export type JobRichTextInline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: JobRichTextInline[] }
  | { type: 'link'; href: string; children: JobRichTextInline[] };

export type JobRichTextBlock =
  | { type: 'heading'; level: 2 | 3 | 4; children: JobRichTextInline[] }
  | { type: 'paragraph'; children: JobRichTextInline[] }
  | { type: 'list'; ordered: boolean; items: JobRichTextInline[][] };

export type JobRichTextDocument = { version: 1; blocks: JobRichTextBlock[] };

type InlineContainer = { tag: 'bold' | 'link'; parent: JobRichTextInline[]; children: JobRichTextInline[] };
type ActiveBlock = { type: 'heading' | 'paragraph'; level?: 2 | 3 | 4; children: JobRichTextInline[] };
type ActiveList = { ordered: boolean; items: JobRichTextInline[][] };

const SKIP_CONTENT_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'form', 'input', 'button', 'textarea',
  'select', 'option', 'video', 'audio', 'canvas', 'noscript',
]);
const ENCODED_TAG_PATTERN = /&(?:lt|#0*60|#x0*3c);/i;

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeCodePoint(parseInt(code, 16)));
}

function safeCodePoint(value: number) {
  try {
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
  } catch {
    return '';
  }
}

/**
 * Some ATS APIs escape an HTML fragment inside their JSON response. Decode a
 * small, bounded number of layers before tokenizing so `<h2>` and friends are
 * treated as allowed structure, not displayed as literal text. A decoded
 * disallowed tag is still dropped by the normal parser below.
 */
function decodeMarkup(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 3 && ENCODED_TAG_PATTERN.test(decoded); pass += 1) decoded = decodeEntities(decoded);
  return decoded;
}

function safeHref(rawTag: string) {
  const match = rawTag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const candidate = decodeEntities((match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim());
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeInlines(children: JobRichTextInline[]): JobRichTextInline[] {
  const output: JobRichTextInline[] = [];
  for (const child of children) {
    if (child.type === 'text') {
      const text = child.text.replace(/\s+/g, ' ');
      if (!text) continue;
      const previous = output.at(-1);
      if (previous?.type === 'text') previous.text += text;
      else output.push({ type: 'text', text });
      continue;
    }
    const nested = normalizeInlines(child.children);
    if (!nested.length) continue;
    output.push(child.type === 'bold' ? { type: 'bold', children: nested } : { type: 'link', href: child.href, children: nested });
  }
  return output;
}

function inlineText(children: JobRichTextInline[]) {
  return children.map((child) => child.type === 'text' ? child.text : inlineText(child.children)).join('');
}

function edgeTextLeaf(children: JobRichTextInline[], fromEnd: boolean): Extract<JobRichTextInline, { type: 'text' }> | null {
  const nodes = fromEnd ? [...children].reverse() : children;
  for (const node of nodes) {
    if (node.type === 'text') return node;
    const nested = edgeTextLeaf(node.children, fromEnd);
    if (nested) return nested;
  }
  return null;
}

/**
 * The canonical text trims each block and list item. Apply that same trimming
 * to the stored render tree so evidence offsets never drift from React's text
 * nodes because an ATS appended whitespace inside the final inline element.
 */
function trimInlineEdges(children: JobRichTextInline[]) {
  const normalized = normalizeInlines(children);
  const first = edgeTextLeaf(normalized, false);
  const last = edgeTextLeaf(normalized, true);
  if (first) first.text = first.text.replace(/^\s+/, '');
  if (last) last.text = last.text.replace(/\s+$/, '');
  return normalizeInlines(normalized);
}

export function normalizeJobRichText(document: JobRichTextDocument): JobRichTextDocument {
  const blocks: JobRichTextBlock[] = [];
  for (const block of document.blocks) {
    if (block.type === 'list') {
      const items = block.items.map(trimInlineEdges).filter((item) => inlineText(item).trim());
      if (items.length) blocks.push({ type: 'list', ordered: block.ordered, items });
      continue;
    }
    const children = trimInlineEdges(block.children);
    if (!inlineText(children).trim()) continue;
    blocks.push(block.type === 'heading'
      ? { type: 'heading', level: block.level, children }
      : { type: 'paragraph', children });
  }
  return { version: 1, blocks };
}

function appendText(target: JobRichTextInline[], value: string) {
  const text = decodeEntities(value).replace(/\u0000/g, ' ');
  if (text) target.push({ type: 'text', text });
}

function closeInline(stack: InlineContainer[], tag: 'bold' | 'link') {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].tag === tag) {
      const parent = stack[index].parent;
      stack.splice(index);
      return parent;
    }
  }
  return null;
}

function documentFromHtml(sourceHtml: string): JobRichTextDocument {
  const html = decodeMarkup(sourceHtml);
  const blocks: JobRichTextBlock[] = [];
  const root: JobRichTextInline[] = [];
  let current = root;
  let activeBlock: ActiveBlock | null = null;
  let activeList: ActiveList | null = null;
  let activeListItem: JobRichTextInline[] | null = null;
  const inlineStack: InlineContainer[] = [];
  let skippedDepth = 0;

  const resetCurrent = () => {
    current = activeListItem ?? activeBlock?.children ?? root;
  };
  const flushRoot = () => {
    const children = normalizeInlines(root.splice(0));
    if (inlineText(children).trim()) blocks.push({ type: 'paragraph', children });
  };
  const finishBlock = () => {
    if (!activeBlock) return;
    const children = normalizeInlines(activeBlock.children);
    if (inlineText(children).trim()) {
      blocks.push(activeBlock.type === 'heading'
        ? { type: 'heading', level: activeBlock.level ?? 2, children }
        : { type: 'paragraph', children });
    }
    activeBlock = null;
    inlineStack.length = 0;
    resetCurrent();
  };
  const finishListItem = () => {
    if (!activeList || !activeListItem) return;
    const item = normalizeInlines(activeListItem);
    if (inlineText(item).trim()) activeList.items.push(item);
    activeListItem = null;
    inlineStack.length = 0;
    resetCurrent();
  };
  const finishList = () => {
    if (!activeList) return;
    finishListItem();
    if (activeList.items.length) blocks.push({ type: 'list', ordered: activeList.ordered, items: activeList.items });
    activeList = null;
    inlineStack.length = 0;
    resetCurrent();
  };
  const startBlock = (type: 'heading' | 'paragraph', level?: 2 | 3 | 4) => {
    // Greenhouse and similar ATSs commonly wrap list item text as `<li><p>`.
    // That paragraph is part of the list item, not an independent paragraph.
    if (activeListItem) {
      current = activeListItem;
      return;
    }
    finishBlock();
    if (!activeListItem) flushRoot();
    activeBlock = { type, level, children: [] };
    current = activeBlock.children;
  };
  const pushInline = (tag: 'bold' | 'link', href?: string) => {
    const node: JobRichTextInline = tag === 'bold'
      ? { type: 'bold', children: [] }
      : { type: 'link', href: href!, children: [] };
    current.push(node);
    const children = node.children;
    inlineStack.push({ tag, parent: current, children });
    current = children;
  };

  const token = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)(?:\s+[^<>]*?)?\s*\/?>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    if (!skippedDepth) appendText(current, html.slice(cursor, match.index));
    cursor = token.lastIndex;
    const raw = match[0];
    const name = (match[1] ?? '').toLowerCase();
    if (!name) continue;
    const closing = /^<\//.test(raw);
    const selfClosing = /\/\s*>$/.test(raw) || name === 'br';

    if (SKIP_CONTENT_TAGS.has(name)) {
      if (closing) skippedDepth = Math.max(0, skippedDepth - 1);
      else if (!selfClosing) skippedDepth += 1;
      continue;
    }
    if (skippedDepth) continue;

    if (closing) {
      switch (name) {
        case 'strong': case 'b': current = closeInline(inlineStack, 'bold') ?? current; break;
        case 'a': current = closeInline(inlineStack, 'link') ?? current; break;
        case 'p': case 'div': case 'section': case 'article': finishBlock(); break;
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': finishBlock(); break;
        case 'li': finishListItem(); break;
        case 'ul': case 'ol': finishList(); break;
      }
      continue;
    }

    switch (name) {
      case 'br': appendText(current, ' '); break;
      case 'p': case 'div': case 'section': case 'article':
        if (name === 'div' && activeBlock) break;
        startBlock('paragraph');
        break;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        startBlock('heading', Math.min(4, Math.max(2, Number(name.slice(1)))) as 2 | 3 | 4);
        break;
      case 'ul': case 'ol':
        finishBlock(); flushRoot(); finishList();
        activeList = { ordered: name === 'ol', items: [] };
        resetCurrent();
        break;
      case 'li':
        if (!activeList) { flushRoot(); activeList = { ordered: false, items: [] }; }
        finishListItem();
        activeListItem = [];
        current = activeListItem;
        break;
      case 'strong': case 'b': pushInline('bold'); break;
      case 'a': {
        const href = safeHref(raw);
        if (href) pushInline('link', href);
        break;
      }
    }
  }
  if (!skippedDepth) appendText(current, html.slice(cursor));
  finishBlock();
  finishList();
  flushRoot();
  return { version: 1, blocks };
}

export function jobRichTextFromValue(value: unknown): JobRichTextDocument {
  if (typeof value !== 'string' || !value.trim()) return { version: 1, blocks: [] };
  return normalizeJobRichText(documentFromHtml(value));
}

export function jobRichTextFromParts(...values: unknown[]) {
  const documents = values.map(jobRichTextFromValue).filter((document) => document.blocks.length);
  return { version: 1 as const, blocks: documents.flatMap((document) => document.blocks) };
}

export function jobRichTextBlockText(block: JobRichTextBlock) {
  if (block.type === 'list') {
    return block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : '•'} ${inlineText(item).trim()}`).join('\n');
  }
  return inlineText(block.children).trim();
}

/** Canonical text for full-text search, skill detection and evidence offsets. */
export function jobRichTextToPlainText(document: JobRichTextDocument) {
  return document.blocks.map(jobRichTextBlockText).filter(Boolean).join('\n\n').trim();
}

function parseInlines(value: unknown): JobRichTextInline[] | null {
  if (!Array.isArray(value)) return null;
  const result: JobRichTextInline[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const node = item as Record<string, unknown>;
    if (node.type === 'text' && typeof node.text === 'string') result.push({ type: 'text', text: node.text.slice(0, 20_000) });
    else if (node.type === 'bold') {
      const children = parseInlines(node.children);
      if (!children) return null;
      result.push({ type: 'bold', children });
    } else if (node.type === 'link' && typeof node.href === 'string') {
      const href = safeHref(`href="${node.href.replace(/"/g, '&quot;')}"`);
      const children = parseInlines(node.children);
      if (!href || !children) return null;
      result.push({ type: 'link', href, children });
    } else return null;
  }
  return normalizeInlines(result);
}

/** Reject malformed/untrusted stored JSON rather than rendering it. */
export function parseJobRichText(value: unknown): JobRichTextDocument | null {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return null; }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const source = parsed as Record<string, unknown>;
  if (source.version !== 1 || !Array.isArray(source.blocks)) return null;
  const blocks: JobRichTextBlock[] = [];
  for (const item of source.blocks) {
    if (!item || typeof item !== 'object') return null;
    const block = item as Record<string, unknown>;
    if (block.type === 'heading' && (block.level === 2 || block.level === 3 || block.level === 4)) {
      const children = parseInlines(block.children);
      if (!children) return null;
      blocks.push({ type: 'heading', level: block.level, children });
    } else if (block.type === 'paragraph') {
      const children = parseInlines(block.children);
      if (!children) return null;
      blocks.push({ type: 'paragraph', children });
    } else if (block.type === 'list' && typeof block.ordered === 'boolean' && Array.isArray(block.items)) {
      const items = block.items.map(parseInlines);
      if (items.some((entry) => entry === null)) return null;
      blocks.push({ type: 'list', ordered: block.ordered, items: items as JobRichTextInline[][] });
    } else return null;
  }
  return normalizeJobRichText({ version: 1, blocks });
}
