import { getAuthUser } from '../../_lib/auth';
import { errorResponse, json } from '../../_lib/http';
import { parseJobRichText } from '../../_lib/jobRichText';
import { loadPublicJobTags } from '../../_lib/jobTags';

type JobRow = {
  id: string;
  slug: string;
  title: string;
  location_text: string | null;
  remote_type: string;
  employment_type: string | null;
  source_url: string;
  original_source_url: string | null;
  apply_url: string | null;
  source_attribution: string;
  display_policy: string;
  source_published_at: string | null;
  source_updated_at: string | null;
  collected_at: string | null;
  first_collected_at: string | null;
  last_seen_at: string | null;
  suspected_expired_at: string | null;
  status: string;
  language: string;
  company_name: string;
  company_slug: string;
  company_career_url: string | null;
  current_version_id: string;
  bookmarked: number;
};

type SectionRow = { id: string; section_key: string; title: string | null; public_text: string; rich_content_json: string | null; order_index: number };
type EvidenceRow = {
  id: string; section_id: string; skill_id: string; evidence_text: string; start_offset: number; end_offset: number;
  requirement_level: string; confidence: number; name_zh: string; name_en: string; slug: string; category: string;
};
type CoverageRow = {
  skill_id: string; course_id: string; chapter_route_id: string; lesson_route_id: string | null; coverage_level: string;
  coverage_score: number; is_primary: number; learning_outcome: string;
};
type RelationRow = {
  from_skill_id: string;
  to_skill_id: string;
  from_slug: string;
  from_name_zh: string;
  from_name_en: string;
  to_slug: string;
  to_name_zh: string;
  to_name_en: string;
  relation_type: string;
  weight: number;
};
type RelationshipRow = RelationRow & {
  related_skill_id: string;
  related_slug: string;
  related_name_zh: string;
  related_name_en: string;
};
type LocationRow = {
  raw_location_text: string;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  is_remote: number;
  confidence: number;
  source_method: string;
};

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ request, env, params }) => {
  try {
    const slug = params.slug;
    if (!slug) return json({ error: 'Job not found' }, { status: 404 });
    const user = await getAuthUser(env.DB, request);
    const job = await env.DB.prepare(
      `SELECT job_postings.id, job_postings.slug, job_postings.title, job_postings.location_text, job_postings.remote_type,
              job_postings.employment_type, job_postings.source_url, job_postings.original_source_url, job_postings.apply_url, job_postings.source_attribution,
              job_postings.display_policy, job_postings.source_published_at, job_postings.source_updated_at,
              job_postings.collected_at, job_postings.first_collected_at, job_postings.last_seen_at,
              job_postings.suspected_expired_at, job_postings.status,
              job_postings.language,
              job_postings.current_version_id, companies.name AS company_name, companies.slug AS company_slug,
              companies.career_url AS company_career_url,
              EXISTS (SELECT 1 FROM user_job_bookmarks
                WHERE user_job_bookmarks.user_id = ? AND user_job_bookmarks.job_id = job_postings.id) AS bookmarked
       FROM job_postings JOIN companies ON companies.id = job_postings.company_id
       WHERE job_postings.slug = ? AND job_postings.status = 'published'`,
    ).bind(user?.id ?? '', slug).first<JobRow>();
    if (!job) return json({ error: 'Job not found' }, { status: 404 });

    const [sectionsResult, evidenceResult, coverageResult, locationsResult, tagsByVersion] = await Promise.all([
      env.DB.prepare(
        `SELECT id, section_key, title, public_text, rich_content_json, order_index FROM job_sections
         WHERE job_id = ? AND version_id = ? AND visibility = 'public' ORDER BY order_index`,
      ).bind(job.id, job.current_version_id).all<SectionRow>(),
      env.DB.prepare(
        `SELECT job_skill_evidence.id, job_skill_evidence.section_id, job_skill_evidence.skill_id,
                job_skill_evidence.evidence_text, job_skill_evidence.start_offset, job_skill_evidence.end_offset,
                job_skill_evidence.requirement_level, job_skill_evidence.confidence,
                skills.name_zh, skills.name_en, skills.slug, skills.category
         FROM job_skill_evidence
         JOIN job_sections ON job_sections.id = job_skill_evidence.section_id AND job_sections.visibility = 'public'
         JOIN skills ON skills.id = job_skill_evidence.skill_id
         WHERE job_skill_evidence.job_id = ? AND job_skill_evidence.version_id = ?
           AND job_skill_evidence.review_status = 'approved'
         ORDER BY job_skill_evidence.section_id, job_skill_evidence.start_offset`,
      ).bind(job.id, job.current_version_id).all<EvidenceRow>(),
      env.DB.prepare(
        `SELECT lesson_skill_coverage.skill_id, lesson_skill_coverage.course_id, lesson_skill_coverage.chapter_route_id,
                lesson_skill_coverage.lesson_route_id, lesson_skill_coverage.coverage_level,
                lesson_skill_coverage.coverage_score, lesson_skill_coverage.is_primary, lesson_skill_coverage.learning_outcome
         FROM lesson_skill_coverage
         JOIN job_skill_evidence ON job_skill_evidence.skill_id = lesson_skill_coverage.skill_id
         JOIN job_sections ON job_sections.id = job_skill_evidence.section_id AND job_sections.visibility = 'public'
         WHERE job_skill_evidence.job_id = ? AND job_skill_evidence.version_id = ?
           AND job_skill_evidence.review_status = 'approved' AND lesson_skill_coverage.review_status = 'approved'
         GROUP BY lesson_skill_coverage.id
         ORDER BY lesson_skill_coverage.is_primary DESC, lesson_skill_coverage.coverage_score DESC`,
      ).bind(job.id, job.current_version_id).all<CoverageRow>(),
      env.DB.prepare(
        `SELECT raw_location_text, country_code, country_name, region_name, city_name, is_remote, confidence, source_method
         FROM job_locations WHERE job_id = ? AND version_id = ?
         ORDER BY is_primary DESC, confidence DESC, created_at ASC`,
      ).bind(job.id, job.current_version_id).all<LocationRow>(),
      loadPublicJobTags(env.DB, [job.current_version_id]),
    ]);

    const evidenceBySection = new Map<string, EvidenceRow[]>();
    const skillsById = new Map<string, { id: string; slug: string; zh: string; en: string; category: string; evidence: EvidenceRow[]; courses: CoverageRow[]; relationships: RelationshipRow[] }>();
    for (const evidence of evidenceResult.results) {
      const sectionEvidence = evidenceBySection.get(evidence.section_id) ?? [];
      sectionEvidence.push(evidence);
      evidenceBySection.set(evidence.section_id, sectionEvidence);
      const skill = skillsById.get(evidence.skill_id) ?? {
        id: evidence.skill_id,
        slug: evidence.slug,
        zh: evidence.name_zh,
        en: evidence.name_en,
        category: evidence.category,
        evidence: [],
        courses: [],
        relationships: [],
      };
      skill.evidence.push(evidence);
      skillsById.set(evidence.skill_id, skill);
    }
    for (const coverage of coverageResult.results) {
      skillsById.get(coverage.skill_id)?.courses.push(coverage);
    }
    const evidenceSkillIds = [...skillsById.keys()];
    if (evidenceSkillIds.length) {
      const placeholders = evidenceSkillIds.map(() => '?').join(', ');
      const relations = await env.DB.prepare(
        `SELECT skill_relations.from_skill_id, skill_relations.to_skill_id,
                from_skill.slug AS from_slug, from_skill.name_zh AS from_name_zh, from_skill.name_en AS from_name_en,
                to_skill.slug AS to_slug, to_skill.name_zh AS to_name_zh, to_skill.name_en AS to_name_en,
                skill_relations.relation_type, skill_relations.weight
         FROM skill_relations
         JOIN skills from_skill ON from_skill.id = skill_relations.from_skill_id
         JOIN skills to_skill ON to_skill.id = skill_relations.to_skill_id
         WHERE skill_relations.status = 'approved'
           AND (skill_relations.from_skill_id IN (${placeholders}) OR skill_relations.to_skill_id IN (${placeholders}))
         ORDER BY skill_relations.weight DESC, from_skill.name_en ASC, to_skill.name_en ASC`,
      ).bind(...evidenceSkillIds, ...evidenceSkillIds).all<RelationRow>();
      for (const relation of relations.results) {
        const from = skillsById.get(relation.from_skill_id);
        if (from) from.relationships.push({
          ...relation,
          related_skill_id: relation.to_skill_id,
          related_slug: relation.to_slug,
          related_name_zh: relation.to_name_zh,
          related_name_en: relation.to_name_en,
        });
        const to = skillsById.get(relation.to_skill_id);
        if (to) to.relationships.push({
          ...relation,
          related_skill_id: relation.from_skill_id,
          related_slug: relation.from_slug,
          related_name_zh: relation.from_name_zh,
          related_name_en: relation.from_name_en,
        });
      }
    }

    return json({
      job: {
        slug: job.slug,
        title: job.title,
        company: { name: job.company_name, slug: job.company_slug, careerUrl: job.company_career_url },
        location: job.location_text,
        locations: locationsResult.results.map((location) => ({
          rawText: location.raw_location_text,
          countryCode: location.country_code,
          countryName: location.country_name,
          regionName: location.region_name,
          cityName: location.city_name,
          isRemote: Boolean(location.is_remote),
          confidence: Number(location.confidence),
          source: location.source_method,
        })),
        remoteType: job.remote_type,
        employmentType: job.employment_type,
        // source_url follows a validated same-site canonical redirect while
        // original_source_url remains immutable lifecycle/audit evidence.
        sourceUrl: job.source_url,
        sourceAttribution: job.source_attribution,
        applyUrl: job.apply_url,
        displayPolicy: job.display_policy,
        publishedAt: job.source_published_at ?? job.collected_at,
        sourceUpdatedAt: job.source_updated_at,
        firstCollectedAt: job.first_collected_at,
        collectedAt: job.collected_at,
        lastSeenAt: job.last_seen_at,
        suspectedExpiredAt: job.suspected_expired_at,
        tags: tagsByVersion.get(job.current_version_id) ?? [],
        status: job.status,
        language: job.language,
        bookmarked: Boolean(job.bookmarked),
      },
      sections: sectionsResult.results.map((section) => ({
        id: section.id,
        key: section.section_key,
        title: section.title,
        text: section.public_text,
        richContent: parseJobRichText(section.rich_content_json),
        annotations: (evidenceBySection.get(section.id) ?? []).map((evidence) => ({
          id: evidence.id,
          skillId: evidence.skill_id,
          start: evidence.start_offset,
          end: evidence.end_offset,
          phrase: evidence.evidence_text,
          requirementLevel: evidence.requirement_level,
          confidence: evidence.confidence,
        })),
      })),
      skills: [...skillsById.values()].map((skill) => ({
        id: skill.id,
        slug: skill.slug,
        name: { zh: skill.zh, en: skill.en },
        category: skill.category,
        evidenceCount: skill.evidence.length,
        evidence: skill.evidence.map((item) => ({ id: item.id, phrase: item.evidence_text, requirementLevel: item.requirement_level })),
        courses: skill.courses.map((coverage) => ({
          courseId: coverage.course_id,
          chapterRouteId: coverage.chapter_route_id,
          lessonRouteId: coverage.lesson_route_id,
          coverageLevel: coverage.coverage_level,
          coverageScore: coverage.coverage_score,
          primary: Boolean(coverage.is_primary),
          learningOutcome: coverage.learning_outcome,
        })),
        relationships: skill.relationships.map((relation) => ({
          skillId: relation.related_skill_id,
          slug: relation.related_slug,
          name: { zh: relation.related_name_zh, en: relation.related_name_en },
          relationType: relation.relation_type,
          weight: Number(relation.weight),
        })),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
