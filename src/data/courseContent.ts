import { getCourseSeoCopy } from './courseSeo';
import { localizedPublicPath } from '../lib/localeRoutes';

// 所有课程封面统一存放于仓库外的 img/cover/course/（与 Course/ 同属私有资源）。
// 文件名约定：<标识>-cover.<ext>；缺失时返回空串，界面使用品牌渐变占位，构建不失败。
const courseCoverModules = import.meta.glob('../../../img/cover/course/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function courseCover(name: string) {
  const entry = Object.entries(courseCoverModules).find(([path]) => path.split('/').at(-1)?.startsWith(`${name}.`));
  return entry?.[1] ?? '';
}

// 提供 dark / light 双版本封面的课程：文件名约定 <base>-dark.<ext> / <base>-light.<ext>。
const themeCoverVariants: Record<string, string> = {
  'claude-code-guide': 'claude-code',
  'hermes-agent-guide': 'hermes-agent',
};

/** 按当前 UI 主题解析课程封面；无主题版本时回退到通用封面（fallback）。 */
export function resolveCourseCover(courseId: string, isDark: boolean, fallback = '') {
  const base = themeCoverVariants[courseId];
  if (!base) return fallback;
  const themed = courseCover(`${base}-${isDark ? 'dark' : 'light'}`);
  return themed || courseCover(`${base}-cover`) || fallback;
}

export const supportedLocales = ['zh-CN', 'zh-TW', 'en', 'fr', 'es'] as const;
export type AppLocale = (typeof supportedLocales)[number];
export type CourseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseAccess = 'free' | 'pro';

export interface Lesson {
  body: string;
  chapter: number;
  duration: string;
  interaction?: 'choice' | 'slider' | 'sort' | 'sequence' | 'compare';
  labId?: string;
  lesson: number;
  level: string;
  parentRouteId: string;
  routeId: string;
  slug: string;
  skills: string[];
  summary: string;
  task: string;
  title: string;
}

export interface Chapter {
  chapter: number;
  duration: string;
  labId: string;
  level: string;
  routeId: string;
  slug: string;
  summary: string;
  tags: string[];
  title: string;
  body: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  topic: string;
  difficulty: CourseDifficulty;
  lessons: number;
  status: string;
  access: CourseAccess[];
  imageUrl: string;
  learningMapUrl?: string;
  authorIconText: string;
  authorDomain: string;
  audience?: string;
  duration?: string;
  skills: string[];
  chapters: Chapter[];
}

type FrontmatterValue = string | number | string[];
type CourseSource = {
  outline: string;
  chapterModules: Record<string, string>;
  lessonModules: Record<string, string>;
};

type RawMarkdownLoader = () => Promise<string>;

// Course pages own their Markdown. Catalog pages only import the compact
// catalogue metadata, so no course body belongs in the initial application
// bundle.
const coreSourceModules = import.meta.glob('../../../Course/{claude-code-guide,hermes-agent-guide,Codex}/**/*.md', {
  query: '?raw', import: 'default',
}) as Record<string, RawMarkdownLoader>;

const coreLocalizedModules: Partial<Record<Exclude<AppLocale, 'zh-CN'>, Record<string, RawMarkdownLoader>>> = {
  'zh-TW': import.meta.glob('../../../Course/locales/zh-TW/{claude-code-guide,hermes-agent-guide,Codex}/**/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  en: import.meta.glob('../../../Course/locales/en/{claude-code-guide,hermes-agent-guide,Codex}/**/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  fr: import.meta.glob('../../../Course/locales/fr/{claude-code-guide,hermes-agent-guide,Codex}/**/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  es: import.meta.glob('../../../Course/locales/es/{claude-code-guide,hermes-agent-guide,Codex}/**/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
};

// Course/15 contains 450 lessons. Keep its Markdown out of the route chunk
// until a learner opens one exact course; each locale is loaded independently.
const aiCourseOutlineModules = import.meta.glob('../../../Course/15/*/course-outline.md', {
  query: '?raw', import: 'default',
}) as Record<string, RawMarkdownLoader>;

const aiCourseChapterModules = import.meta.glob('../../../Course/15/*/*/index.md', {
  query: '?raw', import: 'default',
}) as Record<string, RawMarkdownLoader>;

const aiCourseLessonModules = import.meta.glob('../../../Course/15/*/*/lessons/*.md', {
  query: '?raw', import: 'default',
}) as Record<string, RawMarkdownLoader>;

const aiCourseLocalizedModules: Partial<Record<Exclude<AppLocale, 'zh-CN'>, {
  outlines: Record<string, RawMarkdownLoader>;
  chapters: Record<string, RawMarkdownLoader>;
  lessons: Record<string, RawMarkdownLoader>;
}>> = {
  'zh-TW': {
    outlines: import.meta.glob('../../../Course/locales/zh-TW/15/*/course-outline.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    chapters: import.meta.glob('../../../Course/locales/zh-TW/15/*/*/index.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    lessons: import.meta.glob('../../../Course/locales/zh-TW/15/*/*/lessons/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  },
  en: {
    outlines: import.meta.glob('../../../Course/locales/en/15/*/course-outline.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    chapters: import.meta.glob('../../../Course/locales/en/15/*/*/index.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    lessons: import.meta.glob('../../../Course/locales/en/15/*/*/lessons/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  },
  fr: {
    outlines: import.meta.glob('../../../Course/locales/fr/15/*/course-outline.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    chapters: import.meta.glob('../../../Course/locales/fr/15/*/*/index.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    lessons: import.meta.glob('../../../Course/locales/fr/15/*/*/lessons/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  },
  es: {
    outlines: import.meta.glob('../../../Course/locales/es/15/*/course-outline.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    chapters: import.meta.glob('../../../Course/locales/es/15/*/*/index.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
    lessons: import.meta.glob('../../../Course/locales/es/15/*/*/lessons/*.md', { query: '?raw', import: 'default' }) as Record<string, RawMarkdownLoader>,
  },
};

const aiCourseLearningMapModules = import.meta.glob('../../../Course/15/*/assets/learning-map.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const fdeChapterModules = import.meta.glob('../../../Course/ForwardDeployedEngineer/AI_FDE_Course*/[0-9][0-9]-*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, RawMarkdownLoader>;

const fdeAssetModules = import.meta.glob('../../../Course/ForwardDeployedEngineer/AI_FDE_Course*/assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const LAB_IDS = [
  '00-environment-check',
  '01-installation-first-run',
  '02-project-map',
  '03-agentic-loop',
  '04-claude-md',
  '05-permissions-safety',
  '06-terminal-workflow',
  '07-vibe-task-card',
  '08-debugging',
  '09-testing-refactor',
  '10-git-pr-ci',
  '11-mcp-intro',
  '12-commands-hooks',
  '13-skills-subagents-plugins',
  '14-surface-choice',
  '15-capstone',
  'A-compatibility-faq',
];

function parseFrontmatter(raw: string): { meta: Record<string, FrontmatterValue>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { meta: {}, body: raw.trim() };
  }

  const meta: Record<string, FrontmatterValue> = {};

  match[1].split('\n').forEach((line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!key || value.startsWith('-')) return;

    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      return;
    }

    if (/^\d+$/.test(value)) {
      meta[key] = Number(value);
      return;
    }

    meta[key] = value.replace(/^["']|["']$/g, '');
  });

  return { meta, body: match[2].trim() };
}

function stringMeta(meta: Record<string, FrontmatterValue>, key: string, fallback = '') {
  const value = meta[key];
  return typeof value === 'string' ? value : fallback;
}

function numberMeta(meta: Record<string, FrontmatterValue>, key: string, fallback = 0) {
  const value = meta[key];
  return typeof value === 'number' ? value : fallback;
}

function arrayMeta(meta: Record<string, FrontmatterValue>, key: string) {
  const value = meta[key];
  return Array.isArray(value) ? value : [];
}

function chapterNumberFromPath(path: string) {
  return Number(path.match(/\/(\d{2})-/)?.[1] ?? 0);
}

function lessonRouteId(chapter: number, lesson: number) {
  return `${chapter.toString().padStart(2, '0')}-${lesson.toString().padStart(2, '0')}`;
}

function buildChapterOverview(body: string) {
  const lines = body.split('\n');
  const title = lines[0]?.startsWith('# ') ? [lines[0]] : [];
  const sectionStarts = lines
    .map((line, index) => (/^##\s+/.test(line) ? index : -1))
    .filter((index) => index >= 0)
    .slice(0, 2);
  const pickedSections = sectionStarts
    .map((start) => {
      const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
      return lines.slice(start, end === -1 ? undefined : end).join('\n').trim();
    })
    .filter(Boolean);

  return [...title, ...pickedSections].join('\n\n').trim() || body;
}

function buildCourseChapters({
  chapterModules,
  lessonModules,
  maxChapter,
  minChapter,
}: {
  chapterModules: Record<string, string>;
  lessonModules: Record<string, string>;
  maxChapter: number;
  minChapter: number;
}) {
  const lessonsByChapter = Object.entries(lessonModules).reduce((map, [path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    const chapter = numberMeta(meta, 'chapter', chapterNumberFromPath(path));
    const lesson = numberMeta(meta, 'lesson', 0);

    if (chapter < minChapter || chapter > maxChapter || lesson < 1) {
      return map;
    }

    const item: Lesson = {
      body,
      chapter,
      duration: stringMeta(meta, 'duration', '20 min'),
      interaction: (['choice', 'slider', 'sort', 'sequence', 'compare'] as const).find((value) => value === stringMeta(meta, 'interaction')),
      labId: stringMeta(meta, 'lab_id') || undefined,
      lesson,
      level: stringMeta(meta, 'level', 'beginner'),
      parentRouteId: String(chapter),
      routeId: lessonRouteId(chapter, lesson),
      slug: stringMeta(meta, 'slug', path.split('/').at(-1)?.replace(/\.md$/, '') ?? lessonRouteId(chapter, lesson)),
      skills: arrayMeta(meta, 'skills'),
      summary: stringMeta(meta, 'summary', stringMeta(meta, 'task')),
      task: stringMeta(meta, 'task'),
      title: stringMeta(meta, 'title', `${lessonRouteId(chapter, lesson)}. 小节`),
    };

    const items = map.get(chapter) ?? [];
    items.push(item);
    map.set(chapter, items);
    return map;
  }, new Map<number, Lesson[]>());

  lessonsByChapter.forEach((items) => items.sort((a, b) => a.lesson - b.lesson));

  return Object.entries(chapterModules)
    .map(([path, raw], index) => {
      const { meta, body } = parseFrontmatter(raw);
      const chapter = numberMeta(meta, 'chapter', chapterNumberFromPath(path) || index);

      return {
        chapter,
        duration: stringMeta(meta, 'duration', '45 min'),
        labId: LAB_IDS[chapter] ?? `${chapter}-lab`,
        level: stringMeta(meta, 'level', 'beginner'),
        routeId: String(chapter),
        slug: stringMeta(meta, 'slug', path.split('/').at(-2) ?? String(chapter)),
        summary: stringMeta(meta, 'summary'),
        tags: arrayMeta(meta, 'tags'),
        title: stringMeta(meta, 'title', `第 ${chapter} 章`),
        body: buildChapterOverview(body),
        lessons: lessonsByChapter.get(chapter) ?? [],
      };
    })
    .filter((chapter) => chapter.chapter >= minChapter && chapter.chapter <= maxChapter)
    .sort((a, b) => a.chapter - b.chapter);
}

const fdeDirectoryByLocale: Record<AppLocale, string> = {
  'zh-CN': 'AI_FDE_Course_CN',
  'zh-TW': 'AI_FDE_Course_ZH_TW',
  en: 'AI_FDE_Course',
  fr: 'AI_FDE_Course_FR',
  es: 'AI_FDE_Course_ES',
};

const fdeCoverByLocale: Record<AppLocale, string> = {
  'zh-CN': courseCover('fde-cover-zh-CN'),
  'zh-TW': courseCover('fde-cover-zh-TW'),
  en: courseCover('fde-cover-en'),
  fr: courseCover('fde-cover-fr'),
  es: courseCover('fde-cover-es'),
};

const fdeSkillsByChapter = [
  ['fde-operating-model', 'customer-facing-engineering', 'workflow-discovery'],
  ['workflow-discovery', 'problem-framing', 'requirement-clarification'],
  ['technical-scoping', 'solution-architecture', 'business-case-modeling'],
  ['poc-delivery', 'production-software-engineering', 'python-production-engineering', 'full-stack-engineering', 'model-evaluation'],
  ['production-readiness', 'agent-observability', 'incident-response', 'private-hybrid-cloud', 'kubernetes-helm', 'devops-ci-cd', 'cloud-infrastructure'],
  ['customer-facing-engineering', 'stakeholder-management', 'technical-communication'],
  ['solution-architecture', 'llm-systems-engineering', 'rag-knowledge-retrieval', 'agentic-workflows', 'tool-calling'],
  ['permission-aware-retrieval', 'rag-knowledge-retrieval', 'ai-safety-guardrails', 'model-evaluation'],
  ['agentic-workflows', 'tool-calling', 'human-in-the-loop', 'incident-response'],
  ['human-in-the-loop', 'ai-safety-guardrails', 'model-evaluation', 'data-sovereignty-access-control'],
  ['handoff-enablement', 'change-management', 'technical-communication'],
  ['end-to-end-delivery', 'technical-communication', 'customer-facing-engineering'],
];

const fdeCopy: Record<AppLocale, Pick<Course, 'title' | 'subtitle' | 'description' | 'topic' | 'status' | 'audience'>> = {
  'zh-CN': { title: 'FDE 前线交付工程师：从模糊需求到生产系统', subtitle: '连接客户现场、生产代码与业务结果', description: '12 章、61 节完整 FDE 实战课，覆盖 Discovery、Scope、POC、Pilot、生产运维、Handoff、面试和三项行业项目。', topic: 'FDE工程师', status: '已上线', audience: 'AI 工程师、全栈工程师、解决方案架构师、技术顾问和 FDE 求职者' },
  'zh-TW': { title: 'FDE 前線部署工程師實戰：從現場問題到可營運系統', subtitle: '連接客戶現場、生產程式與業務成果', description: '以臺灣半導體、精密製造、港口物流與醫療情境，完成 Discovery、POC、Pilot、營運與 Handoff。', topic: 'FDE 工程師', status: '已上線', audience: 'AI 工程師、全端工程師、Solutions Architect、技術顧問與 FDE 求職者' },
  en: { title: 'Forward Deployed Engineer (FDE): From Customer Ambiguity to Production AI', subtitle: 'From customer ambiguity to production AI', description: 'A 12-chapter, 61-lesson field course spanning discovery, scope, POC, pilot, production operations, handoff, interviews, and three industry projects.', topic: 'Forward Deployed Engineer (FDE)', status: 'Published', audience: 'AI and full-stack engineers, solutions architects, technical consultants, and FDE candidates' },
  fr: { title: 'FDE — Ingénierie IA sur le terrain : du besoin flou à la production', subtitle: 'Le métier de Forward Deployed Engineer entre client, code et exploitation', description: 'Douze chapitres et 61 leçons situés dans l’aéronautique, la banque, la logistique, l’industrie et la santé en France.', topic: 'Forward Deployed Engineer (FDE)', status: 'Publié', audience: 'Ingénieurs IA et full-stack, Solutions Architects, consultants techniques et candidats FDE' },
  es: { title: 'FDE — Ingeniería de IA en campo: del problema ambiguo a producción', subtitle: 'La práctica FDE entre clientes, código y operaciones', description: 'Doce capítulos y 61 lecciones con casos de logística portuaria, renovables, industria, banca y sanidad.', topic: 'Forward Deployed Engineer (FDE)', status: 'Publicado', audience: 'Profesionales de IA y full-stack, Solutions Architects, consultoría técnica y candidatos FDE' },
};

function resolveFdeAssets(raw: string, sourcePath: string) {
  const directory = sourcePath.match(/\/ForwardDeployedEngineer\/([^/]+)\//)?.[1] ?? '';
  return raw.replace(/\((assets\/[^)\s]+)\)/g, (match, relativePath: string) => {
    const url = Object.entries(fdeAssetModules).find(([path]) => path.includes(`/ForwardDeployedEngineer/${directory}/${relativePath}`))?.[1];
    return url ? `(${url})` : match;
  });
}

function fdeSummary(body: string) {
  return body.split('\n').map((line) => line.trim()).find((line) => line && !/^(#|!\[|>|\||[-*]\s|\d+\.)/.test(line))
    ?.replace(/[*_`]/g, '').slice(0, 220) ?? '';
}

function buildFdeCourseFromSources(locale: AppLocale, sourceModules: Record<string, string>): Course {
  const directory = fdeDirectoryByLocale[locale];
  const chapterEntries = Object.entries(sourceModules)
    .filter(([path]) => path.includes(`/ForwardDeployedEngineer/${directory}/`))
    .sort(([left], [right]) => left.localeCompare(right));
  const interactionTypes: NonNullable<Lesson['interaction']>[] = ['choice', 'sort', 'slider', 'compare', 'sequence', 'sort'];
  const chapters: Chapter[] = chapterEntries.map(([path, source]) => {
    const raw = resolveFdeAssets(source, path);
    const chapter = Number(path.match(/\/(\d{2})-[^/]+\.md$/)?.[1] ?? 0);
    const matches = [...raw.matchAll(/^##\s+(\d+)\.(\d+)\s+(.+)$/gm)];
    const lessons: Lesson[] = matches.map((match, index) => {
      const lessonNumber = Number(match[2]);
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? raw.length;
      const body = `# ${match[3].trim()}\n\n${raw.slice(start, end).trim()}`;
      return {
        body,
        chapter,
        duration: lessonNumber === (chapter === 7 ? 6 : 5) ? '45 min' : '28 min',
        interaction: interactionTypes[(lessonNumber - 1) % interactionTypes.length],
        lesson: lessonNumber,
        level: 'advanced',
        parentRouteId: String(chapter),
        routeId: lessonRouteId(chapter, lessonNumber),
        slug: `fde-${String(chapter).padStart(2, '0')}-${String(lessonNumber).padStart(2, '0')}`,
        skills: fdeSkillsByChapter[chapter - 1] ?? [],
        summary: fdeSummary(body),
        task: locale === 'zh-CN' ? '完成现场练习' : locale === 'zh-TW' ? '完成現場實作' : locale === 'fr' ? 'Réaliser l’exercice de terrain' : locale === 'es' ? 'Completar la práctica de campo' : 'Complete the field exercise',
        title: match[3].trim(),
      };
    });
    const title = raw.match(/^#\s+(.+)$/m)?.[1]?.replace(/^\d{2}\s*[—:-]\s*/, '') ?? `Chapter ${chapter}`;
    const overviewEnd = matches[0]?.index ?? raw.length;
    return {
      chapter,
      duration: `${Math.round(lessons.reduce((total, lesson) => total + Number.parseInt(lesson.duration, 10), 0) / 60)} h`,
      labId: '',
      level: 'advanced',
      routeId: String(chapter),
      slug: `fde-chapter-${String(chapter).padStart(2, '0')}`,
      summary: raw.match(/^>\s+(.+)$/m)?.[1] ?? fdeSummary(raw),
      tags: fdeSkillsByChapter[chapter - 1] ?? [],
      title,
      body: raw.slice(0, overviewEnd).trim(),
      lessons,
    };
  });
  const copy = fdeCopy[locale];
  return {
    id: 'forward-deployed-engineering',
    ...copy,
    difficulty: 'Advanced',
    lessons: chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
    access: ['free'],
    imageUrl: fdeCoverByLocale[locale],
    authorIconText: 'FDE',
    authorDomain: 'studyai.now',
    duration: '10-12 weeks',
    skills: [...new Set(fdeSkillsByChapter.flat())],
    chapters,
  };
}

function buildFdeCourseShell(locale: AppLocale): Course {
  const copy = fdeCopy[locale];
  return {
    id: 'forward-deployed-engineering',
    ...copy,
    difficulty: 'Advanced',
    lessons: 61,
    access: ['free'],
    imageUrl: fdeCoverByLocale[locale],
    authorIconText: 'FDE',
    authorDomain: 'studyai.now',
    duration: '10-12 weeks',
    skills: [...new Set(fdeSkillsByChapter.flat())],
    chapters: [],
  };
}

type CourseCopy = Pick<Course, 'title' | 'subtitle' | 'description' | 'topic' | 'status'>;

function courseDirectoryFromPath(path: string) {
  return path.match(/\/Course\/(?:locales\/[^/]+\/15\/|15\/)([^/]+)\//)?.[1] ?? '';
}

function buildAiPracticeCourses(locale: AppLocale): Course[] {
  // Detailed practice courses are intentionally asynchronous; catalogue cards
  // use the compact `courseCatalog.ts` data instead of eagerly importing 450
  // lesson bodies into every learner's browser.
  void locale;
  return [];
}

const courseCopy: Record<AppLocale, Record<'claude' | 'hermes' | 'codex' | 'vibe' | 'agents' | 'rag', CourseCopy>> = {
  'zh-CN': {
    claude: { title: 'Claude Code 实战指南', subtitle: '把 AI 变成你的工程搭档', description: '面向中文开发者的章节式课程：15 个大章、50 个小节，从安装、仓库理解、Agentic Loop 到权限、安全、MCP 与自动化工作流。', topic: 'Claude Code', status: '已上线' },
    hermes: { title: 'Hermes Agent 入门实战指南', subtitle: '理论知识讲解 + 实战技能应用', description: '面向中文学习者的 Hermes Agent 系统课程：20 章、60 个小节，从常驻代理心智模型、安装配置、Provider、Tools、Memory、Skills、MCP、Gateway、Cron 到 VPS 部署、安全观测和多 Agent 毕业项目。', topic: 'Hermes Agent', status: '已上线' },
    codex: { title: 'OpenAI Codex 实战教程', subtitle: '从本地编码到 AI 原生工程团队', description: '面向中文开发者的 Codex 在线课程：20 章、76 个小节，覆盖安装、CLI、IDE、App、Cloud Tasks、AGENTS.md、权限安全、MCP、Skills、Automations、Security 和 Capstone 实战。', topic: 'OpenAI Codex', status: '已上线' },
    vibe: { title: 'Vibe Coding 工程化工作坊', subtitle: '把模糊想法变成可交付功能', description: '学习需求拆解、验收标准、Agent 协作和前端交付，让 Vibe Coding 从灵感变成工程流程。', topic: 'Vibe Coding', status: '规划中' },
    agents: { title: 'AI Agent 系统设计', subtitle: '从单助手到多角色工程团队', description: '覆盖 Subagents、Skills、MCP、工具权限和任务编排，构建更可靠的 AI 工程协作系统。', topic: 'AI Agent', status: '规划中' },
    rag: { title: 'RAG 与知识库基础', subtitle: '让模型读懂你的资料', description: '从文档切分、向量检索到问答评估，搭建适合课程、文档和企业知识库的 RAG 基础架构。', topic: 'RAG 架构', status: '规划中' },
  },
  'zh-TW': {
    claude: { title: 'Claude Code 實戰指南', subtitle: '讓 AI 成為你的工程搭檔', description: '為繁體中文開發人員設計的章節式課程：15 個大章、50 個小節，涵蓋安裝、理解程式碼庫、Agentic Loop、權限、安全、MCP 與自動化工作流程。', topic: 'Claude Code', status: '已上線' },
    hermes: { title: 'Hermes Agent 入門實戰指南', subtitle: '理論講解與實作技能並重', description: 'Hermes Agent 系統課程：20 章、60 個小節，從常駐代理程式的心智模型、安裝設定到 Provider、Tools、Memory、Skills、MCP、Gateway、Cron、VPS 部署、安全觀測與多 Agent 專題。', topic: 'Hermes Agent', status: '已上線' },
    codex: { title: 'OpenAI Codex 實戰教學', subtitle: '從本機撰寫程式到 AI 原生工程團隊', description: 'Codex 線上課程：20 章、76 個小節，涵蓋安裝、CLI、IDE、App、Cloud Tasks、AGENTS.md、權限安全、MCP、Skills、Automations、Security 與 Capstone 實作。', topic: 'OpenAI Codex', status: '已上線' },
    vibe: { title: 'Vibe Coding 工程化工作坊', subtitle: '把模糊想法化為可交付功能', description: '學習拆解需求、定義驗收標準、協作 Agent 與交付前端，讓 Vibe Coding 從靈感成為工程流程。', topic: 'Vibe Coding', status: '規劃中' },
    agents: { title: 'AI Agent 系統設計', subtitle: '從單一助理到多角色工程團隊', description: '涵蓋 Subagents、Skills、MCP、工具權限與任務編排，建立更可靠的 AI 工程協作系統。', topic: 'AI Agent', status: '規劃中' },
    rag: { title: 'RAG 與知識庫基礎', subtitle: '讓模型理解你的資料', description: '從文件切分、向量檢索到問答評估，建立適合課程、文件與企業知識庫的 RAG 基礎架構。', topic: 'RAG 架構', status: '規劃中' },
  },
  en: {
    claude: { title: 'Claude Code: Practical Guide', subtitle: 'Make AI your engineering partner', description: 'A chapter-based course for developers: 15 chapters and 50 lessons covering installation, repository understanding, the Agentic Loop, permissions, safety, MCP, and automated workflows.', topic: 'Claude Code', status: 'Published' },
    hermes: { title: 'Hermes Agent: Practical Foundations', subtitle: 'Concepts with hands-on skills', description: 'A complete Hermes Agent course with 20 chapters and 60 lessons, from the resident-agent mental model and setup through Providers, Tools, Memory, Skills, MCP, Gateway, Cron, VPS deployment, observability, and a multi-agent capstone.', topic: 'Hermes Agent', status: 'Published' },
    codex: { title: 'OpenAI Codex: Practical Course', subtitle: 'From local coding to an AI-native engineering team', description: 'A 20-chapter, 76-lesson Codex course covering setup, CLI, IDE, App, Cloud Tasks, AGENTS.md, permissions and safety, MCP, Skills, Automations, Security, and a capstone.', topic: 'OpenAI Codex', status: 'Published' },
    vibe: { title: 'Vibe Coding Engineering Workshop', subtitle: 'Turn an unclear idea into a shippable feature', description: 'Learn requirements breakdown, acceptance criteria, agent collaboration, and frontend delivery so Vibe Coding becomes an engineering practice.', topic: 'Vibe Coding', status: 'Coming soon' },
    agents: { title: 'AI Agent Systems Design', subtitle: 'From one assistant to a multi-role engineering team', description: 'Build reliable AI engineering collaboration with Subagents, Skills, MCP, tool permissions, and task orchestration.', topic: 'AI Agents', status: 'Coming soon' },
    rag: { title: 'RAG and Knowledge Base Foundations', subtitle: 'Help models understand your material', description: 'Build an RAG foundation for courses, documents, and company knowledge bases, from chunking and vector retrieval to Q&A evaluation.', topic: 'RAG architecture', status: 'Coming soon' },
  },
  fr: {
    claude: { title: 'Guide pratique de Claude Code', subtitle: 'Faites de l’IA votre partenaire d’ingénierie', description: 'Un cours structuré en 15 chapitres et 50 leçons sur l’installation, la compréhension d’un dépôt, l’Agentic Loop, les autorisations, la sécurité, MCP et les flux automatisés.', topic: 'Claude Code', status: 'Publié' },
    hermes: { title: 'Fondamentaux pratiques de Hermes Agent', subtitle: 'Théorie et compétences appliquées', description: 'Un cours Hermes Agent complet de 20 chapitres et 60 leçons : modèle mental d’agent résident, installation, Providers, Tools, Memory, Skills, MCP, Gateway, Cron, déploiement VPS, observabilité et projet final multi-agent.', topic: 'Hermes Agent', status: 'Publié' },
    codex: { title: 'Tutoriel pratique OpenAI Codex', subtitle: 'Du codage local à une équipe d’ingénierie native IA', description: 'Un cours Codex de 20 chapitres et 76 leçons couvrant l’installation, CLI, IDE, App, Cloud Tasks, AGENTS.md, autorisations et sécurité, MCP, Skills, Automations, Security et un projet final.', topic: 'OpenAI Codex', status: 'Publié' },
    vibe: { title: 'Atelier d’ingénierie Vibe Coding', subtitle: 'Transformer une idée vague en fonctionnalité livrable', description: 'Apprenez à cadrer les besoins, définir les critères d’acceptation, collaborer avec des agents et livrer une interface.', topic: 'Vibe Coding', status: 'Bientôt disponible' },
    agents: { title: 'Conception de systèmes d’agents IA', subtitle: 'D’un assistant à une équipe d’ingénierie multi-rôle', description: 'Concevez une collaboration d’ingénierie IA fiable avec Subagents, Skills, MCP, permissions d’outils et orchestration des tâches.', topic: 'Agents IA', status: 'Bientôt disponible' },
    rag: { title: 'Fondamentaux RAG et base de connaissances', subtitle: 'Aidez les modèles à comprendre vos ressources', description: 'Des fragments documentaires et de la recherche vectorielle à l’évaluation de questions-réponses, bâtissez une base RAG adaptée aux cours et aux entreprises.', topic: 'Architecture RAG', status: 'Bientôt disponible' },
  },
  es: {
    claude: { title: 'Guía práctica de Claude Code', subtitle: 'Convierte la IA en tu compañera de ingeniería', description: 'Un curso por capítulos con 15 capítulos y 50 lecciones sobre instalación, comprensión de repositorios, Agentic Loop, permisos, seguridad, MCP y flujos automatizados.', topic: 'Claude Code', status: 'Publicado' },
    hermes: { title: 'Fundamentos prácticos de Hermes Agent', subtitle: 'Conceptos y habilidades aplicadas', description: 'Curso integral de Hermes Agent con 20 capítulos y 60 lecciones: modelo mental de agente residente, instalación, Providers, Tools, Memory, Skills, MCP, Gateway, Cron, despliegue en VPS, observabilidad y proyecto final multiagente.', topic: 'Hermes Agent', status: 'Publicado' },
    codex: { title: 'Curso práctico de OpenAI Codex', subtitle: 'Del código local a un equipo de ingeniería nativo de IA', description: 'Curso Codex de 20 capítulos y 76 lecciones sobre instalación, CLI, IDE, App, Cloud Tasks, AGENTS.md, permisos y seguridad, MCP, Skills, Automations, Security y proyecto final.', topic: 'OpenAI Codex', status: 'Publicado' },
    vibe: { title: 'Taller de ingeniería Vibe Coding', subtitle: 'Convierte una idea imprecisa en una función entregable', description: 'Aprende a desglosar requisitos, definir criterios de aceptación, colaborar con agentes y entregar interfaces.', topic: 'Vibe Coding', status: 'Próximamente' },
    agents: { title: 'Diseño de sistemas de agentes de IA', subtitle: 'De un asistente a un equipo de ingeniería multirrol', description: 'Crea una colaboración de ingeniería de IA fiable con Subagents, Skills, MCP, permisos de herramientas y orquestación de tareas.', topic: 'Agentes de IA', status: 'Próximamente' },
    rag: { title: 'Fundamentos de RAG y bases de conocimiento', subtitle: 'Haz que los modelos entiendan tu material', description: 'Crea una base RAG para cursos, documentos y conocimiento empresarial, desde el fragmentado y la recuperación vectorial hasta la evaluación de preguntas y respuestas.', topic: 'Arquitectura RAG', status: 'Próximamente' },
  },
};

const aiPracticeCourseCache = new Map<string, Promise<Course | undefined>>();
const fdeCourseCache = new Map<AppLocale, Promise<Course | undefined>>();
const coreCourseCache = new Map<string, Promise<Course | undefined>>();

const coreCourseDefinitions = [
  { id: 'claude-code-guide', directory: 'claude-code-guide', copy: 'claude', minChapter: 1, maxChapter: 15, expectedChapters: 15, access: ['free', 'pro'] as CourseAccess[], cover: 'claude-code-guide-cover', icon: 'AI' },
  { id: 'hermes-agent-guide', directory: 'hermes-agent-guide', copy: 'hermes', minChapter: 0, maxChapter: 19, expectedChapters: 20, access: ['free', 'pro'] as CourseAccess[], cover: 'hermes-agent-guide-cover', icon: 'HA' },
  { id: 'codex-tutorial', directory: 'Codex', copy: 'codex', minChapter: 0, maxChapter: 19, expectedChapters: 20, access: ['free', 'pro'] as CourseAccess[], cover: 'codex-cover', icon: 'CX' },
] as const;

function sourceFromModules(modules: Record<string, string>, directory: string): CourseSource {
  const coursePath = `/${directory}/`;
  const courseModules = Object.fromEntries(Object.entries(modules).filter(([path]) => path.includes(coursePath)));
  return {
    outline: Object.entries(courseModules).find(([path]) => path.endsWith('/course-outline.md'))?.[1] ?? '',
    chapterModules: Object.fromEntries(Object.entries(courseModules).filter(([path]) => /\/[^/]+\/index\.md$/.test(path))),
    lessonModules: Object.fromEntries(Object.entries(courseModules).filter(([path]) => /\/lessons\/[^/]+\.md$/.test(path))),
  };
}

function emptyCourse(courseId: string, locale: AppLocale): Course {
  const content = courseCopy[locale].claude;
  return {
    id: courseId || 'loading', ...content, difficulty: 'Beginner', lessons: 0,
    access: ['free'], imageUrl: '', authorIconText: 'AI', authorDomain: 'studyai.now', skills: [], chapters: [],
  };
}

async function loadCoreSource(directory: string, locale: AppLocale) {
  const modules = locale === 'zh-CN' ? coreSourceModules : coreLocalizedModules[locale];
  if (!modules) return { outline: '', chapterModules: {}, lessonModules: {} } as CourseSource;
  const entries = Object.entries(modules).filter(([path]) => path.includes(`/${directory}/`));
  const loaded = await Promise.all(entries.map(async ([path, load]) => [path, await load()] as const));
  return sourceFromModules(Object.fromEntries(loaded), directory);
}

function isCompleteCoreSource(source: CourseSource, definition: (typeof coreCourseDefinitions)[number]) {
  if (!source.outline || !Object.keys(source.lessonModules).length) return false;
  const chapters = buildCourseChapters({
    chapterModules: source.chapterModules,
    lessonModules: source.lessonModules,
    minChapter: definition.minChapter,
    maxChapter: definition.maxChapter,
  });
  // Some core course folders include an introduction or appendix outside the
  // learner route range. Validate the routed chapters, not every Markdown
  // file in that directory.
  return chapters.length === definition.expectedChapters && chapters.every((chapter) => chapter.lessons.length > 0);
}

async function loadCoreCourse(courseId: string, locale: AppLocale): Promise<Course | undefined> {
  const definition = coreCourseDefinitions.find((item) => item.id === courseId);
  if (!definition) return undefined;
  const key = `${locale}:${courseId}`;
  const cached = coreCourseCache.get(key);
  if (cached) return cached;
  const pending = (async () => {
    const localized = await loadCoreSource(definition.directory, locale);
    const source = isCompleteCoreSource(localized, definition)
      ? localized
      : locale === 'zh-CN' ? undefined : await loadCoreSource(definition.directory, 'zh-CN');
    if (!source || !isCompleteCoreSource(source, definition)) return undefined;
    const chapters = buildCourseChapters({ chapterModules: source.chapterModules, lessonModules: source.lessonModules, maxChapter: definition.maxChapter, minChapter: definition.minChapter });
    if (chapters.length !== definition.expectedChapters) return undefined;
    return {
      id: definition.id,
      ...courseCopy[locale][definition.copy],
      difficulty: 'Beginner',
      lessons: chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
      access: definition.access,
      imageUrl: courseCover(definition.cover),
      authorIconText: definition.icon,
      authorDomain: 'studyai.now',
      skills: [],
      chapters,
    };
  })().catch(() => undefined);
  coreCourseCache.set(key, pending);
  return pending;
}

/** @deprecated Course outlines are now loaded through `loadCourse` on demand. */
export function getCatalogCourses(_locale: AppLocale = 'zh-CN') { return [] as Course[]; }
export function getCourseOutline(_courseId: 'claude-code-guide' | 'hermes-agent-guide' | 'Codex', _locale: AppLocale = 'zh-CN') { return ''; }

async function loadRawModules(modules: Record<string, RawMarkdownLoader>, directory: string) {
  const entries = Object.entries(modules).filter(([path]) => courseDirectoryFromPath(path) === directory);
  const loaded = await Promise.all(entries.map(async ([path, load]) => [path, await load()] as const));
  return Object.fromEntries(loaded) as Record<string, string>;
}

async function loadFdeCourse(locale: AppLocale): Promise<Course | undefined> {
  const cached = fdeCourseCache.get(locale);
  if (cached) return cached;
  const directory = fdeDirectoryByLocale[locale];
  const pending = Promise.all(
    Object.entries(fdeChapterModules)
      .filter(([path]) => path.includes(`/ForwardDeployedEngineer/${directory}/`))
      .map(async ([path, load]) => [path, await load()] as const),
  ).then((entries) => entries.length === 12 ? buildFdeCourseFromSources(locale, Object.fromEntries(entries)) : undefined)
    .catch(() => undefined);
  fdeCourseCache.set(locale, pending);
  return pending;
}

async function loadAiPracticeCourse(courseId: string, locale: AppLocale): Promise<Course | undefined> {
  const outlineEntries = Object.entries(locale === 'zh-CN' ? aiCourseOutlineModules : aiCourseLocalizedModules[locale]?.outlines ?? []);
  const outlinePath = outlineEntries.find(([path]) => {
    const directory = courseDirectoryFromPath(path);
    return directory.replace(/^\d{2}-/, '') === courseId;
  })?.[0];
  if (!outlinePath) return undefined;
  const directory = courseDirectoryFromPath(outlinePath);
  const source = locale === 'zh-CN'
    ? { outlines: aiCourseOutlineModules, chapters: aiCourseChapterModules, lessons: aiCourseLessonModules }
    : aiCourseLocalizedModules[locale];
  if (!source) return undefined;

  const [outline, chapterModules, lessonModules] = await Promise.all([
    source.outlines[outlinePath](),
    loadRawModules(source.chapters, directory),
    loadRawModules(source.lessons, directory),
  ]);
  // Do not silently present a Chinese body under a non-Chinese document URL.
  // A locale becomes available only after every chapter and lesson is present.
  if (Object.keys(chapterModules).length !== 10 || Object.keys(lessonModules).length !== 30) return undefined;

  const { meta } = parseFrontmatter(outline);
  const difficulty = stringMeta(meta, 'difficulty', 'Beginner');
  const access = arrayMeta(meta, 'access').filter((value): value is CourseAccess => value === 'free' || value === 'pro');
  const chapters = buildCourseChapters({ chapterModules, lessonModules, minChapter: 1, maxChapter: 10 });
  if (chapters.length !== 10 || chapters.some((chapter) => chapter.lessons.length !== 3)) return undefined;
  const id = stringMeta(meta, 'id', directory.replace(/^\d{2}-/, ''));
  const seoCopy = getCourseSeoCopy(id, locale);
  const learningMapUrl = Object.entries(aiCourseLearningMapModules).find(([path]) => courseDirectoryFromPath(path) === directory)?.[1];

  return {
    id,
    title: stringMeta(meta, 'title', seoCopy?.title ?? id),
    subtitle: stringMeta(meta, 'subtitle', seoCopy?.subtitle ?? ''),
    description: stringMeta(meta, 'description', seoCopy?.description ?? ''),
    topic: stringMeta(meta, 'topic', seoCopy?.topic ?? 'AI practice'),
    difficulty: (['Beginner', 'Intermediate', 'Advanced'].includes(difficulty) ? difficulty : 'Beginner') as CourseDifficulty,
    lessons: chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
    status: courseCopy[locale].claude.status,
    access: access.length ? access : ['free'],
    imageUrl: courseCover(`${directory}-cover`),
    learningMapUrl,
    authorIconText: `AI${id.slice(0, 1).toUpperCase()}`,
    authorDomain: 'studyai.now',
    audience: stringMeta(meta, 'audience'),
    duration: stringMeta(meta, 'duration'),
    // Stable graph identifiers remain language-neutral; UI labels are localised
    // by the JD/knowledge-graph presentation layer.
    skills: arrayMeta(meta, 'skills'),
    chapters,
  };
}

/** Loads only the selected practice course and locale, never all 450 lessons. */
export function loadCourse(courseId: string, locale: AppLocale = 'zh-CN'): Promise<Course | undefined> {
  if (courseId === 'forward-deployed-engineering') return loadFdeCourse(locale);
  if (coreCourseDefinitions.some((item) => item.id === courseId)) return loadCoreCourse(courseId, locale);
  const key = `${locale}:${courseId}`;
  const cached = aiPracticeCourseCache.get(key);
  if (cached) return cached;
  const pending = loadAiPracticeCourse(courseId, locale).catch(() => undefined);
  aiPracticeCourseCache.set(key, pending);
  return pending;
}

export function getCourse(courseId = 'claude-code-guide', locale: AppLocale = 'zh-CN') {
  return emptyCourse(courseId, locale);
}

export function findCourse(_courseId = 'claude-code-guide', _locale: AppLocale = 'zh-CN') {
  return undefined;
}

export function getChapter(course: Course, chapterId?: string) {
  return findChapter(course, chapterId) ?? course.chapters[0];
}

export function findChapter(course: Course, chapterId?: string) {
  if (!chapterId) return undefined;
  return course.chapters.find(
    (chapter) =>
      chapter.routeId === chapterId ||
      chapter.slug === chapterId ||
      chapter.chapter.toString().padStart(2, '0') === chapterId,
  );
}

export function getLesson(chapter: Chapter, lessonId?: string) {
  return findLesson(chapter, lessonId);
}

export function findLesson(chapter: Chapter, lessonId?: string) {
  if (!lessonId || !chapter.lessons.length) return undefined;
  return chapter.lessons.find(
      (lesson) =>
        lesson.routeId === lessonId || lesson.slug === lessonId || String(lesson.lesson) === lessonId,
  );
}

export function getLessonPath(courseId: string, lesson: Lesson, locale?: AppLocale) {
  const path = `/courses/${courseId}/chapters/${lesson.parentRouteId}/lessons/${lesson.routeId}`;
  return locale ? localizedPublicPath(path, locale) : path;
}

export function getChapterPath(courseId: string, chapter: Chapter, locale?: AppLocale) {
  const path = `/courses/${courseId}/chapters/${chapter.routeId}`;
  return locale ? localizedPublicPath(path, locale) : path;
}

export function getCourseStartPath(course: Course, locale?: AppLocale) {
  const firstChapter = course.chapters[0];
  if (!firstChapter) return locale ? localizedPublicPath('/', locale) : '/';

  const firstLesson = firstChapter.lessons[0];
  return firstLesson ? getLessonPath(course.id, firstLesson, locale) : getChapterPath(course.id, firstChapter, locale);
}

export function getLessonNeighbors(course: Course, lesson?: Lesson) {
  if (!lesson) {
    return { previous: undefined, next: undefined };
  }

  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  const index = lessons.findIndex(
    (item) => item.routeId === lesson.routeId && item.parentRouteId === lesson.parentRouteId,
  );

  return {
    previous: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
  };
}

export function getChapterNeighbors(course: Course, chapter: Chapter) {
  const index = course.chapters.findIndex((item) => item.routeId === chapter.routeId);
  return {
    previous: index > 0 ? course.chapters[index - 1] : undefined,
    next: index >= 0 && index < course.chapters.length - 1 ? course.chapters[index + 1] : undefined,
  };
}
