export const NEWS_LEARNING_CATALOG_CONTRACT = 'studyai-learning-catalog/v1' as const;

interface SkillRow {
  id: string;
  slug: string;
  name_zh: string;
  name_en: string;
  definition: string;
  category: string;
  taxonomy_version: number;
}

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  topic: string | null;
  level: string | null;
}

function hexadecimal(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildNewsLearningCatalog(db: D1Database) {
  const [skills, aliases, courses, coverage] = await Promise.all([
    db.prepare(`
      SELECT id, slug, name_zh, name_en, definition, category, taxonomy_version
      FROM skills WHERE status = 'approved'
      ORDER BY id
    `).all<SkillRow>(),
    db.prepare(`
      SELECT alias.skill_id, alias.alias
      FROM skill_aliases AS alias
      JOIN skills ON skills.id = alias.skill_id
      WHERE skills.status = 'approved'
      ORDER BY alias.skill_id, alias.alias
    `).all<{ skill_id: string; alias: string }>(),
    db.prepare(`
      SELECT id, slug, title, subtitle, description, topic, level
      FROM courses
      WHERE status = 'published' AND visibility IN ('public', 'members')
      ORDER BY id
    `).all<CourseRow>(),
    db.prepare(`
      SELECT coverage.course_id, coverage.skill_id
      FROM lesson_skill_coverage AS coverage
      JOIN skills ON skills.id = coverage.skill_id AND skills.status = 'approved'
      JOIN courses ON courses.id = coverage.course_id
        AND courses.status = 'published' AND courses.visibility IN ('public', 'members')
      WHERE coverage.review_status = 'approved'
      GROUP BY coverage.course_id, coverage.skill_id
      ORDER BY coverage.course_id, coverage.skill_id
    `).all<{ course_id: string; skill_id: string }>(),
  ]);

  const aliasesBySkill = new Map<string, string[]>();
  for (const row of aliases.results) {
    const values = aliasesBySkill.get(row.skill_id) ?? [];
    values.push(row.alias);
    aliasesBySkill.set(row.skill_id, values);
  }
  const skillsByCourse = new Map<string, string[]>();
  for (const row of coverage.results) {
    const values = skillsByCourse.get(row.course_id) ?? [];
    values.push(row.skill_id);
    skillsByCourse.set(row.course_id, values);
  }

  const payload = {
    contractVersion: NEWS_LEARNING_CATALOG_CONTRACT,
    skills: skills.results.map((skill) => ({
      id: skill.id,
      slug: skill.slug,
      nameZh: skill.name_zh,
      nameEn: skill.name_en,
      definition: skill.definition,
      category: skill.category,
      aliases: aliasesBySkill.get(skill.id) ?? [],
      taxonomyVersion: Number(skill.taxonomy_version),
      url: `https://studyai.now/?skill=${encodeURIComponent(skill.slug)}`,
    })),
    courses: courses.results.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle ?? '',
      description: course.description ?? '',
      topic: course.topic ?? '',
      level: course.level ?? '',
      skillIds: skillsByCourse.get(course.id) ?? [],
      url: `https://studyai.now/courses/${encodeURIComponent(course.slug)}`,
    })),
  };
  const serialized = JSON.stringify(payload);
  const checksum = hexadecimal(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized)));
  return {
    ...payload,
    catalogVersion: `core-${checksum.slice(0, 16)}`,
    checksum,
    generatedAt: new Date().toISOString(),
  };
}
