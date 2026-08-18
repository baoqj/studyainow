import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const codeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const graphPath = resolve(codeRoot, '../Course/15/knowledge-graph.json');
const migrationPath = resolve(codeRoot, 'migrations/0021_ai_practice_courses.sql');
const graph = JSON.parse(await readFile(graphPath, 'utf8'));

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function id(prefix, ...values) {
  return `${prefix}_${createHash('sha256').update(values.join('|')).digest('hex').slice(0, 20)}`;
}

const skillCategories = new Map();
for (const course of graph.courses) {
  for (const skill of course.skills) {
    if (!skillCategories.has(skill)) skillCategories.set(skill, course.category);
  }
}

const lines = [
  '-- Curated StudyAINow AI practice curriculum: 15 courses, 52 canonical skills,',
  '-- 450 lesson units, explicit skill coverage, and curriculum relations.',
  '-- These rows come from the authored curriculum manifest, not unreviewed LLM output.',
  'PRAGMA foreign_keys = ON;',
];

for (const skill of graph.skills) {
  const difficulty = /literacy|fundamentals|clarification|instruction|use-case|chat-completions/.test(skill.slug) ? 'beginner'
    : /threat|red-team|multi-agent|orchestrator|optimizer|observability|loop-control|unit-economics/.test(skill.slug) ? 'advanced'
      : 'intermediate';
  const skillId = `skill_${skill.slug.replaceAll('-', '_')}`;
  lines.push(
    `INSERT INTO skills (id, slug, name_zh, name_en, definition, category, difficulty, taxonomy_version, status) VALUES (${sql(skillId)}, ${sql(skill.slug)}, ${sql(skill.nameZh)}, ${sql(skill.nameEn)}, ${sql(skill.definition)}, ${sql(skillCategories.get(skill.slug) ?? 'AI 实战')}, ${sql(difficulty)}, 2, 'approved') ON CONFLICT(slug) DO UPDATE SET name_zh = excluded.name_zh, name_en = excluded.name_en, definition = excluded.definition, category = excluded.category, difficulty = excluded.difficulty, taxonomy_version = 2, status = 'approved', updated_at = CURRENT_TIMESTAMP;`,
  );
  for (const [alias, language] of [[skill.nameZh, 'zh'], [skill.nameEn, 'en']]) {
    lines.push(
      `INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json) SELECT ${sql(id('ai_alias', skill.slug, language))}, skills.id, ${sql(alias)}, ${sql(language)}, ${sql(String(alias).includes(' ') ? 'phrase' : 'word')}, '[]' FROM skills WHERE skills.slug = ${sql(skill.slug)};`,
    );
  }
}

for (const course of graph.courses) {
  for (const coverage of course.coverage) {
    for (const [skillIndex, skillSlug] of coverage.skills.entries()) {
      const score = Math.max(0, coverage.score - skillIndex * 8);
      const primary = skillIndex === 0 ? 1 : 0;
      const evidence = `${course.title} 第 ${coverage.chapterRouteId} 章第 ${coverage.lessonRouteId.split('-').at(-1)} 节的概念、场景与交付练习。`;
      lines.push(
        `INSERT INTO lesson_skill_coverage (id, skill_id, course_id, chapter_route_id, lesson_route_id, coverage_level, coverage_score, is_primary, learning_outcome, evidence, review_status) SELECT ${sql(id('ai_coverage', course.id, coverage.chapterRouteId, coverage.lessonRouteId, skillSlug))}, skills.id, ${sql(course.id)}, ${sql(coverage.chapterRouteId)}, ${sql(coverage.lessonRouteId)}, ${sql(coverage.level)}, ${score}, ${primary}, ${sql(coverage.outcome)}, ${sql(evidence)}, 'approved' FROM skills WHERE skills.slug = ${sql(skillSlug)} ON CONFLICT(skill_id, course_id, chapter_route_id, lesson_route_id) DO UPDATE SET coverage_level = excluded.coverage_level, coverage_score = excluded.coverage_score, is_primary = excluded.is_primary, learning_outcome = excluded.learning_outcome, evidence = excluded.evidence, review_status = 'approved', updated_at = CURRENT_TIMESTAMP;`,
      );
    }
  }
  for (let index = 0; index < course.skills.length - 1; index += 1) {
    const from = course.skills[index];
    const to = course.skills[index + 1];
    lines.push(
      `INSERT INTO skill_relations (id, from_skill_id, to_skill_id, relation_type, weight, confidence, source_method, evidence, status) SELECT ${sql(id('ai_relation', from, to))}, source.id, target.id, 'prerequisite_of', 0.78, 1.0, 'curriculum_curated', ${sql(`${course.title} 的教学目标与章节顺序将 ${from} 作为 ${to} 的学习基础。`)}, 'approved' FROM skills AS source JOIN skills AS target ON target.slug = ${sql(to)} WHERE source.slug = ${sql(from)} ON CONFLICT(from_skill_id, to_skill_id, relation_type) DO UPDATE SET weight = excluded.weight, confidence = excluded.confidence, source_method = excluded.source_method, evidence = excluded.evidence, status = 'approved', updated_at = CURRENT_TIMESTAMP;`,
    );
  }
}

await writeFile(migrationPath, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ migrationPath, skills: graph.skills.length, courses: graph.courses.length, coverageRows: graph.courses.reduce((total, course) => total + course.coverage.length * 2, 0) }, null, 2));
