import { ApiError } from './http';
import { sha256Base64Url } from './crypto';
import { normalizeJobLocations, type JobGeoLocation } from './jobGeo';
import { jobRichTextFromParts, jobRichTextFromValue, jobRichTextToPlainText, type JobRichTextDocument } from './jobRichText';
import { enqueueKnowledgeRefresh } from './knowledgeGraph';

export const ATS_SOURCE_TYPES = ['greenhouse', 'lever', 'ashby'] as const;
export type AtsSourceType = (typeof ATS_SOURCE_TYPES)[number];
export type SourceType = AtsSourceType | 'json_ld' | 'manual';
export type DisplayPolicy = 'metadata_only' | 'excerpt' | 'full_text_authorized';

// Official ATS boards with complete source-language JDs can exceed 5 MB even
// for a few hundred active roles. Keep a finite ceiling to avoid unbounded
// Worker/R2 writes while accepting verified first-party board responses.
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const URL_INSPECTION_TIMEOUT_MS = 12_000;
const URL_INSPECTION_MAX_BYTES = 1_500_000;
const URL_INSPECTION_CONCURRENCY = 8;
const AI_RELEVANCE = /\b(ai|artificial intelligence|machine learning|mlops|large language model|llm|genai|generative ai|agentic|multi-agent|natural language processing|nlp|computer vision|retrieval augmented generation|rag|model evaluation|foundation model|mcp|prompt engineering)\b|人工智能|机器学习|機器學習|深度学习|深度學習|大模型|大型语言模型|大型語言模型|生成式|智能体|智能體|多智能体|多智能體|自然语言处理|自然語言處理|计算机视觉|電腦視覺|检索增强|檢索增強|向量数据库|向量資料庫|模型评测|模型評測|模型评估|模型評估|模型训练|模型訓練|推理|提示词|提示詞/i;

// A company-wide "we build AI" introduction is frequently included in every
// vacancy, including Finance and People roles. The catalogue is intentionally
// a learning map for AI work, so title evidence is preferred and body-only
// matches must appear in the job-specific portion of a JD with two independent
// signals. This still admits AI infrastructure roles such as compilers,
// inference, acceleration kernels and model training.
const AI_ROLE_TITLE = /\b(ai|ml|mle|llm|nlp|rag|mlops|genai|aigc|artificial intelligence|machine learning|deep learning|computer vision|multimodal|foundation model|language model|model(?:ing| training| inference)?|pre[- ]?training|post[- ]?training|reinforcement learning|agentic|agents?|robotics|autonomous|recommender|recommendation|search|neural|compiler|accelerator|kernel)\b|人工智能|機器智能|机器学习|機器學習|深度学习|深度學習|大模型|大型语言模型|大型語言模型|生成式|智能体|智能體|多模态|多模態|算法|演算法|自然语言处理|自然語言處理|计算机视觉|電腦視覺|模型训练|模型訓練|模型推理|模型推論|推理工程师|推理工程師/i;
const AI_BODY_SIGNALS = [
  /\bartificial intelligence\b/i,
  /\bmachine learning\b/i,
  /\bdeep learning\b/i,
  /\b(?:large language|foundation|language) models?\b/i,
  /\b(?:llm|genai|generative ai|aigc)\b/i,
  /\b(?:retrieval augmented generation|rag|agentic|multi-agent)\b/i,
  /\b(?:model training|model inference|inference optimization|model evaluation)\b/i,
  /\b(?:computer vision|natural language processing|nlp|speech recognition)\b/i,
  /\b(?:neural network|neural nets?)\b/i,
  /\b(?:ml compiler|ai compiler|ai accelerator|machine learning accelerator)\b/i,
  /人工智能|機器智能/,
  /机器学习|機器學習/,
  /深度学习|深度學習/,
  /大模型|大型语言模型|大型語言模型/,
  /生成式|智能体|智能體|多智能体|多智能體/,
  /检索增强|檢索增強|向量数据库|向量資料庫/,
  /模型训练|模型訓練|模型推理|模型推論|模型评测|模型評測|模型评估|模型評估/,
  /自然语言处理|自然語言處理|计算机视觉|電腦視覺/,
];

const STRUCTURED_BOARD_ENDPOINTS: Record<string, string> = {
  // The publicly rendered official board embeds a server-side structured list.
  // We consume only that list, never its authenticated internal API.
  'baidu-social': 'https://talent.baidu.com/jobs/social-list',
};

export interface JobSourceRecord {
  id: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  source_type: SourceType;
  board_token: string | null;
  official_career_url: string;
  endpoint_url: string;
  acquisition_policy: string;
  display_policy: DisplayPolicy;
  enabled: number;
  sync_lock_until: string | null;
}

interface NormalizedJob {
  externalJobId: string;
  canonicalKey: string;
  title: string;
  location: string | null;
  remoteType: 'remote' | 'hybrid' | 'on_site' | 'unknown';
  employmentType: string | null;
  sourceUrl: string;
  applyUrl: string | null;
  sourcePublishedAt: string | null;
  description: string;
  richContent: JobRichTextDocument;
  language: string;
  locations: JobGeoLocation[];
}

interface SkillAliasRow {
  id: string;
  skill_id: string;
  alias: string;
  match_type: 'word' | 'phrase';
  name_zh: string;
  name_en: string;
}

interface SkillMatch {
  skillId: string;
  alias: string;
  start: number;
  end: number;
  requirementLevel: 'required' | 'preferred' | 'responsibility' | 'context';
}

type JobUrlInspectionRow = {
  id: string;
  title: string;
  external_job_id: string | null;
  source_url: string;
  original_source_url: string | null;
  source_published_at: string | null;
  collected_at: string | null;
  status: string;
};

type JobUrlInspectionOutcome = 'active' | 'missing' | 'inconclusive' | 'error';

type JobUrlInspectionResult = {
  jobId: string;
  outcome: JobUrlInspectionOutcome;
  httpStatus: number | null;
  finalUrl: string | null;
  detail: string | null;
};

const MISSING_JOB_PAGE_PATTERN = /(?:job|position|posting|role|opportunity|职位|職位|岗位|職缺)[\s\S]{0,80}(?:not\s+found|no\s+longer\s+(?:available|exists)|has\s+(?:closed|expired)|does\s+not\s+exist|已(?:关闭|下线|结束|过期)|不存在|已結束|已關閉|已下架)|(?:职位不存在|職位不存在|岗位不存在|職缺不存在|position\s+not\s+found|job\s+not\s+found|posting\s+not\s+found)/i;

/**
 * Retain an AI role by explicit title, or by two distinct technical signals in
 * the job-specific body. The opening company profile is deliberately ignored
 * for body-only decisions because it is shared across unrelated departments.
 */
export function isAiRelevantJob(title: string, description: string) {
  if (AI_ROLE_TITLE.test(title)) return true;
  const trimmed = description.trim();
  if (!trimmed) return false;
  const introLength = Math.min(1_000, Math.floor(trimmed.length * 0.35));
  const jobSpecificBody = trimmed.slice(introLength);
  const signalCount = AI_BODY_SIGNALS.reduce((count, signal) => count + (signal.test(jobSpecificBody) ? 1 : 0), 0);
  return signalCount >= 2;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message.replace(/https?:\/\/\S+/g, '[source URL]');
  return 'Unknown acquisition error';
}

function parseJobTimestamp(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * A role becomes eligible for a direct source-URL inspection only after both
 * its initial collection window and its publication-age window have passed.
 * The later date is deliberate: a newly collected older role still receives
 * a full 30 days before routine reinspection.
 */
export function suspectedExpiryAt(publishedAt: string, collectedAt: string) {
  const fallback = new Date();
  const publication = parseJobTimestamp(publishedAt, fallback);
  const collection = parseJobTimestamp(collectedAt, fallback);
  const publicationWindow = new Date(publication.getTime() + 90 * 24 * 60 * 60 * 1000);
  const collectionWindow = new Date(collection.getTime() + 30 * 24 * 60 * 60 * 1000);
  return (publicationWindow.getTime() > collectionWindow.getTime() ? publicationWindow : collectionWindow).toISOString();
}

export function classifyJobUrlResponse(
  httpStatus: number,
  body: string | null,
  title: string,
  externalJobId: string | null,
): JobUrlInspectionOutcome {
  if (httpStatus === 404 || httpStatus === 410) return 'missing';
  if (httpStatus < 200 || httpStatus >= 400) return 'error';
  if (!body) return 'inconclusive';
  if (MISSING_JOB_PAGE_PATTERN.test(body)) return 'missing';
  const sourceText = body.toLocaleLowerCase();
  if (title && sourceText.includes(title.toLocaleLowerCase())) return 'active';
  if (externalJobId && sourceText.includes(externalJobId.toLocaleLowerCase())) return 'active';
  // A successful but generic careers landing page is not evidence that this
  // exact role remains open, so it never extends the collection date.
  return 'inconclusive';
}

function assertHttpsUrl(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${name} is required`);
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ApiError(400, `${name} must be a valid HTTPS URL`);
  }
  if (url.protocol !== 'https:') throw new ApiError(400, `${name} must use HTTPS`);
  return url.toString();
}

export function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || slug.length > 80) throw new ApiError(400, 'A valid company slug is required');
  return slug;
}

export function validateBoardToken(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.trim())) {
    throw new ApiError(400, 'boardToken must contain only letters, numbers, underscores, or hyphens');
  }
  return value.trim();
}

/**
 * ATS endpoints are constructed from a source type and board token rather than
 * accepted from a request. This prevents the source admin API from becoming an
 * arbitrary server-side fetch primitive.
 */
export function officialAtsEndpoint(sourceType: AtsSourceType, boardToken: string) {
  const token = validateBoardToken(boardToken);
  switch (sourceType) {
    case 'greenhouse':
      return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
    case 'lever':
      return `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;
    case 'ashby':
      return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=false`;
  }
}

export function officialStructuredBoardEndpoint(boardToken: string) {
  const token = validateBoardToken(boardToken);
  const endpoint = STRUCTURED_BOARD_ENDPOINTS[token];
  if (!endpoint) throw new ApiError(422, 'This structured official board is not supported for automated sync');
  return endpoint;
}

export function sourcePolicy(sourceType: SourceType) {
  if (sourceType === 'manual') return 'manual_only';
  if (sourceType === 'json_ld') return 'structured_data';
  return 'api_allowed';
}

export function assertDisplayPolicy(value: unknown): DisplayPolicy {
  if (value === 'metadata_only' || value === 'excerpt' || value === 'full_text_authorized') return value;
  throw new ApiError(400, 'displayPolicy must be metadata_only, excerpt, or full_text_authorized');
}

export function sourceInputFromRequest(input: Record<string, unknown>) {
  const sourceType = input.sourceType;
  if (!['greenhouse', 'lever', 'ashby', 'json_ld', 'manual'].includes(String(sourceType))) {
    throw new ApiError(400, 'sourceType must be greenhouse, lever, ashby, json_ld, or manual');
  }
  const type = sourceType as SourceType;
  const officialCareerUrl = assertHttpsUrl(input.officialCareerUrl, 'officialCareerUrl');
  // The product displays the source-language JD exactly as acquired (as
  // normalized plain text, never machine-translated). A source admin can still
  // deliberately select metadata_only where display permission is unavailable.
  const displayPolicy = assertDisplayPolicy(input.displayPolicy ?? 'full_text_authorized');

  const boardToken = validateBoardToken(input.boardToken);
  if (type === 'manual') throw new ApiError(422, 'Manual imports cannot be created through the automated source endpoint');
  const endpointUrl = type === 'json_ld'
    ? officialStructuredBoardEndpoint(boardToken)
    : officialAtsEndpoint(type as AtsSourceType, boardToken);
  return {
    sourceType: type,
    boardToken,
    endpointUrl,
    officialCareerUrl,
    displayPolicy,
  };
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function htmlToPlainText(value: unknown) {
  if (typeof value !== 'string') return '';
  return decodeEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<\/?(?:p|div|section|article|h[1-6]|li|ul|ol|br|tr|table|blockquote)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sourceLanguage(value: unknown) {
  const language = asString(value).toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(language) ? language : 'und';
}

function dateIso(value: unknown) {
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function remoteType(value: string) {
  const text = value.toLowerCase();
  if (/\bhybrid\b/.test(text)) return 'hybrid' as const;
  if (/\bremote\b|work from home|distributed/.test(text)) return 'remote' as const;
  if (text) return 'on_site' as const;
  return 'unknown' as const;
}

function richDescription(...parts: unknown[]) {
  const richContent = jobRichTextFromParts(...parts);
  return { richContent, description: jobRichTextToPlainText(richContent) };
}

function primaryRichDescription(primary: unknown, fallback: unknown, additional: unknown[] = []) {
  // Lever can return the same JD in HTML and plain text. Prefer the formatted
  // source representation once, and use the supplementary lists only when a
  // primary description is genuinely absent.
  const preferred = jobRichTextFromValue(fallback);
  if (jobRichTextToPlainText(preferred)) return { richContent: preferred, description: jobRichTextToPlainText(preferred) };
  const primaryDocument = jobRichTextFromValue(primary);
  if (jobRichTextToPlainText(primaryDocument)) return { richContent: primaryDocument, description: jobRichTextToPlainText(primaryDocument) };
  return richDescription(...additional);
}

function flattenLocationValues(...values: unknown[]) {
  return values.flatMap((value) => Array.isArray(value) ? value : value == null ? [] : [value]);
}

function locationText(locations: JobGeoLocation[]) {
  return locations.map((location) => location.rawText).filter(Boolean).join(' · ') || null;
}

function normalizeGreenhouse(payload: any): NormalizedJob[] {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.map((job: any) => {
    const locations = normalizeJobLocations(flattenLocationValues(job?.location, job?.locations, job?.offices));
    const location = locationText(locations);
    const { richContent, description } = richDescription(job?.content);
    const externalJobId = String(job?.id ?? '');
    return {
      externalJobId,
      canonicalKey: `greenhouse:${externalJobId || `${asString(job?.title)}:${asString(job?.absolute_url)}`}`,
      title: asString(job?.title),
      location: location || null,
      remoteType: remoteType(location ?? ''),
      employmentType: null,
      sourceUrl: asString(job?.absolute_url),
      applyUrl: asString(job?.absolute_url) || null,
      // Greenhouse exposes `updated_at`, not a true publication field. Do not
      // relabel an update timestamp as a published date; initial collection is
      // the prescribed fallback when no publication date is exposed.
      sourcePublishedAt: null,
      description,
      richContent,
      language: sourceLanguage(job?.language),
      locations,
    };
  });
}

function normalizeLever(payload: any): NormalizedJob[] {
  const jobs = Array.isArray(payload) ? payload : [];
  return jobs.map((job: any) => {
    const categories = job?.categories ?? {};
    const locations = normalizeJobLocations(flattenLocationValues(categories.location, job?.location, job?.locations));
    const location = locationText(locations);
    const { richContent, description } = primaryRichDescription(job?.descriptionPlain, job?.description, Array.isArray(job?.lists) ? job.lists.map((item: any) => item?.content) : []);
    const externalJobId = asString(job?.id);
    return {
      externalJobId,
      canonicalKey: `lever:${externalJobId || `${asString(job?.text)}:${asString(job?.hostedUrl)}`}`,
      title: asString(job?.text),
      location: location || null,
      remoteType: remoteType(`${location ?? ''} ${asString(job?.workplaceType)}`),
      employmentType: asString(categories.commitment) || null,
      sourceUrl: asString(job?.hostedUrl) || asString(job?.applyUrl),
      applyUrl: asString(job?.applyUrl) || asString(job?.hostedUrl) || null,
      sourcePublishedAt: dateIso(job?.createdAt),
      description,
      richContent,
      language: sourceLanguage(job?.language),
      locations,
    };
  });
}

function normalizeAshby(payload: any): NormalizedJob[] {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.map((job: any) => {
    // Ashby exposes the human label (for example "Toronto") separately from
    // the canonical PostalAddress. Prefer the structured address so Canada,
    // United States and China retain their source-provided city and province/
    // state instead of requiring a best-effort text inference.
    const locations = normalizeJobLocations(flattenLocationValues(
      job?.address?.postalAddress ?? job?.address,
      job?.locations,
      job?.locationName || job?.location,
    ));
    const location = locationText(locations);
    const { richContent, description } = primaryRichDescription(job?.descriptionPlain, job?.descriptionHtml || job?.description);
    const externalJobId = asString(job?.id) || asString(job?.jobId);
    return {
      externalJobId,
      canonicalKey: `ashby:${externalJobId || `${asString(job?.title)}:${asString(job?.applyUrl)}`}`,
      title: asString(job?.title),
      location: location || null,
      remoteType: remoteType(`${location ?? ''} ${asString(job?.workplaceType)}`),
      employmentType: asString(job?.employmentType) || null,
      sourceUrl: asString(job?.applyUrl) || asString(job?.jobUrl),
      applyUrl: asString(job?.applyUrl) || null,
      sourcePublishedAt: dateIso(job?.publishedAt) || dateIso(job?.createdAt),
      description,
      richContent,
      language: sourceLanguage(job?.language),
      locations,
    };
  });
}

function normalizeBaiduStructuredBoard(payload: any, boardToken: string | null): NormalizedJob[] {
  const jobs = Array.isArray(payload?.listData?.listDetailData) ? payload.listData.listDetailData : [];
  const recruitType = asString(payload?.listData?.recruitType) || 'SOCIAL';
  return jobs.map((job: any) => {
    const locations = normalizeJobLocations([asString(job?.workPlace)]);
    const location = locationText(locations);
    const { richContent, description } = richDescription(
      asString(job?.workContent) ? `工作职责\n${asString(job.workContent)}` : '',
      asString(job?.serviceCondition) ? `任职要求\n${asString(job.serviceCondition)}` : '',
    );
    const postId = asString(job?.postId);
    const externalJobId = asString(job?.jobId) || postId;
    const detailUrl = postId ? `https://talent.baidu.com/jobs/detail/${encodeURIComponent(recruitType)}/${encodeURIComponent(postId)}` : '';
    return {
      externalJobId,
      canonicalKey: `baidu:${boardToken ?? 'official'}:${externalJobId || asString(job?.name)}`,
      title: asString(job?.name),
      location: location || null,
      remoteType: remoteType(location ?? ''),
      employmentType: recruitType === 'SOCIAL' ? 'social_recruitment' : recruitType.toLowerCase(),
      sourceUrl: detailUrl,
      applyUrl: detailUrl || null,
      sourcePublishedAt: dateIso(job?.publishDate),
      description,
      richContent,
      language: 'zh-CN',
      locations,
    };
  });
}

function normalizePayload(sourceType: SourceType, payload: unknown, boardToken: string | null) {
  const candidates = sourceType === 'greenhouse'
    ? normalizeGreenhouse(payload)
    : sourceType === 'lever'
      ? normalizeLever(payload)
      : sourceType === 'ashby'
        ? normalizeAshby(payload)
        : sourceType === 'json_ld'
          ? normalizeBaiduStructuredBoard(payload, boardToken)
          : [];
  // Keep all active ATS jobs for absence detection, even if a provider omitted
  // a description. Only AI-relevant jobs are persisted as learning records.
  return candidates.filter((job) => job.title && job.sourceUrl);
}

function publicTextFor(description: string, displayPolicy: DisplayPolicy) {
  if (displayPolicy === 'metadata_only') return '';
  // The full JD stays in its original source language. htmlToPlainText only
  // removes presentation/script markup; it does not translate or summarize.
  if (displayPolicy === 'full_text_authorized') return description.slice(0, 50_000);

  const lines = description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const relevant = lines.filter((line) => AI_RELEVANCE.test(line));
  const candidate = (relevant.length ? relevant : lines).join('\n\n');
  return candidate.length > 1_800 ? `${candidate.slice(0, 1_797).trimEnd()}…` : candidate;
}

function publicContentFor(richContent: JobRichTextDocument, description: string, displayPolicy: DisplayPolicy) {
  if (displayPolicy === 'full_text_authorized') return richContent;
  const text = publicTextFor(description, displayPolicy);
  return jobRichTextFromValue(text);
}

function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requirementLevel(text: string, start: number): SkillMatch['requirementLevel'] {
  const nearby = text.slice(Math.max(0, start - 180), Math.min(text.length, start + 180)).toLowerCase();
  if (/preferred|nice to have|bonus|plus\b|优先|優先|加分/.test(nearby)) return 'preferred';
  if (/responsibilit|you will|you'll|you shall|职责|職責|负责|負責/.test(nearby)) return 'responsibility';
  if (/required|must have|requirements?|qualifications?|任职要求|任職要求|要求|必须|必須/.test(nearby)) return 'required';
  return 'context';
}

export function findSkillMatches(text: string, aliases: SkillAliasRow[]) {
  const matches: SkillMatch[] = [];
  for (const alias of aliases) {
    const escaped = escapedRegex(alias.alias);
    // Phrase aliases must not match a prefix of a longer English term. For
    // example, "agent system" is useful, but must never steal the first
    // twelve characters of "agent systems" before the plural alias is seen.
    // CJK phrases deliberately remain boundary-free because word boundaries
    // are not meaningful for those languages.
    const pattern = alias.match_type === 'word'
      ? `\\b${escaped}\\b`
      : /[A-Za-z0-9]/.test(alias.alias)
        ? `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`
        : escaped;
    const regex = new RegExp(pattern, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      matches.push({
        skillId: alias.skill_id,
        alias: match[0],
        start: match.index,
        end: match.index + match[0].length,
        requirementLevel: requirementLevel(text, match.index),
      });
      if (matches.length >= 120) return matches;
    }
  }
  return matches.sort((a, b) => a.start - b.start || b.end - a.end);
}

async function fetchOfficialSource(source: JobSourceRecord) {
  const isStructuredOfficialBoard = source.source_type === 'json_ld';
  if (!isStructuredOfficialBoard && !ATS_SOURCE_TYPES.includes(source.source_type as AtsSourceType)) {
    throw new ApiError(422, 'This source type cannot be automatically synchronized');
  }
  const endpoint = isStructuredOfficialBoard
    ? officialStructuredBoardEndpoint(source.board_token ?? '')
    : officialAtsEndpoint(source.source_type as AtsSourceType, source.board_token ?? '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: isStructuredOfficialBoard ? 'text/html,application/xhtml+xml' : 'application/json',
        'user-agent': 'StudyAINowJobSkillsMap/1.0 (+https://studyai.now)',
      },
      signal: controller.signal,
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > MAX_RESPONSE_BYTES) throw new ApiError(413, 'The ATS response exceeds the configured size limit');
    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) {
      throw new ApiError(413, 'The ATS response exceeds the configured size limit');
    }
    if (!response.ok) throw new ApiError(502, `The official ATS returned HTTP ${response.status}`);
    let payload: unknown;
    try {
      if (isStructuredOfficialBoard) {
        const marker = 'window.__INITIAL_DATA__ =';
        const start = raw.indexOf(marker);
        const end = start < 0 ? -1 : raw.indexOf('; window.prefix=', start + marker.length);
        if (start < 0 || end < 0) throw new Error('structured payload markers are absent');
        // The public SSR document occasionally serializes an optional field as
        // `undefined`; normalize that JavaScript literal before strict parsing.
        payload = JSON.parse(raw.slice(start + marker.length, end).replace(/:\s*undefined(?=[,}])/g, ':null'));
      } else {
        payload = JSON.parse(raw);
      }
    } catch {
      throw new ApiError(502, isStructuredOfficialBoard ? 'The official board returned invalid structured content' : 'The official ATS returned invalid JSON');
    }
    return { response, raw, payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSkillAliases(db: D1Database) {
  const result = await db.prepare(
    `SELECT skill_aliases.id, skill_aliases.skill_id, skill_aliases.alias, skill_aliases.match_type,
            skills.name_zh, skills.name_en
     FROM skill_aliases JOIN skills ON skills.id = skill_aliases.skill_id
     WHERE skills.status = 'approved'`,
  ).all<SkillAliasRow>();
  return result.results;
}

async function addEvidence(
  db: D1Database,
  jobId: string,
  versionId: string,
  sectionId: string,
  publicText: string,
  aliases: SkillAliasRow[],
) {
  const accepted: SkillMatch[] = [];
  for (const match of findSkillMatches(publicText, aliases)) {
    if (accepted.some((existing) => match.start < existing.end && existing.start < match.end)) continue;
    accepted.push(match);
  }
  if (accepted.length) {
    await db.batch(accepted.map((match) => db.prepare(
      `INSERT INTO job_skill_evidence
         (id, job_id, version_id, section_id, skill_id, evidence_text, start_offset, end_offset,
          requirement_level, evidence_type, confidence, explanation, source_method, review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'explicit', ?, ?, 'dictionary_rule', 'approved')`,
    ).bind(
      crypto.randomUUID(), jobId, versionId, sectionId, match.skillId, publicText.slice(match.start, match.end),
      match.start, match.end, match.requirementLevel, match.requirementLevel === 'required' ? 0.96 : 0.9,
      `Matched the reviewed skill alias “${match.alias}”.`,
    )));
  }
  return accepted.length;
}

async function upsertNormalizedJob(
  db: D1Database,
  source: JobSourceRecord,
  snapshotId: string,
  candidate: NormalizedJob,
  aliases: SkillAliasRow[],
) {
  const publicContent = publicContentFor(candidate.richContent, candidate.description, source.display_policy);
  const publicText = jobRichTextToPlainText(publicContent);
  const semanticHash = await sha256Base64Url(JSON.stringify({
    title: candidate.title,
    location: candidate.location,
    remoteType: candidate.remoteType,
    employmentType: candidate.employmentType,
    sourceUrl: candidate.sourceUrl,
    applyUrl: candidate.applyUrl,
    description: candidate.description,
    richContent: candidate.richContent,
    locations: candidate.locations,
  }));
  const existing = await db.prepare(
    `SELECT id, current_version_id, status,
            (SELECT semantic_hash FROM job_versions WHERE id = job_postings.current_version_id) AS semantic_hash
     FROM job_postings
     WHERE source_id = ? AND (canonical_key = ? OR (external_job_id IS NOT NULL AND external_job_id = ?))
     LIMIT 1`,
  ).bind(source.id, candidate.canonicalKey, candidate.externalJobId || null).first<{
    id: string; current_version_id: string | null; status: string; semantic_hash: string | null;
  }>();

  if (existing?.semantic_hash === semanticHash) {
    await db.prepare(
      `UPDATE job_postings
       SET title = ?, location_text = ?, remote_type = ?, employment_type = ?, source_url = ?, apply_url = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(
      candidate.title, candidate.location, candidate.remoteType, candidate.employmentType, candidate.sourceUrl,
      candidate.applyUrl, existing.id,
    ).run();
    return { created: false, changed: false };
  }

  const jobId = existing?.id ?? crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  const collectedAt = new Date().toISOString();
  // Publication is fixed on first ingestion. If the official source does not
  // expose one, the initial collection timestamp becomes the publication date.
  const publishedAt = candidate.sourcePublishedAt ?? collectedAt;
  const nextSuspectedExpiryAt = suspectedExpiryAt(publishedAt, collectedAt);
  // Provider titles can be localized or unusually long. Prefixing the stable
  // company slug and constraining the input before normalization guarantees a
  // routable base while uniqueSlug still resolves same-title collisions.
  const slugBase = normalizeSlug(`${source.company_slug}-${candidate.title}`.slice(0, 80));
  const slug = existing ? await uniqueSlug(db, slugBase, jobId) : await uniqueSlug(db, slugBase, null);
  const versionNo = existing
    ? ((await db.prepare('SELECT MAX(version_no) AS value FROM job_versions WHERE job_id = ?').bind(jobId).first<{ value: number | null }>())?.value ?? 0) + 1
    : 1;

  if (!existing) {
    await db.prepare(
      `INSERT INTO job_postings
       (id, source_id, company_id, external_job_id, slug, canonical_key, title, normalized_title,
        location_text, remote_type, employment_type, source_url, original_source_url, apply_url, source_attribution, display_policy,
        source_published_at, collected_at, suspected_expired_at, url_check_status, language, current_version_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'published')`,
    ).bind(
      jobId, source.id, source.company_id, candidate.externalJobId || null, slug, candidate.canonicalKey, candidate.title,
      candidate.title.toLowerCase(), candidate.location, candidate.remoteType, candidate.employmentType, candidate.sourceUrl,
      candidate.sourceUrl, candidate.applyUrl, source.official_career_url, source.display_policy, publishedAt, collectedAt,
      nextSuspectedExpiryAt, candidate.language, versionId,
    ).run();
    await db.prepare(
      `INSERT INTO job_status_events (id, job_id, from_status, to_status, reason)
       VALUES (?, ?, NULL, 'published', 'Automatically published from an approved official ATS source')`,
    ).bind(crypto.randomUUID(), jobId).run();
  } else {
    await db.prepare(
      `UPDATE job_postings
       SET external_job_id = ?, canonical_key = ?, slug = ?, title = ?, normalized_title = ?, location_text = ?, remote_type = ?,
           employment_type = ?, source_url = ?, apply_url = ?, display_policy = ?, language = ?, current_version_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(
      candidate.externalJobId || null, candidate.canonicalKey, slug, candidate.title, candidate.title.toLowerCase(), candidate.location,
      candidate.remoteType, candidate.employmentType, candidate.sourceUrl, candidate.applyUrl, source.display_policy,
      candidate.language, versionId, jobId,
    ).run();
  }

  await db.prepare(
    `INSERT INTO job_versions (id, job_id, snapshot_id, version_no, semantic_hash, normalized_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(versionId, jobId, snapshotId, versionNo, semanticHash, JSON.stringify({ ...candidate, publicText })).run();

  for (const [index, location] of candidate.locations.entries()) {
    await db.prepare(
      `INSERT INTO job_locations
       (id, job_id, version_id, raw_location_text, country_code, country_name, region_name, city_name,
        is_remote, confidence, source_method, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), jobId, versionId, location.rawText, location.countryCode, location.countryName,
      location.regionName, location.cityName, location.isRemote ? 1 : 0, location.confidence, location.source, index === 0 ? 1 : 0,
    ).run();
  }

  if (publicText) {
    await db.prepare(
      `INSERT INTO job_sections (id, job_id, version_id, section_key, title, public_text, rich_content_json, order_index)
       VALUES (?, ?, ?, 'description', 'Role description', ?, ?, 1)`,
    ).bind(sectionId, jobId, versionId, publicText, JSON.stringify(publicContent)).run();
    await addEvidence(db, jobId, versionId, sectionId, publicText, aliases);
    // A job-version refresh is independent from the current course catalogue.
    // It can safely wait for an LLM provider and an editor review, then be
    // remapped whenever new skills or course coverage are approved.
    await enqueueKnowledgeRefresh(db, {
      sourceType: 'job_version',
      sourceId: versionId,
      sourceHash: semanticHash,
      locator: { jobId, versionId },
    });
  }
  return { created: !existing, changed: Boolean(existing) };
}

async function uniqueSlug(db: D1Database, base: string, currentJobId: string | null) {
  const trimmed = base.slice(0, 68);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = attempt ? `${trimmed}-${attempt + 1}` : trimmed;
    const row = await db.prepare('SELECT id FROM job_postings WHERE slug = ?').bind(candidate).first<{ id: string }>();
    if (!row || row.id === currentJobId) return candidate;
  }
  return `${trimmed}-${crypto.randomUUID().slice(0, 8)}`;
}

type LegacyRichSection = {
  job_id: string;
  version_id: string;
  snapshot_id: string | null;
  normalized_json: string;
  public_text: string;
};

type LegacyLocation = {
  raw_location_text: string;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  is_remote: number;
  confidence: number;
  source_method: string;
  is_primary: number;
};

function safeNormalizedJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/**
 * One-time, lock-protected migration for jobs captured before rich content was
 * introduced. It creates a new current version, recreates evidence against the
 * canonical plain text, and duplicates geographic rows for that version.
 */
export async function backfillJobRichText(env: Env, limit = 10) {
  const lockedUntil = new Date(Date.now() + 55_000).toISOString();
  const claim = await env.DB.prepare(
    `UPDATE job_rich_text_backfill_state
     SET locked_until = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1 AND completed_at IS NULL
       AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)`,
  ).bind(lockedUntil).run();
  if (!claim.meta.changes) return { processed: 0, remaining: null, claimed: false };

  try {
    const sections = await env.DB.prepare(
      `SELECT job_postings.id AS job_id, job_versions.id AS version_id, job_versions.snapshot_id,
              job_versions.normalized_json, job_sections.public_text
       FROM job_postings
       JOIN job_versions ON job_versions.id = job_postings.current_version_id
       JOIN job_sections ON job_sections.job_id = job_postings.id AND job_sections.version_id = job_postings.current_version_id
       WHERE COALESCE(job_sections.rich_content_json, '') = ''
       ORDER BY job_postings.last_verified_at DESC, job_postings.id
       LIMIT ?`,
    ).bind(Math.max(1, Math.min(limit, 20))).all<LegacyRichSection>();
    const aliases = await loadSkillAliases(env.DB);
    let processed = 0;

    for (const legacy of sections.results) {
      const richContent = jobRichTextFromValue(legacy.public_text);
      const publicText = jobRichTextToPlainText(richContent);
      const normalized = safeNormalizedJson(legacy.normalized_json);
      const normalizedJson = JSON.stringify({
        ...normalized,
        description: publicText,
        richContent,
        richTextSchemaVersion: 1,
      });
      const semanticHash = await sha256Base64Url(JSON.stringify({
        richTextSchemaVersion: 1,
        previousVersionId: legacy.version_id,
        publicText,
        richContent,
      }));
      const nextVersionNo = ((await env.DB.prepare(
        'SELECT MAX(version_no) AS value FROM job_versions WHERE job_id = ?',
      ).bind(legacy.job_id).first<{ value: number | null }>())?.value ?? 0) + 1;
      const versionId = crypto.randomUUID();
      const sectionId = crypto.randomUUID();
      const locations = await env.DB.prepare(
        `SELECT raw_location_text, country_code, country_name, region_name, city_name,
                is_remote, confidence, source_method, is_primary
         FROM job_locations WHERE job_id = ? AND version_id = ?`,
      ).bind(legacy.job_id, legacy.version_id).all<LegacyLocation>();

      await env.DB.prepare(
        `INSERT INTO job_versions (id, job_id, snapshot_id, version_no, semantic_hash, normalized_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(versionId, legacy.job_id, legacy.snapshot_id, nextVersionNo, semanticHash, normalizedJson).run();
      await env.DB.prepare(
        `INSERT INTO job_sections (id, job_id, version_id, section_key, title, public_text, rich_content_json, order_index)
         VALUES (?, ?, ?, 'description', 'Role description', ?, ?, 1)`,
      ).bind(sectionId, legacy.job_id, versionId, publicText, JSON.stringify(richContent)).run();
      for (const location of locations.results) {
        await env.DB.prepare(
          `INSERT INTO job_locations
           (id, job_id, version_id, raw_location_text, country_code, country_name, region_name, city_name,
            is_remote, confidence, source_method, is_primary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), legacy.job_id, versionId, location.raw_location_text, location.country_code,
          location.country_name, location.region_name, location.city_name, location.is_remote, location.confidence,
          location.source_method, location.is_primary,
        ).run();
      }
      await addEvidence(env.DB, legacy.job_id, versionId, sectionId, publicText, aliases);
      await env.DB.prepare(
        'UPDATE job_postings SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ).bind(versionId, legacy.job_id).run();
      processed += 1;
    }

    const remaining = await env.DB.prepare(
      `SELECT COUNT(*) AS value
       FROM job_postings
       JOIN job_sections ON job_sections.job_id = job_postings.id AND job_sections.version_id = job_postings.current_version_id
       WHERE COALESCE(job_sections.rich_content_json, '') = ''`,
    ).first<{ value: number }>();
    if (!Number(remaining?.value ?? 0)) {
      await env.DB.prepare(
        'UPDATE job_rich_text_backfill_state SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      ).run();
    }
    return { processed, remaining: Number(remaining?.value ?? 0), claimed: true };
  } finally {
    await env.DB.prepare(
      'UPDATE job_rich_text_backfill_state SET locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    ).run();
  }
}

type SkillReindexJob = {
  id: string;
  version_id: string;
  semantic_hash: string;
};

type SkillReindexSection = { id: string; public_text: string };

/**
 * Rebuild deterministic skill evidence for the current version of every
 * published JD. It is intentionally resumable: extending the approved alias
 * vocabulary can remap the whole catalogue without recrawling a single ATS
 * source, while reviewed LLM evidence remains untouched.
 */
export async function reindexCurrentJobSkillEvidence(env: Env, limit = 24) {
  const lockedUntil = new Date(Date.now() + 105_000).toISOString();
  const claim = await env.DB.prepare(
    `UPDATE job_skill_evidence_reindex_state
     SET status = 'running', locked_until = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1 AND status IN ('pending', 'running')
       AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)`,
  ).bind(lockedUntil).run();
  if (!claim.meta.changes) {
    const state = await env.DB.prepare(
      'SELECT status FROM job_skill_evidence_reindex_state WHERE id = 1',
    ).first<{ status: string }>();
    return { claimed: false, status: state?.status ?? 'unavailable', processed: 0, evidence: 0, requeued: 0 };
  }

  try {
    const state = await env.DB.prepare(
      'SELECT cursor_job_id FROM job_skill_evidence_reindex_state WHERE id = 1',
    ).first<{ cursor_job_id: string | null }>();
    const batchSize = Math.max(1, Math.min(Math.floor(limit), 24));
    const jobs = await env.DB.prepare(
      `SELECT job_postings.id, job_versions.id AS version_id, job_versions.semantic_hash
       FROM job_postings
       JOIN job_versions ON job_versions.id = job_postings.current_version_id
       JOIN job_sections ON job_sections.job_id = job_postings.id AND job_sections.version_id = job_postings.current_version_id
       WHERE job_postings.status = 'published' AND job_postings.id > COALESCE(?, '')
         AND LENGTH(TRIM(job_sections.public_text)) > 0
       GROUP BY job_postings.id
       ORDER BY job_postings.id
       LIMIT ?`,
    ).bind(state?.cursor_job_id, batchSize).all<SkillReindexJob>();
    const aliases = await loadSkillAliases(env.DB);
    let evidence = 0;
    let requeued = 0;

    for (const job of jobs.results) {
      const sections = await env.DB.prepare(
        `SELECT id, public_text FROM job_sections
         WHERE job_id = ? AND version_id = ? ORDER BY order_index`,
      ).bind(job.id, job.version_id).all<SkillReindexSection>();
      // Do not disturb a human-approved or exact-quote LLM mapping; only the
      // reproducible dictionary layer is rebuilt against the newest aliases.
      await env.DB.prepare(
        `DELETE FROM job_skill_evidence
         WHERE job_id = ? AND version_id = ? AND source_method = 'dictionary_rule'`,
      ).bind(job.id, job.version_id).run();
      for (const section of sections.results) {
        evidence += await addEvidence(env.DB, job.id, job.version_id, section.id, section.public_text, aliases);
      }
      const queued = await enqueueKnowledgeRefresh(env.DB, {
        sourceType: 'job_version',
        sourceId: job.version_id,
        sourceHash: job.semantic_hash,
        locator: { jobId: job.id, versionId: job.version_id },
        force: true,
      });
      if (queued.created) requeued += 1;
    }

    const cursor = jobs.results.at(-1)?.id ?? state?.cursor_job_id ?? null;
    const complete = jobs.results.length < batchSize;
    await env.DB.prepare(
      `UPDATE job_skill_evidence_reindex_state
       SET cursor_job_id = ?, status = ?, locked_until = NULL,
           completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
    ).bind(cursor, complete ? 'completed' : 'pending', complete ? 1 : 0).run();
    return { claimed: true, status: complete ? 'completed' : 'pending', processed: jobs.results.length, evidence, requeued };
  } catch (error) {
    await env.DB.prepare(
      `UPDATE job_skill_evidence_reindex_state
       SET status = 'pending', locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    ).run();
    throw error;
  }
}

export async function startSourceSync(db: D1Database, sourceId: string) {
  const lockUntil = new Date(Date.now() + 5 * 60_000).toISOString();
  const claim = await db.prepare(
    `UPDATE job_sources
     SET sync_lock_until = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND enabled = 1 AND (sync_lock_until IS NULL OR sync_lock_until < CURRENT_TIMESTAMP)`,
  ).bind(lockUntil, sourceId).run();
  if (!claim.meta.changes) throw new ApiError(409, 'This source is disabled or already being synchronized');
  const runId = crypto.randomUUID();
  await db.prepare("INSERT INTO crawl_runs (id, source_id, status) VALUES (?, ?, 'queued')").bind(runId, sourceId).run();
  return runId;
}

async function inspectJobUrl(job: JobUrlInspectionRow): Promise<JobUrlInspectionResult> {
  const checkedUrl = job.original_source_url || job.source_url;
  try {
    const url = new URL(checkedUrl);
    if (url.protocol !== 'https:') {
      return { jobId: job.id, outcome: 'error', httpStatus: null, finalUrl: null, detail: 'Only HTTPS source URLs may be inspected automatically.' };
    }
  } catch {
    return { jobId: job.id, outcome: 'error', httpStatus: null, finalUrl: null, detail: 'The stored original source URL is invalid.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_INSPECTION_TIMEOUT_MS);
  try {
    const response = await fetch(checkedUrl, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.7',
        'user-agent': 'StudyAINowJobUrlInspector/1.0 (+https://studyai.now)',
      },
      redirect: 'follow',
      signal: controller.signal,
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const contentLength = Number(response.headers.get('content-length') ?? '0');
    const body = contentLength > URL_INSPECTION_MAX_BYTES ? null : await response.text();
    const outcome = classifyJobUrlResponse(response.status, body, job.title, job.external_job_id);
    return {
      jobId: job.id,
      outcome,
      httpStatus: response.status,
      finalUrl: response.url || checkedUrl,
      detail: outcome === 'inconclusive'
        ? 'The URL returned successfully but did not contain a stable title or job identifier.'
        : outcome === 'error'
          ? `The source URL returned HTTP ${response.status}.`
          : null,
    };
  } catch (error) {
    return {
      jobId: job.id,
      outcome: 'error',
      httpStatus: null,
      finalUrl: null,
      detail: error instanceof Error && error.name === 'AbortError' ? 'The source URL inspection timed out.' : safeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runConcurrent<T, R>(items: T[], concurrency: number, operation: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      results.push(await operation(item));
    }
  }));
  return results;
}

/**
 * Expiry is established only by the individual original job URL. A source
 * catalogue is intentionally never used as negative evidence: official boards
 * paginate, reorder, and can expose a partial result set.
 */
export async function inspectDueJobUrls(env: Env, limit = 40, initialOnly = false) {
  const batchSize = Math.max(1, Math.min(Math.floor(limit), 64));
  const jobs = await env.DB.prepare(
    `SELECT id, title, external_job_id, source_url, original_source_url,
            source_published_at, collected_at, status
     FROM job_postings
     WHERE status = 'published'
       AND TRIM(COALESCE(original_source_url, source_url, '')) <> ''
       AND (last_url_checked_at IS NULL OR (? = 0 AND suspected_expired_at <= CURRENT_TIMESTAMP))
     ORDER BY CASE WHEN last_url_checked_at IS NULL THEN 0 ELSE 1 END,
              suspected_expired_at ASC, id ASC
     LIMIT ?`,
  ).bind(initialOnly ? 1 : 0, batchSize).all<JobUrlInspectionRow>();

  const results = await runConcurrent(jobs.results, URL_INSPECTION_CONCURRENCY, inspectJobUrl);
  let active = 0;
  let expired = 0;
  let inconclusive = 0;
  let errors = 0;

  for (const result of results) {
    const job = jobs.results.find((item) => item.id === result.jobId);
    if (!job) continue;
    const now = new Date().toISOString();
    const publishedAt = job.source_published_at || job.collected_at || now;
    const isActive = result.outcome === 'active';
    const isMissing = result.outcome === 'missing';
    const nextExpiry = isActive ? suspectedExpiryAt(publishedAt, now) : null;
    const nextStatus = isMissing ? 'expired' : job.status;
    if (isActive) active += 1;
    else if (isMissing) expired += 1;
    else if (result.outcome === 'inconclusive') inconclusive += 1;
    else errors += 1;

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE job_postings
         SET status = ?, collected_at = CASE WHEN ? THEN ? ELSE collected_at END,
             suspected_expired_at = CASE WHEN ? THEN ? ELSE suspected_expired_at END,
             expires_at = CASE WHEN ? THEN CURRENT_TIMESTAMP WHEN ? THEN NULL ELSE expires_at END,
             last_url_checked_at = ?, url_check_status = ?, url_check_http_status = ?, url_check_error = ?,
             missing_run_count = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      ).bind(
        nextStatus, isActive ? 1 : 0, now, isActive ? 1 : 0, nextExpiry,
        isMissing ? 1 : 0, isActive ? 1 : 0, now, result.outcome, result.httpStatus, result.detail, job.id,
      ),
      env.DB.prepare(
        `INSERT INTO job_url_inspections
         (id, job_id, checked_at, source_url, final_url, http_status, outcome, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), job.id, now, job.original_source_url || job.source_url,
        result.finalUrl, result.httpStatus, result.outcome, result.detail,
      ),
      ...(nextStatus === job.status ? [] : [
        env.DB.prepare(
          `INSERT INTO job_status_events (id, job_id, from_status, to_status, reason)
           VALUES (?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), job.id, job.status, nextStatus,
          'The original source URL no longer returned an active job page during scheduled inspection.',
        ),
      ]),
    ]);
  }

  const remaining = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN last_url_checked_at IS NULL THEN 1 ELSE 0 END) AS initial_pending,
       SUM(CASE WHEN last_url_checked_at IS NULL OR suspected_expired_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS due
     FROM job_postings
     WHERE status = 'published'
       AND TRIM(COALESCE(original_source_url, source_url, '')) <> ''`,
  ).first<{ initial_pending: number | null; due: number | null }>();
  return {
    inspected: results.length,
    active,
    expired,
    inconclusive,
    errors,
    initialPending: Number(remaining?.initial_pending ?? 0),
    dueRemaining: Number(remaining?.due ?? 0),
  };
}

export async function runDueSourceSync(env: Env, limit = 20) {
  const sources = await env.DB.prepare(
    `SELECT id FROM job_sources
     WHERE enabled = 1
       AND acquisition_policy IN ('api_allowed', 'structured_data')
       AND source_type IN ('greenhouse', 'lever', 'ashby', 'json_ld')
       AND (next_fetch_at IS NULL OR next_fetch_at <= CURRENT_TIMESTAMP)
       AND (sync_lock_until IS NULL OR sync_lock_until < CURRENT_TIMESTAMP)
     ORDER BY COALESCE(next_fetch_at, created_at), created_at
     LIMIT ?`,
  ).bind(Math.max(1, Math.min(limit, 20))).all<{ id: string }>();
  let started = 0;
  for (const source of sources.results) {
    try {
      const runId = await startSourceSync(env.DB, source.id);
      started += 1;
      await runSourceSync(env, source.id, runId);
    } catch (error) {
      // Another at-least-once Cron delivery can legitimately win the source
      // lock. Other failures remain observable in Cron Events and console logs.
      if (!(error instanceof ApiError) || error.status !== 409) {
        console.error('Scheduled job source sync could not start', { sourceId: source.id, error: safeErrorMessage(error) });
      }
    }
  }
  return { dueSources: sources.results.length, started };
}

export async function runSourceSync(env: Env, sourceId: string, runId: string) {
  const source = await env.DB.prepare(
    `SELECT job_sources.id, job_sources.company_id, companies.name AS company_name, companies.slug AS company_slug,
            job_sources.source_type, job_sources.board_token, job_sources.official_career_url, job_sources.endpoint_url,
            job_sources.acquisition_policy, job_sources.display_policy, job_sources.enabled, job_sources.sync_lock_until
     FROM job_sources JOIN companies ON companies.id = job_sources.company_id WHERE job_sources.id = ?`,
  ).bind(sourceId).first<JobSourceRecord>();
  if (!source) throw new ApiError(404, 'Job source not found');

  await env.DB.prepare("UPDATE crawl_runs SET status = 'running' WHERE id = ? AND status = 'queued'").bind(runId).run();
  try {
    const { response, raw, payload } = await fetchOfficialSource(source);
    const rawHash = await sha256Base64Url(raw);
    const storageKey = `jobs/raw/${runId}/${source.id}.${source.source_type === 'json_ld' ? 'html' : 'json'}`;
    await env.COURSE_STORAGE.put(storageKey, raw, {
      httpMetadata: { contentType: response.headers.get('content-type') ?? 'application/json' },
      customMetadata: { sourceId: source.id, runId, fetchedAt: new Date().toISOString(), visibility: 'private' },
    });
    const snapshotId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO raw_job_snapshots (id, crawl_run_id, source_id, storage_key, content_sha256, content_type, http_status, etag, last_modified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      snapshotId, runId, source.id, storageKey, rawHash, response.headers.get('content-type') ?? 'application/json', response.status,
      response.headers.get('etag'), response.headers.get('last-modified'),
    ).run();

    const candidates = normalizePayload(source.source_type, payload, source.board_token);
    const relevant = candidates.filter((job) => isAiRelevantJob(job.title, job.description));
    const aliases = await loadSkillAliases(env.DB);
    let newCount = 0;
    let updatedCount = 0;
    for (const candidate of relevant) {
      const result = await upsertNormalizedJob(env.DB, source, snapshotId, candidate, aliases);
      if (result.created) newCount += 1;
      if (result.changed) updatedCount += 1;
    }
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE crawl_runs SET status = 'complete_success', completed_at = CURRENT_TIMESTAMP, http_status = ?, discovered_count = ?,
                relevant_count = ?, new_count = ?, updated_count = ?, stats_json = ? WHERE id = ?`,
      ).bind(
        response.status, candidates.length, relevant.length, newCount, updatedCount,
        JSON.stringify({ sourceType: source.source_type, expiryPolicy: 'direct_original_url_only' }), runId,
      ),
      env.DB.prepare(
        // Cron is the authoritative cadence (00:00 and 12:00 UTC). Keeping
        // the source due lets the next fixed trigger run it, instead of a
        // manual first sync shifting an intended twice-daily schedule by hours.
        `UPDATE job_sources SET last_fetched_at = CURRENT_TIMESTAMP, next_fetch_at = CURRENT_TIMESTAMP,
                sync_lock_until = NULL, consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(source.id),
    ]);
  } catch (error) {
    const message = safeErrorMessage(error).slice(0, 500);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE crawl_runs SET status = 'complete_error', completed_at = CURRENT_TIMESTAMP, error_code = ?, error_message = ? WHERE id = ?`,
      ).bind(error instanceof ApiError ? `HTTP_${error.status}` : 'SYNC_ERROR', message, runId),
      env.DB.prepare(
        `UPDATE job_sources SET sync_lock_until = NULL, consecutive_failures = consecutive_failures + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(sourceId),
    ]);
    console.error('Job source sync failed', { sourceId, runId, message });
  }
}

export async function publishJobReview(
  db: D1Database,
  jobId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected' | 'needs_correction' | 'archived',
  notes: string | null,
) {
  const job = await db.prepare('SELECT id, status, current_version_id FROM job_postings WHERE id = ?').bind(jobId).first<{
    id: string; status: string; current_version_id: string | null;
  }>();
  if (!job) throw new ApiError(404, 'Job not found');
  const nextStatus = decision === 'approved' ? 'published' : decision === 'rejected' ? 'rejected' : decision === 'archived' ? 'archived' : 'needs_review';
  await db.batch([
    db.prepare('INSERT INTO job_reviews (id, job_id, reviewer_id, decision, notes) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), jobId, reviewerId, decision, notes),
    db.prepare('UPDATE job_postings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(nextStatus, jobId),
    db.prepare('INSERT INTO job_status_events (id, job_id, from_status, to_status, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), jobId, job.status, nextStatus, notes || `Human reviewer decision: ${decision}`),
    db.prepare(
      `UPDATE job_skill_evidence SET review_status = ? WHERE job_id = ? AND version_id = ? AND review_status = 'pending'`,
    ).bind(decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'pending', jobId, job.current_version_id),
  ]);
  return { status: nextStatus };
}
