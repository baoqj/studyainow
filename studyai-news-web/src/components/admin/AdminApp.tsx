import { useCallback, useEffect, useMemo, useState } from 'react';

type SubmitLikeEvent = { preventDefault(): void };

type Section = 'dashboard' | 'candidates' | 'articles' | 'taxonomy';

interface DashboardCounts {
  pendingEnrichment: number;
  candidates: number;
  drafts: number;
  inReview: number;
  live: number;
  withdrawn: number;
}

interface TaxonomyNode {
  id: string;
  type: 'category' | 'tag';
  slug: string;
  name: string;
  aliases: string[];
  status: 'active' | 'merged' | 'retired';
  locked: boolean;
  canonicalId: string | null;
  usageCount: number;
}

interface Candidate {
  id: string;
  title: string;
  occurredAt: string | null;
  status: string;
  locked: boolean;
  sourceCount: number;
  maxQualityScore: number | null;
  category: { id: string; name: string; confidence: number; locked: boolean } | null;
  tags: Array<{ id: string; name: string; locked: boolean }>;
  entities: Array<{ id: string; name: string; locked: boolean }>;
  sources: Array<{
    id: string;
    sourceName: string;
    title: string;
    url: string;
    publishedAt: string | null;
    relationType: string;
    qualityScore: number | null;
  }>;
  articleId: string | null;
  articleStatus: string | null;
}

interface ArticleSummary {
  id: string;
  status: string;
  articleType: string;
  accessLevel: string;
  version: number;
  title: string;
  summary: string;
  updatedAt: string;
  publishedAt: string | null;
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string }>;
}

interface Revision {
  id: string;
  revisionNumber: number;
  locale: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  changeReason: string;
  editorRef: string;
  createdAt: string;
}

interface ArticleDetail {
  id: string;
  storyId: string | null;
  articleType: string;
  status: string;
  accessLevel: string;
  primaryLocale: string;
  activeRevisionId: string;
  publishedRevisionId: string | null;
  version: number;
  locale: { locale: string; slug: string; title: string; summary: string; status: string };
  revisions: Revision[];
  approvals: Array<{ id: string; revisionId: string; decision: string; actorRole: string; createdAt: string }>;
  taxonomy: Array<{ id: string; name: string; taxonomyType: 'category' | 'tag' }>;
  audit: Array<{ action: string; actorRef: string; reason: string; createdAt: string }>;
}

interface EditorDraft {
  articleId: string | null;
  storyId: string | null;
  expectedVersion: number | null;
  articleType: 'brief' | 'deep_dive';
  accessLevel: 'free' | 'member' | 'vip' | 'internal';
  locale: string;
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  categoryId: string;
  tagIds: string[];
  changeReason: string;
  status: string;
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

const NAVIGATION: Array<{ section: Section; label: string; hint: string }> = [
  { section: 'dashboard', label: '编辑总览', hint: '工作队列' },
  { section: 'candidates', label: '候选新闻', hint: '聚类与分类' },
  { section: 'articles', label: '文章管理', hint: '审核与上下架' },
  { section: 'taxonomy', label: '分类与标签', hint: '受控词表' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  in_review: '待审核',
  scheduled: '已定时',
  published: '已上架',
  rejected: '已退回',
  corrected: '已更正',
  distributed: '已分发',
  withdrawn: '已下架',
};

function sectionFromPath(pathname: string): Section {
  if (pathname.includes('/candidates')) return 'candidates';
  if (pathname.includes('/articles')) return 'articles';
  if (pathname.includes('/taxonomy')) return 'taxonomy';
  return 'dashboard';
}

function sectionPath(section: Section): string {
  return section === 'dashboard' ? '/admin/news' : `/admin/news/${section}`;
}

function formatTime(value: string | null): string {
  if (!value) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function slugFromTitle(title: string): string {
  const ascii = title.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
  return ascii || `news-${Date.now().toString(36)}`;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (!['GET', 'HEAD'].includes(method)) {
    headers.set('content-type', 'application/json');
    headers.set('x-news-csrf', '1');
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({})) as ApiErrorPayload & T;
  if (!response.ok) {
    const code = payload.error?.code ?? 'request_failed';
    if (response.status === 401) window.dispatchEvent(new Event('news-admin-unauthorized'));
    throw new Error(code === 'version_conflict' ? '文章已被其他会话修改，请重新打开。' : (payload.error?.message ?? code));
  }
  return payload;
}

function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SubmitLikeEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/news/session', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: '{}',
      });
      setToken('');
      onAuthenticated();
    } catch {
      setError('管理凭证无效，请检查后重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="login-title">
        <div className="admin-login-brand"><span>S</span><strong>StudyAI News</strong></div>
        <p className="admin-kicker">EDITORIAL CONTROL ROOM</p>
        <h1 id="login-title">进入新闻编辑台</h1>
        <p>凭证只用于换取 8 小时的 HttpOnly 会话，不会写入浏览器本地存储。</p>
        <form onSubmit={submit}>
          <label htmlFor="admin-token">管理凭证</label>
          <input
            id="admin-token"
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            minLength={32}
            required
            placeholder="粘贴 News Admin Token"
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy || token.length < 32}>
            {busy ? '正在验证…' : '验证并进入'}
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="admin-empty"><span aria-hidden="true">{'◇'}</span><h3>{title}</h3><p>{detail}</p></div>;
}

function Dashboard({ counts, onNavigate }: { counts: DashboardCounts; onNavigate: (section: Section) => void }) {
  const cards = [
    ['待聚类', counts.pendingEnrichment, 'candidates' as Section],
    ['候选事件', counts.candidates, 'candidates' as Section],
    ['草稿', counts.drafts, 'articles' as Section],
    ['待人工审核', counts.inReview, 'articles' as Section],
    ['线上文章', counts.live, 'articles' as Section],
    ['已下架', counts.withdrawn, 'articles' as Section],
  ] as const;
  return <section>
    <header className="section-heading"><div><p className="admin-kicker">TODAY'S DESK</p><h1>编辑总览</h1></div><p>从来源聚类到人工发布，每一步都留下证据和审计记录。</p></header>
    <div className="metric-grid">
      {cards.map(([label, value, section], index) => <button key={label} onClick={() => onNavigate(section)}>
        <span>{String(index + 1).padStart(2, '0')}</span><strong>{value}</strong><small>{label}</small>
      </button>)}
    </div>
    <div className="desk-note"><strong>发布门禁已开启</strong><p>未通过 Publisher/Admin 人工审批的修订，数据库会拒绝上架。人工锁定的分类与标签不会被自动任务覆盖。</p></div>
  </section>;
}

function CandidatePanel({
  candidates,
  taxonomy,
  onRefresh,
  onCreateDraft,
}: {
  candidates: Candidate[];
  taxonomy: TaxonomyNode[];
  onRefresh: () => Promise<void>;
  onCreateDraft: (candidate: Candidate) => void;
}) {
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = taxonomy.filter((node) => node.type === 'category' && node.status === 'active');
  const tags = taxonomy.filter((node) => node.type === 'tag' && node.status === 'active');

  function beginEdit(candidate: Candidate) {
    setEditing(candidate);
    setCategoryId(candidate.category?.id ?? categories[0]?.id ?? '');
    setTagIds(candidate.tags.map((tag) => tag.id));
    setLocked(true);
    setMessage(null);
  }

  async function enrich() {
    setBusy(true); setMessage(null);
    try {
      const payload = await apiRequest<{ result: { itemsProcessed: number; storiesCreated: number; itemsClustered: number } }>('/api/admin/news/candidates/enrich', {
        method: 'POST', body: JSON.stringify({ limit: 100 }), headers: { 'idempotency-key': crypto.randomUUID() },
      });
      setMessage(`处理 ${payload.result.itemsProcessed} 条，新建 ${payload.result.storiesCreated} 个事件，合并 ${payload.result.itemsClustered} 条。`);
      await onRefresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '处理失败'); }
    finally { setBusy(false); }
  }

  async function saveMetadata(event: SubmitLikeEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setMessage(null);
    try {
      await apiRequest(`/api/admin/news/candidates/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId, tagIds, locked, reason: '编辑人工核定分类与标签' }),
      });
      setEditing(null);
      await onRefresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  }

  return <section>
    <header className="section-heading"><div><p className="admin-kicker">CANDIDATE INBOX</p><h1>候选新闻</h1></div><button className="secondary-button" onClick={enrich} disabled={busy}>{busy ? '处理中…' : '执行聚类与分类'}</button></header>
    {message && <p className="inline-message" role="status">{message}</p>}
    {candidates.length === 0 ? <EmptyState title="暂无候选新闻" detail="采集完成后，在此执行聚类与分类。" /> : <div className="candidate-list">
      {candidates.map((candidate) => <article className="candidate-card" key={candidate.id}>
        <div className="candidate-main">
          <div className="candidate-meta"><span>{formatTime(candidate.occurredAt)}</span><span>{candidate.sourceCount} 个来源</span><span>质量 {candidate.maxQualityScore ?? '—'}</span>{candidate.category && <span>分类信心 {Math.round(candidate.category.confidence * 100)}%</span>}{candidate.category && candidate.category.confidence < 0.6 && <span className="review-label">待人工复核</span>}{candidate.locked && <span className="lock-label">已锁定</span>}</div>
          <h2>{candidate.title}</h2>
          <div className="chip-row">{candidate.category && <span className="category-chip">{candidate.category.name}</span>}{candidate.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}{candidate.entities.map((entity) => <span className="entity-chip" key={entity.id}>{entity.name}</span>)}</div>
          <details><summary>查看来源证据</summary><ul>{candidate.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.sourceName} · {source.title}</a><small>{source.relationType} · 质量 {source.qualityScore ?? '—'}</small></li>)}</ul></details>
        </div>
        <div className="candidate-actions"><button className="text-button" onClick={() => beginEdit(candidate)}>分类/标签</button>{candidate.articleId ? <span><StatusBadge status={candidate.articleStatus ?? 'draft'} /></span> : <button className="primary-button" onClick={() => onCreateDraft(candidate)}>建立草稿</button>}</div>
      </article>)}
    </div>}
    {editing && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={saveMetadata} aria-label="编辑候选新闻分类"><h2>核定分类与标签</h2><p>{editing.title}</p><label>主分类<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset><legend>标签（最多 10 个）</legend><div className="check-grid">{tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={tagIds.includes(tag.id)} disabled={!tagIds.includes(tag.id) && tagIds.length >= 10} onChange={(event) => setTagIds(event.target.checked ? [...tagIds, tag.id] : tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</div></fieldset><label className="checkbox-line"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} />锁定人工结果，防止自动覆盖</label><div className="modal-actions"><button type="button" className="text-button" onClick={() => setEditing(null)}>取消</button><button className="primary-button" disabled={busy}>保存核定</button></div></form></div>}
  </section>;
}

function emptyDraft(candidate: Candidate, taxonomy: TaxonomyNode[]): EditorDraft {
  const source = candidate.sources[0];
  return {
    articleId: null,
    storyId: candidate.id,
    expectedVersion: null,
    articleType: 'brief',
    accessLevel: 'free',
    locale: 'zh-CN',
    slug: slugFromTitle(candidate.title),
    title: candidate.title,
    summary: '',
    bodyMarkdown: `## 核心信息\n\n\n\n## 学习与实践建议\n\n\n\n---\n来源：${source ? `[${source.sourceName}](${source.url})` : '待补充'}`,
    categoryId: candidate.category?.id ?? taxonomy.find((node) => node.type === 'category' && node.status === 'active')?.id ?? '',
    tagIds: candidate.tags.map((tag) => tag.id),
    changeReason: '从已核定的候选新闻建立草稿',
    status: 'draft',
  };
}

function draftFromDetail(detail: ArticleDetail): EditorDraft {
  const revision = detail.revisions.find((item) => item.id === detail.activeRevisionId) ?? detail.revisions[0]!;
  return {
    articleId: detail.id,
    storyId: detail.storyId,
    expectedVersion: detail.version,
    articleType: detail.articleType === 'deep_dive' ? 'deep_dive' : 'brief',
    accessLevel: detail.accessLevel as EditorDraft['accessLevel'],
    locale: detail.primaryLocale,
    slug: detail.locale.slug,
    title: revision.title,
    summary: revision.summary,
    bodyMarkdown: revision.bodyMarkdown,
    categoryId: detail.taxonomy.find((node) => node.taxonomyType === 'category')?.id ?? '',
    tagIds: detail.taxonomy.filter((node) => node.taxonomyType === 'tag').map((node) => node.id),
    changeReason: '',
    status: detail.status,
  };
}

function ArticlePanel({
  articles, taxonomy, initialDraft, onInitialDraftConsumed, onRefresh, initialArticleId,
}: {
  articles: ArticleSummary[];
  taxonomy: TaxonomyNode[];
  initialDraft: EditorDraft | null;
  onInitialDraftConsumed: () => void;
  onRefresh: () => Promise<void>;
  initialArticleId?: string | null;
}) {
  const [draft, setDraft] = useState<EditorDraft | null>(initialDraft);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = taxonomy.filter((node) => node.type === 'category' && node.status === 'active');
  const tags = taxonomy.filter((node) => node.type === 'tag' && node.status === 'active');

  useEffect(() => {
    if (initialDraft) { setDraft(initialDraft); setDetail(null); onInitialDraftConsumed(); }
  }, [initialDraft, onInitialDraftConsumed]);

  async function openArticle(articleId: string) {
    setBusy(true); setMessage(null);
    try {
      const payload = await apiRequest<{ article: ArticleDetail }>(`/api/admin/news/articles/${articleId}`);
      setDetail(payload.article); setDraft(draftFromDetail(payload.article));
      window.history.pushState({}, '', `/admin/news/articles/${articleId}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '载入失败'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const articleId = initialArticleId ?? window.location.pathname.match(/\/articles\/([^/]+)$/)?.[1];
    if (articleId && !draft) void openArticle(articleId);
  }, []);

  async function save(event: SubmitLikeEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setMessage(null);
    try {
      const body = JSON.stringify({
        storyId: draft.storyId, articleType: draft.articleType, accessLevel: draft.accessLevel,
        locale: draft.locale, slug: draft.slug, title: draft.title, summary: draft.summary,
        bodyMarkdown: draft.bodyMarkdown, categoryId: draft.categoryId, tagIds: draft.tagIds,
        changeReason: draft.changeReason,
        ...(draft.expectedVersion ? { expectedVersion: draft.expectedVersion } : {}),
      });
      if (draft.articleId) {
        await apiRequest(`/api/admin/news/articles/${draft.articleId}`, { method: 'PATCH', body });
        await openArticle(draft.articleId);
      } else {
        const payload = await apiRequest<{ articleId: string }>('/api/admin/news/articles', { method: 'POST', body });
        await openArticle(payload.articleId);
      }
      setMessage('已保存为不可变新修订。');
      await onRefresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  }

  async function act(action: string, label: string) {
    if (!draft?.articleId) return;
    const reason = window.prompt(`${label}原因（将写入审计日志）`);
    if (!reason?.trim()) return;
    setBusy(true); setMessage(null);
    try {
      await apiRequest(`/api/admin/news/articles/${draft.articleId}/actions/${action}`, {
        method: 'POST',
        headers: { 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await openArticle(draft.articleId);
      await onRefresh();
      setMessage(`${label}操作已记录。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : `${label}失败`); }
    finally { setBusy(false); }
  }

  const actions = useMemo(() => {
    if (!draft?.articleId) return [];
    if (draft.status === 'draft') return [['submit', '提交审核']];
    if (draft.status === 'in_review') return [['return', '退回修订'], ['reject', '驳回'], ['approve', '人工批准'], ['publish', '上架']];
    if (draft.status === 'scheduled') return [['return', '取消定时'], ['publish', '立即上架']];
    if (draft.status === 'published' || draft.status === 'distributed') return [['approve', '批准当前修订'], ['correct', '发布更正'], ['withdraw', '下架']];
    if (draft.status === 'corrected') return [['approve', '批准当前修订'], ['publish', '恢复上架'], ['withdraw', '下架']];
    if (draft.status === 'withdrawn') return [['reopen', '重新编辑']];
    return [];
  }, [draft?.articleId, draft?.status]);

  if (draft) return <section className="article-studio">
    <header className="section-heading"><div><button className="back-button" onClick={() => { setDraft(null); setDetail(null); window.history.pushState({}, '', '/admin/news/articles'); }}>← 文章列表</button><h1>{draft.articleId ? '文章编辑与审核' : '新建新闻草稿'}</h1></div>{draft.articleId && <StatusBadge status={draft.status} />}</header>
    {message && <p className="inline-message" role="status">{message}</p>}
    <div className="studio-grid"><form className="editor-form" onSubmit={save}>
      <div className="form-row"><label>类型<select value={draft.articleType} onChange={(event) => setDraft({ ...draft, articleType: event.target.value as EditorDraft['articleType'] })}><option value="brief">快讯</option><option value="deep_dive">深度报道</option></select></label><label>访问级别<select value={draft.accessLevel} onChange={(event) => setDraft({ ...draft, accessLevel: event.target.value as EditorDraft['accessLevel'] })}><option value="free">公开</option><option value="member">会员</option><option value="vip">VIP</option><option value="internal">内部</option></select></label></div>
      <label>标题<input value={draft.title} maxLength={500} required onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Slug<input value={draft.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
      <label>摘要<textarea rows={4} value={draft.summary} required onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
      <label>正文（Markdown）<textarea className="body-editor" rows={18} value={draft.bodyMarkdown} required onChange={(event) => setDraft({ ...draft, bodyMarkdown: event.target.value })} /></label>
      <label>主分类<select value={draft.categoryId} required onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend>标签</legend><div className="check-grid">{tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={draft.tagIds.includes(tag.id)} onChange={(event) => setDraft({ ...draft, tagIds: event.target.checked ? [...draft.tagIds, tag.id] : draft.tagIds.filter((id) => id !== tag.id) })} />{tag.name}</label>)}</div></fieldset>
      <label>修订原因<input value={draft.changeReason} required placeholder="说明本次修改，将写入审计日志" onChange={(event) => setDraft({ ...draft, changeReason: event.target.value })} /></label>
      <button className="primary-button" disabled={busy || ['in_review', 'scheduled', 'withdrawn'].includes(draft.status)}>{busy ? '处理中…' : draft.articleId ? '保存新修订' : '建立草稿'}</button>
      {['in_review', 'scheduled', 'withdrawn'].includes(draft.status) && <small className="form-hint">当前状态不可编辑，请先执行下方流程操作。</small>}
    </form><aside className="review-rail"><section><h2>审核操作</h2><div className="action-stack">{actions.map(([action, label]) => <button key={action} className={action === 'publish' || action === 'correct' ? 'primary-button' : action === 'withdraw' || action === 'reject' ? 'danger-button' : 'secondary-button'} disabled={busy} onClick={() => act(action!, label!)}>{label}</button>)}</div></section><section><h2>修订记录</h2>{detail?.revisions.map((revision) => <div className="history-item" key={revision.id}><strong>v{revision.revisionNumber} · {revision.title}</strong><small>{formatTime(revision.createdAt)} · {revision.changeReason}</small></div>) ?? <p>建立后显示</p>}</section><section><h2>审计轨迹</h2>{detail?.audit.slice(0, 8).map((entry, index) => <div className="history-item" key={`${entry.action}-${index}`}><strong>{entry.action}</strong><small>{formatTime(entry.createdAt)} · {entry.reason}</small></div>) ?? <p>建立后显示</p>}</section></aside></div>
  </section>;

  return <section><header className="section-heading"><div><p className="admin-kicker">ARTICLE DESK</p><h1>文章管理</h1></div><p>修订不可变，发布和下架均需人工操作并记录原因。</p></header>{message && <p className="inline-message">{message}</p>}{articles.length === 0 ? <EmptyState title="暂无文章" detail="从候选新闻列表中选择事件建立草稿。" /> : <div className="article-table"><div className="article-table-head"><span>状态</span><span>标题</span><span>分类</span><span>更新</span></div>{articles.map((article) => <button key={article.id} onClick={() => openArticle(article.id)} disabled={busy}><StatusBadge status={article.status} /><span><strong>{article.title}</strong><small>{article.summary}</small></span><span>{article.category?.name ?? '未分类'}</span><span>{formatTime(article.updatedAt)}</span></button>)}</div>}</section>;
}

function TaxonomyPanel({ taxonomy, onRefresh }: { taxonomy: TaxonomyNode[]; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [aliases, setAliases] = useState('');
  const [editing, setEditing] = useState<TaxonomyNode | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const categories = taxonomy.filter((node) => node.type === 'category');
  const tags = taxonomy.filter((node) => node.type === 'tag');

  async function create(event: SubmitLikeEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try { await apiRequest('/api/admin/news/taxonomy/tags', { method: 'POST', body: JSON.stringify({ name, slug, aliases: aliases.split(',').map((item) => item.trim()).filter(Boolean) }) }); setName(''); setSlug(''); setAliases(''); await onRefresh(); setMessage('标签已创建并锁定为人工词条。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '创建失败'); } finally { setBusy(false); }
  }

  async function saveEdit(event: SubmitLikeEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setMessage(null);
    try { await apiRequest(`/api/admin/news/taxonomy/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: editing.name, aliases: editing.aliases, status: editing.status === 'retired' ? 'retired' : 'active' }) }); setEditing(null); await onRefresh(); setMessage('词条已更新。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '更新失败'); } finally { setBusy(false); }
  }

  async function mergeEditingTag() {
    if (!editing || !mergeTarget) return;
    setBusy(true); setMessage(null);
    try {
      await apiRequest(`/api/admin/news/taxonomy/${editing.id}/merge`, {
        method: 'POST', body: JSON.stringify({ canonicalId: mergeTarget }),
      });
      setEditing(null); setMergeTarget(''); await onRefresh(); setMessage('标签已合并，原有关联已转向目标标签。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '合并失败'); }
    finally { setBusy(false); }
  }

  return <section><header className="section-heading"><div><p className="admin-kicker">CONTROLLED VOCABULARY</p><h1>分类与标签</h1></div><p>8 个主分类为受控集合，自动模型无权新增。管理员可维护展示名与别名。</p></header>{message && <p className="inline-message">{message}</p>}<div className="taxonomy-grid"><section><h2>主分类 <small>{categories.length}/8</small></h2><div className="taxonomy-list">{categories.map((node) => <button key={node.id} onClick={() => setEditing({ ...node })}><span><strong>{node.name}</strong><small>{node.slug} · {node.usageCount} 次使用</small></span><span>编辑</span></button>)}</div></section><section><h2>标签 <small>{tags.filter((tag) => tag.status === 'active').length} 个有效</small></h2><form className="tag-create" onSubmit={create}><input value={name} required placeholder="新标签名称" onChange={(event) => setName(event.target.value)} /><input value={slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Slug（英文/数字）" onChange={(event) => setSlug(event.target.value)} /><input value={aliases} placeholder="别名，用逗号分隔" onChange={(event) => setAliases(event.target.value)} /><button className="primary-button" disabled={busy}>新增标签</button></form><div className="taxonomy-list">{tags.map((node) => <button key={node.id} onClick={() => { setEditing({ ...node }); setMergeTarget(''); }}><span><strong>{node.name}</strong><small>{node.status} · {node.usageCount} 次使用</small></span><span>编辑</span></button>)}</div></section></div>{editing && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveEdit}><h2>编辑{editing.type === 'category' ? '主分类' : '标签'}</h2><label>名称<input value={editing.name} required onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label>别名（逗号分隔）<input value={editing.aliases.join(', ')} onChange={(event) => setEditing({ ...editing, aliases: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>{editing.type === 'tag' && <><label>状态<select value={editing.status === 'retired' ? 'retired' : 'active'} onChange={(event) => setEditing({ ...editing, status: event.target.value as TaxonomyNode['status'] })}><option value="active">有效</option><option value="retired">停用</option></select></label><fieldset><legend>合并标签</legend><div className="merge-row"><select aria-label="合并目标" value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}><option value="">选择有效目标标签</option>{tags.filter((tag) => tag.id !== editing.id && tag.status === 'active').map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select><button type="button" className="danger-button" disabled={!mergeTarget || busy} onClick={mergeEditingTag}>合并并重定向</button></div></fieldset></>}<div className="modal-actions"><button type="button" className="text-button" onClick={() => setEditing(null)}>取消</button><button className="primary-button" disabled={busy}>保存</button></div></form></div>}</section>;
}

export default function AdminApp({ initialPath }: { initialPath: string }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>(sectionFromPath(initialPath));
  const [counts, setCounts] = useState<DashboardCounts>({ pendingEnrichment: 0, candidates: 0, drafts: 0, inReview: 0, live: 0, withdrawn: 0 });
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [initialDraft, setInitialDraft] = useState<EditorDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboardPayload, taxonomyPayload, candidatePayload, articlePayload] = await Promise.all([
        apiRequest<{ counts: DashboardCounts }>('/api/admin/news/dashboard'),
        apiRequest<{ taxonomy: TaxonomyNode[] }>('/api/admin/news/taxonomy'),
        apiRequest<{ candidates: Candidate[] }>('/api/admin/news/candidates?limit=50'),
        apiRequest<{ articles: ArticleSummary[] }>('/api/admin/news/articles?limit=50'),
      ]);
      setCounts(dashboardPayload.counts); setTaxonomy(taxonomyPayload.taxonomy);
      setCandidates(candidatePayload.candidates); setArticles(articlePayload.articles);
      setAuthenticated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '编辑数据载入失败');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const unauthorized = () => setAuthenticated(false);
    window.addEventListener('news-admin-unauthorized', unauthorized);
    apiRequest('/api/admin/news/session').then(() => { setAuthenticated(true); void load(); }).catch(() => { setAuthenticated(false); setLoading(false); });
    return () => window.removeEventListener('news-admin-unauthorized', unauthorized);
  }, [load]);

  useEffect(() => {
    const pop = () => setSection(sectionFromPath(window.location.pathname));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  function navigate(next: Section) { setSection(next); window.history.pushState({}, '', sectionPath(next)); }
  async function logout() { try { await apiRequest('/api/admin/news/session', { method: 'DELETE', body: '{}' }); } finally { setAuthenticated(false); } }
  function startDraft(candidate: Candidate) { setInitialDraft(emptyDraft(candidate, taxonomy)); navigate('articles'); }

  if (authenticated === null || (authenticated && loading && taxonomy.length === 0)) return <main className="admin-loading"><span></span><p>正在安全载入编辑台…</p></main>;
  if (!authenticated) return <Login onAuthenticated={() => { setAuthenticated(true); void load(); }} />;

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/admin/news"><span>S</span><strong>StudyAI<br />Newsroom</strong></a><nav aria-label="新闻管理导航">{NAVIGATION.map((item) => <button key={item.section} className={section === item.section ? 'active' : ''} onClick={() => navigate(item.section)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</nav><div className="admin-identity"><span>管理员会话</span><button onClick={logout}>安全退出</button></div></aside><main className="admin-main"><div className="admin-mobile-bar"><strong>StudyAI Newsroom</strong><select aria-label="选择管理页面" value={section} onChange={(event) => navigate(event.target.value as Section)}>{NAVIGATION.map((item) => <option key={item.section} value={item.section}>{item.label}</option>)}</select></div>{error && <div className="admin-error" role="alert"><strong>数据载入失败</strong><p>{error}</p><button onClick={() => void load()}>重试</button></div>}{!error && section === 'dashboard' && <Dashboard counts={counts} onNavigate={navigate} />}{!error && section === 'candidates' && <CandidatePanel candidates={candidates} taxonomy={taxonomy} onRefresh={load} onCreateDraft={startDraft} />}{!error && section === 'articles' && <ArticlePanel articles={articles} taxonomy={taxonomy} initialDraft={initialDraft} onInitialDraftConsumed={() => setInitialDraft(null)} onRefresh={load} />}{!error && section === 'taxonomy' && <TaxonomyPanel taxonomy={taxonomy} onRefresh={load} />}<footer className="admin-footer"><span>studyai-news-web · P0-3</span><span>所有发布操作均写入审计日志</span></footer></main></div>;
}
