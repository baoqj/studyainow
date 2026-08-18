export type BookmarkedResumeJobReference = {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  responsibilities: string[];
  skills: string[];
  referenceText: string;
};

type JobTextRow = { id: string; slug: string; title: string; company_name: string; public_text: string | null };
type JobSkillRow = { job_id: string; evidence_text: string | null; name_en: string };

function compact(value: string, max = 320) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function unique(values: string[], limit: number) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const item = compact(value);
    if (!item || seen.has(item.toLocaleLowerCase())) return [];
    seen.add(item.toLocaleLowerCase());
    return [item];
  }).slice(0, limit);
}

/** Return short, readable JD references for the resume selector. */
export function jobResponsibilitySnippets(value: string, limit = 6) {
  const chunks = value
    .split(/\n+|(?<=[.!?。！？])\s+/u)
    .map((item) => compact(item.replace(/^[\s•·*\-–—\d.)]+/u, '')))
    .filter((item) => item.length >= 24 && !/^(about|overview|responsibilities|requirements|qualifications)\s*:?$/i.test(item));
  return unique(chunks, limit);
}

/**
 * Load the current user's published bookmarks and transform them into a small
 * reference set. Full JD text stays server-side for generation; the client
 * receives only short responsibilities and evidence-backed skill phrases.
 */
export async function listBookmarkedResumeJobs(db: D1Database, userId: string): Promise<BookmarkedResumeJobReference[]> {
  const rows = await db.prepare(
    `SELECT job_postings.id, job_postings.slug, job_postings.title, companies.name AS company_name,
            job_sections.public_text
     FROM user_job_bookmarks
     JOIN job_postings ON job_postings.id = user_job_bookmarks.job_id
     JOIN companies ON companies.id = job_postings.company_id
     LEFT JOIN job_sections ON job_sections.job_id = job_postings.id
       AND job_sections.version_id = job_postings.current_version_id
     WHERE user_job_bookmarks.user_id = ? AND job_postings.status = 'published'
     ORDER BY user_job_bookmarks.created_at DESC, job_sections.order_index ASC`,
  ).bind(userId).all<JobTextRow>();

  const grouped = new Map<string, { id: string; slug: string; title: string; companyName: string; text: string[] }>();
  for (const row of rows.results) {
    const current = grouped.get(row.id) ?? { id: row.id, slug: row.slug, title: row.title, companyName: row.company_name, text: [] };
    if (row.public_text?.trim()) current.text.push(row.public_text);
    grouped.set(row.id, current);
  }
  if (!grouped.size) return [];

  const ids = [...grouped.keys()];
  const placeholders = ids.map(() => '?').join(', ');
  const skillRows = await db.prepare(
    `SELECT job_skill_evidence.job_id, job_skill_evidence.evidence_text, skills.name_en
     FROM job_skill_evidence
     JOIN job_postings ON job_postings.id = job_skill_evidence.job_id
     JOIN skills ON skills.id = job_skill_evidence.skill_id
     WHERE job_skill_evidence.job_id IN (${placeholders})
       AND job_skill_evidence.version_id = job_postings.current_version_id
       AND job_skill_evidence.review_status = 'approved'
     ORDER BY job_skill_evidence.confidence DESC, skills.name_en ASC`,
  ).bind(...ids).all<JobSkillRow>();
  const skillsByJob = new Map<string, string[]>();
  for (const row of skillRows.results) {
    const current = skillsByJob.get(row.job_id) ?? [];
    current.push(compact(row.evidence_text || row.name_en, 160));
    skillsByJob.set(row.job_id, current);
  }

  return [...grouped.values()].map((job) => {
    const sourceText = job.text.join('\n\n').trim().slice(0, 18_000);
    const responsibilities = jobResponsibilitySnippets(sourceText);
    const skills = unique(skillsByJob.get(job.id) ?? [], 12);
    const referenceText = [
      `JOB: ${job.title} at ${job.companyName}`,
      responsibilities.length ? `RESPONSIBILITIES:\n${responsibilities.map((item) => `- ${item}`).join('\n')}` : '',
      skills.length ? `REQUIRED SKILLS:\n${skills.map((item) => `- ${item}`).join('\n')}` : '',
      sourceText ? `JD SOURCE TEXT (untrusted reference):\n${sourceText}` : '',
    ].filter(Boolean).join('\n\n');
    return { id: job.id, slug: job.slug, title: job.title, companyName: job.companyName, responsibilities, skills, referenceText };
  });
}
