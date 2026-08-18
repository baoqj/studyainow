#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const courseRoot = path.resolve(import.meta.dirname, '..', '..', 'Course');
const localeRoots = {
  'zh-CN': path.join(courseRoot, 'Codex'),
  'zh-TW': path.join(courseRoot, 'locales', 'zh-TW', 'Codex'),
  en: path.join(courseRoot, 'locales', 'en', 'Codex'),
  fr: path.join(courseRoot, 'locales', 'fr', 'Codex'),
  es: path.join(courseRoot, 'locales', 'es', 'Codex'),
};

const requiredHeadings = {
  'zh-CN': ['## 学习目标', '## 核心知识', '## 操作方法', '## 完整示例', '## 练习一：知识点掌握', '## 练习二：累积场景实战', '## 互动课件提示', '## 本节小结与衔接'],
  'zh-TW': ['## 學習成果', '## 核心知識', '## 操作方法', '## 情境示例', '## 練習一：知識檢核', '## 練習二：累積情境', '## 互動課件與下一步'],
  en: ['## Learning outcomes', '## Core model', '## Method', '## Worked example', '## Exercise 1: check the lesson knowledge', '## Exercise 2: cumulative scenario', '## Interactive courseware', '## Summary and next step'],
  fr: ['## Objectifs pédagogiques', '## Modèle de décision', '## Méthode opérationnelle', '## Exemple fil rouge', '## Exercice 1 : vérifier les connaissances', '## Exercice 2 : mise en situation cumulative', '## Activité interactive et suite'],
  es: ['## Objetivos de aprendizaje', '## Modelo de decisión', '## Método operativo', '## Ejemplo progresivo', '## Ejercicio 1: comprobar conocimientos', '## Ejercicio 2: escenario acumulativo', '## Actividad interactiva y siguiente paso'],
};

const minimumCharacters = { 'zh-CN': 3000, 'zh-TW': 2600, en: 7000, fr: 5200, es: 5000 };
const interactionTypes = new Set(['choice', 'sort', 'sequence', 'compare', 'slider']);
const failures = [];
const reports = [];

function fail(locale, file, message) {
  failures.push(`${locale}: ${path.relative(courseRoot, file)} — ${message}`);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    meta[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return { meta, body: raw.slice(match[0].length) };
}

function normalizedLongLines(body) {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[`*_#[\]|>:()“”‘’«».,;!?！？。，；：—–-]/g, '').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter((line) => line.length >= 60);
}

function duplicateCharacterRate(allBodies) {
  const counts = new Map();
  for (const body of allBodies) {
    for (const line of normalizedLongLines(body)) counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  let total = 0;
  let repeated = 0;
  for (const [line, count] of counts) {
    total += line.length * count;
    if (count > 1) repeated += line.length * (count - 1);
  }
  return total ? repeated / total : 0;
}

for (const [locale, root] of Object.entries(localeRoots)) {
  const chapterDirs = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (chapterDirs.length !== 20) fail(locale, root, `expected 20 chapters, found ${chapterDirs.length}`);

  const bodies = [];
  const artifacts = new Set();
  const tasks = new Set();
  const interactions = new Set();
  let lessonCount = 0;

  for (const chapterDir of chapterDirs) {
    const lessonRoot = path.join(root, chapterDir, 'lessons');
    const lessonFiles = (await readdir(lessonRoot))
      .filter((name) => /^\d{2}-\d{2}-.*\.md$/.test(name))
      .sort();
    if (lessonFiles.length < 3 || lessonFiles.length > 4) fail(locale, lessonRoot, `expected 3–4 lessons, found ${lessonFiles.length}`);

    for (const filename of lessonFiles) {
      const file = path.join(lessonRoot, filename);
      const raw = await readFile(file, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      lessonCount += 1;
      bodies.push(body);

      if (raw.length < minimumCharacters[locale]) fail(locale, file, `content is too short (${raw.length} characters)`);
      if (meta.course !== 'codex') fail(locale, file, 'course metadata must be codex');
      if (!meta.task) fail(locale, file, 'missing lesson-specific task');
      if (!meta.skills || meta.skills === '[]') fail(locale, file, 'missing skills metadata');
      if (!interactionTypes.has(meta.interaction)) fail(locale, file, `invalid interaction type: ${meta.interaction || 'missing'}`);
      else interactions.add(meta.interaction);
      if ('lab_id' in meta) fail(locale, file, 'legacy shared lab_id must be removed');
      if (/帮我把这个弄好|help me (with|do) this\.?/iu.test(raw)) fail(locale, file, 'contains a vague generic prompt');
      if (/Courses\/Codex|Course\/Codex\/-https/u.test(raw)) fail(locale, file, 'contains a stale or malformed course reference');

      for (const heading of requiredHeadings[locale]) {
        if (!body.includes(heading)) fail(locale, file, `missing section: ${heading}`);
      }

      if (['en', 'fr', 'es'].includes(locale)) {
        const prose = body.replace(/```[\s\S]*?```/g, '');
        if (/[\u3400-\u9fff]/u.test(prose)) fail(locale, file, 'contains Han characters in rendered prose');
      }

      const artifact = body.match(/produce `([^`]+)`|完成 `([^`]+)`|produire `([^`]+)`|producir `([^`]+)`|形成 `([^`]+)`/u);
      if (artifact) artifacts.add(artifact.slice(1).find(Boolean));
      if (meta.task) tasks.add(meta.task.toLocaleLowerCase(locale));
    }
  }

  const duplicateRate = duplicateCharacterRate(bodies);
  if (lessonCount !== 76) fail(locale, root, `expected 76 lessons, found ${lessonCount}`);
  if (artifacts.size !== 76) fail(locale, root, `expected 76 distinct lesson artifacts, found ${artifacts.size}`);
  if (tasks.size < 72) fail(locale, root, `lesson tasks are insufficiently distinct (${tasks.size}/76)`);
  if (interactions.size !== 5) fail(locale, root, `expected all 5 interaction types, found ${[...interactions].join(', ')}`);
  if (duplicateRate >= 0.3) fail(locale, root, `repeated long-line character rate is ${(duplicateRate * 100).toFixed(1)}% (limit 30%)`);

  reports.push({
    locale,
    chapters: chapterDirs.length,
    lessons: lessonCount,
    distinctArtifacts: artifacts.size,
    distinctTasks: tasks.size,
    interactions: [...interactions].sort(),
    repeatedLongLineCharacters: `${(duplicateRate * 100).toFixed(1)}%`,
  });
}

console.table(reports);

if (failures.length) {
  console.error(`\nCodex curriculum verification failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\nCodex curriculum verification passed: 5 locales, 20 chapters and 76 lessons per locale.');
}
