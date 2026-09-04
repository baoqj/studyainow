import {
  AlertTriangle,
  Archive,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  FilePenLine,
  GraduationCap,
  Layers3,
  LoaderCircle,
  Newspaper,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Section = 'overview' | 'sources' | 'candidates' | 'learning' | 'articles' | 'taxonomy';

interface DashboardCounts {
  pendingEnrichment: number; candidates: number; drafts: number;
  inReview: number; live: number; withdrawn: number;
}
interface SourceHealth {
  id: string; name: string; sourceType: string; trustTier: string; status: string;
  policyStatus: string; robotsStatus: string; fetchUrl: string; lastSuccessAt: string | null;
  consecutiveFailures: number; latestQualityAverage: number | null;
}
interface TaxonomyNode {
  id: string; type: 'category' | 'tag'; slug: string; name: string; aliases: string[];
  status: 'active' | 'merged' | 'retired'; locked: boolean; usageCount: number;
}
interface Candidate {
  id: string; title: string; occurredAt: string | null; status: string; locked: boolean;
  sourceCount: number; maxQualityScore: number | null;
  category: { id: string; name: string; confidence: number; locked: boolean } | null;
  tags: Array<{ id: string; name: string; locked: boolean }>;
  entities: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; sourceName: string; title: string; url: string; relationType: string; qualityScore: number | null }>;
  articleId: string | null; articleStatus: string | null;
}
interface Claim {
  id: string; claimText: string; claimType: string; supportStatus: string;
  riskLevel: string; importance: string; checkedAt: string | null; reviewerRef: string | null;
}
interface Evidence {
  id: string; claimId: string; itemId: string; sourceUrl: string;
  evidenceExcerpt: string; sourceTier: string; isPrimary: boolean;
}
interface StoryResearch {
  story: { id: string; title: string; status: string; locked: number };
  sources: Array<{ itemId: string; sourceName: string; sourceTier: string; title: string; summary: string | null; url: string; relationType: string }>;
  researchPackage: null | { id: string; version: number; status: string; sourceCount: number; claimCount: number; conflictCount: number; generatorVersion: string; createdAt: string };
  claims: Claim[]; evidence: Evidence[]; learningLinks: LearningLink[];
}
interface LearningLink {
  id: string; storyId: string; storyTitle: string; articleId: string | null;
  objectType: 'skill' | 'course'; coreObjectId: string; coreSlug: string;
  coreTitle: string; coreUrl: string; relevanceScore: number; keywordScore: number;
  vectorScore: number; relationshipType: string; impactType: string;
  evidenceExcerpt: string; reason: string; catalogVersion: string;
  retrievalVersion: string; embeddingVersion: string; reviewStatus: string;
  reviewerRef: string | null; reviewedAt: string | null; updatedAt: string;
}
interface ArticleSummary {
  id: string; status: string; articleType: string; accessLevel: string; version: number;
  title: string; summary: string; updatedAt: string; publishedAt: string | null;
  category: { id: string; name: string } | null; tags: Array<{ id: string; name: string }>;
}
interface Revision {
  id: string; revisionNumber: number; locale: string; slug: string; title: string;
  summary: string; bodyMarkdown: string; changeReason: string; editorRef: string; createdAt: string;
}
interface ArticleDetail {
  id: string; storyId: string | null; articleType: string; status: string; accessLevel: string;
  primaryLocale: string; activeRevisionId: string; version: number;
  locale: { slug: string }; revisions: Revision[];
  taxonomy: Array<{ id: string; name: string; taxonomyType: 'category' | 'tag' }>;
  claims: Array<Claim & { hasEvidence: boolean }>;
  factChecks: Array<{ action: string; coveragePercent: number; status: string; checkedAt: string }>;
  audit: Array<{ action: string; actorRef: string; reason: string; createdAt: string }>;
}

const NAV: Array<{ key: Section; label: string; icon: typeof Newspaper }> = [
  { key: 'overview', label: '编辑总览', icon: Layers3 },
  { key: 'sources', label: '采集来源', icon: BookOpenCheck },
  { key: 'candidates', label: '候选与 Claims', icon: ShieldCheck },
  { key: 'learning', label: '技能与课程', icon: GraduationCap },
  { key: 'articles', label: '文章与发布', icon: FilePenLine },
  { key: 'taxonomy', label: '分类与标签', icon: Tags },
];
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿', in_review: '待审核', scheduled: '已定时', published: '已上架',
  rejected: '已驳回', corrected: '已更正', distributed: '已分发', withdrawn: '已下架',
  supported: '已支持', conflicted: '有冲突', unverified: '待核验', rejected_claim: '已拒绝',
  suggested: '待人工复核', stale: '目录已失效',
};
const fieldClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-md bg-[#123a5f] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0b2b49] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50';

function formatTime(value: string | null | undefined) {
  if (!value) return '尚无记录';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function sectionFromPath(path: string): Section {
  if (path.includes('/sources')) return 'sources';
  if (path.includes('/candidates') || path.includes('/stories/')) return 'candidates';
  if (path.includes('/learning')) return 'learning';
  if (path.includes('/articles')) return 'articles';
  if (path.includes('/taxonomy')) return 'taxonomy';
  return 'overview';
}
function slugFromTitle(title: string) {
  return title.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || `news-${Date.now().toString(36)}`;
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (!['GET', 'HEAD'].includes(method)) {
    headers.set('content-type', 'application/json');
    headers.set('x-news-csrf', '1');
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } | string };
  if (!response.ok) {
    const detail = typeof payload.error === 'string' ? payload.error : payload.error?.message ?? payload.error?.code;
    throw new Error(detail || `请求失败 (${response.status})`);
  }
  return payload;
}
function Badge({ value }: { value: string }) {
  const warning = ['conflicted', 'unverified', 'rejected', 'withdrawn'].includes(value);
  const success = ['supported', 'published', 'corrected', 'active', 'approved'].includes(value);
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${warning ? 'bg-amber-100 text-amber-800' : success ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{STATUS_LABELS[value] ?? value}</span>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string; key?: string }) {
  return <section className={`border border-slate-200 bg-white ${className}`}>{children}</section>;
}

export function AdminNews() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = sectionFromPath(location.pathname);
  const storyId = location.pathname.match(/\/stories\/([^/]+)$/)?.[1] ?? null;
  const articleId = location.pathname.match(/\/articles\/([^/]+)$/)?.[1] ?? null;
  const [counts, setCounts] = useState<DashboardCounts>({ pendingEnrichment: 0, candidates: 0, drafts: 0, inReview: 0, live: 0, withdrawn: 0 });
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [learningLinks, setLearningLinks] = useState<LearningLink[]>([]);
  const [story, setStory] = useState<StoryResearch | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboard, sourcePayload, taxonomyPayload, candidatePayload, articlePayload, learningPayload] = await Promise.all([
        api<{ counts: DashboardCounts }>('/api/admin/news/dashboard'),
        api<{ sources: SourceHealth[] }>('/api/admin/news/sources'),
        api<{ taxonomy: TaxonomyNode[] }>('/api/admin/news/taxonomy'),
        api<{ candidates: Candidate[] }>('/api/admin/news/candidates?limit=60'),
        api<{ articles: ArticleSummary[] }>('/api/admin/news/articles?limit=60'),
        api<{ learningLinks: LearningLink[] }>('/api/admin/news/learning-links?limit=100'),
      ]);
      setCounts(dashboard.counts); setSources(sourcePayload.sources); setTaxonomy(taxonomyPayload.taxonomy);
      setCandidates(candidatePayload.candidates); setArticles(articlePayload.articles); setLearningLinks(learningPayload.learningLinks);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '新闻管理数据载入失败'); }
    finally { setLoading(false); }
  }, []);

  const loadStory = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    try { setStory(await api<StoryResearch>(`/api/admin/news/stories/${encodeURIComponent(id)}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Research Package 载入失败'); }
    finally { setLoading(false); }
  }, []);
  const loadArticle = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    try { setArticle((await api<{ article: ArticleDetail }>(`/api/admin/news/articles/${encodeURIComponent(id)}`)).article); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '文章载入失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadLists(); }, [loadLists]);
  useEffect(() => { if (storyId) void loadStory(storyId); else setStory(null); }, [loadStory, storyId]);
  useEffect(() => { if (articleId) void loadArticle(articleId); else setArticle(null); }, [articleId, loadArticle]);

  async function mutate(work: () => Promise<void>, success: string) {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); setMessage(success); await loadLists(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '操作失败'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5" data-news-admin-root>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Unified editorial control</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">新闻管理</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">采集、Research Package、Claim Ledger、编辑、人工审核与上下架统一由 StudyAINow 管理员身份保护。</p>
      </div>
      <button className={secondaryButton} onClick={() => void loadLists()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新</button>
    </header>

    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="新闻管理功能">
      {NAV.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => navigate(key === 'overview' ? '/admin/news' : `/admin/news/${key}`)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${section === key ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}
    </nav>

    {message && <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><CheckCircle2 className="h-4 w-4" />{message}</div>}
    {error && <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>操作未完成</strong><p className="mt-0.5">{error}</p></div></div>}
    {loading && !story && !article && <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />正在载入新闻工作台…</div>}

    {!loading && section === 'overview' && <Overview counts={counts} sources={sources} onNavigate={(next) => navigate(`/admin/news/${next}`)} />}
    {!loading && section === 'sources' && <SourcesPanel sources={sources} busy={busy} run={(sourceId) => mutate(async () => { await api(`/api/admin/news/sources/${sourceId}/run`, { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: '{}' }); }, '采集与候选聚类已完成。')} />}
    {!storyId && !loading && section === 'candidates' && <CandidatesPanel candidates={candidates} taxonomy={taxonomy} busy={busy} navigate={navigate} enrich={() => mutate(async () => { await api('/api/admin/news/candidates/enrich', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ limit: 100 }) }); }, '候选聚类与分类已刷新。')} saveMetadata={(candidate, categoryId, tagIds) => mutate(async () => { await api(`/api/admin/news/candidates/${candidate.id}`, { method: 'PATCH', body: JSON.stringify({ categoryId, tagIds, locked: true, reason: '管理员在统一后台人工核定分类与标签' }) }); }, '分类与标签已人工锁定。')} />}
    {storyId && story && <StoryPanel story={story} taxonomy={taxonomy} busy={busy} back={() => navigate('/admin/news/candidates')} refresh={() => loadStory(storyId)} generate={() => mutate(async () => { await api(`/api/admin/news/stories/${storyId}/research`, { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: '{}' }); await loadStory(storyId); }, 'Research Package 与 Claim Ledger 已生成。')} generateLearning={() => mutate(async () => { await api(`/api/admin/news/stories/${storyId}/learning-links`, { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: '{}' }); await loadStory(storyId); }, '技能与课程关联已按当前 Core 目录重新计算。')} review={(claim, supportStatus) => mutate(async () => { await api(`/api/admin/news/claims/${claim.id}`, { method: 'PATCH', body: JSON.stringify({ ...claim, supportStatus, reason: `管理员人工复核：${supportStatus}` }) }); await loadStory(storyId); }, 'Claim 审核状态已记录。')} createDraft={() => mutate(async () => {
      const supported = story.claims.filter((claim) => claim.supportStatus === 'supported');
      if (supported.length === 0) throw new Error('请先生成并核验至少一个有证据的 Claim');
      const categoryId = taxonomy.find((node) => node.type === 'category' && node.status === 'active')?.id;
      if (!categoryId) throw new Error('没有可用主分类');
      const title = story.story.title;
      const response = await api<{ articleId: string }>('/api/admin/news/articles', { method: 'POST', body: JSON.stringify({ storyId, articleType: 'brief', accessLevel: 'free', locale: 'zh-CN', slug: slugFromTitle(title), title, summary: story.sources[0]?.summary || '待编辑补充摘要。', bodyMarkdown: `## 已核验事实\n\n${supported.map((claim) => `- ${claim.claimText}`).join('\n')}\n\n## 编辑分析\n\n待人工编辑。`, categoryId, tagIds: [], claimIds: supported.map((claim) => claim.id), changeReason: '从 Claim Ledger 建立人工编辑草稿' }) });
      navigate(`/admin/news/articles/${response.articleId}`);
    }, '新闻草稿已建立。')} />}
    {!loading && section === 'learning' && <LearningPanel links={learningLinks} busy={busy} navigate={navigate} review={(link, status) => mutate(async () => { await api(`/api/admin/news/learning-links/${link.id}`, { method: 'PATCH', body: JSON.stringify({ status, expectedUpdatedAt: link.updatedAt, reason: `管理员人工复核技能/课程关联：${status}` }) }); }, '技能或课程关联审核状态已更新。')} />}
    {!articleId && !loading && section === 'articles' && <ArticlesPanel articles={articles} navigate={navigate} />}
    {articleId && article && <ArticleEditor article={article} taxonomy={taxonomy} busy={busy} back={() => navigate('/admin/news/articles')} save={(draft) => mutate(async () => { await api(`/api/admin/news/articles/${article.id}`, { method: 'PATCH', body: JSON.stringify({ ...draft, storyId: article.storyId, articleType: article.articleType, locale: article.primaryLocale, expectedVersion: article.version, claimIds: article.claims.map((claim) => claim.id) }) }); await loadArticle(article.id); }, '新修订已保存，旧版本保持不可变。')} act={(action) => mutate(async () => { await api(`/api/admin/news/articles/${article.id}/actions/${action}`, { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ reason: `管理员在统一后台执行 ${action}` }) }); await loadArticle(article.id); }, '状态变更、事实核验与审计记录已保存。')} />}
    {!loading && section === 'taxonomy' && <TaxonomyPanel taxonomy={taxonomy} busy={busy} createTag={(name, slug, aliases) => mutate(async () => { await api('/api/admin/news/taxonomy/tags', { method: 'POST', body: JSON.stringify({ name, slug, aliases }) }); }, '新标签已创建并锁定。')} update={(node, name, aliases, status) => mutate(async () => { await api(`/api/admin/news/taxonomy/${node.id}`, { method: 'PATCH', body: JSON.stringify({ name, aliases, status }) }); }, '分类或标签已更新。')} />}
  </div>;
}

function Overview({ counts, sources, onNavigate }: { counts: DashboardCounts; sources: SourceHealth[]; onNavigate: (section: Section) => void }) {
  const metrics: Array<[string, number, Section]> = [['待聚类', counts.pendingEnrichment, 'candidates'], ['候选事件', counts.candidates, 'candidates'], ['草稿', counts.drafts, 'articles'], ['待审核', counts.inReview, 'articles'], ['线上文章', counts.live, 'articles'], ['已下架', counts.withdrawn, 'articles']];
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(([label, value, target]) => <button key={label} onClick={() => onNavigate(target)} className="border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/40"><strong className="block text-2xl text-slate-950">{value}</strong><span className="mt-1 block text-xs font-semibold text-slate-500">{label}</span></button>)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel className="p-5"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 text-blue-700" /><div><h2 className="font-semibold text-slate-950">Claim 发布门禁</h2><p className="mt-2 text-sm leading-6 text-slate-600">关键事实证据覆盖率必须为 100%，普通事实至少 95%；任何高风险未验证 Claim 都会阻止提交、批准、上架和更正。</p></div></div></Panel><Panel className="p-5"><h2 className="font-semibold text-slate-950">来源健康</h2><div className="mt-3 flex items-end gap-6"><div><strong className="text-2xl">{sources.filter((source) => source.status === 'active').length}</strong><span className="ml-2 text-sm text-slate-500">个活跃来源</span></div><div><strong className="text-2xl text-amber-700">{sources.filter((source) => source.consecutiveFailures > 0).length}</strong><span className="ml-2 text-sm text-slate-500">个存在失败</span></div></div></Panel></div></div>;
}

function SourcesPanel({ sources, busy, run }: { sources: SourceHealth[]; busy: boolean; run: (id: string) => void }) {
  return <Panel><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-950">采集来源与策略状态</h2><p className="mt-1 text-sm text-slate-500">只执行已批准、robots 允许的 Feed；不使用绕过验证码、登录墙或访问控制的反爬手段。</p></div><div className="divide-y divide-slate-100">{sources.map((source) => <article key={source.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{source.name}</h3><Badge value={source.status} /><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Tier {source.trustTier}</span><span className="text-xs text-slate-500">{source.policyStatus} · robots {source.robotsStatus}</span></div><a href={source.fetchUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-blue-700 hover:underline">{source.fetchUrl}</a><p className="mt-1 text-xs text-slate-500">最近成功：{formatTime(source.lastSuccessAt)} · 最新质量：{source.latestQualityAverage ?? '—'} · 连续失败：{source.consecutiveFailures}</p></div><button className={secondaryButton} disabled={busy || source.status !== 'active' || source.policyStatus !== 'approved'} onClick={() => run(source.id)}><Play className="h-4 w-4" />立即采集</button></article>)}</div></Panel>;
}

function CandidatesPanel({ candidates, taxonomy, busy, navigate, enrich, saveMetadata }: { candidates: Candidate[]; taxonomy: TaxonomyNode[]; busy: boolean; navigate: ReturnType<typeof useNavigate>; enrich: () => void; saveMetadata: (candidate: Candidate, category: string, tags: string[]) => void }) {
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const categories = taxonomy.filter((node) => node.type === 'category' && node.status === 'active');
  const tags = taxonomy.filter((node) => node.type === 'tag' && node.status === 'active');
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">候选新闻</h2><p className="text-sm text-slate-500">逐条核对来源质量、分类、Research Package 与 Claims。</p></div><button className={primaryButton} disabled={busy} onClick={enrich}><RefreshCw className="h-4 w-4" />执行聚类与分类</button></div>{candidates.length === 0 ? <Panel className="p-8 text-center text-sm text-slate-500">暂无候选新闻。请先运行已批准来源。</Panel> : <div className="space-y-3">{candidates.map((candidate) => <Panel key={candidate.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{formatTime(candidate.occurredAt)}</span><span>{candidate.sourceCount} 个来源</span><span>质量 {candidate.maxQualityScore ?? '—'}</span>{candidate.locked && <Badge value="approved" />}</div><h3 className="mt-2 font-semibold text-slate-950">{candidate.title}</h3><div className="mt-2 flex flex-wrap gap-2">{candidate.category && <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{candidate.category.name} · {Math.round(candidate.category.confidence * 100)}%</span>}{candidate.tags.map((tag) => <span key={tag.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{tag.name}</span>)}</div><details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-blue-700">查看 {candidate.sources.length} 条来源证据</summary><ul className="mt-2 space-y-2 border-l-2 border-blue-100 pl-3">{candidate.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="text-slate-800 hover:text-blue-700 hover:underline">{source.sourceName} · {source.title}</a><span className="ml-2 text-xs text-slate-400">{source.relationType}</span></li>)}</ul></details></div><div className="flex shrink-0 flex-wrap gap-2"><button className={secondaryButton} onClick={() => { setEditing(candidate); setCategoryId(candidate.category?.id ?? categories[0]?.id ?? ''); setTagIds(candidate.tags.map((tag) => tag.id)); }}>分类/标签</button><button className={primaryButton} onClick={() => navigate(`/admin/news/stories/${candidate.id}`)}>Research / Claims<ChevronRight className="h-4 w-4" /></button>{candidate.articleId && <button className={secondaryButton} onClick={() => navigate(`/admin/news/articles/${candidate.articleId}`)}>打开文章</button>}</div></div></Panel>)}</div>}{editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true"><form className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); saveMetadata(editing, categoryId, tagIds); setEditing(null); }}><h2 className="text-lg font-semibold">人工核定分类与标签</h2><p className="mt-1 text-sm text-slate-500">{editing.title}</p><label className="mt-5 block text-sm font-medium">主分类<select className={`${fieldClass} mt-1`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><fieldset className="mt-4"><legend className="text-sm font-medium">标签（最多 10 个）</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tagIds.includes(tag.id)} disabled={!tagIds.includes(tag.id) && tagIds.length >= 10} onChange={(event) => setTagIds(event.target.checked ? [...tagIds, tag.id] : tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</div></fieldset><p className="mt-4 text-xs text-slate-500">保存后会锁定人工结果，自动分类不得覆盖。</p><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setEditing(null)}>取消</button><button className={primaryButton} disabled={busy}>保存核定</button></div></form></div>}</div>;
}

function StoryPanel({ story, busy, back, refresh, generate, generateLearning, review, createDraft }: { story: StoryResearch; taxonomy: TaxonomyNode[]; busy: boolean; back: () => void; refresh: () => Promise<void>; generate: () => void; generateLearning: () => void; review: (claim: Claim, status: string) => void; createDraft: () => void }) {
  const evidenceFor = (claimId: string) => story.evidence.filter((item) => item.claimId === claimId);
  const supported = story.claims.filter((claim) => claim.supportStatus === 'supported').length;
  return <div className="space-y-4">
    <button className="text-sm font-semibold text-blue-700 hover:underline" onClick={back}>← 返回候选列表</button>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Research package</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{story.story.title}</h2><p className="mt-1 text-sm text-slate-500">{story.sources.length} 个来源 · {story.claims.length} 个 Claims · {supported} 个已支持 · {story.learningLinks.length} 个学习关联</p></div>
      <div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />刷新</button><button className={secondaryButton} disabled={busy} onClick={generateLearning}><GraduationCap className="h-4 w-4" />生成技能/课程关联</button><button className={primaryButton} disabled={busy} onClick={generate}><ShieldCheck className="h-4 w-4" />{story.researchPackage ? '按来源变更重新研究' : '生成 Research Package'}</button></div>
    </div>
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h3 className="font-semibold">技能与课程建议</h3><p className="mt-1 text-xs text-slate-500">≥85% 为高置信建议；70–84% 必须人工判断。只有人工批准后才会出现在公开文章。</p></div><button className={secondaryButton} onClick={() => window.location.assign('/admin/news/learning')}>打开审核队列</button></div>
      {story.learningLinks.length === 0 ? <div className="p-6 text-sm text-slate-500">尚未生成学习关联。</div> : <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">{story.learningLinks.map((link) => <article key={link.id} className="bg-white p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase text-blue-700">{link.objectType === 'skill' ? 'Skill' : 'Course'}</span><Badge value={link.reviewStatus} /></div><a href={link.coreUrl} target="_blank" rel="noreferrer" className="mt-2 block font-semibold text-slate-900 hover:text-blue-700">{link.coreTitle}</a><p className="mt-2 text-xs leading-5 text-slate-500">相关度 {Math.round(link.relevanceScore * 100)}% · 关键词 {Math.round(link.keywordScore * 100)}% · 向量 {Math.round(link.vectorScore * 100)}%</p></article>)}</div>}
    </Panel>
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel><div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">来源包</h3>{story.researchPackage && <p className="mt-1 text-xs text-slate-500">v{story.researchPackage.version} · {story.researchPackage.generatorVersion} · <Badge value={story.researchPackage.status} /></p>}</div><div className="divide-y divide-slate-100">{story.sources.map((source) => <article key={source.itemId} className="p-4"><div className="flex items-center gap-2"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold">Tier {source.sourceTier}</span><span className="text-xs text-slate-500">{source.relationType}</span></div><a href={source.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-semibold text-blue-800 hover:underline">{source.sourceName} · {source.title}</a><p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-600">{source.summary || '仅有标题元数据'}</p></article>)}</div></Panel>
      <Panel><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="font-semibold">Claim Ledger</h3><p className="mt-1 text-xs text-slate-500">事实、数字与引语必须绑定不可变证据。</p></div><button className={primaryButton} disabled={busy || supported === 0} onClick={createDraft}>用已支持 Claims 建立草稿</button></div>{story.claims.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">尚未生成 Claims。</div> : <div className="divide-y divide-slate-100">{story.claims.map((claim) => <article key={claim.id} className="p-5"><div className="flex flex-wrap items-center gap-2"><Badge value={claim.supportStatus} /><span className="text-xs font-semibold uppercase text-slate-500">{claim.claimType}</span><span className="text-xs text-slate-500">{claim.importance === 'critical' ? '关键事实' : '普通事实'}</span>{claim.riskLevel === 'high' && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">高风险</span>}</div><p className="mt-2 text-sm font-medium leading-6 text-slate-900">{claim.claimText}</p>{evidenceFor(claim.id).map((evidence) => <blockquote key={evidence.id} className="mt-3 border-l-2 border-blue-300 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-slate-700"><a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-800">Tier {evidence.sourceTier} 证据</a><p>{evidence.evidenceExcerpt}</p></blockquote>)}<div className="mt-3 flex flex-wrap gap-2"><button className={secondaryButton} disabled={busy || evidenceFor(claim.id).length === 0} onClick={() => review(claim, 'supported')}>确认支持</button><button className={secondaryButton} disabled={busy} onClick={() => review(claim, 'conflicted')}>标记冲突</button><button className={secondaryButton} disabled={busy} onClick={() => review(claim, 'rejected')}>拒绝 Claim</button></div></article>)}</div>}</Panel>
    </div>
  </div>;
}

function LearningPanel({ links, busy, navigate, review }: { links: LearningLink[]; busy: boolean; navigate: ReturnType<typeof useNavigate>; review: (link: LearningLink, status: 'approved' | 'rejected' | 'withdrawn') => void }) {
  const [filter, setFilter] = useState('suggested');
  const visible = filter === 'all' ? links : links.filter((link) => link.reviewStatus === filter);
  const filters = [['suggested', '待复核'], ['approved', '已批准'], ['rejected', '已拒绝'], ['stale', '已失效'], ['all', '全部']];
  return <div className="space-y-4"><Panel className="p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-semibold text-slate-950">技能与课程关联审核</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">规范 ID 只读自 StudyAINow Core。向量库仅用于召回；评分、证据、目录版本和人工审核状态保存在 News。</p></div><div className="flex flex-wrap gap-2">{filters.map(([value, label]) => <button key={value} className={filter === value ? primaryButton : secondaryButton} onClick={() => setFilter(value)}>{label} ({value === 'all' ? links.length : links.filter((link) => link.reviewStatus === value).length})</button>)}</div></div></Panel>{visible.length === 0 ? <Panel className="p-8 text-center text-sm text-slate-500">当前筛选下没有关联。</Panel> : <div className="space-y-3">{visible.map((link) => <Panel key={link.id} className="p-5"><div className="grid gap-4 xl:grid-cols-[1fr_280px]"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase text-blue-700">{link.objectType === 'skill' ? 'Skill' : 'Course'}</span><Badge value={link.reviewStatus} /><span className={`text-xs font-semibold ${link.relevanceScore >= 0.85 ? 'text-emerald-700' : 'text-amber-700'}`}>相关度 {Math.round(link.relevanceScore * 100)}%</span><span className="text-xs text-slate-400">目录 {link.catalogVersion}</span></div><a href={link.coreUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-lg font-semibold text-slate-950 hover:text-blue-700 hover:underline">{link.coreTitle}</a><button className="ml-3 text-xs font-semibold text-blue-700 hover:underline" onClick={() => navigate(`/admin/news/stories/${link.storyId}`)}>查看候选新闻</button><h3 className="mt-3 text-sm font-semibold text-slate-800">{link.storyTitle}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{link.reason}</p><blockquote className="mt-3 border-l-2 border-blue-200 bg-blue-50/50 px-3 py-2 text-xs leading-5 text-slate-600">{link.evidenceExcerpt}</blockquote></div><div className="border-t border-slate-100 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"><dl className="grid grid-cols-2 gap-2 text-xs text-slate-500"><dt>关键词</dt><dd className="text-right font-semibold">{Math.round(link.keywordScore * 100)}%</dd><dt>向量</dt><dd className="text-right font-semibold">{Math.round(link.vectorScore * 100)}%</dd><dt>检索版本</dt><dd className="truncate text-right" title={link.retrievalVersion}>{link.retrievalVersion}</dd><dt>更新时间</dt><dd className="text-right">{formatTime(link.updatedAt)}</dd></dl><div className="mt-4 grid gap-2">{link.reviewStatus !== 'approved' && link.reviewStatus !== 'stale' && <button className={primaryButton} disabled={busy} onClick={() => review(link, 'approved')}>批准关联</button>}{link.reviewStatus === 'suggested' && <button className={secondaryButton} disabled={busy} onClick={() => review(link, 'rejected')}>拒绝关联</button>}{link.reviewStatus === 'approved' && <button className={secondaryButton} disabled={busy} onClick={() => review(link, 'withdrawn')}>撤回关联</button>}</div></div></div></Panel>)}</div>}</div>;
}

function ArticlesPanel({ articles, navigate }: { articles: ArticleSummary[]; navigate: ReturnType<typeof useNavigate> }) {
  return <Panel><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">文章、审核与上下架</h2><p className="mt-1 text-sm text-slate-500">从候选新闻的 Claim Ledger 建立稿件；每次保存均创建不可变修订。</p></div>{articles.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">尚无稿件。</div> : <div className="divide-y divide-slate-100">{articles.map((item) => <button key={item.id} className="grid w-full gap-2 px-5 py-4 text-left hover:bg-blue-50/40 md:grid-cols-[120px_1fr_140px_110px] md:items-center" onClick={() => navigate(`/admin/news/articles/${item.id}`)}><span><Badge value={item.status} /></span><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{item.title}</strong><small className="mt-1 block truncate text-slate-500">{item.summary}</small></span><span className="text-sm text-slate-600">{item.category?.name ?? '未分类'}</span><span className="text-xs text-slate-500">{formatTime(item.updatedAt)}</span></button>)}</div>}</Panel>;
}

function ArticleEditor({ article, taxonomy, busy, back, save, act }: { article: ArticleDetail; taxonomy: TaxonomyNode[]; busy: boolean; back: () => void; save: (draft: Record<string, unknown>) => void; act: (action: string) => void }) {
  const active = article.revisions.find((revision) => revision.id === article.activeRevisionId) ?? article.revisions[0];
  const [title, setTitle] = useState(active?.title ?? '');
  const [slug, setSlug] = useState(active?.slug ?? article.locale.slug);
  const [summary, setSummary] = useState(active?.summary ?? '');
  const [bodyMarkdown, setBodyMarkdown] = useState(active?.bodyMarkdown ?? '');
  const [accessLevel, setAccessLevel] = useState(article.accessLevel);
  const [categoryId, setCategoryId] = useState(article.taxonomy.find((item) => item.taxonomyType === 'category')?.id ?? '');
  const [tagIds, setTagIds] = useState(article.taxonomy.filter((item) => item.taxonomyType === 'tag').map((item) => item.id));
  const [changeReason, setChangeReason] = useState('');
  useEffect(() => { setTitle(active?.title ?? ''); setSlug(active?.slug ?? article.locale.slug); setSummary(active?.summary ?? ''); setBodyMarkdown(active?.bodyMarkdown ?? ''); setAccessLevel(article.accessLevel); setCategoryId(article.taxonomy.find((item) => item.taxonomyType === 'category')?.id ?? ''); setTagIds(article.taxonomy.filter((item) => item.taxonomyType === 'tag').map((item) => item.id)); setChangeReason(''); }, [active?.id, article.accessLevel, article.locale.slug, article.taxonomy]);
  const categories = taxonomy.filter((node) => node.type === 'category' && node.status === 'active');
  const tags = taxonomy.filter((node) => node.type === 'tag' && node.status === 'active');
  const locked = ['in_review', 'scheduled', 'withdrawn'].includes(article.status);
  const actions = useMemo(() => {
    if (article.status === 'draft') return [['submit', '提交审核']];
    if (article.status === 'in_review') return [['return', '退回修订'], ['reject', '驳回'], ['approve', '人工批准'], ['publish', '上架']];
    if (article.status === 'scheduled') return [['return', '取消定时'], ['publish', '立即上架']];
    if (['published', 'distributed'].includes(article.status)) return [['approve', '批准当前修订'], ['correct', '发布更正'], ['withdraw', '下架']];
    if (article.status === 'corrected') return [['approve', '批准当前修订'], ['publish', '恢复上架'], ['withdraw', '下架']];
    if (article.status === 'withdrawn' || article.status === 'rejected') return [['reopen', '重新编辑']];
    return [];
  }, [article.status]);
  function submit(event: FormEvent) { event.preventDefault(); save({ accessLevel, slug, title, summary, bodyMarkdown, categoryId, tagIds, changeReason }); }
  return <div className="space-y-4"><button onClick={back} className="text-sm font-semibold text-blue-700 hover:underline">← 返回文章列表</button><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">文章编辑与审核</h2><p className="mt-1 text-sm text-slate-500">版本 {article.version} · {article.claims.length} 个关联 Claims</p></div><Badge value={article.status} /></div><div className="grid gap-4 xl:grid-cols-[1fr_340px]"><Panel className="p-5"><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">访问级别<select className={`${fieldClass} mt-1`} value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}><option value="free">公开</option><option value="member">会员</option><option value="vip">VIP</option><option value="internal">内部</option></select></label><label className="text-sm font-medium">主分类<select className={`${fieldClass} mt-1`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label></div><label className="block text-sm font-medium">标题<input className={`${fieldClass} mt-1`} value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="block text-sm font-medium">Slug<input className={`${fieldClass} mt-1`} value={slug} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label className="block text-sm font-medium">摘要<textarea className={`${fieldClass} mt-1`} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} required /></label><label className="block text-sm font-medium">正文（Markdown）<textarea className={`${fieldClass} mt-1 font-mono`} rows={18} value={bodyMarkdown} onChange={(event) => setBodyMarkdown(event.target.value)} required /></label><fieldset><legend className="text-sm font-medium">标签</legend><div className="mt-2 flex flex-wrap gap-3">{tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={(event) => setTagIds(event.target.checked ? [...tagIds, tag.id] : tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</div></fieldset><label className="block text-sm font-medium">修订原因<input className={`${fieldClass} mt-1`} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} required /></label><button className={primaryButton} disabled={busy || locked}><Save className="h-4 w-4" />保存不可变新修订</button>{locked && <p className="text-xs text-amber-700">当前状态不可编辑，请先执行相应流程操作。</p>}</form></Panel><div className="space-y-4"><Panel className="p-5"><h3 className="font-semibold">审核与发布</h3><div className="mt-3 grid gap-2">{actions.map(([action, label]) => <button key={action} className={action === 'publish' || action === 'correct' ? primaryButton : secondaryButton} disabled={busy} onClick={() => act(action)}>{action === 'withdraw' ? <Archive className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{label}</button>)}</div></Panel><Panel className="p-5"><h3 className="font-semibold">事实门禁</h3><div className="mt-3 space-y-3">{article.claims.map((claim) => <div key={claim.id} className="border-l-2 border-blue-200 pl-3"><div className="flex flex-wrap gap-1"><Badge value={claim.supportStatus} />{claim.importance === 'critical' && <span className="text-xs font-semibold text-red-700">关键</span>}</div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{claim.claimText}</p></div>)}</div>{article.factChecks[0] && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">最近核验：{article.factChecks[0].coveragePercent}% · {article.factChecks[0].action} · {formatTime(article.factChecks[0].checkedAt)}</p>}</Panel><Panel className="p-5"><h3 className="font-semibold">修订与审计</h3><div className="mt-3 space-y-3">{article.revisions.slice(0, 5).map((revision) => <div key={revision.id}><strong className="text-xs">v{revision.revisionNumber} · {revision.title}</strong><p className="text-xs text-slate-500">{formatTime(revision.createdAt)} · {revision.changeReason}</p></div>)}</div></Panel></div></div></div>;
}

function TaxonomyPanel({ taxonomy, busy, createTag, update }: { taxonomy: TaxonomyNode[]; busy: boolean; createTag: (name: string, slug: string, aliases: string[]) => void; update: (node: TaxonomyNode, name: string, aliases: string[], status: string) => void }) {
  const [editing, setEditing] = useState<TaxonomyNode | null>(null);
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [aliases, setAliases] = useState('');
  const categories = taxonomy.filter((node) => node.type === 'category'); const tags = taxonomy.filter((node) => node.type === 'tag');
  return <div className="grid gap-4 xl:grid-cols-2"><Panel><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">8 个受控主分类</h2><p className="mt-1 text-sm text-slate-500">可人工修正名称和别名，不允许自动新增或停用。</p></div><div className="divide-y divide-slate-100">{categories.map((node) => <button key={node.id} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-blue-50" onClick={() => setEditing(node)}><span><strong className="block text-sm">{node.name}</strong><small className="text-slate-500">{node.slug} · {node.usageCount} 次使用</small></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div></Panel><Panel><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">标签</h2><form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createTag(name, slug, aliases.split(',').map((item) => item.trim()).filter(Boolean)); setName(''); setSlug(''); setAliases(''); }}><input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="标签名称" required /><input className={fieldClass} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /><input className={fieldClass} value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="别名，逗号分隔" /><button className={primaryButton} disabled={busy}>新增标签</button></form></div><div className="max-h-[560px] divide-y divide-slate-100 overflow-auto">{tags.map((node) => <button key={node.id} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-blue-50" onClick={() => setEditing(node)}><span><strong className="block text-sm">{node.name}</strong><small className="text-slate-500">{node.status} · {node.usageCount} 次使用</small></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div></Panel>{editing && <TaxonomyDialog node={editing} busy={busy} close={() => setEditing(null)} save={(nextName, nextAliases, status) => { update(editing, nextName, nextAliases, status); setEditing(null); }} />}</div>;
}
function TaxonomyDialog({ node, busy, close, save }: { node: TaxonomyNode; busy: boolean; close: () => void; save: (name: string, aliases: string[], status: string) => void }) {
  const [name, setName] = useState(node.name); const [aliases, setAliases] = useState(node.aliases.join(', ')); const [status, setStatus] = useState(node.status === 'retired' ? 'retired' : 'active');
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true"><form className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); save(name, aliases.split(',').map((item) => item.trim()).filter(Boolean), status); }}><h2 className="text-lg font-semibold">编辑{node.type === 'category' ? '主分类' : '标签'}</h2><label className="mt-4 block text-sm font-medium">名称<input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="mt-4 block text-sm font-medium">别名<input className={`${fieldClass} mt-1`} value={aliases} onChange={(event) => setAliases(event.target.value)} /></label>{node.type === 'tag' && <label className="mt-4 block text-sm font-medium">状态<select className={`${fieldClass} mt-1`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">有效</option><option value="retired">停用</option></select></label>}<div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={close}>取消</button><button className={primaryButton} disabled={busy}>保存</button></div></form></div>;
}
