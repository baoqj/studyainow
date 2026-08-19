import type { AppLocale } from './courseContent';

export type InterviewCopy = {
  heroTitle: string;
  heroBody: string;
  searchPlaceholder: string;
  searchButton: string;
  filtersTitle: string;
  filterTags: string;
  filterCategory: string;
  filterKeyword: string;
  clearFilters: string;
  noMatches: string;
  noMatchesBody: string;
  showing: string;
  cardLevelsAndQuestions: string;
  cardSkills: string;
  breadcrumbSets: string;
  startPractice: string;
  viewLevels: string;
  overview: string;
  outline: string;
  toc: string;
  level: string;
  levelDifficulty: string;
  timeBudget: string;
  assesses: string;
  questions: string;
  question: string;
  questionFocus: string;
  problemStatement: string;
  requirements: string;
  example: string;
  hint: string;
  showHint: string;
  hideHint: string;
  mistakes: string;
  showMistakes: string;
  hideMistakes: string;
  solution: string;
  showSolution: string;
  hideSolution: string;
  summary: string;
  showSummary: string;
  hideSummary: string;
  skills: string;
  previous: string;
  next: string;
  backToLevel: string;
  backToSet: string;
  revealAll: string;
  collapseAll: string;
  resetProgress: string;
  progressHint: string;
  selfCheck: string;
  gotIt: string;
  needsReview: string;
  notTried: string;
  language: string;
  difficultyLadder: string;
  recommendedFor: string;
  tryFirst: string;
  questionPosition: string;
  hiddenUntilReveal: string;
  revealCount: string;
  setStats: string;
  setLanguages: string;
};

const copy: Record<AppLocale, InterviewCopy> = {
  'zh-CN': {
    heroTitle: '面试题集',
    heroBody: '以题目为先导、知识点为连接的互动式面试练习。先自己动手，再展开提示、解法与标准答案，逐步验证你的工程能力。',
    searchPlaceholder: '搜索题集、标签、关键字…',
    searchButton: '搜索',
    filtersTitle: '筛选',
    filterTags: '标签',
    filterCategory: '分类',
    filterKeyword: '关键字',
    clearFilters: '清除筛选',
    noMatches: '没有匹配的题集',
    noMatchesBody: '请减少筛选条件或清除筛选后重新浏览。',
    showing: '显示 {{filtered}} / {{total}} 个题集',
    cardLevelsAndQuestions: '{{levels}} 级 / {{questions}} 题',
    cardSkills: '考察技能',
    breadcrumbSets: '面试题集',
    startPractice: '开始第一题',
    viewLevels: '查看级别大纲',
    overview: '题集简介',
    outline: '级别大纲',
    toc: '题目目录',
    level: 'Level {{number}}',
    levelDifficulty: '难度',
    timeBudget: '建议用时',
    assesses: '本级别考察',
    questions: '题目列表',
    question: '第 {{number}} 题',
    questionFocus: '核心考点',
    problemStatement: '题目描述',
    requirements: '要求',
    example: '示例',
    hint: '提示',
    showHint: '展开提示',
    hideHint: '收起提示',
    mistakes: '常见错误与边界情况',
    showMistakes: '展开常见错误',
    hideMistakes: '收起常见错误',
    solution: '参考解法',
    showSolution: '展开参考解法',
    hideSolution: '收起参考解法',
    summary: '要点回顾',
    showSummary: '展开要点回顾',
    hideSummary: '收起要点回顾',
    skills: '考察技能',
    previous: '上一题',
    next: '下一题',
    backToLevel: '返回 Level {{number}}',
    backToSet: '返回题集',
    revealAll: '全部展开',
    collapseAll: '全部收起',
    resetProgress: '重置练习进度',
    progressHint: '练习进度（展开状态与自评）保存在本机浏览器中，不会上传。',
    selfCheck: '解完后自评',
    gotIt: '已掌握',
    needsReview: '需要复习',
    notTried: '未作答',
    language: '界面语言',
    difficultyLadder: '难度进阶',
    recommendedFor: '适合人群',
    tryFirst: '先自己动手实现，再展开下面的内容对照。',
    questionPosition: '第 {{index}} / {{total}} 题',
    hiddenUntilReveal: '以下内容默认隐藏',
    revealCount: '已展开 {{count}} / {{total}}',
    setStats: '题集概况',
    setLanguages: '五语种题面',
  },
  'zh-TW': {
    heroTitle: '面試題集',
    heroBody: '以題目為先導、知識點為連結的互動式面試練習。先自己動手，再展開提示、解法與標準答案，逐步驗證你的工程能力。',
    searchPlaceholder: '搜尋題集、標籤、關鍵字…',
    searchButton: '搜尋',
    filtersTitle: '篩選',
    filterTags: '標籤',
    filterCategory: '分類',
    filterKeyword: '關鍵字',
    clearFilters: '清除篩選',
    noMatches: '沒有相符的題集',
    noMatchesBody: '請減少篩選條件，或清除篩選後再瀏覽。',
    showing: '顯示 {{filtered}} / {{total}} 個題集',
    cardLevelsAndQuestions: '{{levels}} 級 / {{questions}} 題',
    cardSkills: '考查技能',
    breadcrumbSets: '面試題集',
    startPractice: '開始第一題',
    viewLevels: '查看級別大綱',
    overview: '題集簡介',
    outline: '級別大綱',
    toc: '題目目錄',
    level: 'Level {{number}}',
    levelDifficulty: '難度',
    timeBudget: '建議用時',
    assesses: '本級別考查',
    questions: '題目列表',
    question: '第 {{number}} 題',
    questionFocus: '核心考點',
    problemStatement: '題目說明',
    requirements: '要求',
    example: '範例',
    hint: '提示',
    showHint: '展開提示',
    hideHint: '收起提示',
    mistakes: '常見錯誤與邊界情況',
    showMistakes: '展開常見錯誤',
    hideMistakes: '收起常見錯誤',
    solution: '參考解法',
    showSolution: '展開參考解法',
    hideSolution: '收起參考解法',
    summary: '重點回顧',
    showSummary: '展開重點回顧',
    hideSummary: '收起重點回顧',
    skills: '考查技能',
    previous: '上一題',
    next: '下一題',
    backToLevel: '返回 Level {{number}}',
    backToSet: '返回題集',
    revealAll: '全部展開',
    collapseAll: '全部收起',
    resetProgress: '重設練習進度',
    progressHint: '練習進度（展開狀態與自評）儲存在本機瀏覽器中，不會上傳。',
    selfCheck: '解完後自評',
    gotIt: '已掌握',
    needsReview: '需要複習',
    notTried: '未作答',
    language: '介面語言',
    difficultyLadder: '難度進階',
    recommendedFor: '適合對象',
    tryFirst: '先自己動手實作，再展開下方內容對照。',
    questionPosition: '第 {{index}} / {{total}} 題',
    hiddenUntilReveal: '以下內容預設隱藏',
    revealCount: '已展開 {{count}} / {{total}}',
    setStats: '題集概況',
    setLanguages: '五語種題面',
  },
  en: {
    heroTitle: 'Interview Practice',
    heroBody: 'Guided, interactive interview practice built around real questions. Solve first, then expand hints, solutions, and reference answers to verify your engineering skills.',
    searchPlaceholder: 'Search sets, tags, keywords…',
    searchButton: 'Search',
    filtersTitle: 'Filters',
    filterTags: 'Tags',
    filterCategory: 'Category',
    filterKeyword: 'Keywords',
    clearFilters: 'Clear filters',
    noMatches: 'No matching sets',
    noMatchesBody: 'Reduce or clear the filters to browse again.',
    showing: 'Showing {{filtered}} of {{total}} sets',
    cardLevelsAndQuestions: '{{levels}} levels / {{questions}} questions',
    cardSkills: 'Skills covered',
    breadcrumbSets: 'Interview sets',
    startPractice: 'Start first question',
    viewLevels: 'View level outline',
    overview: 'About this set',
    outline: 'Level outline',
    toc: 'Question index',
    level: 'Level {{number}}',
    levelDifficulty: 'Difficulty',
    timeBudget: 'Suggested time',
    assesses: 'What this level assesses',
    questions: 'Questions',
    question: 'Question {{number}}',
    questionFocus: 'Primary focus',
    problemStatement: 'Problem statement',
    requirements: 'Requirements',
    example: 'Example',
    hint: 'Hint',
    showHint: 'Reveal hint',
    hideHint: 'Hide hint',
    mistakes: 'Common mistakes and edge cases',
    showMistakes: 'Reveal common mistakes',
    hideMistakes: 'Hide common mistakes',
    solution: 'Reference solution',
    showSolution: 'Reveal solution',
    hideSolution: 'Hide solution',
    summary: 'Key takeaways',
    showSummary: 'Reveal key takeaways',
    hideSummary: 'Hide key takeaways',
    skills: 'Skills covered',
    previous: 'Previous question',
    next: 'Next question',
    backToLevel: 'Back to Level {{number}}',
    backToSet: 'Back to set',
    revealAll: 'Reveal all',
    collapseAll: 'Collapse all',
    resetProgress: 'Reset practice progress',
    progressHint: 'Practice progress (revealed sections and self-assessment) is stored in this browser only.',
    selfCheck: 'Self-check',
    gotIt: 'Got it',
    needsReview: 'Needs review',
    notTried: 'Not tried',
    language: 'Interface language',
    difficultyLadder: 'Difficulty progression',
    recommendedFor: 'Recommended for',
    tryFirst: 'Implement it yourself first, then expand the sections below to compare.',
    questionPosition: 'Question {{index}} of {{total}}',
    hiddenUntilReveal: 'The sections below start hidden',
    revealCount: '{{count}} of {{total}} revealed',
    setStats: 'Set overview',
    setLanguages: 'Five-language questions',
  },
  fr: {
    heroTitle: 'Questions d’entretien',
    heroBody: 'Un entraînement d’entretien guidé et interactif. Résolvez d’abord, puis dépliez les indices, les solutions et les réponses de référence pour vérifier vos compétences.',
    searchPlaceholder: 'Rechercher des ensembles, tags, mots-clés…',
    searchButton: 'Rechercher',
    filtersTitle: 'Filtres',
    filterTags: 'Tags',
    filterCategory: 'Catégorie',
    filterKeyword: 'Mots-clés',
    clearFilters: 'Effacer les filtres',
    noMatches: 'Aucun ensemble correspondant',
    noMatchesBody: 'Réduisez ou effacez les filtres pour parcourir à nouveau.',
    showing: '{{filtered}} ensemble(s) sur {{total}} affichés',
    cardLevelsAndQuestions: '{{levels}} niveaux / {{questions}} questions',
    cardSkills: 'Compétences couvertes',
    breadcrumbSets: 'Questions d’entretien',
    startPractice: 'Commencer la première question',
    viewLevels: 'Voir le plan des niveaux',
    overview: 'À propos de cet ensemble',
    outline: 'Plan des niveaux',
    toc: 'Index des questions',
    level: 'Niveau {{number}}',
    levelDifficulty: 'Difficulté',
    timeBudget: 'Temps conseillé',
    assesses: 'Ce que ce niveau évalue',
    questions: 'Questions',
    question: 'Question {{number}}',
    questionFocus: 'Objectif principal',
    problemStatement: 'Énoncé du problème',
    requirements: 'Exigences',
    example: 'Exemple',
    hint: 'Indice',
    showHint: 'Afficher l’indice',
    hideHint: 'Masquer l’indice',
    mistakes: 'Erreurs fréquentes et cas limites',
    showMistakes: 'Afficher les erreurs fréquentes',
    hideMistakes: 'Masquer les erreurs fréquentes',
    solution: 'Solution de référence',
    showSolution: 'Afficher la solution',
    hideSolution: 'Masquer la solution',
    summary: 'Points clés',
    showSummary: 'Afficher les points clés',
    hideSummary: 'Masquer les points clés',
    skills: 'Compétences couvertes',
    previous: 'Question précédente',
    next: 'Question suivante',
    backToLevel: 'Retour au niveau {{number}}',
    backToSet: 'Retour à l’ensemble',
    revealAll: 'Tout afficher',
    collapseAll: 'Tout masquer',
    resetProgress: 'Réinitialiser la progression',
    progressHint: 'La progression (sections affichées et auto-évaluation) est stockée uniquement dans ce navigateur.',
    selfCheck: 'Auto-évaluation',
    gotIt: 'Acquis',
    needsReview: 'À revoir',
    notTried: 'Non tenté',
    language: 'Langue de l’interface',
    difficultyLadder: 'Progression de la difficulté',
    recommendedFor: 'Recommandé pour',
    tryFirst: 'Implémentez d’abord par vous-même, puis dépliez les sections ci-dessous pour comparer.',
    questionPosition: 'Question {{index}} sur {{total}}',
    hiddenUntilReveal: 'Les sections ci-dessous sont masquées au départ',
    revealCount: '{{count}} sections sur {{total}} affichées',
    setStats: 'Aperçu de l’ensemble',
    setLanguages: 'Questions en cinq langues',
  },
  es: {
    heroTitle: 'Preguntas de entrevista',
    heroBody: 'Práctica de entrevista guiada e interactiva. Resuelve primero y luego expande pistas, soluciones y respuestas de referencia para verificar tus habilidades.',
    searchPlaceholder: 'Buscar conjuntos, etiquetas, palabras clave…',
    searchButton: 'Buscar',
    filtersTitle: 'Filtros',
    filterTags: 'Etiquetas',
    filterCategory: 'Categoría',
    filterKeyword: 'Palabras clave',
    clearFilters: 'Borrar filtros',
    noMatches: 'No hay conjuntos coincidentes',
    noMatchesBody: 'Reduce o borra los filtros para volver a explorar.',
    showing: 'Mostrando {{filtered}} de {{total}} conjuntos',
    cardLevelsAndQuestions: '{{levels}} niveles / {{questions}} preguntas',
    cardSkills: 'Habilidades cubiertas',
    breadcrumbSets: 'Preguntas de entrevista',
    startPractice: 'Empezar con la primera pregunta',
    viewLevels: 'Ver el esquema de niveles',
    overview: 'Sobre este conjunto',
    outline: 'Esquema de niveles',
    toc: 'Índice de preguntas',
    level: 'Nivel {{number}}',
    levelDifficulty: 'Dificultad',
    timeBudget: 'Tiempo sugerido',
    assesses: 'Qué evalúa este nivel',
    questions: 'Preguntas',
    question: 'Pregunta {{number}}',
    questionFocus: 'Enfoque principal',
    problemStatement: 'Enunciado del problema',
    requirements: 'Requisitos',
    example: 'Ejemplo',
    hint: 'Pista',
    showHint: 'Mostrar pista',
    hideHint: 'Ocultar pista',
    mistakes: 'Errores comunes y casos límite',
    showMistakes: 'Mostrar errores comunes',
    hideMistakes: 'Ocultar errores comunes',
    solution: 'Solución de referencia',
    showSolution: 'Mostrar solución',
    hideSolution: 'Ocultar solución',
    summary: 'Puntos clave',
    showSummary: 'Mostrar puntos clave',
    hideSummary: 'Ocultar puntos clave',
    skills: 'Habilidades cubiertas',
    previous: 'Pregunta anterior',
    next: 'Pregunta siguiente',
    backToLevel: 'Volver al nivel {{number}}',
    backToSet: 'Volver al conjunto',
    revealAll: 'Mostrar todo',
    collapseAll: 'Contraer todo',
    resetProgress: 'Restablecer el progreso',
    progressHint: 'El progreso (secciones mostradas y autoevaluación) se guarda solo en este navegador.',
    selfCheck: 'Autoevaluación',
    gotIt: 'Lo tengo',
    needsReview: 'Necesita repaso',
    notTried: 'Sin intentar',
    language: 'Idioma de la interfaz',
    difficultyLadder: 'Progresión de dificultad',
    recommendedFor: 'Recomendado para',
    tryFirst: 'Impleméntalo primero tú mismo y luego expande las secciones para comparar.',
    questionPosition: 'Pregunta {{index}} de {{total}}',
    hiddenUntilReveal: 'Las secciones siguientes empiezan ocultas',
    revealCount: '{{count}} de {{total}} mostradas',
    setStats: 'Resumen del conjunto',
    setLanguages: 'Preguntas en cinco idiomas',
  },
};

export function getInterviewCopy(locale: AppLocale): InterviewCopy {
  return copy[locale] ?? copy['zh-CN'];
}

/** 每个级别对应的难度标签（随界面语言）。 */
export const levelDifficultyLabels: Record<number, Record<AppLocale, string>> = {
  1: { 'zh-CN': '入门', 'zh-TW': '入門', en: 'Beginner', fr: 'Débutant', es: 'Inicial' },
  2: { 'zh-CN': '初级', 'zh-TW': '初級', en: 'Beginner+', fr: 'Débutant avancé', es: 'Inicial+' },
  3: { 'zh-CN': '中级', 'zh-TW': '中級', en: 'Intermediate', fr: 'Intermédiaire', es: 'Intermedio' },
  4: { 'zh-CN': '中高级', 'zh-TW': '中高級', en: 'Intermediate+', fr: 'Intermédiaire avancé', es: 'Intermedio+' },
  5: { 'zh-CN': '高级', 'zh-TW': '高級', en: 'Advanced', fr: 'Avancé', es: 'Avanzado' },
  6: { 'zh-CN': '专家级', 'zh-TW': '專家級', en: 'Expert', fr: 'Expert', es: 'Experto' },
};

export function levelDifficultyLabel(level: number, locale: AppLocale) {
  return levelDifficultyLabels[level]?.[locale] ?? levelDifficultyLabels[level]?.en ?? String(level);
}

/** 本机浏览器中的练习进度（不涉及后端）。 */
export type QuestionProgressState = {
  revealed: string[];
  assessment?: 'got-it' | 'review';
};

export type InterviewProgress = Record<string, Record<string, QuestionProgressState>>;

export const INTERVIEW_PROGRESS_KEY = 'studyai.now.interview.progress';

export function readInterviewProgress(): InterviewProgress {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INTERVIEW_PROGRESS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as InterviewProgress) : {};
  } catch {
    return {};
  }
}

export function writeInterviewProgress(progress: InterviewProgress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INTERVIEW_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable in private browsing; practice still works.
  }
}

export function clearInterviewProgress() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(INTERVIEW_PROGRESS_KEY);
  } catch {
    // Ignore storage errors.
  }
}
