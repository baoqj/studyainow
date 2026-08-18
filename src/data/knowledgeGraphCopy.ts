import type { AppLocale } from './courseContent';

export type KnowledgeGraphCopy = {
  title: string; intro: string; refreshed: string; refresh: string; loading: string; loadError: string;
  approvedSkills: string; approvedRelations: string; jobEvidence: string; courseCoverage: string; queued: string;
  pendingSkills: string; pendingRelations: string; graph: string; graphEmpty: string; graphLegend: string;
  nodes: string; edges: string; search: string; queue: string; analysisRuns: string; noRuns: string;
  source: string; status: string; count: string; oldest: string; model: string; lastRun: string;
  nodeDetail: string; evidence: string; coverage: string; incoming: string; outgoing: string; relation: string;
  approvedOnly: string; reviewNote: string;
};

const copies: Record<AppLocale, KnowledgeGraphCopy> = {
  'zh-CN': {
    title: '知识技能图谱审查', intro: '只显示已审核的技能节点与关系；JD 和课程数字是已审核的支撑证据。', refreshed: '数据时间', refresh: '刷新', loading: '正在载入图谱…', loadError: '无法载入知识图谱。',
    approvedSkills: '已审核技能', approvedRelations: '已审核关系', jobEvidence: 'JD 技能证据', courseCoverage: '课程覆盖', queued: '待分析来源',
    pendingSkills: '待审核技能候选', pendingRelations: '待审核关系候选', graph: '已审核关系预览', graphEmpty: '当前没有已审核的技能关系。技能节点与待分析队列仍可审查；关系将在模型分析并经人工审核后出现。', graphLegend: '箭头表示有方向的已审核关系',
    nodes: '节点', edges: '关系', search: '搜索技能或分类', queue: '分析队列', analysisRuns: '模型分析记录', noRuns: '尚未完成模型分析。',
    source: '来源', status: '状态', count: '数量', oldest: '最早入队', model: '模型', lastRun: '最近执行',
    nodeDetail: '技能节点', evidence: 'JD 证据', coverage: '课程覆盖', incoming: '入边', outgoing: '出边', relation: '关系',
    approvedOnly: '仅已审核数据', reviewNote: '模型建议必须由管理员审核；候选和原始模型输出不会进入公开职位页面。',
  },
  'zh-TW': {
    title: '知識技能圖譜審查', intro: '僅顯示已審核的技能節點與關係；JD 和課程數字是已審核的佐證。', refreshed: '資料時間', refresh: '重新整理', loading: '正在載入圖譜…', loadError: '無法載入知識圖譜。',
    approvedSkills: '已審核技能', approvedRelations: '已審核關係', jobEvidence: 'JD 技能佐證', courseCoverage: '課程涵蓋', queued: '待分析來源',
    pendingSkills: '待審核技能候選', pendingRelations: '待審核關係候選', graph: '已審核關係預覽', graphEmpty: '目前沒有已審核的技能關係。仍可審查技能節點與待分析佇列；關係會在模型分析並經人工審核後出現。', graphLegend: '箭頭代表有方向的已審核關係',
    nodes: '節點', edges: '關係', search: '搜尋技能或分類', queue: '分析佇列', analysisRuns: '模型分析紀錄', noRuns: '尚未完成模型分析。',
    source: '來源', status: '狀態', count: '數量', oldest: '最早入列', model: '模型', lastRun: '最近執行',
    nodeDetail: '技能節點', evidence: 'JD 佐證', coverage: '課程涵蓋', incoming: '入邊', outgoing: '出邊', relation: '關係',
    approvedOnly: '僅限已審核資料', reviewNote: '模型建議必須由管理員審核；候選與原始模型輸出不會進入公開職位頁面。',
  },
  en: {
    title: 'Knowledge graph review', intro: 'Only approved skill nodes and relations are shown. JD and course totals are reviewed supporting evidence.', refreshed: 'Data time', refresh: 'Refresh', loading: 'Loading graph…', loadError: 'Unable to load the knowledge graph.',
    approvedSkills: 'Approved skills', approvedRelations: 'Approved relations', jobEvidence: 'JD evidence', courseCoverage: 'Course coverage', queued: 'Queued sources',
    pendingSkills: 'Pending skill candidates', pendingRelations: 'Pending relation candidates', graph: 'Approved relation preview', graphEmpty: 'There are no approved skill relations yet. You can still inspect skill nodes and the analysis queue; relations appear after model analysis and human review.', graphLegend: 'Arrows indicate approved directed relations',
    nodes: 'Nodes', edges: 'Relations', search: 'Search skills or category', queue: 'Analysis queue', analysisRuns: 'Model analysis runs', noRuns: 'No model analysis has completed yet.',
    source: 'Source', status: 'Status', count: 'Count', oldest: 'Oldest queued', model: 'Model', lastRun: 'Last run',
    nodeDetail: 'Skill nodes', evidence: 'JD evidence', coverage: 'Course coverage', incoming: 'Incoming', outgoing: 'Outgoing', relation: 'Relation',
    approvedOnly: 'Approved data only', reviewNote: 'An administrator must review model proposals. Candidates and raw model output never enter public job pages.',
  },
  fr: {
    title: 'Revue du graphe de compétences', intro: 'Seuls les nœuds et relations approuvés sont affichés. Les totaux JD et cours sont des preuves validées.', refreshed: 'Horodatage', refresh: 'Actualiser', loading: 'Chargement du graphe…', loadError: 'Impossible de charger le graphe de connaissances.',
    approvedSkills: 'Compétences approuvées', approvedRelations: 'Relations approuvées', jobEvidence: 'Preuves JD', courseCoverage: 'Couverture des cours', queued: 'Sources en attente',
    pendingSkills: 'Candidats compétence en attente', pendingRelations: 'Candidats relation en attente', graph: 'Aperçu des relations approuvées', graphEmpty: 'Aucune relation de compétence n’est encore approuvée. Vous pouvez examiner les nœuds et la file d’analyse ; les relations apparaîtront après analyse et revue humaine.', graphLegend: 'Les flèches indiquent des relations approuvées orientées',
    nodes: 'Nœuds', edges: 'Relations', search: 'Rechercher une compétence ou catégorie', queue: 'File d’analyse', analysisRuns: 'Analyses du modèle', noRuns: 'Aucune analyse de modèle n’est encore terminée.',
    source: 'Source', status: 'État', count: 'Nombre', oldest: 'Plus ancien en attente', model: 'Modèle', lastRun: 'Dernière exécution',
    nodeDetail: 'Nœuds de compétence', evidence: 'Preuves JD', coverage: 'Couverture des cours', incoming: 'Entrantes', outgoing: 'Sortantes', relation: 'Relation',
    approvedOnly: 'Données approuvées uniquement', reviewNote: 'Un administrateur doit revoir les propositions du modèle. Les candidats et sorties brutes ne sont jamais publiés dans les pages d’emploi.',
  },
  es: {
    title: 'Revisión del grafo de habilidades', intro: 'Solo se muestran nodos y relaciones aprobados. Los totales de JD y cursos son evidencia revisada.', refreshed: 'Hora de los datos', refresh: 'Actualizar', loading: 'Cargando grafo…', loadError: 'No se pudo cargar el grafo de conocimiento.',
    approvedSkills: 'Habilidades aprobadas', approvedRelations: 'Relaciones aprobadas', jobEvidence: 'Evidencia de JD', courseCoverage: 'Cobertura de cursos', queued: 'Fuentes en cola',
    pendingSkills: 'Candidatos de habilidad pendientes', pendingRelations: 'Candidatos de relación pendientes', graph: 'Vista previa de relaciones aprobadas', graphEmpty: 'Aún no hay relaciones de habilidades aprobadas. Puedes revisar los nodos y la cola de análisis; las relaciones aparecerán después del análisis del modelo y la revisión humana.', graphLegend: 'Las flechas indican relaciones aprobadas y dirigidas',
    nodes: 'Nodos', edges: 'Relaciones', search: 'Buscar habilidades o categoría', queue: 'Cola de análisis', analysisRuns: 'Ejecuciones de análisis', noRuns: 'Aún no se ha completado un análisis del modelo.',
    source: 'Fuente', status: 'Estado', count: 'Cantidad', oldest: 'En cola desde', model: 'Modelo', lastRun: 'Última ejecución',
    nodeDetail: 'Nodos de habilidad', evidence: 'Evidencia de JD', coverage: 'Cobertura de cursos', incoming: 'Entrantes', outgoing: 'Salientes', relation: 'Relación',
    approvedOnly: 'Solo datos aprobados', reviewNote: 'Un administrador debe revisar las propuestas del modelo. Los candidatos y las salidas sin procesar nunca se publican en las páginas de empleo.',
  },
};

export function getKnowledgeGraphCopy(locale: AppLocale): KnowledgeGraphCopy {
  return copies[locale] ?? copies['zh-CN'];
}
