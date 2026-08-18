import { CheckCircle2, Copy } from 'lucide-react';
import React from 'react';

export interface ArticleHeading {
  id: string;
  level: number;
  text: string;
}

type Block =
  | { type: 'blockquote'; text: string }
  | { type: 'code'; code: string; language: string }
  | { type: 'heading'; id: string; level: number; text: string }
  | { type: 'image'; alt: string; src: string; caption: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function normalizeId(text: string, index: number) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `section-${index}-${normalized || 'heading'}`;
}

function stripFirstTitle(markdown: string) {
  return markdown.replace(/^# .+\n+/, '').trim();
}

function parseBlocks(markdown: string) {
  const lines = stripFirstTitle(markdown).replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let index = 0;
  let headingIndex = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (image) {
      blocks.push({ type: 'image', alt: image[1].trim(), src: image[2], caption: image[3]?.trim() ?? '' });
      index += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        type: 'code',
        language: fence[1] ?? 'text',
        code: codeLines.join('\n'),
      });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const text = heading[2].trim();
      blocks.push({
        type: 'heading',
        id: normalizeId(text, headingIndex),
        level: heading[1].length,
        text,
      });
      headingIndex += 1;
      index += 1;
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1])) {
      const tableLines: string[] = [];

      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());

      blocks.push({
        type: 'table',
        headers: parseRow(tableLines[0]),
        rows: tableLines.slice(2).map(parseRow),
      });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];

      while (
        index < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*]\s+/.test(lines[index]))
      ) {
        items.push(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, '').trim());
        index += 1;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('```') &&
      !/^(#{2,4})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].startsWith('>')
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

export function extractHeadings(markdown: string): ArticleHeading[] {
  return parseBlocks(markdown)
    .filter((block): block is Extract<Block, { type: 'heading' }> => block.type === 'heading')
    .filter((heading) => heading.level <= 3)
    .map(({ id, level, text }) => ({ id, level, text }));
}

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-on-surface">
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={index} className="break-all rounded bg-surface-container px-1.5 py-0.5 font-code-block text-[0.92em] text-primary">
          {token.slice(1, -1)}
        </code>
      );
    }

    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} className="font-medium text-primary underline underline-offset-4">
          {link[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <article className="min-w-0 space-y-7">
      {parseBlocks(markdown).map((block, index) => {
        if (block.type === 'heading') {
          const size =
            block.level === 2
              ? 'font-h2 text-h2 mt-12'
              : block.level === 3
                ? 'font-h3 text-h3 mt-10'
                : 'text-xl font-semibold mt-8';
          const className = `${size} break-words scroll-mt-24 text-on-surface`;

          if (block.level === 2) {
            return (
              <h2 id={block.id} key={`${block.id}-${index}`} className={className}>
                {block.text}
              </h2>
            );
          }

          if (block.level === 3) {
            return (
              <h3 id={block.id} key={`${block.id}-${index}`} className={className}>
                {block.text}
              </h3>
            );
          }

          return (
            <h4 id={block.id} key={`${block.id}-${index}`} className={className}>
              {block.text}
            </h4>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="break-words font-body-lg text-body-lg text-on-surface-variant">
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={`${block.src}-${index}`} className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <img src={block.src} alt={block.alt} loading="lazy" className="h-auto w-full object-cover" />
              {block.caption && <figcaption className="border-t border-outline-variant px-4 py-3 text-sm text-on-surface-variant">{block.caption}</figcaption>}
            </figure>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote key={index} className="break-words border-l-4 border-primary bg-surface-container-low px-5 py-4 text-on-surface-variant">
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'code') {
          return (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-700 bg-[#111827] shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-700 bg-[#1f2937] px-4 py-2">
                <span className="font-code-block text-xs text-slate-300">{block.language}</span>
                <button className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white">
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-code-block text-code-block text-slate-200">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header} className="border-b border-outline-variant px-4 py-3 font-label-sm text-on-surface">
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-surface-container-low/50">
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-on-surface-variant">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const ListTag = block.ordered ? 'ol' : 'ul';

        return (
          <ListTag
            key={index}
            className={`space-y-3 text-on-surface-variant ${block.ordered ? 'list-decimal pl-6' : 'list-none'}`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className={`min-w-0 ${block.ordered ? 'pl-1 text-body-md' : 'flex gap-3 text-body-md'}`}>
                {!block.ordered && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />}
                <span className="min-w-0 break-words">{renderInline(item)}</span>
              </li>
            ))}
          </ListTag>
        );
      })}
    </article>
  );
}
