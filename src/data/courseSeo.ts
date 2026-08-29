import type { PublicLocale } from '../lib/localeRoutes';

export type CourseSeoCopy = {
  title: string;
  subtitle: string;
  description: string;
  topic: string;
  keywords: string[];
};

type LocalizedCourseSeo = Record<PublicLocale, CourseSeoCopy>;

const course = (
  title: string,
  subtitle: string,
  description: string,
  topic: string,
  keywords: string[],
): CourseSeoCopy => ({ title, subtitle, description, topic, keywords });

/**
 * This is deliberately compact, route-safe SEO copy. It is independent of
 * Vite's Markdown glob imports so the Worker can use it for canonical URLs,
 * document metadata and structured data without loading course bodies.
 */
export const COURSE_SEO: Record<string, LocalizedCourseSeo> = {
  'claude-code-guide': {
    'zh-CN': course('Claude Code 实战指南', '把 AI 变成你的工程搭档', '从安装、仓库理解到 Agentic Loop、权限、安全、MCP 与自动化工作流的章节式实战课程。', 'Claude Code', ['Claude Code 教程', 'Claude Code 实战', 'AI 编程', 'MCP', 'AI Agent']),
    'zh-TW': course('Claude Code 實戰指南', '讓 AI 成為你的工程搭檔', '從安裝、理解程式碼庫到 Agentic Loop、權限、安全、MCP 與自動化工作流程的章節式實作課程。', 'Claude Code', ['Claude Code 教學', 'Claude Code 實作', 'AI 程式設計', 'MCP', 'AI Agent']),
    en: course('Claude Code: Practical Guide', 'Make AI your engineering partner', 'A hands-on path from setup and repository understanding to Agentic Loop, permissions, safety, MCP, and automated workflows.', 'Claude Code', ['Claude Code tutorial', 'Claude Code course', 'AI coding', 'MCP', 'AI agents']),
    fr: course('Guide pratique de Claude Code', 'Faites de l’IA votre partenaire d’ingénierie', 'De l’installation et la compréhension d’un dépôt à Agentic Loop, aux autorisations, à la sécurité, MCP et aux flux automatisés.', 'Claude Code', ['tutoriel Claude Code', 'cours Claude Code', 'programmation IA', 'MCP', 'agents IA']),
    es: course('Guía práctica de Claude Code', 'Convierte la IA en tu compañera de ingeniería', 'Desde la instalación y el entendimiento del repositorio hasta Agentic Loop, permisos, seguridad, MCP y flujos automatizados.', 'Claude Code', ['tutorial de Claude Code', 'curso Claude Code', 'programación con IA', 'MCP', 'agentes de IA']),
  },
  'hermes-agent-guide': {
    'zh-CN': course('Hermes Agent 入门实战指南', '理论知识讲解 + 实战技能应用', '从常驻代理心智模型、安装配置到 Tools、Memory、Skills、MCP、Gateway、Cron 与 VPS 部署。', 'Hermes Agent', ['Hermes Agent 教程', 'AI Agent', 'MCP', 'Skills', 'VPS 部署']),
    'zh-TW': course('Hermes Agent 入門實戰指南', '理論講解與實作技能並重', '從常駐代理程式的心智模型、安裝設定到 Tools、Memory、Skills、MCP、Gateway、Cron 與 VPS 部署。', 'Hermes Agent', ['Hermes Agent 教學', 'AI Agent', 'MCP', 'Skills', 'VPS 部署']),
    en: course('Hermes Agent: Practical Foundations', 'Concepts with hands-on skills', 'From the resident-agent mental model and setup through Tools, Memory, Skills, MCP, Gateway, Cron, and VPS deployment.', 'Hermes Agent', ['Hermes Agent tutorial', 'AI agent course', 'MCP', 'agent skills', 'VPS deployment']),
    fr: course('Fondamentaux pratiques de Hermes Agent', 'Théorie et compétences appliquées', 'Du modèle mental d’agent résident à Tools, Memory, Skills, MCP, Gateway, Cron et au déploiement VPS.', 'Hermes Agent', ['tutoriel Hermes Agent', 'cours agent IA', 'MCP', 'compétences agent', 'déploiement VPS']),
    es: course('Fundamentos prácticos de Hermes Agent', 'Conceptos y habilidades aplicadas', 'Desde el modelo mental del agente residente hasta Tools, Memory, Skills, MCP, Gateway, Cron y despliegue VPS.', 'Hermes Agent', ['tutorial Hermes Agent', 'curso de agentes de IA', 'MCP', 'habilidades de agentes', 'despliegue VPS']),
  },
  'codex-tutorial': {
    'zh-CN': course('OpenAI Codex 实战教程', '从本地编码到 AI 原生工程团队', '覆盖安装、CLI、IDE、App、Cloud Tasks、AGENTS.md、权限安全、MCP、Skills、Automations 与团队治理。', 'OpenAI Codex', ['OpenAI Codex 教程', 'Codex 实战', 'AI 编程', 'AGENTS.md', 'MCP']),
    'zh-TW': course('OpenAI Codex 實戰教學', '從本機撰寫程式到 AI 原生工程團隊', '涵蓋安裝、CLI、IDE、App、Cloud Tasks、AGENTS.md、權限安全、MCP、Skills、Automations 與團隊治理。', 'OpenAI Codex', ['OpenAI Codex 教學', 'Codex 實作', 'AI 程式設計', 'AGENTS.md', 'MCP']),
    en: course('OpenAI Codex: Practical Course', 'From local coding to an AI-native engineering team', 'Covers setup, CLI, IDE, App, Cloud Tasks, AGENTS.md, permissions, MCP, Skills, Automations, and team governance.', 'OpenAI Codex', ['OpenAI Codex tutorial', 'Codex course', 'AI coding', 'AGENTS.md', 'MCP']),
    fr: course('Tutoriel pratique OpenAI Codex', 'Du codage local à une équipe d’ingénierie native IA', 'Installation, CLI, IDE, App, Cloud Tasks, AGENTS.md, autorisations, MCP, Skills, Automations et gouvernance d’équipe.', 'OpenAI Codex', ['tutoriel OpenAI Codex', 'cours Codex', 'programmation IA', 'AGENTS.md', 'MCP']),
    es: course('Curso práctico de OpenAI Codex', 'Del código local a un equipo de ingeniería nativo de IA', 'Instalación, CLI, IDE, App, Cloud Tasks, AGENTS.md, permisos, MCP, Skills, Automations y gestión de equipos.', 'OpenAI Codex', ['tutorial de OpenAI Codex', 'curso Codex', 'programación con IA', 'AGENTS.md', 'MCP']),
  },
  'forward-deployed-engineering': {
    'zh-CN': course('FDE 前线交付工程师：从模糊需求到生产系统', '连接客户现场、生产代码与业务结果', '12 章、61 节完整 FDE 实战课，覆盖 Discovery、Scope、POC、Pilot、生产运维、Handoff、面试和三项行业项目。', 'FDE 工程师', ['FDE 工程师', '前线交付工程师', 'AI 工程师课程', 'POC', '生产 AI 系统']),
    'zh-TW': course('FDE 前線部署工程師實戰：從現場問題到可營運系統', '連接客戶現場、生產程式與業務成果', '以臺灣半導體、精密製造、港口物流與醫療情境，完成 Discovery、POC、Pilot、營運與 Handoff。', 'FDE 工程師', ['FDE 工程師', '前線部署工程師', 'AI 工程師課程', 'POC', '生產 AI 系統']),
    en: course('Forward Deployed Engineer (FDE): From Customer Ambiguity to Production AI', 'From customer ambiguity to production AI', 'A 12-chapter, 61-lesson field course spanning discovery, scope, POC, pilot, production operations, handoff, interviews, and three industry projects.', 'Forward Deployed Engineer', ['forward deployed engineer', 'FDE course', 'AI engineering', 'production AI', 'technical discovery']),
    fr: course('FDE — Ingénierie IA sur le terrain : du besoin flou à la production', 'Le métier de Forward Deployed Engineer entre client, code et exploitation', 'Douze chapitres et 61 leçons situés dans l’aéronautique, la banque, la logistique, l’industrie et la santé.', 'Forward Deployed Engineer', ['forward deployed engineer', 'cours FDE', 'ingénierie IA', 'IA en production', 'découverte technique']),
    es: course('FDE — Ingeniería de IA en campo: del problema ambiguo a producción', 'La práctica FDE entre clientes, código y operaciones', 'Doce capítulos y 61 lecciones con casos de logística, renovables, industria, banca y salud.', 'Forward Deployed Engineer', ['forward deployed engineer', 'curso FDE', 'ingeniería de IA', 'IA en producción', 'descubrimiento técnico']),
  },
  'ai-learning-orientation': {
    'zh-CN': course('AI 学习入门与能力定位', '从一次惊喜，走到可复现的工作能力', '用能力基线、最小实验、证据记录和岗位场景，建立可持续的 AI 学习方法。', 'AI 入门', ['AI 学习入门', '人工智能学习路线', 'AI 能力定位', 'AI 学习方法']),
    'zh-TW': course('AI 學習入門與能力定位', '從一次驚喜，走到可重現的工作能力', '透過能力基線、最小實驗、證據紀錄與職場情境，建立可持續的人工智慧學習方法。', 'AI 入門', ['AI 學習入門', '人工智慧學習路線', 'AI 能力定位', 'AI 學習方法']),
    en: course('AI Learning Foundations and Capability Planning', 'Turn early curiosity into repeatable work capability', 'Build a sustainable AI learning practice with a capability baseline, small experiments, evidence records, and job scenarios.', 'AI foundations', ['AI learning for beginners', 'AI learning path', 'AI skills assessment', 'AI learning method']),
    fr: course('Fondamentaux de l’apprentissage de l’IA et positionnement', 'Transformer la curiosité en compétences de travail réutilisables', 'Construisez une pratique d’apprentissage durable avec un bilan de compétences, de petites expériences, des preuves et des situations de travail.', 'Fondamentaux de l’IA', ['apprendre l’IA débutant', 'parcours IA', 'compétences IA', 'méthode d’apprentissage IA']),
    es: course('Fundamentos de aprendizaje de IA y orientación de capacidades', 'Convierte la curiosidad en capacidades de trabajo repetibles', 'Crea una práctica sostenible con una línea base de capacidades, pequeños experimentos, registro de evidencias y situaciones laborales.', 'Fundamentos de IA', ['aprender IA para principiantes', 'ruta de aprendizaje IA', 'habilidades de IA', 'método de aprendizaje IA']),
  },
  'llm-core-principles': {
    'zh-CN': course('大模型核心原理', '从训练数据、Token 到注意力与技术选型', '用产品和工程决策需要的深度理解大模型，不背术语也能定位问题。', '大模型基础', ['大模型原理', 'LLM 入门', 'Token', 'Transformer', '模型选型']),
    'zh-TW': course('大型語言模型核心原理', '從訓練資料、Token 到注意力與技術選型', '以產品與工程決策所需的深度理解大型語言模型，不必死背術語也能定位問題。', '大型語言模型基礎', ['大型語言模型原理', 'LLM 入門', 'Token', 'Transformer', '模型選型']),
    en: course('Core Principles of Large Language Models', 'From training data and tokens to attention and model selection', 'Understand LLMs deeply enough for product and engineering decisions without memorising jargon.', 'LLM foundations', ['large language model fundamentals', 'LLM course', 'tokens', 'transformers', 'model selection']),
    fr: course('Principes fondamentaux des grands modèles de langage', 'Des données d’entraînement et tokens à l’attention et au choix du modèle', 'Comprenez les LLM avec la profondeur utile aux décisions produit et techniques, sans réciter du jargon.', 'Fondamentaux des LLM', ['fondamentaux grands modèles de langage', 'cours LLM', 'tokens', 'transformers', 'choix de modèle']),
    es: course('Principios fundamentales de los modelos de lenguaje grandes', 'De datos de entrenamiento y tokens a atención y selección de modelos', 'Comprende los LLM con la profundidad necesaria para decisiones de producto e ingeniería, sin memorizar jerga.', 'Fundamentos de los LLM', ['fundamentos de modelos de lenguaje', 'curso LLM', 'tokens', 'transformers', 'selección de modelos']),
  },
  'agent-engineering': {
    'zh-CN': course('Agent 工程实战', '让 AI 从会说走向会做', '系统掌握 Agent 的目标、工具、状态、记忆、控制、观测与多 Agent 协作。', 'Agent 工程', ['Agent 工程', 'AI Agent', '多 Agent', '工具调用', 'MCP']),
    'zh-TW': course('Agent 工程實戰', '讓 AI 從會說走向會做', '系統掌握 Agent 的目標、工具、狀態、記憶、控制、可觀測性與多 Agent 協作。', 'Agent 工程', ['Agent 工程', 'AI Agent', '多 Agent', '工具呼叫', 'MCP']),
    en: course('Practical Agent Engineering', 'Move AI from talking to doing', 'Learn the goals, tools, state, memory, control, observability, and collaboration patterns behind production AI agents.', 'Agent engineering', ['agent engineering', 'AI agents', 'multi-agent systems', 'tool calling', 'MCP']),
    fr: course('Ingénierie pratique des agents', 'Faire passer l’IA de la parole à l’action', 'Maîtrisez objectifs, outils, état, mémoire, contrôle, observabilité et collaboration multi-agents.', 'Ingénierie des agents', ['ingénierie des agents', 'agents IA', 'systèmes multi-agents', 'appel d’outils', 'MCP']),
    es: course('Ingeniería práctica de agentes', 'Haz que la IA pase de hablar a actuar', 'Domina objetivos, herramientas, estado, memoria, control, observabilidad y colaboración de múltiples agentes.', 'Ingeniería de agentes', ['ingeniería de agentes', 'agentes de IA', 'sistemas multiagente', 'llamada a herramientas', 'MCP']),
  },
  'hallucination-mitigation': {
    'zh-CN': course('AI 幻觉分析与治理', '让流畅回答接受事实约束', '通过证据格式、RAG、采样控制、评测和人工审核建立组合防线。', 'AI 可靠性', ['AI 幻觉', '大模型幻觉', 'RAG', '模型评测', 'AI 治理']),
    'zh-TW': course('AI 幻覺分析與治理', '讓流暢回答接受事實約束', '透過證據格式、RAG、取樣控制、評測與人工審核建立組合防線。', 'AI 可靠性', ['AI 幻覺', '大型語言模型幻覺', 'RAG', '模型評測', 'AI 治理']),
    en: course('AI Hallucination Analysis and Governance', 'Make fluent answers answer to evidence', 'Build layered defences using evidence formats, RAG, sampling controls, evaluation, and human review.', 'AI reliability', ['AI hallucinations', 'LLM hallucinations', 'RAG', 'model evaluation', 'AI governance']),
    fr: course('Analyse et gouvernance des hallucinations de l’IA', 'Soumettre les réponses fluides aux faits', 'Construisez une défense combinée avec formats de preuve, RAG, contrôle d’échantillonnage, évaluation et revue humaine.', 'Fiabilité de l’IA', ['hallucinations IA', 'hallucinations LLM', 'RAG', 'évaluation de modèles', 'gouvernance IA']),
    es: course('Análisis y gestión de las alucinaciones de IA', 'Haz que las respuestas fluidas respondan a los hechos', 'Crea defensas combinadas con formatos de evidencia, RAG, control de muestreo, evaluación y revisión humana.', 'Fiabilidad de IA', ['alucinaciones de IA', 'alucinaciones LLM', 'RAG', 'evaluación de modelos', 'gobernanza de IA']),
  },
  'ai-literacy-and-boundaries': {
    'zh-CN': course('AI 素养：能力、边界与正确期待', '知道什么时候用、什么时候不用', '面向零基础学习者建立准确的 AI 心智模型和任务分流能力。', 'AI 入门', ['AI 素养', '人工智能入门', 'AI 能力边界', 'AI 使用场景']),
    'zh-TW': course('AI 素養：能力、界線與正確期待', '知道何時該用、何時不該用', '為零基礎學習者建立準確的人工智慧心智模型與任務分流能力。', 'AI 入門', ['AI 素養', '人工智慧入門', 'AI 能力界線', 'AI 使用情境']),
    en: course('AI Literacy: Capabilities, Boundaries, and Expectations', 'Know when to use AI and when not to', 'Build an accurate mental model of AI and learn to route tasks wisely as a beginner.', 'AI foundations', ['AI literacy', 'AI for beginners', 'AI limitations', 'AI use cases']),
    fr: course('Culture IA : capacités, limites et attentes justes', 'Savoir quand utiliser l’IA et quand s’en passer', 'Construisez un modèle mental précis de l’IA et apprenez à orienter les tâches en débutant.', 'Fondamentaux de l’IA', ['culture IA', 'IA débutant', 'limites de l’IA', 'cas d’usage IA']),
    es: course('Alfabetización en IA: capacidades, límites y expectativas', 'Sabe cuándo usar IA y cuándo no', 'Construye un modelo mental preciso de la IA y aprende a asignar tareas con criterio.', 'Fundamentos de IA', ['alfabetización en IA', 'IA para principiantes', 'límites de la IA', 'casos de uso de IA']),
  },
  'chat-completion-systems': {
    'zh-CN': course('从补全到对话系统', '聊天界面背后的消息机器', '拆解 Chat API、消息模板、上下文窗口和产品状态，设计可靠对话体验。', '大模型基础', ['Chat API', '对话系统', '上下文窗口', '消息模板', 'LLM 产品']),
    'zh-TW': course('從補全到對話系統', '聊天介面背後的訊息機器', '拆解 Chat API、訊息範本、上下文視窗與產品狀態，設計可靠的對話體驗。', '大型語言模型基礎', ['Chat API', '對話系統', '上下文視窗', '訊息範本', 'LLM 產品']),
    en: course('From Completion to Conversational Systems', 'The message machine behind a chat interface', 'Break down Chat APIs, message templates, context windows, and product state to design reliable conversations.', 'LLM foundations', ['Chat API', 'conversational systems', 'context window', 'message templates', 'LLM product']),
    fr: course('De la complétion aux systèmes conversationnels', 'La machine à messages derrière une interface de chat', 'Décomposez les API de chat, modèles de messages, fenêtres de contexte et états produit pour concevoir des conversations fiables.', 'Fondamentaux des LLM', ['API de chat', 'systèmes conversationnels', 'fenêtre de contexte', 'modèles de messages', 'produit LLM']),
    es: course('De la finalización a los sistemas conversacionales', 'La máquina de mensajes detrás de una interfaz de chat', 'Desglosa API de chat, plantillas de mensajes, ventanas de contexto y estado de producto para diseñar conversaciones fiables.', 'Fundamentos de los LLM', ['API de chat', 'sistemas conversacionales', 'ventana de contexto', 'plantillas de mensajes', 'producto LLM']),
  },
  'ai-beginner-question-map': {
    'zh-CN': course('AI 小白问题地图', '用高频问题建立完整认知', '围绕 Prompt、模型、Agent、多模态、API 和账号安全建立选型与使用地图。', 'AI 入门', ['AI 新手', 'AI 入门问题', 'Prompt', 'AI Agent', '大模型 API']),
    'zh-TW': course('AI 新手問題地圖', '以高頻問題建立完整認知', '圍繞 Prompt、模型、Agent、多模態、API 與帳號安全建立選型與使用地圖。', 'AI 入門', ['AI 新手', 'AI 入門問題', 'Prompt', 'AI Agent', '大型語言模型 API']),
    en: course('AI Beginner Question Map', 'Build a complete mental model from common questions', 'Use high-frequency questions about prompts, models, agents, multimodality, APIs, and account safety to make better choices.', 'AI foundations', ['AI beginner questions', 'AI basics', 'prompts', 'AI agents', 'LLM API']),
    fr: course('Carte des questions pour débuter avec l’IA', 'Construire une compréhension complète à partir des questions fréquentes', 'Utilisez les questions sur prompts, modèles, agents, multimodalité, API et sécurité de compte pour faire de meilleurs choix.', 'Fondamentaux de l’IA', ['questions IA débutant', 'bases de l’IA', 'prompts', 'agents IA', 'API LLM']),
    es: course('Mapa de preguntas para principiantes de IA', 'Construye una visión completa a partir de preguntas frecuentes', 'Usa preguntas sobre prompts, modelos, agentes, multimodalidad, API y seguridad de cuentas para elegir mejor.', 'Fundamentos de IA', ['preguntas de IA para principiantes', 'bases de IA', 'prompts', 'agentes de IA', 'API LLM']),
  },
  'prompt-engineering-production': {
    'zh-CN': course('生产级 Prompt 工程', '把自然语言写成可维护接口', '掌握结构、角色、示例、Schema、流式输出、评测与版本生命周期。', 'Prompt 与上下文', ['Prompt 工程', '提示词工程', '结构化输出', 'Few-shot', 'Prompt 评测']),
    'zh-TW': course('生產級 Prompt 工程', '把自然語言寫成可維護的介面', '掌握結構、角色、範例、Schema、串流輸出、評測與版本生命週期。', 'Prompt 與上下文', ['Prompt 工程', '提示詞工程', '結構化輸出', 'Few-shot', 'Prompt 評測']),
    en: course('Production Prompt Engineering', 'Turn natural language into a maintainable interface', 'Master structure, roles, examples, schemas, streaming output, evaluation, and version lifecycles.', 'Prompting and context', ['prompt engineering', 'structured output', 'few-shot prompting', 'prompt evaluation', 'LLM production']),
    fr: course('Ingénierie de prompts pour la production', 'Transformer le langage naturel en interface maintenable', 'Maîtrisez structure, rôles, exemples, schémas, sortie en flux, évaluation et cycle de versions.', 'Prompts et contexte', ['ingénierie de prompts', 'sortie structurée', 'few-shot prompting', 'évaluation de prompts', 'LLM en production']),
    es: course('Ingeniería de prompts para producción', 'Convierte lenguaje natural en una interfaz mantenible', 'Domina estructura, roles, ejemplos, esquemas, salida en streaming, evaluación y ciclo de versiones.', 'Prompts y contexto', ['ingeniería de prompts', 'salida estructurada', 'few-shot prompting', 'evaluación de prompts', 'LLM en producción']),
  },
  'llm-cost-model-selection': {
    'zh-CN': course('大模型成本优化与选型', '算清每一次智能的单位经济', '从多轮 Token、缓存、图片成本到模型路由，建立可解释的成本质量决策。', 'AI 工程管理', ['LLM 成本优化', '大模型选型', 'Token 成本', '模型路由', 'AI 单位经济']),
    'zh-TW': course('大型語言模型成本最佳化與選型', '算清每一次智慧的單位經濟', '從多輪 Token、快取、圖像成本到模型路由，建立可解釋的成本與品質決策。', 'AI 工程管理', ['LLM 成本最佳化', '大型語言模型選型', 'Token 成本', '模型路由', 'AI 單位經濟']),
    en: course('LLM Cost Optimisation and Model Selection', 'Understand the unit economics of every AI interaction', 'Make explainable cost and quality decisions across multi-turn tokens, caching, image cost, and model routing.', 'AI engineering management', ['LLM cost optimization', 'model selection', 'token cost', 'model routing', 'AI unit economics']),
    fr: course('Optimisation des coûts et choix des modèles LLM', 'Comprendre l’économie unitaire de chaque interaction IA', 'Prenez des décisions explicables de coût et qualité sur tokens, cache, coût image et routage de modèles.', 'Gestion de l’ingénierie IA', ['optimisation coût LLM', 'choix de modèle', 'coût des tokens', 'routage de modèles', 'économie unitaire IA']),
    es: course('Optimización de costes y selección de modelos LLM', 'Comprende la economía unitaria de cada interacción de IA', 'Toma decisiones explicables de coste y calidad sobre tokens, caché, coste de imagen y enrutamiento de modelos.', 'Gestión de ingeniería IA', ['optimización de costes LLM', 'selección de modelos', 'coste de tokens', 'enrutamiento de modelos', 'economía unitaria de IA']),
  },
  'context-engineering': {
    'zh-CN': course('上下文工程实战', '给模型一张干净、可信、够用的工作台', '管理指令、事实、状态、工具结果和长期记忆的完整生命周期。', 'Prompt 与上下文', ['上下文工程', 'Context Engineering', 'RAG', '上下文压缩', '长期记忆']),
    'zh-TW': course('上下文工程實戰', '給模型一張乾淨、可信、夠用的工作臺', '管理指令、事實、狀態、工具結果與長期記憶的完整生命週期。', 'Prompt 與上下文', ['上下文工程', 'Context Engineering', 'RAG', '上下文壓縮', '長期記憶']),
    en: course('Practical Context Engineering', 'Give a model a clean, trustworthy, sufficient workspace', 'Manage the full lifecycle of instructions, facts, state, tool results, and long-term memory.', 'Prompting and context', ['context engineering', 'RAG', 'context compression', 'long-term memory', 'LLM context']),
    fr: course('Ingénierie du contexte en pratique', 'Donner au modèle un espace de travail propre, fiable et suffisant', 'Gérez le cycle de vie des instructions, faits, état, résultats d’outils et mémoire longue durée.', 'Prompts et contexte', ['ingénierie du contexte', 'RAG', 'compression du contexte', 'mémoire longue durée', 'contexte LLM']),
    es: course('Ingeniería de contexto práctica', 'Da al modelo un espacio de trabajo limpio, fiable y suficiente', 'Gestiona el ciclo completo de instrucciones, hechos, estado, resultados de herramientas y memoria a largo plazo.', 'Prompts y contexto', ['ingeniería de contexto', 'RAG', 'compresión de contexto', 'memoria a largo plazo', 'contexto LLM']),
  },
  'prompt-security': {
    'zh-CN': course('Prompt 安全与注入防御', '把不可信内容关在权限边界之外', '从攻击面、指令隔离、最小权限到红队评测，构建可上线的安全体系。', 'AI 安全', ['Prompt 安全', '提示词注入', 'Prompt Injection', 'AI 安全', '红队评测']),
    'zh-TW': course('Prompt 安全與注入防禦', '把不可信內容關在權限界線之外', '從攻擊面、指令隔離、最小權限到紅隊評測，建立可上線的安全體系。', 'AI 安全', ['Prompt 安全', '提示詞注入', 'Prompt Injection', 'AI 安全', '紅隊評測']),
    en: course('Prompt Security and Injection Defence', 'Keep untrusted content outside permission boundaries', 'Build production-ready defences from attack surface analysis and instruction isolation to least privilege and red-team evaluation.', 'AI safety', ['prompt security', 'prompt injection', 'AI security', 'least privilege', 'red-team evaluation']),
    fr: course('Sécurité des prompts et défense contre les injections', 'Garder le contenu non fiable hors des limites d’autorisation', 'Construisez une défense prête pour la production, de l’analyse de surface d’attaque à l’isolation des instructions et aux tests red-team.', 'Sécurité de l’IA', ['sécurité des prompts', 'injection de prompt', 'sécurité IA', 'moindre privilège', 'évaluation red team']),
    es: course('Seguridad de prompts y defensa ante inyecciones', 'Mantén contenido no fiable fuera de los límites de permisos', 'Crea defensas listas para producción desde el análisis de superficie de ataque y aislamiento de instrucciones hasta mínimo privilegio y red teaming.', 'Seguridad de IA', ['seguridad de prompts', 'inyección de prompts', 'seguridad de IA', 'mínimo privilegio', 'evaluación red team']),
  },
  'ai-image-production': {
    'zh-CN': course('AI 图像生成与产品化', '从一张好看图片到可靠视觉工作流', '覆盖视觉 Prompt、参考图、一致性、分镜、成本、版权和生产验收。', '生成式媒体', ['AI 图像生成', '文生图', '视觉 Prompt', '图像工作流', '生成式媒体']),
    'zh-TW': course('AI 圖像生成與產品化', '從一張好看圖片到可靠視覺工作流程', '涵蓋視覺 Prompt、參考圖、一致性、分鏡、成本、版權與生產驗收。', '生成式媒體', ['AI 圖像生成', '文字生成圖像', '視覺 Prompt', '圖像工作流程', '生成式媒體']),
    en: course('AI Image Generation and Productisation', 'From an attractive image to a reliable visual workflow', 'Cover visual prompts, reference images, consistency, storyboards, cost, copyright, and production acceptance.', 'Generative media', ['AI image generation', 'text to image', 'visual prompting', 'image workflow', 'generative media']),
    fr: course('Génération d’images par IA et mise en production', 'D’une belle image à un flux visuel fiable', 'Couvrez prompts visuels, images de référence, cohérence, storyboard, coût, droits et validation de production.', 'Médias génératifs', ['génération d’images IA', 'texte vers image', 'prompt visuel', 'flux image', 'médias génératifs']),
    es: course('Generación de imágenes con IA y producción', 'De una imagen atractiva a un flujo visual fiable', 'Cubre prompts visuales, imágenes de referencia, consistencia, guion gráfico, costes, derechos y validación de producción.', 'Medios generativos', ['generación de imágenes IA', 'texto a imagen', 'prompt visual', 'flujo de imágenes', 'medios generativos']),
  },
  'communicating-with-ai': {
    'zh-CN': course('高效与 AI 沟通', '像给一位不了解背景的新同事交代任务', '通过澄清、材料边界、结果倒推和反馈迭代，让日常 AI 协作更稳定。', 'AI 入门', ['与 AI 沟通', 'AI 协作', '提示词', '需求澄清', '反馈迭代']),
    'zh-TW': course('高效與 AI 溝通', '像向一位不了解背景的新同事交代任務', '透過澄清、資料界線、結果倒推與回饋迭代，讓日常 AI 協作更穩定。', 'AI 入門', ['與 AI 溝通', 'AI 協作', '提示詞', '需求澄清', '回饋迭代']),
    en: course('Communicating Effectively with AI', 'Brief AI as you would a new colleague without context', 'Use clarification, material boundaries, outcome-first thinking, and feedback loops for more reliable everyday AI collaboration.', 'AI foundations', ['communicating with AI', 'AI collaboration', 'prompting', 'requirements clarification', 'feedback loops']),
    fr: course('Communiquer efficacement avec l’IA', 'Briefer l’IA comme un nouveau collègue sans contexte', 'Utilisez clarification, limites de matière, raisonnement par le résultat et boucles de retour pour collaborer avec l’IA au quotidien.', 'Fondamentaux de l’IA', ['communiquer avec IA', 'collaboration IA', 'prompts', 'clarification des besoins', 'boucles de retour']),
    es: course('Comunicación eficaz con IA', 'Da contexto a la IA como a un nuevo colega', 'Usa aclaración, límites del material, enfoque en resultados y ciclos de feedback para colaborar mejor con IA cada día.', 'Fundamentos de IA', ['comunicación con IA', 'colaboración con IA', 'prompts', 'clarificación de requisitos', 'ciclos de feedback']),
  },
  'agent-loop-control': {
    'zh-CN': course('Agent Loop 控制与恢复', '让循环前进，也让循环停下', '深入掌握循环状态、卡死模式、预算、流式事件、幂等、检查点与恢复。', 'Agent 工程', ['Agent Loop', 'Agent 控制', 'Agent 恢复', 'AI Agent', '可观测性']),
    'zh-TW': course('Agent Loop 控制與復原', '讓迴圈前進，也讓迴圈停下', '深入掌握迴圈狀態、卡死模式、預算、串流事件、冪等、檢查點與復原。', 'Agent 工程', ['Agent Loop', 'Agent 控制', 'Agent 復原', 'AI Agent', '可觀測性']),
    en: course('Agent Loop Control and Recovery', 'Help loops advance and stop safely', 'Master loop state, stuck patterns, budgets, streaming events, idempotency, checkpoints, and recovery.', 'Agent engineering', ['agent loop', 'agent control', 'agent recovery', 'AI agents', 'agent observability']),
    fr: course('Contrôle et reprise des boucles d’agents', 'Faire avancer les boucles et les arrêter en sécurité', 'Maîtrisez état de boucle, blocages, budgets, événements en flux, idempotence, points de contrôle et reprise.', 'Ingénierie des agents', ['boucle d’agent', 'contrôle des agents', 'reprise d’agent', 'agents IA', 'observabilité des agents']),
    es: course('Control y recuperación del bucle de agentes', 'Haz que los bucles avancen y se detengan con seguridad', 'Domina estado de bucle, patrones atascados, presupuestos, eventos en streaming, idempotencia, puntos de control y recuperación.', 'Ingeniería de agentes', ['bucle de agentes', 'control de agentes', 'recuperación de agentes', 'agentes de IA', 'observabilidad de agentes']),
  },
  'agent-design-patterns': {
    'zh-CN': course('Agent 设计模式与架构选型', '先选最简单的可靠结构', '系统掌握 Workflow、链式、路由、并行、编排、评估优化与多 Agent 模式。', 'Agent 工程', ['Agent 设计模式', '多 Agent 架构', '工作流编排', 'AI Agent', '架构选型']),
    'zh-TW': course('Agent 設計模式與架構選型', '先選最簡單的可靠結構', '系統掌握 Workflow、鏈式、路由、平行、編排、評估最佳化與多 Agent 模式。', 'Agent 工程', ['Agent 設計模式', '多 Agent 架構', '工作流程編排', 'AI Agent', '架構選型']),
    en: course('Agent Design Patterns and Architecture Selection', 'Choose the simplest reliable structure first', 'Learn workflow, chaining, routing, parallelism, orchestration, evaluator-optimizer, and multi-agent patterns.', 'Agent engineering', ['agent design patterns', 'multi-agent architecture', 'workflow orchestration', 'AI agents', 'architecture selection']),
    fr: course('Patrons d’agents et choix d’architecture', 'Choisir d’abord la structure fiable la plus simple', 'Maîtrisez workflow, chaînage, routage, parallélisme, orchestration, évaluation-optimisation et modèles multi-agents.', 'Ingénierie des agents', ['patrons d’agents', 'architecture multi-agents', 'orchestration de workflows', 'agents IA', 'choix d’architecture']),
    es: course('Patrones de agentes y selección de arquitectura', 'Elige primero la estructura fiable más sencilla', 'Domina flujos de trabajo, encadenamiento, enrutamiento, paralelismo, orquestación, evaluación-optimización y patrones multiagente.', 'Ingeniería de agentes', ['patrones de agentes', 'arquitectura multiagente', 'orquestación de flujos', 'agentes de IA', 'selección de arquitectura']),
  },
};

export const SITE_SEO: Record<PublicLocale, { title: string; description: string; keywords: string[]; catalogLabel: string; homeH1: string }> = {
  'zh-CN': { title: 'Study AI Now!｜AI 编程与人工智能实战课程', description: '面向实践的 AI 编程课程：Claude Code、OpenAI Codex、AI Agent、Prompt 工程、RAG、AI 安全与生产交付。', keywords: ['AI 编程课程', '人工智能课程', 'AI Agent 教程', 'Claude Code 教程', 'OpenAI Codex 教程'], catalogLabel: 'AI 课程', homeH1: '免费学习 Claude Code、Codex 与 AI Agent 工程' },
  'zh-TW': { title: 'Study AI Now!｜AI 程式設計與人工智慧實作課程', description: '以實作為核心的 AI 程式設計課程：Claude Code、OpenAI Codex、AI Agent、Prompt 工程、RAG、AI 安全與生產交付。', keywords: ['AI 程式設計課程', '人工智慧課程', 'AI Agent 教學', 'Claude Code 教學', 'OpenAI Codex 教學'], catalogLabel: 'AI 課程', homeH1: '免費學習 Claude Code、Codex 與 AI Agent 工程' },
  en: { title: 'Study AI Now! | Practical AI Engineering Courses', description: 'Practical AI engineering courses for Claude Code, OpenAI Codex, AI agents, prompt engineering, RAG, AI safety, and production delivery.', keywords: ['AI engineering courses', 'AI coding course', 'AI agent tutorial', 'Claude Code tutorial', 'OpenAI Codex course'], catalogLabel: 'AI courses', homeH1: 'Free practical courses for Claude Code, Codex, and AI agent engineering' },
  fr: { title: 'Study AI Now! | Cours pratiques d’ingénierie IA', description: 'Cours pratiques pour Claude Code, OpenAI Codex, agents IA, ingénierie de prompts, RAG, sécurité IA et livraison en production.', keywords: ['cours ingénierie IA', 'cours programmation IA', 'tutoriel agents IA', 'tutoriel Claude Code', 'cours OpenAI Codex'], catalogLabel: 'Cours IA', homeH1: 'Cours pratiques gratuits pour Claude Code, Codex et l’ingénierie des agents IA' },
  es: { title: 'Study AI Now! | Cursos prácticos de ingeniería de IA', description: 'Cursos prácticos de Claude Code, OpenAI Codex, agentes de IA, ingeniería de prompts, RAG, seguridad de IA y entrega en producción.', keywords: ['cursos de ingeniería de IA', 'curso de programación con IA', 'tutorial de agentes de IA', 'tutorial de Claude Code', 'curso OpenAI Codex'], catalogLabel: 'Cursos de IA', homeH1: 'Cursos prácticos gratuitos de Claude Code, Codex e ingeniería de agentes de IA' },
};

export function getCourseSeoCopy(courseId: string, locale: PublicLocale) {
  return COURSE_SEO[courseId]?.[locale];
}
