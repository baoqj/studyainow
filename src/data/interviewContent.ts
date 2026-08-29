import type { AppLocale } from './courseContent';

/**
 * 面试题练习数据层。
 *
 * 题面内容存放在仓库外的 `Interview/` 各题集目录
 * （与 `Course/` 相同，属私有内容，不进入 GitHub 仓库）。本模块只负责：
 *  1. 按界面语言加载对应语种的 Level-*.md（en / zh-CN / zh-TW / fr / es）；
 *  2. 将题库解析为结构化数据（题集、级别、题目与七个固定小节）；
 *  3. 提供路由与前后题目导航工具。
 *
 * 解析不依赖各语种的小节标题文本，而是依赖固定的小节顺序：
 *  题目描述 → 要求 → 示例 → 题目分析 → 常见错误与边界情况 → 完整解法 → 要点总结。
 */

export const AI_ENGINEERING_INTERVIEW_SET_ID = 'ai-engineering-progressive-assessment';
export const INFERENCE_ENGINE_INTERVIEW_SET_ID = 'inference-engine-scheduler';
/** 保留原常量作为默认题集，避免已有调用方失效。 */
export const INTERVIEW_SET_ID = AI_ENGINEERING_INTERVIEW_SET_ID;

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
  coverUrlDark?: string;
  levelCount: number;
  questionCount: number;
  levels: InterviewLevel[];
}

type SetCopy = Pick<InterviewSet, 'title' | 'subtitle' | 'description' | 'topic' | 'category' | 'tags' | 'keywords'>;

const aiEngineeringLevelModules = import.meta.glob('../../../Interview/ai_engineering_progressive_assessment_levels_1_6/locales/*/Level-*-Practice-Problems.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const inferenceEngineLevelModules = import.meta.glob('../../../Interview/inference_engine/locales/*/Level-*-Practice-Problems.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// 面试题集封面统一存放于仓库外的 img/cover/interview/（与 Course/ 同属私有资源）。
// 文件名约定：<题集标识>-cover[-light|-dark].<ext>；缺失时返回空串。
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
const aiEngineeringSetCopy: Record<AppLocale, SetCopy> = {
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

const inferenceEngineSetCopy: Record<AppLocale, SetCopy> = {
  'zh-CN': {
    title: 'LLM 推理引擎调度器：Python 递进式面试题',
    subtitle: '用 5 个连续阶段实现从基础批调度到 KV 抢占与优先级准入',
    description:
      '围绕同一个 LLM 推理引擎调度器逐步完成 5 个工程阶段：基础 Prefill/Decode 调度、分块 Prefill、KV 峰值准入、运行时抢占和优先级策略。题集重点考察候选人能否把系统规则翻译为确定性的 Python 计划函数，并用列表、稳定排序、集合、生成式表达式和事务式状态推演守住预算、顺序与内存不变量。每一阶段都提供可执行示例、深入思路、常见陷阱、完整标准答案、Python 语法讲解和交互式调度轨迹。',
    topic: 'LLM 推理调度与 Python',
    category: 'AI 基础设施',
    tags: ['Python', 'LLM 推理', '调度', 'KV Cache', '系统设计', '面试'],
    keywords: ['python', 'llm inference', 'scheduler', 'prefill', 'decode', 'kv cache', 'preemption', 'priority queue', 'deterministic planning'],
  },
  'zh-TW': {
    title: 'LLM 推論引擎排程器：Python 漸進式面試題',
    subtitle: '以 5 個連續階段，從基礎批次排程實作到 KV 搶佔與優先級准入',
    description:
      '圍繞同一個 LLM 推論引擎排程器，逐步完成 5 個工程階段：基礎 Prefill/Decode 排程、分塊 Prefill、KV 峰值准入、執行期搶佔與優先級策略。題集著重評估候選人能否把系統規則轉換成確定性的 Python 計畫函式，並運用串列、穩定排序、集合、生成式與交易式狀態推演，守住預算、順序及記憶體不變量。每一階段皆附可執行範例、深入解題思路、常見陷阱、完整標準答案、Python 語法說明及互動式排程軌跡。',
    topic: 'LLM 推論排程與 Python',
    category: 'AI 基礎設施',
    tags: ['Python', 'LLM 推論', '排程', 'KV Cache', '系統設計', '面試'],
    keywords: ['python', 'llm inference', 'scheduler', 'prefill', 'decode', 'kv cache', 'preemption', 'priority queue', 'deterministic planning'],
  },
  en: {
    title: 'LLM Inference Engine Scheduler: Progressive Python Interview',
    subtitle: 'Build from basic batch scheduling to KV preemption and priority admission in five connected stages',
    description:
      'Implement one LLM inference scheduler across five progressive engineering stages: basic prefill/decode scheduling, chunked prefill, peak-KV admission, runtime preemption, and priority policy. The assessment tests whether a candidate can translate systems rules into a deterministic Python planning function while protecting budget, ordering, and memory invariants with lists, stable sorting, sets, comprehensions, and transactional state reasoning. Every stage includes an executable example, detailed reasoning, pitfalls, a complete reference answer, Python language notes, and an interactive scheduling trace.',
    topic: 'LLM Inference Scheduling and Python',
    category: 'AI Infrastructure',
    tags: ['Python', 'LLM Inference', 'Scheduling', 'KV Cache', 'Systems Design', 'Interview'],
    keywords: ['python', 'llm inference', 'scheduler', 'prefill', 'decode', 'kv cache', 'preemption', 'priority queue', 'deterministic planning'],
  },
  fr: {
    title: 'Ordonnanceur d’inférence LLM : entretien Python progressif',
    subtitle: 'Cinq étapes liées, de l’ordonnancement par lots à la préemption KV et à l’admission prioritaire',
    description:
      'Implémentez un même ordonnanceur d’inférence LLM au fil de cinq étapes d’ingénierie : ordonnancement prefill/decode, prefill fractionné, admission selon le pic KV, préemption à l’exécution et politique de priorité. L’évaluation mesure la capacité à traduire des règles système en une fonction de planification Python déterministe, tout en préservant budget, ordre et invariants mémoire avec listes, tri stable, ensembles, compréhensions et raisonnement transactionnel. Chaque étape fournit un exemple exécutable, une démarche détaillée, les pièges fréquents, une réponse de référence complète, des explications Python et une trace interactive.',
    topic: 'Ordonnancement d’inférence LLM et Python',
    category: 'Infrastructure IA',
    tags: ['Python', 'Inférence LLM', 'Ordonnancement', 'Cache KV', 'Conception système', 'Entretien'],
    keywords: ['python', 'llm inference', 'scheduler', 'prefill', 'decode', 'kv cache', 'preemption', 'priority queue', 'deterministic planning'],
  },
  es: {
    title: 'Planificador de inferencia LLM: entrevista progresiva de Python',
    subtitle: 'Cinco etapas conectadas, desde la planificación por lotes hasta el desalojo de KV y la admisión por prioridad',
    description:
      'Implemente un único planificador de inferencia LLM a lo largo de cinco etapas: planificación básica de prefill/decode, prefill por fragmentos, admisión por pico de KV, desalojo en ejecución y política de prioridades. La evaluación comprueba si la persona candidata sabe convertir reglas de sistema en una función de planificación determinista en Python, preservando presupuesto, orden e invariantes de memoria mediante listas, ordenación estable, conjuntos, comprensiones y razonamiento transaccional. Cada etapa incluye un ejemplo ejecutable, razonamiento detallado, errores habituales, una respuesta completa de referencia, explicaciones de Python y una traza interactiva.',
    topic: 'Planificación de inferencia LLM y Python',
    category: 'Infraestructura de IA',
    tags: ['Python', 'Inferencia LLM', 'Planificación', 'Caché KV', 'Diseño de sistemas', 'Entrevista'],
    keywords: ['python', 'llm inference', 'scheduler', 'prefill', 'decode', 'kv cache', 'preemption', 'priority queue', 'deterministic planning'],
  },
};

/** 每题考察的技能（与知识图谱 `skills.slug` 通用；新增技能的种子见 migration 0034）。 */
const aiEngineeringQuestionSkills: Record<string, string[]> = {
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

const inferenceEngineQuestionSkills: Record<string, string[]> = {
  '1-1': ['python-data-structures', 'scheduling-queues', 'deterministic-systems'],
  '2-1': ['python-data-structures', 'stream-processing', 'scheduling-queues'],
  '3-1': ['kv-cache-management', 'algorithm-complexity', 'scheduling-queues'],
  '4-1': ['preemption-policies', 'state-machine-design', 'python-data-structures'],
  '5-1': ['priority-scheduling', 'transactional-systems', 'deterministic-systems'],
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
  'deterministic-systems': { 'zh-CN': '确定性系统与不变量', 'zh-TW': '確定性系統與不變量', en: 'Deterministic systems and invariants', fr: 'Systèmes déterministes et invariants', es: 'Sistemas deterministas e invariantes' },
  'kv-cache-management': { 'zh-CN': 'KV Cache 容量管理', 'zh-TW': 'KV Cache 容量管理', en: 'KV-cache capacity management', fr: 'Gestion de capacité du cache KV', es: 'Gestión de capacidad de caché KV' },
  'preemption-policies': { 'zh-CN': '抢占与恢复策略', 'zh-TW': '搶佔與恢復策略', en: 'Preemption and recovery policies', fr: 'Politiques de préemption et de reprise', es: 'Políticas de desalojo y recuperación' },
  'priority-scheduling': { 'zh-CN': '优先级调度', 'zh-TW': '優先級排程', en: 'Priority scheduling', fr: 'Ordonnancement prioritaire', es: 'Planificación por prioridad' },
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

function parseQuestion(
  block: { heading: string; body: string },
  level: number,
  index: number,
  questionSkills: Record<string, string[]>,
): InterviewQuestion | null {
  const titleMatch = block.heading.match(/^Question\s+(\d+)\s*[—–-]\s*(.+)$/i);
  const number = titleMatch ? Number(titleMatch[1]) : index;
  const title = titleMatch?.[2]?.trim() || block.heading.replace(/^Question\s+\d+\s*[—–-]\s*/, '');
  const focus = block.body.match(/^\*\*[^*]+\*\*\s*:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const sections = splitH3(block.body.replace(/^\*\*[^*]+\*\*\s*:\s*.+$/m, ''));
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

function parseLevel(raw: string, number: number, questionSkills: Record<string, string[]>): InterviewLevel {
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `Level ${number}`;
  const blocks = splitH2(raw);
  const overviewBlock = blocks[0]?.body ?? '';
  const timeBudget = overviewBlock.match(/^\*\*[^*]+\*\*\s*:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const overview = overviewBlock
    .replace(/^\*\*[^*]+\*\*\s*:\s*.+$/gm, '')
    .trim();
  const assesses = (blocks[1]?.body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim());
  const questions = blocks
    .slice(3)
    .map((block, index) => parseQuestion(block, number, index + 1, questionSkills))
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

function modulesForLocale(modules: Record<string, string>, locale: AppLocale) {
  const marker = `/locales/${locale}/Level-`;
  return Object.entries(modules).filter(([path]) => path.includes(marker));
}

type SetDefinition = {
  id: string;
  copy: Record<AppLocale, SetCopy>;
  modules: Record<string, string>;
  levelNumbers: number[];
  questionSkills: Record<string, string[]>;
  coverLight: string;
  coverDark?: string;
};

const setDefinitions: SetDefinition[] = [
  {
    id: AI_ENGINEERING_INTERVIEW_SET_ID,
    copy: aiEngineeringSetCopy,
    modules: aiEngineeringLevelModules,
    levelNumbers: [1, 2, 3, 4, 5, 6],
    questionSkills: aiEngineeringQuestionSkills,
    coverLight: 'ai-engineering-progressive-assessment-cover',
  },
  {
    id: INFERENCE_ENGINE_INTERVIEW_SET_ID,
    copy: inferenceEngineSetCopy,
    modules: inferenceEngineLevelModules,
    levelNumbers: [1, 2, 3, 4, 5],
    questionSkills: inferenceEngineQuestionSkills,
    coverLight: 'inference-engine-scheduler-cover-light',
    coverDark: 'inference-engine-scheduler-cover-dark',
  },
];

const setCache = new Map<AppLocale, InterviewSet[]>();

export function getInterviewSets(locale: AppLocale = 'zh-CN'): InterviewSet[] {
  const cached = setCache.get(locale);
  if (cached) return cached;

  const sets = setDefinitions.map((definition): InterviewSet => {
    const copy = definition.copy[locale] ?? definition.copy.en;
    const entries = modulesForLocale(definition.modules, locale);
    const fallbackEntries = locale === 'en' ? [] : modulesForLocale(definition.modules, 'en');
    const levels = definition.levelNumbers.map((number) => {
      const raw =
        entries.find(([path]) => path.includes(`/Level-${number}-Practice-Problems.md`))?.[1] ??
        fallbackEntries.find(([path]) => path.includes(`/Level-${number}-Practice-Problems.md`))?.[1] ??
        '';
      return raw
        ? parseLevel(raw, number, definition.questionSkills)
        : { id: String(number), number, title: `Level ${number}`, overview: '', timeBudget: '', assesses: [], glance: '', questions: [] };
    });
    const skills = [...new Set(['python-production-engineering', ...Object.values(definition.questionSkills).flat()])];
    return {
      id: definition.id,
      ...copy,
      skills,
      coverUrl: interviewCover(definition.coverLight),
      coverUrlDark: definition.coverDark ? interviewCover(definition.coverDark) : undefined,
      levelCount: levels.length,
      questionCount: levels.reduce((total, level) => total + level.questions.length, 0),
      levels,
    };
  });
  setCache.set(locale, sets);
  return sets;
}

export function getInterviewSet(setId = INTERVIEW_SET_ID, locale: AppLocale = 'zh-CN') {
  return findInterviewSet(setId, locale) ?? getInterviewSets(locale)[0];
}

export function findInterviewSet(setId = INTERVIEW_SET_ID, locale: AppLocale = 'zh-CN') {
  return getInterviewSets(locale).find((set) => set.id === setId);
}

export function getInterviewLevel(set: InterviewSet, levelId?: string) {
  return findInterviewLevel(set, levelId) ?? set.levels[0];
}

export function findInterviewLevel(set: InterviewSet, levelId?: string) {
  if (!levelId) return undefined;
  return set.levels.find((level) => level.id === levelId || String(level.number) === levelId);
}

export function getInterviewQuestion(level: InterviewLevel, questionId?: string) {
  return findInterviewQuestion(level, questionId);
}

export function findInterviewQuestion(level: InterviewLevel, questionId?: string) {
  if (!questionId || !level.questions.length) return undefined;
  return level.questions.find(
    (question) => question.id === questionId || String(question.number) === questionId,
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
