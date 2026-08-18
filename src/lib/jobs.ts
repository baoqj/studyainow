export type JobGeography = {
  countryCode: string | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
};

export type JobLocation = JobGeography & {
  rawText: string;
  isRemote: boolean;
  confidence: number;
  source: string;
};

export type JobRichTextInline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: JobRichTextInline[] }
  | { type: 'link'; href: string; children: JobRichTextInline[] };

export type JobRichTextBlock =
  | { type: 'heading'; level: 2 | 3 | 4; children: JobRichTextInline[] }
  | { type: 'paragraph'; children: JobRichTextInline[] }
  | { type: 'list'; ordered: boolean; items: JobRichTextInline[][] };

export type JobRichTextDocument = { version: 1; blocks: JobRichTextBlock[] };

export type JobListItem = {
  slug: string;
  title: string;
  company: { name: string; slug: string };
  location: string | null;
  geography: JobGeography | null;
  remoteType: string;
  employmentType: string | null;
  status: string;
  publishedAt: string | null;
  collectedAt: string | null;
  suspectedExpiredAt: string | null;
  skillCount: number;
  primarySkill: { zh: string | null; en: string } | null;
  bookmarked: boolean;
};

export type JobListResponse = {
  jobs: JobListItem[];
  pagination: { limit: number; offset: number; total: number; nextOffset: number | null };
  stats: { publishedJobs: number; companies: number; mappedJobs: number; latestPublishedAt: string | null };
  filters: {
    countries: Array<{ code: string; name: string; count: number }>;
    cities: Array<{ slug: string; name: string; count: number }>;
    locations: Array<{
      code: string; name: string; count: number;
      cities: Array<{ slug: string; name: string; count: number }>;
    }>;
  };
};

export type JobDetail = {
  job: {
    slug: string; title: string; company: { name: string; slug: string; careerUrl: string | null };
    location: string | null; locations: JobLocation[]; remoteType: string; employmentType: string | null; sourceUrl: string;
    sourceAttribution: string; applyUrl: string | null; displayPolicy: string; publishedAt: string | null;
    collectedAt: string | null; suspectedExpiredAt: string | null; status: string;
    language: string;
    bookmarked: boolean;
  };
  sections: Array<{
    id: string; key: string; title: string | null; text: string;
    richContent: JobRichTextDocument | null;
    annotations: Array<{ id: string; skillId: string; start: number; end: number; phrase: string; requirementLevel: string; confidence: number }>;
  }>;
  skills: Array<{
    id: string; slug: string; name: { zh: string | null; en: string }; category: string; evidenceCount: number;
    evidence: Array<{ id: string; phrase: string; requirementLevel: string }>;
    courses: Array<{ courseId: string; chapterRouteId: string; lessonRouteId: string | null; coverageLevel: string; coverageScore: number; primary: boolean; learningOutcome: string }>;
    relationships: Array<{ skillId: string; slug: string; name: { zh: string | null; en: string }; relationType: string; weight: number }>;
  }>;
};

async function read<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export async function fetchJobs(query = '') {
  const response = await fetch(`/api/jobs${query ? `?${query}` : ''}`, { headers: { accept: 'application/json' } });
  return read<JobListResponse>(response);
}

export async function fetchJob(slug: string) {
  const response = await fetch(`/api/jobs/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' } });
  return read<JobDetail>(response);
}

export async function fetchBookmarkedJobs() {
  const response = await fetch('/api/jobs/bookmarks', { headers: { accept: 'application/json' } });
  return read<{ jobs: JobListItem[] }>(response);
}

export async function setJobBookmark(slug: string, bookmarked: boolean) {
  const response = await fetch(`/api/jobs/${encodeURIComponent(slug)}/bookmark`, {
    method: bookmarked ? 'PUT' : 'DELETE',
    headers: { accept: 'application/json' },
  });
  return read<{ bookmarked: boolean }>(response);
}
