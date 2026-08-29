/**
 * Catalogue-only data. Keep this file intentionally compact: detailed
 * outlines and lesson Markdown belong to the lazy courseContent route chunk.
 */
import { getCourseSeoCopy } from './courseSeo';
import { localizedPublicPath } from '../lib/localeRoutes';

export const supportedLocales = ['zh-CN', 'zh-TW', 'en', 'fr', 'es'] as const;
export type AppLocale = (typeof supportedLocales)[number];
export type CourseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseAccess = 'free' | 'pro';

export type CatalogCourse = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  topic: string;
  difficulty: CourseDifficulty;
  lessons: number;
  chapters: number;
  status: string;
  access: CourseAccess[];
  imageUrl: string;
  authorIconText: string;
  authorDomain: string;
  skills: string[];
  lessonRouteIds: string[];
};

type CourseCopy = Pick<CatalogCourse, 'title' | 'subtitle' | 'description' | 'topic'>;
type CourseSeed = Omit<CatalogCourse, 'status' | 'imageUrl' | 'authorIconText' | 'authorDomain' | 'lessonRouteIds' | 'lessons' | 'chapters'>;

// 所有课程封面统一存放于仓库外的 img/cover/course/（与 Course/ 同属私有资源）。
// 文件名约定：<标识>-cover.<ext>；缺失时返回空串，卡片使用品牌渐变占位，构建不失败。
const courseCoverModules = import.meta.glob('../../../img/cover/course/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

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
export function resolveCatalogCourseCover(courseId: string, isDark: boolean, fallback = '') {
  const base = themeCoverVariants[courseId];
  if (!base) return fallback;
  const themed = courseCover(`${base}-${isDark ? 'dark' : 'light'}`);
  return themed || courseCover(`${base}-cover`) || fallback;
}

const publishedLabel: Record<AppLocale, string> = {
  'zh-CN': '已上线', 'zh-TW': '已上線', en: 'Published', fr: 'Publié', es: 'Publicado',
};

const localizedTopics: Record<string, Partial<Record<AppLocale, string>>> = {
  'AI 入门': { 'zh-TW': 'AI 入門', en: 'AI foundations', fr: 'Fondamentaux de l’IA', es: 'Fundamentos de IA' },
  'AI 可靠性': { 'zh-TW': 'AI 可靠性', en: 'AI reliability', fr: 'Fiabilité de l’IA', es: 'Fiabilidad de IA' },
  'AI 安全': { 'zh-TW': 'AI 安全', en: 'AI safety', fr: 'Sécurité de l’IA', es: 'Seguridad de IA' },
  'AI 工程管理': { 'zh-TW': 'AI 工程管理', en: 'AI engineering management', fr: 'Gestion de l’ingénierie IA', es: 'Gestión de ingeniería IA' },
  'Agent 工程': { 'zh-TW': 'Agent 工程', en: 'Agent engineering', fr: 'Ingénierie des agents', es: 'Ingeniería de agentes' },
  'Prompt 与上下文': { 'zh-TW': 'Prompt 與上下文', en: 'Prompting and context', fr: 'Prompts et contexte', es: 'Prompts y contexto' },
  '大模型基础': { 'zh-TW': '大型語言模型基礎', en: 'LLM foundations', fr: 'Fondamentaux des LLM', es: 'Fundamentos de los LLM' },
  '生成式媒体': { 'zh-TW': '生成式媒體', en: 'Generative media', fr: 'Médias génératifs', es: 'Medios generativos' },
};

const coreCopy: Record<AppLocale, Record<'claude' | 'hermes' | 'codex', CourseCopy>> = {
  'zh-CN': {
    claude: { title: 'Claude Code 实战指南', subtitle: '把 AI 变成你的工程搭档', description: '从安装、仓库理解到 Agentic Loop、权限、安全、MCP 与自动化工作流的章节式实战课程。', topic: 'Claude Code' },
    hermes: { title: 'Hermes Agent 入门实战指南', subtitle: '理论知识讲解 + 实战技能应用', description: '从常驻代理心智模型、安装配置到 Tools、Memory、Skills、MCP、Gateway、Cron 与 VPS 部署。', topic: 'Hermes Agent' },
    codex: { title: 'OpenAI Codex 实战教程', subtitle: '从本地编码到 AI 原生工程团队', description: '覆盖安装、CLI、IDE、App、Cloud Tasks、AGENTS.md、权限安全、MCP、Skills、Automations 与团队治理。', topic: 'OpenAI Codex' },
  },
  'zh-TW': {
    claude: { title: 'Claude Code 實戰指南', subtitle: '讓 AI 成為你的工程搭檔', description: '從安裝、理解程式碼庫到 Agentic Loop、權限、安全、MCP 與自動化工作流程的章節式實作課程。', topic: 'Claude Code' },
    hermes: { title: 'Hermes Agent 入門實戰指南', subtitle: '理論講解與實作技能並重', description: '從常駐代理程式的心智模型、安裝設定到 Tools、Memory、Skills、MCP、Gateway、Cron 與 VPS 部署。', topic: 'Hermes Agent' },
    codex: { title: 'OpenAI Codex 實戰教學', subtitle: '從本機撰寫程式到 AI 原生工程團隊', description: '涵蓋安裝、CLI、IDE、App、Cloud Tasks、AGENTS.md、權限安全、MCP、Skills、Automations 與團隊治理。', topic: 'OpenAI Codex' },
  },
  en: {
    claude: { title: 'Claude Code: Practical Guide', subtitle: 'Make AI your engineering partner', description: 'A hands-on path from setup and repository understanding to Agentic Loop, permissions, safety, MCP, and automated workflows.', topic: 'Claude Code' },
    hermes: { title: 'Hermes Agent: Practical Foundations', subtitle: 'Concepts with hands-on skills', description: 'From the resident-agent mental model and setup through Tools, Memory, Skills, MCP, Gateway, Cron, and VPS deployment.', topic: 'Hermes Agent' },
    codex: { title: 'OpenAI Codex: Practical Course', subtitle: 'From local coding to an AI-native engineering team', description: 'Covers setup, CLI, IDE, App, Cloud Tasks, AGENTS.md, permissions, MCP, Skills, Automations, and team governance.', topic: 'OpenAI Codex' },
  },
  fr: {
    claude: { title: 'Guide pratique de Claude Code', subtitle: 'Faites de l’IA votre partenaire d’ingénierie', description: 'De l’installation et la compréhension d’un dépôt à Agentic Loop, aux autorisations, à la sécurité, MCP et aux flux automatisés.', topic: 'Claude Code' },
    hermes: { title: 'Fondamentaux pratiques de Hermes Agent', subtitle: 'Théorie et compétences appliquées', description: 'Du modèle mental d’agent résident à Tools, Memory, Skills, MCP, Gateway, Cron et au déploiement VPS.', topic: 'Hermes Agent' },
    codex: { title: 'Tutoriel pratique OpenAI Codex', subtitle: 'Du codage local à une équipe d’ingénierie native IA', description: 'Installation, CLI, IDE, App, Cloud Tasks, AGENTS.md, autorisations, MCP, Skills, Automations et gouvernance d’équipe.', topic: 'OpenAI Codex' },
  },
  es: {
    claude: { title: 'Guía práctica de Claude Code', subtitle: 'Convierte la IA en tu compañera de ingeniería', description: 'Desde la instalación y el entendimiento del repositorio hasta Agentic Loop, permisos, seguridad, MCP y flujos automatizados.', topic: 'Claude Code' },
    hermes: { title: 'Fundamentos prácticos de Hermes Agent', subtitle: 'Conceptos y habilidades aplicadas', description: 'Desde el modelo mental del agente residente hasta Tools, Memory, Skills, MCP, Gateway, Cron y despliegue VPS.', topic: 'Hermes Agent' },
    codex: { title: 'Curso práctico de OpenAI Codex', subtitle: 'Del código local a un equipo de ingeniería nativo de IA', description: 'Instalación, CLI, IDE, App, Cloud Tasks, AGENTS.md, permisos, MCP, Skills, Automations y gestión de equipos.', topic: 'OpenAI Codex' },
  },
};

function lessonRoutes(chapterLessons: Array<[number, number]>) {
  return chapterLessons.flatMap(([chapter, count]) => Array.from({ length: count }, (_, index) => `${String(chapter).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`));
}

const coreDefinitions = [
  { id: 'claude-code-guide', copy: 'claude' as const, lessonRouteIds: lessonRoutes([[1, 3], [2, 3], [3, 4], [4, 3], [5, 3], [6, 3], [7, 4], [8, 4], [9, 3], [10, 4], [11, 3], [12, 3], [13, 3], [14, 3], [15, 4]]), chapters: 15, access: ['free', 'pro'] as CourseAccess[], icon: 'AI', imageUrl: courseCover('claude-code-guide-cover'), skills: ['Claude Code', 'Vibe Coding', 'AI Agent', 'CLI', 'MCP'] },
  { id: 'hermes-agent-guide', copy: 'hermes' as const, lessonRouteIds: lessonRoutes(Array.from({ length: 20 }, (_, index) => [index, 3] as [number, number])), chapters: 20, access: ['free', 'pro'] as CourseAccess[], icon: 'HA', imageUrl: courseCover('hermes-agent-guide-cover'), skills: ['Hermes Agent', 'AI Agent', 'CLI', 'Skills', 'MCP', 'Gateway', 'Memory'] },
  { id: 'codex-tutorial', copy: 'codex' as const, lessonRouteIds: lessonRoutes(Array.from({ length: 20 }, (_, index) => [index, index < 4 ? 3 : 4] as [number, number])), chapters: 20, access: ['free', 'pro'] as CourseAccess[], icon: 'CX', imageUrl: courseCover('codex-cover'), skills: ['OpenAI Codex', 'CLI', 'IDE', 'Cloud Tasks', 'MCP', 'Skills'] },
];

const fdeCopy: Record<AppLocale, CourseCopy> = {
  'zh-CN': {
    title: 'FDE 前线交付工程师：从模糊需求到生产系统',
    subtitle: '连接客户现场、生产代码与业务结果',
    description: '12 章、61 节 FDE 实战课：从 Discovery、Scope、POC 到 Pilot、生产运维、Handoff、面试与三项行业项目。',
    topic: 'FDE工程师',
  },
  'zh-TW': {
    title: 'FDE 前線部署工程師實戰：從現場問題到可營運系統',
    subtitle: '連接客戶現場、生產程式與業務成果',
    description: '以臺灣半導體、精密製造、港口物流與醫療情境，完成 Discovery、POC、Pilot、營運與 Handoff。',
    topic: 'FDE 工程師',
  },
  en: {
    title: 'Forward Deployed Engineer (FDE): From Customer Ambiguity to Production AI',
    subtitle: 'From customer ambiguity to production AI',
    description: 'A 12-chapter, 61-lesson field course spanning discovery, scope, POC, pilot, production operations, handoff, interviews, and three industry projects.',
    topic: 'Forward Deployed Engineer (FDE)',
  },
  fr: {
    title: 'FDE — Ingénierie IA sur le terrain : du besoin flou à la production',
    subtitle: 'Le métier de Forward Deployed Engineer entre client, code et exploitation',
    description: 'Douze chapitres et 61 leçons situés dans l’aéronautique, la banque, la logistique, l’industrie et la santé en France.',
    topic: 'Forward Deployed Engineer (FDE)',
  },
  es: {
    title: 'FDE — Ingeniería de IA en campo: del problema ambiguo a producción',
    subtitle: 'La práctica FDE entre clientes, código y operaciones',
    description: 'Doce capítulos y 61 lecciones con casos de logística portuaria, renovables, industria, banca y sanidad.',
    topic: 'Forward Deployed Engineer (FDE)',
  },
};

const fdeLessonRouteIds = lessonRoutes([
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 6], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],
]);

const fdeSkills = [
  'fde-operating-model', 'workflow-discovery', 'problem-framing', 'customer-facing-engineering', 'technical-scoping',
  'solution-architecture', 'poc-delivery', 'production-software-engineering', 'model-evaluation', 'production-readiness',
  'python-production-engineering', 'full-stack-engineering', 'agent-observability', 'private-hybrid-cloud', 'kubernetes-helm',
  'devops-ci-cd', 'cloud-infrastructure', 'llm-systems-engineering', 'rag-knowledge-retrieval', 'permission-aware-retrieval', 'agentic-workflows',
  'tool-calling', 'human-in-the-loop', 'ai-safety-guardrails', 'handoff-enablement', 'end-to-end-delivery',
];

const fdeCovers: Record<AppLocale, string> = {
  'zh-CN': courseCover('fde-cover-zh-CN'),
  'zh-TW': courseCover('fde-cover-zh-TW'),
  en: courseCover('fde-cover-en'),
  fr: courseCover('fde-cover-fr'),
  es: courseCover('fde-cover-es'),
};

const aiLessonRouteIds = lessonRoutes(Array.from({ length: 10 }, (_, index) => [index + 1, 3] as [number, number]));
const aiSeeds: CourseSeed[] = [
  { id: 'ai-learning-orientation', title: 'AI 学习入门与能力定位', subtitle: '从一次惊喜，走到可复现的工作能力', description: '用能力基线、最小实验、证据记录和岗位场景，建立可持续的 AI 学习方法。', topic: 'AI 入门', difficulty: 'Beginner', access: ['free'], skills: ['ai-literacy', 'ai-task-framing', 'ai-learning-method', 'human-ai-collaboration', 'model-evaluation'] },
  { id: 'llm-core-principles', title: '大模型核心原理', subtitle: '从训练数据、Token 到注意力与技术选型', description: '用产品和工程决策需要的深度理解大模型，不背术语也能定位问题。', topic: '大模型基础', difficulty: 'Intermediate', access: ['free'], skills: ['llm-fundamentals', 'tokenization', 'attention-transformers', 'model-adaptation', 'ai-task-framing'] },
  { id: 'agent-engineering', title: 'Agent 工程实战', subtitle: '让 AI 从会说走向会做', description: '系统掌握 Agent 的目标、工具、状态、记忆、控制、观测与多 Agent 协作。', topic: 'Agent 工程', difficulty: 'Advanced', access: ['free'], skills: ['agent-architecture', 'tool-calling', 'mcp-tool-integration', 'agent-memory', 'agent-observability', 'agentic-workflows', 'agent-loop-control'] },
  { id: 'hallucination-mitigation', title: 'AI 幻觉分析与治理', subtitle: '让流畅回答接受事实约束', description: '通过证据格式、RAG、采样控制、评测和人工审核建立组合防线。', topic: 'AI 可靠性', difficulty: 'Intermediate', access: ['free'], skills: ['hallucination-analysis', 'grounded-generation', 'rag-knowledge-retrieval', 'sampling-control', 'model-evaluation'] },
  { id: 'ai-literacy-and-boundaries', title: 'AI 素养：能力、边界与正确期待', subtitle: '知道什么时候用、什么时候不用', description: '面向零基础学习者建立准确的 AI 心智模型和任务分流能力。', topic: 'AI 入门', difficulty: 'Beginner', access: ['free'], skills: ['ai-literacy', 'ai-use-case-selection', 'human-ai-collaboration', 'hallucination-analysis', 'multimodal-literacy'] },
  { id: 'chat-completion-systems', title: '从补全到对话系统', subtitle: '聊天界面背后的消息机器', description: '拆解 Chat API、消息模板、上下文窗口和产品状态，设计可靠对话体验。', topic: '大模型基础', difficulty: 'Intermediate', access: ['free'], skills: ['chat-completions', 'chat-templates', 'conversation-state', 'context-engineering', 'structured-output'] },
  { id: 'ai-beginner-question-map', title: 'AI 小白问题地图', subtitle: '用高频问题建立完整认知', description: '围绕 Prompt、模型、Agent、多模态、API 和账号安全建立选型与使用地图。', topic: 'AI 入门', difficulty: 'Beginner', access: ['free'], skills: ['ai-literacy', 'ai-product-landscape', 'structured-prompting', 'agent-architecture', 'multimodal-literacy', 'ai-safety-guardrails'] },
  { id: 'prompt-engineering-production', title: '生产级 Prompt 工程', subtitle: '把自然语言写成可维护接口', description: '掌握结构、角色、示例、Schema、流式输出、评测与版本生命周期。', topic: 'Prompt 与上下文', difficulty: 'Intermediate', access: ['free'], skills: ['structured-prompting', 'few-shot-prompting', 'structured-output', 'prompt-evaluation', 'requirement-clarification'] },
  { id: 'llm-cost-model-selection', title: '大模型成本优化与选型', subtitle: '算清每一次智能的单位经济', description: '从多轮 Token、缓存、图片成本到模型路由，建立可解释的成本质量决策。', topic: 'AI 工程管理', difficulty: 'Advanced', access: ['free'], skills: ['llm-unit-economics', 'prompt-caching', 'model-routing', 'tokenization', 'model-evaluation'] },
  { id: 'context-engineering', title: '上下文工程实战', subtitle: '给模型一张干净、可信、够用的工作台', description: '管理指令、事实、状态、工具结果和长期记忆的完整生命周期。', topic: 'Prompt 与上下文', difficulty: 'Advanced', access: ['free'], skills: ['context-engineering', 'context-compression', 'context-quality', 'rag-knowledge-retrieval', 'conversation-state'] },
  { id: 'prompt-security', title: 'Prompt 安全与注入防御', subtitle: '把不可信内容关在权限边界之外', description: '从攻击面、指令隔离、最小权限到红队评测，构建可上线的安全体系。', topic: 'AI 安全', difficulty: 'Advanced', access: ['free'], skills: ['prompt-injection-defense', 'ai-safety-guardrails', 'ai-threat-modeling', 'red-team-evaluation', 'tool-calling'] },
  { id: 'ai-image-production', title: 'AI 图像生成与产品化', subtitle: '从一张好看图片到可靠视觉工作流', description: '覆盖视觉 Prompt、参考图、一致性、分镜、成本、版权和生产验收。', topic: '生成式媒体', difficulty: 'Intermediate', access: ['free'], skills: ['image-prompting', 'visual-consistency', 'image-workflow', 'generative-media-governance', 'llm-unit-economics'] },
  { id: 'communicating-with-ai', title: '高效与 AI 沟通', subtitle: '像给一位不了解背景的新同事交代任务', description: '通过澄清、材料边界、结果倒推和反馈迭代，让日常 AI 协作更稳定。', topic: 'AI 入门', difficulty: 'Beginner', access: ['free'], skills: ['requirement-clarification', 'instruction-design', 'structured-prompting', 'feedback-iteration', 'human-ai-collaboration'] },
  { id: 'agent-loop-control', title: 'Agent Loop 控制与恢复', subtitle: '让循环前进，也让循环停下', description: '深入掌握循环状态、卡死模式、预算、流式事件、幂等、检查点与恢复。', topic: 'Agent 工程', difficulty: 'Advanced', access: ['free'], skills: ['agentic-workflows', 'agent-loop-control', 'agent-recovery', 'agent-observability', 'llm-unit-economics'] },
  { id: 'agent-design-patterns', title: 'Agent 设计模式与架构选型', subtitle: '先选最简单的可靠结构', description: '系统掌握 Workflow、链式、路由、并行、编排、评估优化与多 Agent 模式。', topic: 'Agent 工程', difficulty: 'Advanced', access: ['free'], skills: ['workflow-patterns', 'orchestrator-worker', 'evaluator-optimizer', 'multi-agent-design', 'agentic-workflows', 'context-engineering'] },
];

function aiDirectory(courseId: string) {
  const index = aiSeeds.findIndex((course) => course.id === courseId);
  return index < 0 ? '' : `${String(index + 1).padStart(2, '0')}-${courseId}`;
}

function topicFor(topic: string, locale: AppLocale) {
  return localizedTopics[topic]?.[locale] ?? topic;
}

const catalogCache = new Map<AppLocale, CatalogCourse[]>();

export function getCatalogCourses(locale: AppLocale = 'zh-CN') {
  const cached = catalogCache.get(locale);
  if (cached) return cached;

  const core: CatalogCourse[] = coreDefinitions.map((definition) => ({
    id: definition.id,
    ...coreCopy[locale][definition.copy],
    difficulty: 'Beginner',
    lessons: definition.lessonRouteIds.length,
    chapters: definition.chapters,
    status: publishedLabel[locale],
    access: definition.access,
    imageUrl: definition.imageUrl,
    authorIconText: definition.icon,
    authorDomain: 'studyai.now',
    skills: definition.skills,
    lessonRouteIds: definition.lessonRouteIds,
  }));
  const ai: CatalogCourse[] = aiSeeds.map((seed) => ({
    ...seed,
    title: getCourseSeoCopy(seed.id, locale)?.title ?? seed.title,
    subtitle: getCourseSeoCopy(seed.id, locale)?.subtitle ?? seed.subtitle,
    description: getCourseSeoCopy(seed.id, locale)?.description ?? seed.description,
    topic: getCourseSeoCopy(seed.id, locale)?.topic ?? topicFor(seed.topic, locale),
    lessons: aiLessonRouteIds.length,
    chapters: 10,
    status: publishedLabel[locale],
    imageUrl: courseCover(`${aiDirectory(seed.id)}-cover`),
    authorIconText: `AI${seed.id.slice(0, 1).toUpperCase()}`,
    authorDomain: 'studyai.now',
    lessonRouteIds: aiLessonRouteIds,
  }));
  const fde: CatalogCourse = {
    id: 'forward-deployed-engineering',
    ...fdeCopy[locale],
    difficulty: 'Advanced',
    lessons: fdeLessonRouteIds.length,
    chapters: 12,
    status: publishedLabel[locale],
    access: ['free'],
    imageUrl: fdeCovers[locale],
    authorIconText: 'FDE',
    authorDomain: 'studyai.now',
    skills: fdeSkills,
    lessonRouteIds: fdeLessonRouteIds,
  };
  const courses = [...core, fde, ...ai];
  catalogCache.set(locale, courses);
  return courses;
}

export function getCatalogCourse(courseId: string, locale: AppLocale = 'zh-CN') {
  return getCatalogCourses(locale).find((course) => course.id === courseId);
}

export function getCatalogCourseStartPath(course: Pick<CatalogCourse, 'id'>, locale?: AppLocale) {
  const path = `/courses/${encodeURIComponent(course.id)}`;
  return locale ? localizedPublicPath(path, locale) : path;
}

export function getCatalogLessonPath(courseId: string, chapterNumber: number, lessonRouteId: string, locale?: AppLocale) {
  const path = `/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(String(chapterNumber))}/lessons/${encodeURIComponent(lessonRouteId)}`;
  return locale ? localizedPublicPath(path, locale) : path;
}
