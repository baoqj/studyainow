export type ArticleBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string };

export function markdownToBlocks(markdown: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list });
    list = [];
  };
  for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n').slice(0, 5000)) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      flushParagraph(); flushList();
      if (code) { blocks.push({ type: 'code', text: code.join('\n') }); code = null; }
      else code = [];
      continue;
    }
    if (code) { code.push(rawLine); continue; }
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      blocks.push({ type: 'heading', level: heading[1] === '##' ? 2 : 3, text: heading[2] ?? '' });
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) { flushParagraph(); list.push(item[1] ?? ''); continue; }
    if (line.startsWith('> ')) { flushParagraph(); flushList(); blocks.push({ type: 'quote', text: line.slice(2) }); continue; }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  if (code) blocks.push({ type: 'code', text: code.join('\n') });
  return blocks;
}
