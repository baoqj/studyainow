import type { AppLocale } from './courseContent';

type JobsCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  search: string;
  searchAction: string;
  location: string;
  country: string;
  allCountries: string;
  city: string;
  allCities: string;
  locationHint: string;
  remote: string;
  allWorkplaces: string;
  remoteOnly: string;
  hybrid: string;
  onsite: string;
  positions: string;
  companies: string;
  mapped: string;
  lastChecked: string;
  skills: string;
  skillMap: string;
  source: string;
  originalSourceText: string;
  sourceNotice: string;
  apply: string;
  jobDescription: string;
  skillsInJd: string;
  coursePath: string;
  courseOutcome: string;
  evidence: string;
  noJobs: string;
  noJobsBody: string;
  noDescription: string;
  loading: string;
  loadMore: string;
  loadError: string;
  retry: string;
  updated: string;
  required: string;
  preferred: string;
  responsibility: string;
  context: string;
  coverage: Record<string, string>;
  backToJobs: string;
  selectedSkill: string;
  relatedContent: string;
  relatedSkills: string;
  openCourse: string;
  noCourse: string;
  saveJob: string;
  removeSavedJob: string;
  myJobs: string;
  myJobsIntro: string;
  noSavedJobs: string;
  returnToCoursesTitle: string;
  returnToCoursesBody: string;
  confirm: string;
  cancel: string;
};

const copy: Record<AppLocale, JobsCopy> = {
  'zh-CN': {
    eyebrow: '职位需求 → 可学技能 → 对应课节',
    title: 'AI 职位技能地图',
    intro: '从经过审核的官方职位信息中识别技能证据，并直接连接到可学习的课程章节。',
    search: '搜索职位、公司、地点或技能', searchAction: '搜索', location: '地理位置', country: '国家/地区', allCountries: '全部国家和地区', city: '城市', allCities: '全部城市', locationHint: '先选择国家或地区，再按城市精确筛选。', remote: '工作方式', allWorkplaces: '全部工作方式', remoteOnly: '远程', hybrid: '混合办公', onsite: '现场办公',
    positions: '已发布职位', companies: '招聘公司', mapped: '已映射技能', lastChecked: '最近巡检',
    skills: '项技能', skillMap: 'JD 技能与知识点', source: '官方来源', originalSourceText: '抓取原文 · 未翻译', sourceNotice: '职位内容保留原始官方链接与发布日期；到达疑似过期日期后，系统会直接巡检该职位页。JD 始终显示采集到的原文，不进行翻译或摘要改写。',
    apply: '前往申请', jobDescription: '职位描述', skillsInJd: 'JD 中的技能点', coursePath: '推荐学习路径', courseOutcome: '学完你将能够', evidence: '标注证据',
    noJobs: '尚无可公开的审核职位', noJobsBody: '职位在从官方来源采集后，必须完成人工审核与技能确认才会在这里显示。', noDescription: '该职位只允许展示元数据，未提供公开的职位描述。',
    loading: '正在加载职位地图…', loadMore: '加载更多职位', loadError: '暂时无法加载职位信息。', retry: '重试', updated: '发布于', required: '要求', preferred: '加分项', responsibility: '职责', context: '相关语境',
    coverage: { intro: '入门', practice: '实战', advanced: '进阶' }, backToJobs: '返回职位列表', selectedSkill: '已选择技能', relatedContent: '相关内容', relatedSkills: '关联技能', openCourse: '打开对应课节', noCourse: '课程映射审核中', saveJob: '收藏职位', removeSavedJob: '取消收藏', myJobs: '我的职位', myJobsIntro: '这里保存你关注的职位，点击即可回到对应的 JD 详情。', noSavedJobs: '还没有收藏职位。可以在职位列表或职位详情中点击书签保存。', returnToCoursesTitle: '返回 Study AI Now! 课程页面？', returnToCoursesBody: '确认后将跳转到课程首页。', confirm: '确认', cancel: '取消',
  },
  'zh-TW': {
    eyebrow: '職位需求 → 可學技能 → 對應課節',
    title: 'AI 職位技能地圖',
    intro: '從已審核的官方職缺資料辨識技能證據，並直接連結到可學習的課程章節。',
    search: '搜尋職位、公司、地點或技能', searchAction: '搜尋', location: '地理位置', country: '國家／地區', allCountries: '所有國家及地區', city: '城市', allCities: '所有城市', locationHint: '先選擇國家或地區，再按城市精準篩選。', remote: '工作方式', allWorkplaces: '所有工作方式', remoteOnly: '遠端', hybrid: '混合辦公', onsite: '現場辦公',
    positions: '已發布職缺', companies: '徵才公司', mapped: '已映射技能', lastChecked: '最近巡檢',
    skills: '項技能', skillMap: 'JD 技能與知識點', source: '官方來源', originalSourceText: '擷取原文 · 未翻譯', sourceNotice: '職缺內容保留原始官方連結與發布日期；到達疑似過期日期後，系統會直接巡檢該職缺頁。JD 一律顯示擷取的原文，不會翻譯或改寫摘要。',
    apply: '前往應徵', jobDescription: '職缺說明', skillsInJd: 'JD 中的技能點', coursePath: '建議學習路徑', courseOutcome: '完成後你將能夠', evidence: '標註證據',
    noJobs: '目前沒有可公開的已審核職缺', noJobsBody: '職缺從官方來源擷取後，必須完成人工審核及技能確認才會在這裡顯示。', noDescription: '此職缺只允許顯示中繼資料，未提供公開職缺說明。',
    loading: '正在載入職缺地圖…', loadMore: '載入更多職缺', loadError: '暫時無法載入職缺資料。', retry: '重試', updated: '發布於', required: '必要條件', preferred: '加分條件', responsibility: '工作職責', context: '相關脈絡',
    coverage: { intro: '入門', practice: '實作', advanced: '進階' }, backToJobs: '返回職缺列表', selectedSkill: '已選擇技能', relatedContent: '相關內容', relatedSkills: '關聯技能', openCourse: '開啟對應課節', noCourse: '課程映射審核中', saveJob: '收藏職缺', removeSavedJob: '取消收藏', myJobs: '我的職缺', myJobsIntro: '這裡會保存你關注的職缺，點選即可回到相應的 JD 詳情。', noSavedJobs: '尚未收藏職缺。你可在職缺列表或職缺詳情頁點選書籤儲存。', returnToCoursesTitle: '返回 Study AI Now! 課程頁面？', returnToCoursesBody: '確認後將跳轉到課程首頁。', confirm: '確認', cancel: '取消',
  },
  en: {
    eyebrow: 'Job requirements → learnable skills → exact lessons',
    title: 'AI Job Skills Map',
    intro: 'Read reviewed official job postings, see the skills evidenced in each JD, and move directly into the right course lesson.',
    search: 'Search jobs, companies, locations, or skills', searchAction: 'Search', location: 'Location', country: 'Country / region', allCountries: 'All countries and regions', city: 'City', allCities: 'All cities', locationHint: 'Choose a country or region first, then narrow results by city.', remote: 'Workplace', allWorkplaces: 'All workplaces', remoteOnly: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
    positions: 'Published jobs', companies: 'Hiring companies', mapped: 'Mapped jobs', lastChecked: 'Last inspection',
    skills: 'skills', skillMap: 'JD skills and knowledge', source: 'Official source', originalSourceText: 'Acquired source text · not translated', sourceNotice: 'Every listing preserves its original official URL and publication date. Once its suspected-expiry date is reached, the system inspects that exact posting URL. The JD is shown in its acquired original language, without translation or summary rewriting.',
    apply: 'Apply on source', jobDescription: 'Job description', skillsInJd: 'Skills in this JD', coursePath: 'Recommended learning path', courseOutcome: 'After this lesson, you can', evidence: 'Marked evidence',
    noJobs: 'No reviewed public jobs yet', noJobsBody: 'A role appears here only after acquisition from an official source, a human review, and confirmation of its skill evidence.', noDescription: 'This source permits metadata only; no public job description is available.',
    loading: 'Loading the job skills map…', loadMore: 'Load more jobs', loadError: 'We could not load job information right now.', retry: 'Try again', updated: 'Published', required: 'Required', preferred: 'Preferred', responsibility: 'Responsibility', context: 'Relevant context',
    coverage: { intro: 'Foundation', practice: 'Practice', advanced: 'Advanced' }, backToJobs: 'Back to jobs', selectedSkill: 'Selected skill', relatedContent: 'Related context', relatedSkills: 'Related skills', openCourse: 'Open exact lesson', noCourse: 'Course mapping under review', saveJob: 'Save job', removeSavedJob: 'Remove saved job', myJobs: 'My jobs', myJobsIntro: 'Your saved jobs live here. Select one to open its JD directly.', noSavedJobs: 'You have not saved a job yet. Use the bookmark on a job card or JD detail page.', returnToCoursesTitle: 'Return to the Study AI Now! courses page?', returnToCoursesBody: 'You will be taken to the course home page.', confirm: 'Confirm', cancel: 'Cancel',
  },
  fr: {
    eyebrow: 'Exigences du poste → compétences à acquérir → leçons ciblées',
    title: 'Carte des compétences IA',
    intro: 'Consultez des offres officielles vérifiées, voyez les compétences étayées dans chaque JD et accédez directement à la bonne leçon.',
    search: 'Rechercher un poste, une entreprise, un lieu ou une compétence', searchAction: 'Rechercher', location: 'Lieu', country: 'Pays / région', allCountries: 'Tous les pays et régions', city: 'Ville', allCities: 'Toutes les villes', locationHint: 'Choisissez d’abord un pays ou une région, puis affinez par ville.', remote: 'Mode de travail', allWorkplaces: 'Tous les modes', remoteOnly: 'À distance', hybrid: 'Hybride', onsite: 'Sur site',
    positions: 'Offres publiées', companies: 'Entreprises', mapped: 'Offres cartographiées', lastChecked: 'Dernière inspection',
    skills: 'compétences', skillMap: 'Compétences et connaissances du JD', source: 'Source officielle', originalSourceText: 'Texte source collecté · non traduit', sourceNotice: 'Chaque offre conserve son URL officielle d’origine et sa date de publication. À sa date d’expiration présumée, le système inspecte directement cette URL. Le JD est affiché dans sa langue d’origine, sans traduction ni réécriture en résumé.',
    apply: 'Postuler sur la source', jobDescription: 'Description du poste', skillsInJd: 'Compétences dans ce JD', coursePath: 'Parcours recommandé', courseOutcome: 'Après cette leçon, vous saurez', evidence: 'Preuve signalée',
    noJobs: 'Aucune offre publique vérifiée pour le moment', noJobsBody: 'Une offre apparaît ici seulement après sa collecte depuis une source officielle, une revue humaine et la confirmation de ses compétences.', noDescription: 'Cette source n’autorise que les métadonnées ; aucune description publique n’est disponible.',
    loading: 'Chargement de la carte des compétences…', loadMore: 'Afficher plus d’offres', loadError: 'Impossible de charger les offres pour le moment.', retry: 'Réessayer', updated: 'Publié le', required: 'Requis', preferred: 'Souhaité', responsibility: 'Responsabilité', context: 'Contexte pertinent',
    coverage: { intro: 'Bases', practice: 'Pratique', advanced: 'Avancé' }, backToJobs: 'Retour aux offres', selectedSkill: 'Compétence sélectionnée', relatedContent: 'Contenu associé', relatedSkills: 'Compétences associées', openCourse: 'Ouvrir la leçon', noCourse: 'Correspondance de cours en cours de revue', saveJob: 'Enregistrer cette offre', removeSavedJob: 'Retirer l’offre enregistrée', myJobs: 'Mes offres', myJobsIntro: 'Vos offres enregistrées apparaissent ici. Sélectionnez-en une pour ouvrir directement son JD.', noSavedJobs: 'Vous n’avez pas encore enregistré d’offre. Utilisez le signet dans une carte ou la page de détail.', returnToCoursesTitle: 'Retourner à la page des cours Study AI Now! ?', returnToCoursesBody: 'Vous serez redirigé vers la page d’accueil des cours.', confirm: 'Confirmer', cancel: 'Annuler',
  },
  es: {
    eyebrow: 'Requisitos del puesto → habilidades para aprender → lecciones exactas',
    title: 'Mapa de habilidades para empleos de IA',
    intro: 'Lee ofertas oficiales revisadas, identifica las habilidades demostradas en cada JD y ve directamente a la lección adecuada.',
    search: 'Buscar puestos, empresas, ubicaciones o habilidades', searchAction: 'Buscar', location: 'Ubicación', country: 'País / región', allCountries: 'Todos los países y regiones', city: 'Ciudad', allCities: 'Todas las ciudades', locationHint: 'Elige primero un país o región y luego acota los resultados por ciudad.', remote: 'Modalidad', allWorkplaces: 'Todas las modalidades', remoteOnly: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial',
    positions: 'Puestos publicados', companies: 'Empresas contratantes', mapped: 'Puestos mapeados', lastChecked: 'Última inspección',
    skills: 'habilidades', skillMap: 'Habilidades y conocimientos del JD', source: 'Fuente oficial', originalSourceText: 'Texto original capturado · sin traducción', sourceNotice: 'Cada oferta conserva su URL oficial original y su fecha de publicación. Al llegar su fecha de posible vencimiento, el sistema inspecciona directamente esa URL. El JD se muestra en el idioma original capturado, sin traducción ni reescritura resumida.',
    apply: 'Postular en la fuente', jobDescription: 'Descripción del puesto', skillsInJd: 'Habilidades en este JD', coursePath: 'Ruta de aprendizaje recomendada', courseOutcome: 'Al terminar esta lección podrás', evidence: 'Evidencia marcada',
    noJobs: 'Aún no hay puestos públicos revisados', noJobsBody: 'Un puesto aparece aquí solo después de recopilarlo de una fuente oficial, revisarlo manualmente y confirmar sus evidencias de habilidades.', noDescription: 'Esta fuente solo permite metadatos; no hay una descripción pública disponible.',
    loading: 'Cargando el mapa de habilidades…', loadMore: 'Cargar más puestos', loadError: 'No pudimos cargar la información de puestos ahora.', retry: 'Reintentar', updated: 'Publicado', required: 'Requisito', preferred: 'Deseable', responsibility: 'Responsabilidad', context: 'Contexto relevante',
    coverage: { intro: 'Fundamentos', practice: 'Práctica', advanced: 'Avanzado' }, backToJobs: 'Volver a puestos', selectedSkill: 'Habilidad seleccionada', relatedContent: 'Contenido relacionado', relatedSkills: 'Habilidades relacionadas', openCourse: 'Abrir lección exacta', noCourse: 'La relación con el curso está en revisión', saveJob: 'Guardar puesto', removeSavedJob: 'Quitar puesto guardado', myJobs: 'Mis puestos', myJobsIntro: 'Aquí se guardan los puestos que sigues. Selecciona uno para abrir directamente su JD.', noSavedJobs: 'Aún no has guardado un puesto. Usa el marcador en la tarjeta o en la página de detalle.', returnToCoursesTitle: '¿Volver a la página de cursos de Study AI Now!?', returnToCoursesBody: 'Irás a la página principal de cursos.', confirm: 'Confirmar', cancel: 'Cancelar',
  },
};

export function getJobsCopy(locale: AppLocale): JobsCopy {
  return copy[locale] ?? copy['zh-CN'];
}

export function localSkillName(name: { zh: string | null; en: string }, locale: AppLocale) {
  return locale.startsWith('zh') ? name.zh || name.en : name.en;
}
