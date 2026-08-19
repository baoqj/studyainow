import type { AppLocale } from './courseContent';

/**
 * 面试题练习数据层。
 *
 * 题面内容存放在仓库外的 `Interview/ai_engineering_progressive_assessment_levels_1_6/`
 * （与 `Course/` 相同，属私有内容，不进入 GitHub 仓库）。本模块只负责：
 *  1. 按界面语言加载对应语种的 Level-*.md（en / zh-CN / zh-TW / fr / es）；
 *  2. 将题库解析为结构化数据（题集、级别、题目与七个固定小节）；
 *  3. 提供路由与前后题目导航工具。
 *
 * 解析不依赖各语种的小节标题文本，而是依赖固定的小节顺序：
 *  题目描述 → 要求 → 示例 → 题目分析 → 常见错误与边界情况 → 完整解法 → 要点总结。
 */

export const INTERVIEW_SET_ID = 'ai-engineering-progressive-assessment';

export interface InterviewQuestion {
  /** `level-number`，如 `1-1`。 */
  id: string;
  level: number;
  number: number;
  title: string;
  focus: string;
  statement: string;
  requirements: string;
  example: string;
  analysis: string;
  mistakes: string;
  solution: string;
  summary: string;
  skills: string[];
}

export interface InterviewLevel {
  /** 级别序号，如 `1`。 */
  id: string;
  number: number;
  title: string;
  overview: string;
  timeBudget: string;
  assesses: string[];
  glance: string;
  questions: InterviewQuestion[];
}

export interface InterviewSet {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  topic: string;
  category: string;
  tags: string[];
  keywords: string[];
  skills: string[];
  coverUrl: string;
  levelCount: number;
  questionCount: number;
  levels: InterviewLevel[];
}

type SetCopy = Pick<InterviewSet, 'title' | 'subtitle' | 'description' | 'topic' | 'category' | 'tags' | 'keywords'>;

const levelModules = import.meta.glob('../../../Interview/ai_engineering_progressive_assessment_levels_1_6/locales/*/Level-*-Practice-Problems.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// 面试题集封面统一存放于仓库外的 img/cover/interview/（与 Course/ 同属私有资源）。
// 文件名约定：<题集标识>-cover.<ext>；缺失时返回空串，界面使用品牌渐变占位。
const coverModules = import.meta.glob('../../../img/cover/interview/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function interviewCover(name: string) {
  const entry = Object.entries(coverModules).find(([path]) => path.split('/').at(-1)?.startsWith(`${name}.`));
  return entry?.[1] ?? '';
}

/** 题集级元数据（各界面语言）。 */
const setCopy: Record<AppLocale, SetCopy> = {
  'zh-CN': {
    title: 'AI 工程渐进式评估：Python 编程面试题集',
    subtitle: '从入门实现到分布式系统模拟，6 级 36 道原创 Python 题',
    description:
      'AI Engineering Progressive Assessment 是一套面向 AI 工程师的 Python 编程评估题集：6 个难度级别、36 道原创题目，覆盖数据结构、算法、状态机、缓存、调度、事务与分布式系统。每道题都配有题目描述、要求、示例、题目分析、常见错误与完整解法，适合面试备考与工程能力自测。',
    topic: 'Python 编程评估',
    category: 'AI 工程',
    tags: ['Python', 'AI 工程', '算法', '数据结构', '分布式系统', '面试'],
    keywords: ['python', 'interview', 'algorithms', 'data structures', 'distributed systems', 'cache', 'scheduler', 'transaction', 'crdt', 'consensus', 'topological sort', 'lru', 'ttl'],
  },
  'zh-TW': {
    title: 'AI 工程漸進式評估：Python 程式設計面試題集',
    subtitle: '從入門實作到分散式系統模擬，6 級 36 道原創 Python 題目',
    description:
      'AI Engineering Progressive Assessment 是一套為 AI 工程師設計的 Python 程式設計評估題集：6 個難度級別、36 道原創題目，涵蓋資料結構、演算法、狀態機、快取、排程、交易與分散式系統。每道題都附有題目說明、要求、範例、題目分析、常見錯誤與完整解法，適合面試準備與工程能力自我檢測。',
    topic: 'Python 程式設計評估',
    category: 'AI 工程',
    tags: ['Python', 'AI 工程', '演算法', '資料結構', '分散式系統', '面試'],
    keywords: ['python', 'interview', 'algorithms', 'data structures', 'distributed systems', 'cache', 'scheduler', 'transaction', 'crdt', 'consensus', 'topological sort', 'lru', 'ttl'],
  },
  en: {
    title: 'AI Engineering Progressive Assessment',
    subtitle: '36 original Python problems across six levels, from entry-level implementation to distributed-systems simulation',
    description:
      'A Python coding assessment for AI engineers: six difficulty levels and 36 original problems covering data structures, algorithms, state machines, caching, scheduling, transactions, and distributed systems. Every problem ships with a statement, requirements, examples, analysis, common mistakes, and a complete reference solution — ideal for interview preparation and self-assessment.',
    topic: 'Python Coding Assessment',
    category: 'AI Engineering',
    tags: ['Python', 'AI Engineering', 'Algorithms', 'Data Structures', 'Distributed Systems', 'Interview'],
    keywords: ['python', 'interview', 'algorithms', 'data structures', 'distributed systems', 'cache', 'scheduler', 'transaction', 'crdt', 'consensus', 'topological sort', 'lru', 'ttl'],
  },
  fr: {
    title: 'Évaluation progressive d’ingénierie IA : problèmes Python',
    subtitle: '36 problèmes Python originaux répartis sur six niveaux, de l’implémentation d’entrée de gamme à la simulation de systèmes distribués',
    description:
      'Une évaluation de programmation Python pour les ingénieurs IA : six niveaux de difficulté et 36 problèmes originaux couvrant structures de données, algorithmes, machines à états, caches, ordonnancement, transactions et systèmes distribués. Chaque problème comprend énoncé, exigences, exemples, analyse, erreurs fréquentes et solution complète — idéal pour préparer un entretien et s’auto-évaluer.',
    topic: 'Évaluation de programmation Python',
    category: 'Ingénierie IA',
    tags: ['Python', 'Ingénierie IA', 'Algorithmes', 'Structures de données', 'Systèmes distribués', 'Entretien'],
    keywords: ['python', 'interview', 'algorithms', 'data structures', 'distributed systems', 'cache', 'scheduler', 'transaction', 'crdt', 'consensus', 'topological sort', 'lru', 'ttl'],
  },
  es: {
    title: 'Evaluación progresiva de ingeniería de IA: problemas de Python',
    subtitle: '36 problemas originales de Python en seis niveles, de la implementación inicial a la simulación de sistemas distribuidos',
    description:
      'Una evaluación de programación en Python para ingenieros de IA: seis niveles de dificultad y 36 problemas originales que cubren estructuras de datos, algoritmos, máquinas de estados, cachés, planificación, transacciones y sistemas distribuidos. Cada problema incluye enunciado, requisitos, ejemplos, análisis, errores comunes y una solución completa de referencia — ideal para preparar entrevistas y autoevaluarse.',
    topic: 'Evaluación de programación en Python',
    category: 'Ingeniería de IA',
    tags: ['Python', 'Ingeniería de IA', 'Algoritmos', 'Estructuras de datos', 'Sistemas distribuidos', 'Entrevista'],
    keywords: ['python', 'interview', 'algorithms', 'data structures', 'distributed systems', 'cache', 'scheduler', 'transaction', 'crdt', 'consensus', 'topological sort', 'lru', 'ttl'],
  },
};

/** 每题考察的技能（与知识图谱 `skills.slug` 通用；新增技能的种子见 migration 0034）。 */
const questionSkills: Record<string, string[]> = {
  '1-1': ['python-data-structures', 'algorithm-complexity'],
  '1-2': ['python-data-structures', 'sorting-aggregation'],
  '1-3': ['string-processing', 'ai-safety-guardrails'],
  '1-4': ['state-machine-design', 'human-in-the-loop'],
  '1-5': ['algorithm-complexity', 'stream-processing'],
  '1-6': ['graph-algorithms', 'agent-architecture'],
  '2-1': ['sorting-aggregation', 'model-evaluation'],
  '2-2': ['string-processing', 'state-machine-design'],
  '2-3': ['graph-algorithms', 'agent-architecture'],
  '2-4': ['python-data-structures', 'scheduling-queues'],
  '2-5': ['stream-processing', 'scheduling-queues'],
  '2-6': ['state-machine-design', 'event-sourcing'],
  '3-1': ['graph-algorithms', 'scheduling-queues'],
  '3-2': ['transactional-systems', 'state-machine-design'],
  '3-3': ['ai-safety-guardrails', 'state-machine-design'],
  '3-4': ['graph-algorithms', 'algorithm-complexity'],
  '3-5': ['stream-processing', 'algorithm-complexity'],
  '3-6': ['cache-design', 'state-machine-design'],
  '4-1': ['cache-design', 'python-data-structures'],
  '4-2': ['graph-algorithms', 'scheduling-queues'],
  '4-3': ['python-data-structures', 'string-processing'],
  '4-4': ['scheduling-queues', 'algorithm-complexity'],
  '4-5': ['event-sourcing', 'python-data-structures'],
  '4-6': ['string-processing', 'python-data-structures'],
  '5-1': ['event-sourcing', 'transactional-systems'],
  '5-2': ['distributed-consensus', 'python-data-structures'],
  '5-3': ['graph-algorithms', 'algorithm-complexity'],
  '5-4': ['scheduling-queues', 'stream-processing'],
  '5-5': ['crash-recovery', 'incident-response'],
  '5-6': ['stream-processing', 'cache-design'],
  '6-1': ['transactional-systems', 'distributed-consensus'],
  '6-2': ['distributed-consensus', 'crash-recovery'],
  '6-3': ['distributed-consensus', 'stream-processing'],
  '6-4': ['crash-recovery', 'distributed-consensus'],
  '6-5': ['transactional-systems', 'crash-recovery'],
  '6-6': ['stream-processing', 'distributed-consensus'],
};

/** 技能 slug 的五语种展示名（含少量已有知识图谱技能，用于题面标签展示）。 */
export const interviewSkillNames: Record<string, Record<AppLocale, string>> = {
  'python-data-structures': { 'zh-CN': 'Python 数据结构', 'zh-TW': 'Python 資料結構', en: 'Python data structures', fr: 'Structures de données Python', es: 'Estructuras de datos en Python' },
  'algorithm-complexity': { 'zh-CN': '算法与复杂度分析', 'zh-TW': '演算法與複雜度分析', en: 'Algorithm analysis and complexity', fr: 'Analyse d’algorithmes et complexité', es: 'Análisis de algoritmos y complejidad' },
  'string-processing': { 'zh-CN': '字符串处理与匹配', 'zh-TW': '字串處理與比對', en: 'String processing and matching', fr: 'Traitement et correspondance de chaînes', es: 'Procesamiento y coincidencia de cadenas' },
  'state-machine-design': { 'zh-CN': '状态机与状态转换', 'zh-TW': '狀態機與狀態轉換', en: 'State machine and state transitions', fr: 'Machines à états et transitions', es: 'Máquinas de estados y transiciones' },
  'sorting-aggregation': { 'zh-CN': '排序、聚合与统计', 'zh-TW': '排序、聚合與統計', en: 'Sorting, aggregation and statistics', fr: 'Tri, agrégation et statistiques', es: 'Ordenación, agregación y estadísticas' },
  'graph-algorithms': { 'zh-CN': '图遍历与拓扑排序', 'zh-TW': '圖遍歷與拓撲排序', en: 'Graph traversal and topological ordering', fr: 'Parcours de graphes et ordre topologique', es: 'Recorrido de grafos y orden topológico' },
  'cache-design': { 'zh-CN': '缓存、TTL 与淘汰策略', 'zh-TW': '快取、TTL 與淘汰策略', en: 'Cache design, TTL and eviction', fr: 'Conception de cache, TTL et éviction', es: 'Diseño de caché, TTL y desalojo' },
  'stream-processing': { 'zh-CN': '流式处理与滑动窗口', 'zh-TW': '串流處理與滑動視窗', en: 'Stream processing and sliding windows', fr: 'Traitement de flux et fenêtres glissantes', es: 'Procesamiento de flujos y ventanas deslizantes' },
  'scheduling-queues': { 'zh-CN': '调度、队列与公平性', 'zh-TW': '排程、佇列與公平性', en: 'Scheduling, queues and fairness', fr: 'Ordonnancement, files et équité', es: 'Planificación, colas y equidad' },
  'event-sourcing': { 'zh-CN': '事件溯源与版本化存储', 'zh-TW': '事件溯源與版本化儲存', en: 'Event sourcing and versioned storage', fr: 'Event sourcing et stockage versionné', es: 'Event sourcing y almacenamiento versionado' },
  'distributed-consensus': { 'zh-CN': '分布式共识与仲裁', 'zh-TW': '分散式共識與仲裁', en: 'Distributed consensus and quorum', fr: 'Consensus distribué et quorum', es: 'Consenso distribuido y quórum' },
  'crash-recovery': { 'zh-CN': '崩溃恢复与租约', 'zh-TW': '當機復原與租約', en: 'Crash recovery and leases', fr: 'Reprise après panne et baux', es: 'Recuperación ante fallos y concesiones' },
  'transactional-systems': { 'zh-CN': '事务与快照隔离', 'zh-TW': '交易與快照隔離', en: 'Transactions and snapshot isolation', fr: 'Transactions et isolation par instantané', es: 'Transacciones y aislamiento por instantáneas' },
  'python-production-engineering': { 'zh-CN': 'Python 生产工程', 'zh-TW': 'Python 生產工程', en: 'Python production engineering', fr: 'Ingénierie Python en production', es: 'Ingeniería de Python en producción' },
  'ai-safety-guardrails': { 'zh-CN': 'AI 安全护栏', 'zh-TW': 'AI 安全護欄', en: 'AI safety guardrails', fr: 'Garde-fous de sécurité IA', es: 'Barreras de seguridad de IA' },
  'human-in-the-loop': { 'zh-CN': '人在回路', 'zh-TW': '人在迴路', en: 'Human in the loop', fr: 'Humain dans la boucle', es: 'Humano en el bucle' },
  'model-evaluation': { 'zh-CN': '模型评估', 'zh-TW': '模型評估', en: 'Model evaluation', fr: 'Évaluation de modèles', es: 'Evaluación de modelos' },
  'agent-architecture': { 'zh-CN': 'Agent 架构', 'zh-TW': 'Agent 架構', en: 'Agent architecture', fr: 'Architecture d’agents', es: 'Arquitectura de agentes' },
  'incident-response': { 'zh-CN': '故障响应', 'zh-TW': '事故應變', en: 'Incident response', fr: 'Réponse aux incidents', es: 'Respuesta a incidentes' },
};

export function skillDisplayName(skill: string, locale: AppLocale) {
  return interviewSkillNames[skill]?.[locale] ?? interviewSkillNames[skill]?.en ?? skill.replaceAll('-', ' ');
}

function splitH2(raw: string) {
  const matches = [...raw.matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? raw.length;
    return { heading: match[1].trim(), body: raw.slice(start, end).trim() };
  });
}

function splitH3(body: string) {
  const matches = [...body.matchAll(/^###\s+.*$/gm)];
  if (!matches.length) return [body.trim()];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    return body.slice(start, end).trim();
  });
}

function parseQuestion(block: { heading: string; body: string }, level: number, index: number): InterviewQuestion | null {
  const titleMatch = block.heading.match(/^Question\s+(\d+)\s*[—–-]\s*(.+)$/i);
  const number = titleMatch ? Number(titleMatch[1]) : index;
  const title = titleMatch?.[2]?.trim() || block.heading.replace(/^Question\s+\d+\s*[—–-]\s*/, '');
  const focus = block.body.match(/^\*\*[^*]+\*\*:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const sections = splitH3(block.body.replace(/^\*\*[^*]+\*\*:\s*.+$/m, ''));
  const [statement = '', requirements = '', example = '', analysis = '', mistakes = '', solution = '', summary = ''] = sections;
  if (!statement && !requirements && !example && !analysis && !mistakes && !solution) return null;
  return {
    id: `${level}-${number}`,
    level,
    number,
    title,
    focus,
    statement,
    requirements,
    example,
    analysis,
    mistakes,
    solution,
    summary,
    skills: questionSkills[`${level}-${number}`] ?? [],
  };
}

function parseLevel(raw: string, number: number): InterviewLevel {
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `Level ${number}`;
  const blocks = splitH2(raw);
  const overviewBlock = blocks[0]?.body ?? '';
  const timeBudget = overviewBlock.match(/^\*\*[^*]+\*\*:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const overview = overviewBlock
    .replace(/^\*\*[^*]+\*\*:\s*.+$/gm, '')
    .trim();
  const assesses = (blocks[1]?.body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim());
  const questions = blocks
    .slice(3)
    .map((block, index) => parseQuestion(block, number, index + 1))
    .filter((question): question is InterviewQuestion => question !== null);
  return {
    id: String(number),
    number,
    title,
    overview,
    timeBudget,
    assesses,
    glance: blocks[2]?.body ?? '',
    questions,
  };
}

function modulesForLocale(locale: AppLocale) {
  const prefix = `/ai_engineering_progressive_assessment_levels_1_6/locales/${locale}/Level-`;
  return Object.entries(levelModules).filter(([path]) => path.includes(prefix));
}

const LEVEL_NUMBERS = [1, 2, 3, 4, 5, 6];

const setCache = new Map<AppLocale, InterviewSet>();

export function getInterviewSets(locale: AppLocale = 'zh-CN'): InterviewSet[] {
  const cached = setCache.get(locale);
  if (cached) return [cached];

  const copy = setCopy[locale] ?? setCopy.en;
  const entries = modulesForLocale(locale);
  const fallbackEntries = locale === 'en' ? [] : modulesForLocale('en');
  const levels = LEVEL_NUMBERS.map((number) => {
    const raw =
      entries.find(([path]) => path.includes(`/Level-${number}-Practice-Problems.md`))?.[1] ??
      fallbackEntries.find(([path]) => path.includes(`/Level-${number}-Practice-Problems.md`))?.[1] ??
      '';
    return raw ? parseLevel(raw, number) : { id: String(number), number, title: `Level ${number}`, overview: '', timeBudget: '', assesses: [], glance: '', questions: [] };
  });
  const skills = [...new Set(['python-production-engineering', ...Object.values(questionSkills).flat()])];
  const set: InterviewSet = {
    id: INTERVIEW_SET_ID,
    ...copy,
    skills,
    coverUrl: interviewCover('ai-engineering-progressive-assessment-cover'),
    levelCount: levels.length,
    questionCount: levels.reduce((total, level) => total + level.questions.length, 0),
    levels,
  };
  setCache.set(locale, set);
  return [set];
}

export function getInterviewSet(setId = INTERVIEW_SET_ID, locale: AppLocale = 'zh-CN') {
  return getInterviewSets(locale).find((set) => set.id === setId) ?? getInterviewSets(locale)[0];
}

export function getInterviewLevel(set: InterviewSet, levelId?: string) {
  return (
    set.levels.find((level) => level.id === levelId || String(level.number) === levelId) ??
    set.levels[0]
  );
}

export function getInterviewQuestion(level: InterviewLevel, questionId?: string) {
  if (!questionId || !level.questions.length) return undefined;
  return (
    level.questions.find(
      (question) => question.id === questionId || String(question.number) === questionId,
    ) ?? level.questions[0]
  );
}

export function getInterviewLevelPath(setId: string, level: InterviewLevel) {
  return `/interviews/${setId}/levels/${level.id}`;
}

/** 题集根路由：展示题集简介、大纲与完整题目目录。 */
export function getInterviewSetPath(set: InterviewSet) {
  return `/interviews/${set.id}`;
}

export function getInterviewQuestionPath(setId: string, question: InterviewQuestion) {
  return `/interviews/${setId}/levels/${question.level}/questions/${question.id}`;
}

export function getInterviewSetStartPath(set: InterviewSet) {
  const firstLevel = set.levels[0];
  const firstQuestion = firstLevel?.questions[0];
  return firstQuestion ? getInterviewQuestionPath(set.id, firstQuestion) : getInterviewLevelPath(set.id, firstLevel);
}

export function getQuestionNeighbors(set: InterviewSet, question?: InterviewQuestion) {
  if (!question) return { previous: undefined, next: undefined };
  const questions = set.levels.flatMap((level) => level.questions);
  const index = questions.findIndex((item) => item.id === question.id && item.level === question.level);
  return {
    previous: index > 0 ? questions[index - 1] : undefined,
    next: index >= 0 && index < questions.length - 1 ? questions[index + 1] : undefined,
  };
}

export function getQuestionPosition(set: InterviewSet, question?: InterviewQuestion) {
  if (!question) return { index: 0, total: 0 };
  const questions = set.levels.flatMap((level) => level.questions);
  const index = questions.findIndex((item) => item.id === question.id && item.level === question.level);
  return { index: index + 1, total: questions.length };
}
