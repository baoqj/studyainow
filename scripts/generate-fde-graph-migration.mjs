import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const codeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputPath = resolve(codeRoot, 'migrations/0032_forward_deployed_engineering.sql');

const skills = [
  ['fde-operating-model', 'FDE 前线交付模型', 'Forward deployed operating model', '从客户问题到生产运营与产品反馈的完整交付责任', 'AI 工程与职业发展', 'intermediate'],
  ['workflow-discovery', '客户流程发现', 'Workflow discovery', '观察真实工作流、例外、基线、Owner 与决策后果', '客户工程', 'intermediate'],
  ['problem-framing', '问题定义', 'Problem framing', '把解决方案请求重写为有用户、边界和证据的可验证问题', '客户工程', 'intermediate'],
  ['customer-facing-engineering', '客户现场工程', 'Customer-facing engineering', '与客户工程和业务团队共同澄清、构建、交付并承担结果', '客户工程', 'advanced'],
  ['technical-scoping', '技术范围界定', 'Technical scoping', '定义用户、流程、数据边界、Non-goals、成功标准和变更规则', '客户工程', 'advanced'],
  ['solution-architecture', '解决方案架构', 'Solution architecture', '在业务、数据、安全、可靠性和运维约束下选择系统结构', 'AI 系统架构', 'advanced'],
  ['business-case-modeling', '商业价值建模', 'Business case modeling', '用基线、单位经济、风险和采纳证据建立投资判断', 'AI 工程管理', 'intermediate'],
  ['poc-delivery', 'POC 交付', 'POC delivery', '通过可重播 Vertical Slice 验证机制并作出停止、转向或继续决定', 'AI 工程管理', 'intermediate'],
  ['production-software-engineering', '生产级软件工程', 'Production software engineering', '编写可测试、可观测、可扩展且能处理故障的生产代码', '软件工程', 'advanced'],
  ['python-production-engineering', 'Python 生产工程', 'Production Python engineering', '使用 Python 构建、测试、观测并部署生产服务', '软件工程', 'advanced'],
  ['full-stack-engineering', '全栈工程', 'Full-stack engineering', '跨后端、API、数据与前端完成可用 Vertical Slice', '软件工程', 'intermediate'],
  ['production-readiness', '生产就绪度', 'Production readiness', '用容量、可靠性、安全、回滚、支持和 Owner 证据控制上线', 'AI 运维', 'advanced'],
  ['incident-response', '事故响应与恢复', 'Incident response and recovery', '发现、止损、回滚、复盘并验证 AI 系统事故修复', 'AI 运维', 'advanced'],
  ['private-hybrid-cloud', '私有云与混合云部署', 'Private and hybrid cloud deployment', '在私有云、混合云或本地环境规划、配置、测试和上线企业软件', '云基础设施', 'advanced'],
  ['kubernetes-helm', 'Kubernetes 与 Helm', 'Kubernetes and Helm', '运营生产 Kubernetes 集群并使用 Helm 管理可重复部署', '云基础设施', 'advanced'],
  ['devops-ci-cd', 'DevOps 与 CI/CD', 'DevOps and CI/CD', '通过版本控制、流水线、自动测试和发布控制交付软件', '云基础设施', 'intermediate'],
  ['cloud-infrastructure', '云基础设施', 'Cloud infrastructure', '设计与排查 Azure、AWS、GCP、网络和虚拟化基础设施', '云基础设施', 'advanced'],
  ['stakeholder-management', '利益相关方协作', 'Stakeholder management', '在操作员、安全、采购、管理层和工程团队之间推动证据型决定', '客户工程', 'advanced'],
  ['technical-communication', '技术沟通', 'Technical communication', '将同一技术事实转换为面向不同决策者的清晰表达', '客户工程', 'intermediate'],
  ['llm-systems-engineering', 'LLM 系统工程', 'LLM systems engineering', '组合模型、向量数据库、编排框架、评测与运维构建完整 LLM 系统', 'AI 系统架构', 'advanced'],
  ['permission-aware-retrieval', '权限感知检索', 'Permission-aware retrieval', '在内容进入模型前执行身份和 ACL 过滤并传播撤权与删除', 'AI 安全', 'advanced'],
  ['human-in-the-loop', 'Human-in-the-loop', 'Human-in-the-loop', '把人工复核、具名批准、Abstention 和升级路径嵌入高风险流程', 'AI 安全', 'advanced'],
  ['data-sovereignty-access-control', '数据主权与访问控制', 'Data sovereignty and access control', '满足数据驻留、最小权限、身份、审计与敏感环境边界', 'AI 安全', 'advanced'],
  ['handoff-enablement', '交接与赋能', 'Handoff and enablement', '通过 Runbook、Teach-back、Cold Handoff 和 Ownership Matrix 转移运营能力', 'AI 工程管理', 'intermediate'],
  ['change-management', '变更与采纳管理', 'Change and adoption management', '管理 Pilot 反馈、用户采纳、流程变化、培训和渐进式发布', 'AI 工程管理', 'intermediate'],
  ['end-to-end-delivery', '端到端交付', 'End-to-end delivery', '从概念、设计、构建、部署到运营与产品学习全程负责', 'AI 工程与职业发展', 'advanced'],
];

const aliases = {
  'fde-operating-model': [['Forward Deployed Engineer', 'en'], ['FDE', 'en'], ['前线交付工程师', 'zh'], ['前線部署工程師', 'zh-TW'], ['ingénieur IA sur le terrain', 'fr'], ['ingeniería de IA en campo', 'es']],
  'workflow-discovery': [['ambiguous business problems', 'en'], ['real-world business problems', 'en'], ['workflow discovery', 'en'], ['流程发现', 'zh'], ['流程探索', 'zh-TW'], ['découverte du workflow', 'fr'], ['descubrimiento del workflow', 'es']],
  'problem-framing': [['well-framed', 'en'], ['problem framing', 'en'], ['问题定义', 'zh'], ['問題界定', 'zh-TW'], ['cadrage du problème', 'fr'], ['definición del problema', 'es']],
  'customer-facing-engineering': [['working directly with customers', 'en'], ['work closely with our enterprise customers', 'en'], ['clients’ engineering teams', 'en'], ['customer-facing', 'en'], ['客户现场工程', 'zh'], ['客戶現場工程', 'zh-TW'], ['ingénierie client', 'fr'], ['ingeniería con clientes', 'es']],
  'technical-scoping': [['scoping and shaping use cases', 'en'], ['clear success criteria', 'en'], ['technical specs', 'en'], ['技术范围', 'zh'], ['技術範圍', 'zh-TW'], ['cadrage technique', 'fr'], ['alcance técnico', 'es']],
  'solution-architecture': [['architectural standards', 'en'], ['solution architecture', 'en'], ['deployment strategies', 'en'], ['解决方案架构', 'zh'], ['解決方案架構', 'zh-TW'], ['architecture de solution', 'fr'], ['arquitectura de solución', 'es']],
  'business-case-modeling': [['business value', 'en'], ['business case', 'en'], ['商业价值', 'zh'], ['商業價值', 'zh-TW'], ['cas d’affaires', 'fr'], ['caso de negocio', 'es']],
  'poc-delivery': [['early prototypes', 'en'], ['proof of concept', 'en'], ['POC delivery', 'en'], ['POC 交付', 'zh'], ['livraison du POC', 'fr'], ['entrega del POC', 'es']],
  'production-software-engineering': [['production-grade software', 'en'], ['clean, testable, observable, scalable code', 'en'], ['production-grade AI agents', 'en'], ['生产级软件', 'zh'], ['生產級軟體', 'zh-TW'], ['logiciel de production', 'fr'], ['software de producción', 'es']],
  'python-production-engineering': [['Python', 'en'], ['Python 生产工程', 'zh'], ['Python 生產工程', 'zh-TW'], ['Python en production', 'fr'], ['Python en producción', 'es']],
  'full-stack-engineering': [['frontend', 'en'], ['full-stack', 'en'], ['全栈工程', 'zh'], ['全端工程', 'zh-TW'], ['full-stack', 'fr'], ['full-stack', 'es']],
  'production-readiness': [['reliable, observable, safe, and auditable', 'en'], ['production readiness', 'en'], ['production-grade AI agents', 'en'], ['生产就绪', 'zh'], ['生產就緒', 'zh-TW'], ['préparation à la production', 'fr'], ['preparación para producción', 'es']],
  'incident-response': [['incident response', 'en'], ['minimize downtime', 'en'], ['troubleshoot and resolve', 'en'], ['事故响应', 'zh'], ['事故回應', 'zh-TW'], ['réponse aux incidents', 'fr'], ['respuesta a incidentes', 'es']],
  'private-hybrid-cloud': [['private/hybrid cloud environments', 'en'], ['private cloud', 'en'], ['hybrid cloud', 'en'], ['on-premises environments', 'en'], ['私有云', 'zh'], ['混合云', 'zh'], ['私有雲', 'zh-TW'], ['cloud privé', 'fr'], ['nube privada', 'es']],
  'kubernetes-helm': [['Kubernetes clusters', 'en'], ['Kubernetes', 'en'], ['Helm', 'en'], ['Kubernetes 集群', 'zh'], ['Kubernetes 叢集', 'zh-TW']],
  'devops-ci-cd': [['DevOps practices', 'en'], ['CI/CD pipelines', 'en'], ['Git for version control', 'en'], ['DevOps', 'en'], ['CI/CD', 'en']],
  'cloud-infrastructure': [['cloud infrastructure', 'en'], ['Azure', 'en'], ['AWS', 'en'], ['GCP', 'en'], ['networking, and virtualization', 'en'], ['云基础设施', 'zh'], ['雲端基礎設施', 'zh-TW'], ['infrastructure cloud', 'fr'], ['infraestructura cloud', 'es']],
  'stakeholder-management': [['enterprise stakeholders', 'en'], ['build alignment', 'en'], ['利益相关方', 'zh'], ['利害關係人', 'zh-TW'], ['parties prenantes', 'fr'], ['stakeholders empresariales', 'es']],
  'technical-communication': [['technical discussions', 'en'], ['drive clarity', 'en'], ['技术沟通', 'zh'], ['技術溝通', 'zh-TW'], ['communication technique', 'fr'], ['comunicación técnica', 'es']],
  'llm-systems-engineering': [['LLM stack', 'en'], ['frontier models', 'en'], ['orchestration frameworks', 'en'], ['LLM 系统', 'zh'], ['LLM 系統', 'zh-TW'], ['système LLM', 'fr'], ['sistema LLM', 'es']],
  'permission-aware-retrieval': [['permission-aware RAG', 'en'], ['authorization filter', 'en'], ['权限感知检索', 'zh'], ['權限感知檢索', 'zh-TW'], ['recherche sensible aux droits', 'fr'], ['recuperación con permisos', 'es']],
  'human-in-the-loop': [['human-in-the-loop', 'en'], ['human approval', 'en'], ['人工复核', 'zh'], ['人工複核', 'zh-TW'], ['validation humaine', 'fr'], ['revisión humana', 'es']],
  'data-sovereignty-access-control': [['data sovereignty', 'en'], ['access controls', 'en'], ['security clearance', 'en'], ['数据主权', 'zh'], ['資料主權', 'zh-TW'], ['souveraineté des données', 'fr'], ['soberanía de datos', 'es']],
  'handoff-enablement': [['handoff', 'en'], ['runbook', 'en'], ['客户交接', 'zh'], ['客戶交接', 'zh-TW'], ['transfert opérationnel', 'fr'], ['traspaso operativo', 'es']],
  'change-management': [['change management', 'en'], ['user adoption', 'en'], ['变更管理', 'zh'], ['變更管理', 'zh-TW'], ['conduite du changement', 'fr'], ['gestión del cambio', 'es']],
  'end-to-end-delivery': [['own the design, build, and deployment', 'en'], ['full scope of a use case end-to-end', 'en'], ['full product lifecycle', 'en'], ['端到端交付', 'zh'], ['端到端交付', 'zh-TW'], ['livraison de bout en bout', 'fr'], ['entrega de extremo a extremo', 'es']],
};

const coverage = [
  ['fde-operating-model', 1, '01-01', 'advanced', 98], ['workflow-discovery', 2, '02-01', 'advanced', 98], ['problem-framing', 2, '02-02', 'practice', 95],
  ['requirement-clarification', 2, '02-03', 'practice', 91], ['technical-scoping', 3, '03-01', 'advanced', 98], ['solution-architecture', 3, '03-02', 'practice', 94],
  ['business-case-modeling', 3, '03-04', 'practice', 92], ['poc-delivery', 4, '04-01', 'advanced', 97], ['production-software-engineering', 4, '04-05', 'advanced', 96],
  ['python-production-engineering', 4, '04-05', 'practice', 91], ['full-stack-engineering', 4, '04-02', 'practice', 86], ['model-evaluation', 4, '04-02', 'advanced', 97],
  ['production-readiness', 5, '05-01', 'advanced', 98], ['agent-observability', 5, '05-02', 'advanced', 94], ['incident-response', 5, '05-05', 'advanced', 96],
  ['private-hybrid-cloud', 5, '05-05', 'advanced', 96], ['kubernetes-helm', 5, '05-05', 'practice', 90], ['devops-ci-cd', 5, '05-05', 'practice', 90], ['cloud-infrastructure', 5, '05-05', 'practice', 89],
  ['customer-facing-engineering', 6, '06-01', 'advanced', 98], ['stakeholder-management', 6, '06-02', 'advanced', 96], ['technical-communication', 6, '06-03', 'advanced', 95],
  ['llm-systems-engineering', 7, '07-01', 'advanced', 96], ['solution-architecture', 7, '07-02', 'advanced', 98], ['rag-knowledge-retrieval', 8, '08-02', 'advanced', 98],
  ['permission-aware-retrieval', 8, '08-02', 'advanced', 99], ['ai-safety-guardrails', 8, '08-03', 'advanced', 96], ['agentic-workflows', 9, '09-02', 'advanced', 98],
  ['tool-calling', 9, '09-02', 'advanced', 96], ['human-in-the-loop', 9, '09-03', 'advanced', 98], ['data-sovereignty-access-control', 10, '10-02', 'advanced', 97],
  ['model-evaluation', 10, '10-03', 'advanced', 98], ['handoff-enablement', 11, '11-02', 'advanced', 98], ['change-management', 11, '11-03', 'practice', 93],
  ['end-to-end-delivery', 12, '12-05', 'advanced', 99], ['technical-communication', 12, '12-03', 'practice', 92],
];

const relations = [
  ['workflow-discovery', 'problem-framing', 'prerequisite_of', 0.98], ['problem-framing', 'technical-scoping', 'prerequisite_of', 0.97],
  ['technical-scoping', 'solution-architecture', 'prerequisite_of', 0.96], ['solution-architecture', 'poc-delivery', 'prerequisite_of', 0.90],
  ['model-evaluation', 'production-readiness', 'prerequisite_of', 0.96], ['production-software-engineering', 'production-readiness', 'prerequisite_of', 0.95],
  ['private-hybrid-cloud', 'production-readiness', 'part_of', 0.90], ['kubernetes-helm', 'private-hybrid-cloud', 'part_of', 0.94],
  ['devops-ci-cd', 'production-readiness', 'part_of', 0.90], ['cloud-infrastructure', 'private-hybrid-cloud', 'related_to', 0.91],
  ['permission-aware-retrieval', 'rag-knowledge-retrieval', 'part_of', 0.97], ['human-in-the-loop', 'ai-safety-guardrails', 'part_of', 0.93],
  ['stakeholder-management', 'customer-facing-engineering', 'part_of', 0.95], ['technical-communication', 'customer-facing-engineering', 'part_of', 0.92],
  ['handoff-enablement', 'end-to-end-delivery', 'part_of', 0.94], ['fde-operating-model', 'end-to-end-delivery', 'related_to', 0.96],
];

const fdeEvidence = [
  ['workflow-discovery', 'ambiguous business problems', 'responsibility'], ['customer-facing-engineering', 'working directly with customers', 'required'],
  ['technical-scoping', 'clear success criteria', 'responsibility'], ['technical-scoping', 'technical specs', 'required'], ['solution-architecture', 'architectural standards', 'preferred'],
  ['poc-delivery', 'early prototypes', 'context'], ['production-software-engineering', 'clean, testable, observable, scalable code', 'required'],
  ['python-production-engineering', 'Python', 'required'], ['full-stack-engineering', 'frontend', 'preferred'], ['model-evaluation', 'evaluation frameworks', 'required'],
  ['production-readiness', 'reliable, observable, safe, and auditable', 'context'], ['stakeholder-management', 'enterprise stakeholders', 'required'],
  ['llm-systems-engineering', 'LLM stack', 'required'], ['rag-knowledge-retrieval', 'vector databases', 'required'], ['agentic-workflows', 'orchestration frameworks', 'required'],
  ['ai-safety-guardrails', 'enterprise security', 'preferred'], ['end-to-end-delivery', 'full scope of a use case end-to-end', 'required'],
  ['private-hybrid-cloud', 'private/hybrid cloud environments', 'required'], ['kubernetes-helm', 'Kubernetes clusters', 'required'], ['kubernetes-helm', 'Helm', 'required'],
  ['devops-ci-cd', 'DevOps practices', 'required'], ['devops-ci-cd', 'CI/CD pipelines', 'required'], ['cloud-infrastructure', 'cloud infrastructure', 'required'],
  ['data-sovereignty-access-control', 'data sovereignty', 'required'], ['data-sovereignty-access-control', 'access controls', 'required'],
];

function q(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function id(value) { return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase(); }

const sql = ['PRAGMA foreign_keys = ON;', '', '-- Published FDE course and canonical chapter access records.'];
sql.push(`INSERT INTO courses (id, slug, title, subtitle, description, topic, level, status, visibility, price_points, markdown_root, published_at) VALUES ('course_forward_deployed_engineering', 'forward-deployed-engineering', 'FDE 前线交付工程师：从模糊需求到生产系统', '连接客户现场、生产代码与业务结果', '12 章、61 节 FDE 实战课程，含本地化项目、互动练习、知识图谱与 JD 技能链接。', 'FDE工程师', 'advanced', 'published', 'public', 0, 'knowledge-sources/forward-deployed-engineering/en', CURRENT_TIMESTAMP) ON CONFLICT(slug) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, description=excluded.description, topic=excluded.topic, level='advanced', status='published', visibility='public', price_points=0, markdown_root=excluded.markdown_root, published_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP;`);
for (let chapter = 1; chapter <= 12; chapter += 1) {
  const count = chapter === 7 ? 6 : 5;
  const details = Array.from({ length: count }, (_, index) => `knowledge-sources/forward-deployed-engineering/en/${chapter}/${String(chapter).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}.md`);
  sql.push(`INSERT INTO chapters (id, course_id, chapter_number, slug, title, summary, duration_minutes, markdown_path, lesson_details_path, is_free, order_index, published_at) VALUES ('chapter-forward-deployed-engineering-${chapter}', 'course_forward_deployed_engineering', ${chapter}, 'fde-chapter-${String(chapter).padStart(2, '0')}', 'FDE Chapter ${chapter}', 'Forward Deployed Engineering field chapter ${chapter}.', ${count * 30}, 'knowledge-sources/forward-deployed-engineering/en/${chapter}/chapter.md', ${q(JSON.stringify(details))}, 1, ${chapter - 1}, CURRENT_TIMESTAMP) ON CONFLICT(course_id, chapter_number) DO UPDATE SET slug=excluded.slug, title=excluded.title, summary=excluded.summary, duration_minutes=excluded.duration_minutes, markdown_path=excluded.markdown_path, lesson_details_path=excluded.lesson_details_path, is_free=1, order_index=excluded.order_index, published_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP;`);
}

sql.push('', '-- Reviewed FDE skill taxonomy and multilingual aliases.');
for (const [slug, zh, en, definition, category, difficulty] of skills) {
  const skillId = `skill_fde_${id(slug)}`;
  sql.push(`INSERT INTO skills (id, slug, name_zh, name_en, definition, category, difficulty, taxonomy_version, status) VALUES (${q(skillId)}, ${q(slug)}, ${q(zh)}, ${q(en)}, ${q(definition)}, ${q(category)}, ${q(difficulty)}, 3, 'approved') ON CONFLICT(slug) DO UPDATE SET name_zh=excluded.name_zh, name_en=excluded.name_en, definition=excluded.definition, category=excluded.category, difficulty=excluded.difficulty, taxonomy_version=3, status='approved', updated_at=CURRENT_TIMESTAMP;`);
}
for (const [slug, values] of Object.entries(aliases)) for (const [alias, language] of values) {
  sql.push(`INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json) SELECT ${q(`fde_alias_${id(slug)}_${id(alias)}`)}, skills.id, ${q(alias)}, ${q(language)}, ${/[A-Za-z0-9]/.test(alias) ? "'phrase'" : "'word'"}, '[]' FROM skills WHERE skills.slug=${q(slug)};`);
}
// Exact aliases for existing canonical nodes used by the FDE JD.
for (const [slug, alias] of [['model-evaluation', 'evaluation frameworks'], ['rag-knowledge-retrieval', 'vector databases'], ['agentic-workflows', 'orchestration frameworks'], ['agentic-workflows', 'ReAct'], ['agentic-workflows', 'Plan-and-Execute'], ['ai-safety-guardrails', 'enterprise security'], ['ai-safety-guardrails', 'auditability requirements']]) {
  sql.push(`INSERT OR IGNORE INTO skill_aliases (id, skill_id, alias, language, match_type, exclusion_context_json) SELECT ${q(`fde_alias_${id(slug)}_${id(alias)}`)}, skills.id, ${q(alias)}, 'en', 'phrase', '[]' FROM skills WHERE skills.slug=${q(slug)};`);
}

sql.push('', '-- Approved lesson coverage connects every JD skill to an exact FDE lesson.');
for (const [slug, chapter, lesson, level, score] of coverage) {
  sql.push(`INSERT INTO lesson_skill_coverage (id, skill_id, course_id, chapter_route_id, lesson_route_id, coverage_level, coverage_score, is_primary, learning_outcome, evidence, review_status) SELECT ${q(`fde_coverage_${id(slug)}_${lesson}`)}, skills.id, 'forward-deployed-engineering', ${q(String(chapter))}, ${q(lesson)}, ${q(level)}, ${score}, 1, ${q(`Apply ${slug} in an FDE field artifact and defend the decision with evidence.`)}, ${q(`Fieldcraft AI chapter ${chapter}, lesson ${lesson}: localized tutorial, interaction, exercise, and rubric.`)}, 'approved' FROM skills WHERE skills.slug=${q(slug)} ON CONFLICT(skill_id, course_id, chapter_route_id, lesson_route_id) DO UPDATE SET coverage_level=excluded.coverage_level, coverage_score=excluded.coverage_score, is_primary=1, learning_outcome=excluded.learning_outcome, evidence=excluded.evidence, review_status='approved', updated_at=CURRENT_TIMESTAMP;`);
}

sql.push('', '-- Reviewed knowledge-graph relations for the FDE learning path.');
for (const [from, to, relation, weight] of relations) {
  sql.push(`INSERT INTO skill_relations (id, from_skill_id, to_skill_id, relation_type, weight, confidence, source_method, evidence, status) SELECT ${q(`fde_relation_${id(from)}_${id(to)}_${id(relation)}`)}, source.id, target.id, ${q(relation)}, ${weight}, 0.99, 'curriculum_reviewed', ${q(`Reviewed FDE curriculum sequence: ${from} ${relation} ${to}.`)}, 'approved' FROM skills source JOIN skills target WHERE source.slug=${q(from)} AND target.slug=${q(to)} ON CONFLICT(from_skill_id, to_skill_id, relation_type) DO UPDATE SET weight=excluded.weight, confidence=excluded.confidence, source_method=excluded.source_method, evidence=excluded.evidence, status='approved', updated_at=CURRENT_TIMESTAMP;`);
}

sql.push('', '-- Immediate exact-source evidence for current published FDE JDs. The regular resumable reindex below keeps future versions aligned.');
for (const [slug, phrase, requirement] of fdeEvidence) {
  const position = `instr(lower(job_sections.public_text), lower(${q(phrase)}))`;
  sql.push(`INSERT OR IGNORE INTO job_skill_evidence (id, job_id, version_id, section_id, skill_id, evidence_text, start_offset, end_offset, requirement_level, evidence_type, confidence, explanation, source_method, review_status) SELECT 'fde_evidence_' || job_postings.id || '_' || skills.id || '_' || ${position}, job_postings.id, job_postings.current_version_id, job_sections.id, skills.id, substr(job_sections.public_text, ${position}, length(${q(phrase)})), ${position}-1, ${position}-1+length(${q(phrase)}), ${q(requirement)}, 'explicit', 0.98, ${q(`Exact reviewed FDE JD phrase mapped to ${slug}.`)}, 'dictionary_rule', 'approved' FROM job_postings JOIN job_sections ON job_sections.job_id=job_postings.id AND job_sections.version_id=job_postings.current_version_id JOIN skills ON skills.slug=${q(slug)} WHERE job_postings.status='published' AND (job_postings.title LIKE 'Forward Deployed Engineer%' OR job_postings.title LIKE '%FDE%') AND ${position}>0;`);
}

sql.push('', "UPDATE job_skill_evidence_reindex_state SET cursor_job_id=NULL, status='pending', locked_until=NULL, requested_at=CURRENT_TIMESTAMP, completed_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=1;");
sql.push('');
await writeFile(outputPath, `${sql.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, skills: skills.length, aliases: Object.values(aliases).reduce((sum, values) => sum + values.length, 0), coverage: coverage.length, relations: relations.length, evidenceRules: fdeEvidence.length }));
