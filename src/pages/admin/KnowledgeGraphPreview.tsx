import { AlertTriangle, CircleDot, Database, GitBranch, Network, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AppLocale } from '../../data/courseContent';
import { getKnowledgeGraphCopy } from '../../data/knowledgeGraphCopy';

type Summary = { approved_skills: number; approved_relations: number; approved_job_evidence: number; approved_course_coverage: number; pending_skill_candidates: number; pending_relation_candidates: number; outstanding_queue: number };
type Node = { id: string; slug: string; name_zh: string; name_en: string; definition: string; category: string; difficulty: string; job_evidence_count: number; course_coverage_count: number; incoming_relation_count: number; outgoing_relation_count: number };
type Edge = { id: string; relation_type: string; weight: number; confidence: number; evidence: string; from_id: string; from_slug: string; from_name_zh: string; from_name_en: string; to_id: string; to_slug: string; to_name_zh: string; to_name_en: string };
type QueueRow = { source_type: string; status: string; count: number; oldest_at: string | null };
type Run = { provider: string | null; model: string | null; status: string; count: number; last_started_at: string | null };
type Preview = { generatedAt: string; summary: Summary; nodes: Node[]; edges: Edge[]; queue: QueueRow[]; runs: Run[] };

const number = new Intl.NumberFormat();

function date(value: string | null, locale: AppLocale) {
  if (!value) return '—';
  const parsed = new Date(value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat(locale === 'zh-CN' || locale === 'zh-TW' ? locale : locale === 'en' ? 'en-CA' : `${locale}-CA`, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function skillName(node: Pick<Node, 'name_zh' | 'name_en'> | Pick<Edge, 'from_name_zh' | 'from_name_en'> | Pick<Edge, 'to_name_zh' | 'to_name_en'>, locale: AppLocale) {
  const values = node as Record<string, string>;
  const zh = values.name_zh ?? values.from_name_zh ?? values.to_name_zh;
  const en = values.name_en ?? values.from_name_en ?? values.to_name_en;
  return locale.startsWith('zh') ? zh || en : en || zh;
}

function GraphCanvas({ nodes, edges, locale, empty }: { nodes: Node[]; edges: Edge[]; locale: AppLocale; empty: string }) {
  const graphNodes = nodes.slice(0, 28);
  const positions = useMemo(() => {
    const radiusX = 350; const radiusY = 150; const centerX = 460; const centerY = 220;
    return new Map(graphNodes.map((node, index) => {
      const theta = (Math.PI * 2 * index / Math.max(graphNodes.length, 1)) - Math.PI / 2;
      return [node.id, { x: centerX + Math.cos(theta) * radiusX, y: centerY + Math.sin(theta) * radiusY }];
    }));
  }, [graphNodes]);
  const graphEdges = edges.filter((edge) => positions.has(edge.from_id) && positions.has(edge.to_id));
  if (!graphEdges.length) return <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-10 text-sm leading-6 text-on-surface-variant">{empty}</div>;
  return <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low"><svg viewBox="0 0 920 440" role="img" aria-label="Approved skill relation graph" className="min-w-[760px] w-full">
    <defs><marker id="kg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" /></marker></defs>
    {graphEdges.map((edge) => { const from = positions.get(edge.from_id)!; const to = positions.get(edge.to_id)!; return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth={Math.max(1.5, edge.weight * 4)} className="stroke-primary/55" markerEnd="url(#kg-arrow)"><title>{`${edge.from_slug} ${edge.relation_type} ${edge.to_slug}`}</title></line>; })}
    {graphNodes.map((node) => { const point = positions.get(node.id)!; const label = skillName(node, locale); return <g key={node.id}><circle cx={point.x} cy={point.y} r="28" className="admin-graph-node" strokeWidth="2" /><text x={point.x} y={point.y + 4} textAnchor="middle" className="admin-graph-label text-[11px] font-semibold">{label.length > 18 ? `${label.slice(0, 18)}…` : label}</text></g>; })}
  </svg></div>;
}

export function KnowledgeGraphPreview() {
  const locale: AppLocale = 'zh-CN';
  const copy = getKnowledgeGraphCopy(locale);
  const [data, setData] = useState<Preview | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  async function load(value = submittedQuery) {
    setState('loading');
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (value) params.set('q', value);
      const response = await fetch(`/api/admin/knowledge-graph/preview?${params}`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('preview unavailable');
      setData(await response.json() as Preview); setState('ready');
    } catch { setState('error'); }
  }
  useEffect(() => { void load(''); }, []);

  const metrics = data ? [
    [copy.approvedSkills, data.summary.approved_skills, ShieldCheck], [copy.approvedRelations, data.summary.approved_relations, GitBranch], [copy.jobEvidence, data.summary.approved_job_evidence, CircleDot], [copy.courseCoverage, data.summary.approved_course_coverage, Database], [copy.queued, data.summary.outstanding_queue, Network],
  ] : [];
  return <div className="min-w-0 space-y-5 text-on-surface">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" />{copy.approvedOnly}</div><h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1><p className="mt-1 max-w-3xl text-xs leading-5 text-on-surface-variant">{copy.intro}</p></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-container"><RefreshCw className="h-4 w-4" />{copy.refresh}</button></header>
    {state === 'loading' && !data ? <p className="rounded-xl bg-surface-container-low p-8 text-center text-on-surface-variant">{copy.loading}</p> : null}
    {state === 'error' ? <p className="rounded-xl border border-error/30 bg-error-container/30 p-5 text-sm text-on-error-container">{copy.loadError}</p> : null}
    {data ? <><section className="grid overflow-hidden border-y border-outline-variant bg-surface-container-lowest sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value, Icon], index) => <article key={String(label)} className={`p-4 ${index ? 'border-t border-outline-variant/60 sm:border-l sm:border-t-0' : ''}`}><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-2xl font-bold">{number.format(value as number)}</p><p className="mt-1 text-xs text-on-surface-variant">{String(label)}</p></article>)}</section>
      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_290px]"><div className="min-w-0 border border-outline-variant bg-surface-container-lowest p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{copy.graph}</h2><p className="mt-1 text-xs text-on-surface-variant">{copy.graphLegend}</p></div><span className="text-sm text-on-surface-variant">{data.nodes.length} {copy.nodes} · {data.edges.length} {copy.edges}</span></div><div className="mt-5 min-w-0"><GraphCanvas nodes={data.nodes} edges={data.edges} locale={locale} empty={copy.graphEmpty} /></div></div>
        <aside className="min-w-0 border border-outline-variant bg-surface-container-lowest p-5"><h2 className="text-sm font-semibold">{copy.reviewNote}</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-on-surface-variant">{copy.pendingSkills}</dt><dd className="font-semibold">{number.format(data.summary.pending_skill_candidates)}</dd></div><div className="flex justify-between gap-4"><dt className="text-on-surface-variant">{copy.pendingRelations}</dt><dd className="font-semibold">{number.format(data.summary.pending_relation_candidates)}</dd></div><div className="border-t border-outline-variant pt-4 text-xs text-on-surface-variant">{copy.refreshed}: {date(data.generatedAt, locale)}</div></dl></aside></section>
      <section className="border border-outline-variant bg-surface-container-lowest p-5"><form onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(query.trim()); void load(query.trim()); }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold">{copy.nodeDetail}</h2><label className="flex min-w-0 items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-2 sm:w-80"><Search className="h-4 w-4 shrink-0 text-outline" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="w-full bg-transparent text-sm outline-none" /></label></form><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-outline-variant text-xs text-on-surface-variant"><tr><th className="pb-3 font-medium">{copy.nodeDetail}</th><th className="pb-3 font-medium">{copy.evidence}</th><th className="pb-3 font-medium">{copy.coverage}</th><th className="pb-3 font-medium">{copy.incoming}</th><th className="pb-3 font-medium">{copy.outgoing}</th></tr></thead><tbody>{data.nodes.map((node) => <tr key={node.id} className="border-b border-outline-variant/60"><td className="py-3 pr-4"><p className="font-semibold">{skillName(node, locale)}</p><p className="mt-1 text-xs text-on-surface-variant">{node.slug} · {node.category}</p></td><td className="py-3">{number.format(node.job_evidence_count)}</td><td className="py-3">{number.format(node.course_coverage_count)}</td><td className="py-3">{number.format(node.incoming_relation_count)}</td><td className="py-3">{number.format(node.outgoing_relation_count)}</td></tr>)}</tbody></table></div></section>
      <section className="grid min-w-0 gap-4 lg:grid-cols-2"><div className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5"><h2 className="font-h2 text-xl">{copy.queue}</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-b border-outline-variant text-xs text-on-surface-variant"><tr><th className="pb-3 font-medium">{copy.source}</th><th className="pb-3 font-medium">{copy.status}</th><th className="pb-3 font-medium">{copy.count}</th><th className="pb-3 font-medium">{copy.oldest}</th></tr></thead><tbody>{data.queue.map((item, index) => <tr key={`${item.source_type}-${item.status}-${index}`} className="border-b border-outline-variant/60"><td className="py-3">{item.source_type}</td><td className="py-3"><span className="rounded-full bg-surface-container-high px-2 py-1 text-xs">{item.status}</span></td><td className="py-3">{number.format(item.count)}</td><td className="py-3 text-xs text-on-surface-variant">{date(item.oldest_at, locale)}</td></tr>)}</tbody></table></div></div>
        <div className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5"><h2 className="font-h2 text-xl">{copy.analysisRuns}</h2>{data.runs.length ? <div className="mt-4 space-y-3">{data.runs.map((run, index) => <div key={`${run.provider}-${run.model}-${run.status}-${index}`} className="rounded-lg bg-surface-container-low p-3 text-sm"><p className="font-semibold">{run.provider ?? '—'} · {run.model ?? '—'}</p><p className="mt-1 text-xs text-on-surface-variant">{run.status} · {number.format(run.count)} · {copy.lastRun}: {date(run.last_started_at, locale)}</p></div>)}</div> : <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant"><AlertTriangle className="h-4 w-4 shrink-0" />{copy.noRuns}</p>}</div></section>
    </> : null}
  </div>;
}
