import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const APP_LOCALES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
] as const;

function storedLocale() {
  if (typeof window === 'undefined') return 'zh-CN';
  const value = window.localStorage.getItem('studyai.now.locale');
  if (value === 'zh') return 'zh-CN';
  if (APP_LOCALES.some((item) => item.code === value)) return value;

  const languageTags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const languageTag of languageTags) {
    const language = languageTag.toLowerCase();
    if (language === 'zh' || language.startsWith('zh-')) {
      return /zh-(?:tw|hk|mo|hant)/.test(language) ? 'zh-TW' : 'zh-CN';
    }
    if (language.startsWith('en')) return 'en';
    if (language.startsWith('fr')) return 'fr';
    if (language.startsWith('es')) return 'es';
  }

  return 'zh-CN';
}

const initialLocale = storedLocale();

const siteCopy = {
  en: {
    'nav.courses': 'Courses', 'nav.jobs': 'Job Skills Map', 'nav.login': 'Log in', 'nav.dashboard': 'Learning dashboard', 'nav.language': 'Language',
    'catalog.hero.title': 'Learn AI engineering like reading a practical book', 'catalog.hero.body': 'Study AI Now! connects concepts, hands-on practice, and delivery workflows for Claude Code, Vibe Coding, and AI agents.', 'catalog.search': 'Search Claude Code, MCP, or agents…', 'catalog.searchButton': 'Find courses',
    'catalog.continue': 'Continue learning', 'catalog.myDashboard': 'My learning dashboard', 'catalog.lessonContext': 'Chapter {{chapter}} · Lesson {{lesson}}: {{title}}', 'catalog.continueReading': 'Continue reading', 'catalog.popular': 'Featured courses', 'catalog.showing': 'Showing {{filtered}} of {{total}} learning paths', 'catalog.noMatches': 'No matching courses', 'catalog.noMatchesBody': 'Reduce or clear filters to browse again.', 'catalog.clearFilters': 'Clear filters', 'catalog.more': 'See more courses', 'catalog.goal': 'Goal: add a course page', 'catalog.plan': 'Plan – build – verify',
    'filter.title': 'Filters', 'filter.open': 'Open filters', 'filter.close': 'Close filters', 'filter.clear': 'Clear', 'filter.showing': 'Showing {{filtered}} of {{total}} courses', 'filter.topic': 'Topic', 'filter.difficulty': 'Difficulty', 'filter.access': 'Course access', 'filter.beginner': 'Beginner', 'filter.intermediate': 'Intermediate', 'filter.advanced': 'Advanced', 'filter.free': 'Free lessons', 'filter.pro': 'Pro membership',
    'course.catalog': 'Course catalog', 'course.chapter': 'Chapter {{number}}', 'course.lesson': 'Lesson {{number}}', 'course.chapterAndLessons': '{{chapters}} chapters / {{lessons}} lessons', 'course.lessons': '{{count}} lessons', 'course.lessonExercises': 'Lesson exercises', 'course.guidedCourse': 'Guided course', 'course.practice': 'Hands-on practice', 'course.taskByLesson': 'Tasks for each lesson', 'course.startFirst': 'Start first lesson', 'course.viewChapters': 'View chapters', 'course.outline': 'Course outline', 'course.outlineBody': 'Open a chapter introduction, then choose a lesson.', 'course.fromFirst': 'Start with the first lesson', 'course.task': 'Task: {{task}}', 'course.previous': 'Previous lesson', 'course.next': 'Next lesson', 'course.enterFirst': 'Open first lesson', 'course.progress': 'Course progress', 'course.openDashboard': 'Open learning dashboard', 'course.pageContents': 'On this page', 'course.published': 'Published', 'course.comingSoon': 'Coming soon',
    'footer.catalog': 'Course catalog', 'footer.dashboard': 'Learning dashboard', 'footer.privacy': 'Privacy', 'footer.terms': 'Terms', 'footer.copyright': '© 2026 Study AI Now! — AI engineering courses',
    'support.button': 'Buy me a coffee', 'support.eyebrow': 'Every course is free', 'support.title': 'Learn freely. Support if it helped.', 'support.body': 'Every course on Study AI Now! is free. If this course helped you, you can say thanks by buying me a coffee.', 'support.free': 'Free learning, always', 'support.notNow': 'Maybe later', 'support.processing': 'Opening secure checkout…', 'support.unavailable': 'Donations are not available yet. Please try again later.', 'support.startFailed': 'We could not open secure checkout. Please try again.', 'support.successTitle': 'Thank you for your support!', 'support.successBody': 'Your payment was received securely. It helps keep every course free.', 'support.cancelledTitle': 'No problem', 'support.cancelledBody': 'Your donation was not completed. The courses will remain free for you.', 'support.close': 'Close',
    'lab.loading': 'Loading CLI Lab…', 'lab.interactive': 'Interactive practice', 'lab.reset': 'Reset', 'lab.start': 'Start practice', 'lab.login': 'Log in', 'lab.steps': 'Steps', 'lab.startHint': 'Start practice to save commands to the D1 Lab session.', 'lab.completed': 'This interactive exercise is complete', 'lab.command': 'Enter command', 'lab.submit': 'Submit', 'lab.safety': 'Safety boundary: this lab matches commands and provides feedback only. It does not run a shell or read your file system.', 'lab.unavailable': 'CLI Lab is temporarily unavailable.', 'lab.loginFirst': 'Log in before starting a saved CLI Lab practice.', 'lab.startFailed': 'Unable to start CLI Lab.', 'lab.submitFailed': 'Command submission failed.',
    'course.markComplete': 'Mark this lesson complete',
    'course.completeCourse': 'Complete course',
  },
  'zh-CN': {
    'nav.courses': '课程', 'nav.jobs': '岗位能力地图', 'nav.login': '登录', 'nav.dashboard': '学习后台', 'nav.language': '语言',
    'catalog.hero.title': '像读电子书一样学习 AI 编程', 'catalog.hero.body': 'Study AI Now! 聚焦 Claude Code、Vibe Coding 与 AI Agent 工程，把概念、实操和交付流程串成可复用的学习路径。', 'catalog.search': '搜索 Claude Code、MCP、Agent…', 'catalog.searchButton': '找课程',
    'catalog.continue': '继续学习', 'catalog.myDashboard': '我的学习后台', 'catalog.lessonContext': '第 {{chapter}} 章 · 第 {{lesson}} 节：{{title}}', 'catalog.continueReading': '继续阅读', 'catalog.popular': '热门课程', 'catalog.showing': '显示 {{filtered}} / {{total}} 条学习路径', 'catalog.noMatches': '没有匹配的课程', 'catalog.noMatchesBody': '请减少筛选条件或清除筛选后重新浏览。', 'catalog.clearFilters': '清除筛选', 'catalog.more': '查看更多课程', 'catalog.goal': '目标：加一个课程页', 'catalog.plan': '计划 · 执行 · 验证',
    'filter.title': '筛选', 'filter.open': '打开筛选', 'filter.close': '关闭筛选', 'filter.clear': '清除', 'filter.showing': '当前显示 {{filtered}} / {{total}} 门课程', 'filter.topic': '主题', 'filter.difficulty': '难度', 'filter.access': '课程类型', 'filter.beginner': '入门', 'filter.intermediate': '进阶', 'filter.advanced': '高阶', 'filter.free': '免费章节', 'filter.pro': 'Pro 会员',
    'course.catalog': '课程', 'course.chapter': '第 {{number}} 章', 'course.lesson': '第 {{number}} 节', 'course.chapterAndLessons': '{{chapters}} 章 / {{lessons}} 节', 'course.lessons': '{{count}} 节', 'course.lessonExercises': '小节练习', 'course.guidedCourse': '系统课程', 'course.practice': '实战练习', 'course.taskByLesson': '逐节任务', 'course.startFirst': '开始第一节', 'course.viewChapters': '查看章节目录', 'course.outline': '章节目录', 'course.outlineBody': '点击任一章节进入章节导读，再选择具体小节。', 'course.fromFirst': '从第一节开始', 'course.task': '小任务：{{task}}', 'course.previous': '上一节', 'course.next': '下一节', 'course.enterFirst': '进入第一小节', 'course.progress': '课程进度', 'course.openDashboard': '进入学习后台', 'course.pageContents': '本页内容', 'course.published': '已上线', 'course.comingSoon': '规划中',
    'footer.catalog': '课程目录', 'footer.dashboard': '学习后台', 'footer.privacy': '隐私', 'footer.terms': '条款', 'footer.copyright': '© 2026 Study AI Now! · AI 编程课程',
    'support.button': '请我喝杯咖啡', 'support.eyebrow': '全部课程永久免费', 'support.title': '免费学习；如果有收获，欢迎请我喝杯咖啡', 'support.body': 'Study AI Now! 的全部课程均可免费学习。如果课程对你有帮助，欢迎用一杯咖啡表达感谢。', 'support.free': '学习始终免费', 'support.notNow': '暂时不用', 'support.processing': '正在打开安全支付页面…', 'support.unavailable': '打赏暂未开放，请稍后再试。', 'support.startFailed': '无法打开安全支付页面，请重试。', 'support.successTitle': '感谢你的支持！', 'support.successBody': '已安全收到你的支付。你的支持帮助本站持续免费。', 'support.cancelledTitle': '没关系', 'support.cancelledBody': '本次打赏没有完成，课程仍会一直免费开放。', 'support.close': '关闭',
    'lab.loading': 'CLI Lab 加载中…', 'lab.interactive': '互动实战', 'lab.reset': '重置', 'lab.start': '开始练习', 'lab.login': '去登录', 'lab.steps': '步骤', 'lab.startHint': '点击“开始练习”后，命令会保存到 D1 的 Lab 会话。', 'lab.completed': '本节互动练习已完成', 'lab.command': '输入命令', 'lab.submit': '提交', 'lab.safety': '安全边界：本实验只做命令匹配与反馈，不执行真实 shell，也不读取你的文件系统。', 'lab.unavailable': 'CLI Lab 暂不可用。', 'lab.loginFirst': '请先登录，再开始保存 CLI Lab 练习。', 'lab.startFailed': '无法开始 CLI Lab。', 'lab.submitFailed': '命令提交失败。',
    'course.markComplete': '完成本节',
    'course.completeCourse': '完成课程',
  },
  'zh-TW': {
    'nav.courses': '課程', 'nav.jobs': '職位能力地圖', 'nav.login': '登入', 'nav.dashboard': '學習後台', 'nav.language': '語言',
    'catalog.hero.title': '像閱讀實作書一樣學習 AI 程式設計', 'catalog.hero.body': 'Study AI Now! 聚焦 Claude Code、Vibe Coding 與 AI Agent 工程，串連觀念、實作與交付流程，建立可重複使用的學習路徑。', 'catalog.search': '搜尋 Claude Code、MCP 或 Agent…', 'catalog.searchButton': '尋找課程',
    'catalog.continue': '繼續學習', 'catalog.myDashboard': '我的學習後台', 'catalog.lessonContext': '第 {{chapter}} 章 · 第 {{lesson}} 節：{{title}}', 'catalog.continueReading': '繼續閱讀', 'catalog.popular': '精選課程', 'catalog.showing': '顯示 {{filtered}} / {{total}} 條學習路徑', 'catalog.noMatches': '沒有相符的課程', 'catalog.noMatchesBody': '請減少篩選條件，或清除篩選後再瀏覽。', 'catalog.clearFilters': '清除篩選', 'catalog.more': '查看更多課程', 'catalog.goal': '目標：新增一個課程頁面', 'catalog.plan': '規劃 · 實作 · 驗證',
    'filter.title': '篩選', 'filter.open': '開啟篩選', 'filter.close': '關閉篩選', 'filter.clear': '清除', 'filter.showing': '目前顯示 {{filtered}} / {{total}} 門課程', 'filter.topic': '主題', 'filter.difficulty': '難度', 'filter.access': '課程方案', 'filter.beginner': '入門', 'filter.intermediate': '進階', 'filter.advanced': '高階', 'filter.free': '免費單元', 'filter.pro': 'Pro 會員',
    'course.catalog': '課程', 'course.chapter': '第 {{number}} 章', 'course.lesson': '第 {{number}} 節', 'course.chapterAndLessons': '{{chapters}} 章 / {{lessons}} 節', 'course.lessons': '{{count}} 節', 'course.lessonExercises': '單元練習', 'course.guidedCourse': '系統課程', 'course.practice': '實作練習', 'course.taskByLesson': '逐節任務', 'course.startFirst': '開始第一節', 'course.viewChapters': '查看章節目錄', 'course.outline': '章節目錄', 'course.outlineBody': '開啟任一章的導讀後，再選擇具體單元。', 'course.fromFirst': '從第一節開始', 'course.task': '小任務：{{task}}', 'course.previous': '上一節', 'course.next': '下一節', 'course.enterFirst': '進入第一節', 'course.progress': '課程進度', 'course.openDashboard': '進入學習後台', 'course.pageContents': '本頁內容', 'course.published': '已上線', 'course.comingSoon': '規劃中',
    'footer.catalog': '課程目錄', 'footer.dashboard': '學習後台', 'footer.privacy': '隱私權', 'footer.terms': '服務條款', 'footer.copyright': '© 2026 Study AI Now! · AI 程式設計課程',
    'support.button': '請我喝杯咖啡', 'support.eyebrow': '所有課程永久免費', 'support.title': '免費學習；若有收穫，歡迎請我喝杯咖啡', 'support.body': 'Study AI Now! 的所有課程均可免費學習。若課程對你有幫助，歡迎以一杯咖啡表達謝意。', 'support.free': '學習永遠免費', 'support.notNow': '暫時不用', 'support.processing': '正在開啟安全付款頁面…', 'support.unavailable': '打賞功能暫未開放，請稍後再試。', 'support.startFailed': '無法開啟安全付款頁面，請重試。', 'support.successTitle': '感謝你的支持！', 'support.successBody': '已安全收到你的付款。你的支持有助本站持續免費開放。', 'support.cancelledTitle': '沒關係', 'support.cancelledBody': '本次打賞未完成，課程仍會一直免費開放。', 'support.close': '關閉',
    'lab.loading': '正在載入 CLI Lab…', 'lab.interactive': '互動實作', 'lab.reset': '重設', 'lab.start': '開始練習', 'lab.login': '前往登入', 'lab.steps': '步驟', 'lab.startHint': '開始練習後，輸入的命令會儲存到 D1 的 Lab 工作階段。', 'lab.completed': '本節互動練習已完成', 'lab.command': '輸入命令', 'lab.submit': '提交', 'lab.safety': '安全界線：本實驗只比對命令並提供回饋，不會執行真實 Shell，也不會讀取你的檔案系統。', 'lab.unavailable': 'CLI Lab 暫時無法使用。', 'lab.loginFirst': '請先登入，再開始會儲存的 CLI Lab 練習。', 'lab.startFailed': '無法開始 CLI Lab。', 'lab.submitFailed': '命令提交失敗。',
    'course.markComplete': '完成本節',
    'course.completeCourse': '完成課程',
  },
  fr: {
    'nav.courses': 'Cours', 'nav.login': 'Connexion', 'nav.dashboard': 'Espace d’apprentissage', 'nav.language': 'Langue', 'catalog.hero.title': 'Apprenez l’ingénierie IA comme dans un guide pratique', 'catalog.hero.body': 'Study AI Now! relie les concepts, la pratique et les flux de livraison pour Claude Code, le Vibe Coding et les agents IA.', 'catalog.search': 'Rechercher Claude Code, MCP ou un agent…', 'catalog.searchButton': 'Trouver des cours', 'catalog.continue': 'Reprendre l’apprentissage', 'catalog.myDashboard': 'Mon espace d’apprentissage', 'catalog.lessonContext': 'Chapitre {{chapter}} · Leçon {{lesson}} : {{title}}', 'catalog.continueReading': 'Continuer la lecture', 'catalog.popular': 'Cours à la une', 'catalog.showing': '{{filtered}} parcours sur {{total}} affichés', 'catalog.noMatches': 'Aucun cours correspondant', 'catalog.noMatchesBody': 'Réduisez ou effacez les filtres pour parcourir à nouveau.', 'catalog.clearFilters': 'Effacer les filtres', 'catalog.more': 'Voir plus de cours', 'catalog.goal': 'Objectif : ajouter une page de cours', 'catalog.plan': 'Planifier · réaliser · vérifier', 'filter.title': 'Filtres', 'filter.open': 'Ouvrir les filtres', 'filter.close': 'Fermer les filtres', 'filter.clear': 'Effacer', 'filter.showing': '{{filtered}} cours sur {{total}} affichés', 'filter.topic': 'Thème', 'filter.difficulty': 'Niveau', 'filter.access': 'Accès au cours', 'filter.beginner': 'Débutant', 'filter.intermediate': 'Intermédiaire', 'filter.advanced': 'Avancé', 'filter.free': 'Leçons gratuites', 'filter.pro': 'Abonnement Pro', 'course.catalog': 'Catalogue des cours', 'course.chapter': 'Chapitre {{number}}', 'course.lesson': 'Leçon {{number}}', 'course.chapterAndLessons': '{{chapters}} chapitres / {{lessons}} leçons', 'course.lessons': '{{count}} leçons', 'course.lessonExercises': 'Exercices par leçon', 'course.guidedCourse': 'Parcours guidé', 'course.practice': 'Mise en pratique', 'course.taskByLesson': 'Tâches par leçon', 'course.startFirst': 'Commencer la première leçon', 'course.viewChapters': 'Voir les chapitres', 'course.outline': 'Plan du cours', 'course.outlineBody': 'Ouvrez un chapitre, puis choisissez une leçon.', 'course.fromFirst': 'Commencer par la première leçon', 'course.task': 'Exercice : {{task}}', 'course.previous': 'Leçon précédente', 'course.next': 'Leçon suivante', 'course.enterFirst': 'Ouvrir la première leçon', 'course.progress': 'Progression du cours', 'course.openDashboard': 'Ouvrir l’espace d’apprentissage', 'course.pageContents': 'Sur cette page', 'course.published': 'Publié', 'course.comingSoon': 'Bientôt disponible', 'footer.catalog': 'Catalogue des cours', 'footer.dashboard': 'Espace d’apprentissage', 'footer.privacy': 'Confidentialité', 'footer.terms': 'Conditions', 'footer.copyright': '© 2026 Study AI Now! — Cours d’ingénierie IA', 'support.button': 'Offrez-moi un café', 'support.eyebrow': 'Tous les cours sont gratuits', 'support.title': 'Apprenez librement. Soutenez le site si cela vous a aidé.', 'support.body': 'Tous les cours de Study AI Now! sont gratuits. Si ce cours vous a aidé, vous pouvez nous remercier en m’offrant un café.', 'support.free': 'Apprendre reste toujours gratuit', 'support.notNow': 'Pas maintenant', 'support.processing': 'Ouverture du paiement sécurisé…', 'support.unavailable': 'Les dons ne sont pas encore disponibles. Réessayez plus tard.', 'support.startFailed': 'Impossible d’ouvrir le paiement sécurisé. Réessayez.', 'support.successTitle': 'Merci pour votre soutien !', 'support.successBody': 'Votre paiement a été reçu en toute sécurité. Il permet de garder tous les cours gratuits.', 'support.cancelledTitle': 'Aucun problème', 'support.cancelledBody': 'Votre don n’a pas été finalisé. Les cours restent gratuits pour vous.', 'support.close': 'Fermer', 'lab.loading': 'Chargement du CLI Lab…', 'lab.interactive': 'Exercice interactif', 'lab.reset': 'Réinitialiser', 'lab.start': 'Commencer', 'lab.login': 'Se connecter', 'lab.steps': 'Étapes', 'lab.startHint': 'Commencez l’exercice pour enregistrer les commandes dans la session D1 Lab.', 'lab.completed': 'Cet exercice interactif est terminé', 'lab.command': 'Saisir une commande', 'lab.submit': 'Envoyer', 'lab.safety': 'Limite de sécurité : ce laboratoire compare les commandes et fournit un retour. Il n’exécute aucun shell et ne lit pas votre système de fichiers.', 'lab.unavailable': 'Le CLI Lab est temporairement indisponible.', 'lab.loginFirst': 'Connectez-vous avant de commencer un exercice CLI Lab enregistré.', 'lab.startFailed': 'Impossible de démarrer le CLI Lab.', 'lab.submitFailed': 'L’envoi de la commande a échoué.',
    'course.markComplete': 'Marquer la leçon comme terminée',
    'course.completeCourse': 'Terminer le cours',
  },
  es: {
    'nav.courses': 'Cursos', 'nav.login': 'Iniciar sesión', 'nav.dashboard': 'Panel de aprendizaje', 'nav.language': 'Idioma', 'catalog.hero.title': 'Aprende ingeniería de IA como si leyeras una guía práctica', 'catalog.hero.body': 'Study AI Now! conecta conceptos, práctica y flujos de entrega para Claude Code, Vibe Coding y agentes de IA.', 'catalog.search': 'Buscar Claude Code, MCP o agentes…', 'catalog.searchButton': 'Buscar cursos', 'catalog.continue': 'Continuar aprendiendo', 'catalog.myDashboard': 'Mi panel de aprendizaje', 'catalog.lessonContext': 'Capítulo {{chapter}} · Lección {{lesson}}: {{title}}', 'catalog.continueReading': 'Seguir leyendo', 'catalog.popular': 'Cursos destacados', 'catalog.showing': 'Mostrando {{filtered}} de {{total}} rutas de aprendizaje', 'catalog.noMatches': 'No hay cursos coincidentes', 'catalog.noMatchesBody': 'Reduce o borra los filtros para volver a explorar.', 'catalog.clearFilters': 'Borrar filtros', 'catalog.more': 'Ver más cursos', 'catalog.goal': 'Objetivo: añadir una página de curso', 'catalog.plan': 'Planificar · crear · verificar', 'filter.title': 'Filtros', 'filter.open': 'Abrir filtros', 'filter.close': 'Cerrar filtros', 'filter.clear': 'Borrar', 'filter.showing': 'Mostrando {{filtered}} de {{total}} cursos', 'filter.topic': 'Tema', 'filter.difficulty': 'Nivel', 'filter.access': 'Acceso al curso', 'filter.beginner': 'Inicial', 'filter.intermediate': 'Intermedio', 'filter.advanced': 'Avanzado', 'filter.free': 'Lecciones gratuitas', 'filter.pro': 'Membresía Pro', 'course.catalog': 'Catálogo de cursos', 'course.chapter': 'Capítulo {{number}}', 'course.lesson': 'Lección {{number}}', 'course.chapterAndLessons': '{{chapters}} capítulos / {{lessons}} lecciones', 'course.lessons': '{{count}} lecciones', 'course.lessonExercises': 'Ejercicios por lección', 'course.guidedCourse': 'Curso guiado', 'course.practice': 'Práctica aplicada', 'course.taskByLesson': 'Tareas en cada lección', 'course.startFirst': 'Iniciar la primera lección', 'course.viewChapters': 'Ver capítulos', 'course.outline': 'Temario del curso', 'course.outlineBody': 'Abre un capítulo y después elige una lección.', 'course.fromFirst': 'Empezar por la primera lección', 'course.task': 'Tarea: {{task}}', 'course.previous': 'Lección anterior', 'course.next': 'Lección siguiente', 'course.enterFirst': 'Abrir la primera lección', 'course.progress': 'Progreso del curso', 'course.openDashboard': 'Abrir panel de aprendizaje', 'course.pageContents': 'En esta página', 'course.published': 'Publicado', 'course.comingSoon': 'Próximamente', 'footer.catalog': 'Catálogo de cursos', 'footer.dashboard': 'Panel de aprendizaje', 'footer.privacy': 'Privacidad', 'footer.terms': 'Términos', 'footer.copyright': '© 2026 Study AI Now! — Cursos de ingeniería de IA', 'support.button': 'Invítame a un café', 'support.eyebrow': 'Todos los cursos son gratis', 'support.title': 'Aprende gratis. Apoya el sitio si te ha servido.', 'support.body': 'Todos los cursos de Study AI Now! son gratuitos. Si este curso te ha ayudado, puedes dar las gracias invitándome a un café.', 'support.free': 'Aprender siempre será gratis', 'support.notNow': 'Quizá más tarde', 'support.processing': 'Abriendo el pago seguro…', 'support.unavailable': 'Las donaciones aún no están disponibles. Inténtalo más tarde.', 'support.startFailed': 'No pudimos abrir el pago seguro. Vuelve a intentarlo.', 'support.successTitle': '¡Gracias por tu apoyo!', 'support.successBody': 'Tu pago se recibió de forma segura. Ayuda a mantener todos los cursos gratuitos.', 'support.cancelledTitle': 'No pasa nada', 'support.cancelledBody': 'Tu donación no se completó. Los cursos seguirán siendo gratuitos para ti.', 'support.close': 'Cerrar', 'lab.loading': 'Cargando CLI Lab…', 'lab.interactive': 'Práctica interactiva', 'lab.reset': 'Restablecer', 'lab.start': 'Iniciar práctica', 'lab.login': 'Iniciar sesión', 'lab.steps': 'Pasos', 'lab.startHint': 'Inicia la práctica para guardar los comandos en la sesión D1 Lab.', 'lab.completed': 'Este ejercicio interactivo está completo', 'lab.command': 'Introduce un comando', 'lab.submit': 'Enviar', 'lab.safety': 'Límite de seguridad: este laboratorio solo compara comandos y ofrece comentarios. No ejecuta una shell ni lee tu sistema de archivos.', 'lab.unavailable': 'CLI Lab no está disponible temporalmente.', 'lab.loginFirst': 'Inicia sesión antes de comenzar una práctica CLI Lab guardada.', 'lab.startFailed': 'No se pudo iniciar CLI Lab.', 'lab.submitFailed': 'No se pudo enviar el comando.',
    'course.markComplete': 'Marcar esta lección como completada',
    'course.completeCourse': 'Completar el curso',
  },
} as const;

// Legacy account and dashboard strings live below; siteCopy contains every
// learner-facing course/catalogue string added for the five-language experience.
const resources = {
  en: {
    translation: {
      ...siteCopy.en,
      'nav.jobs': 'Job Skills Map',
      "Dashboard": "Dashboard",
      "Tutorials": "Tutorials",
      "User Management": "User Management",
      "Billing": "Billing",
      "Settings": "Settings",
      "Referral": "Referral",
      "Documentation": "Documentation",
      "Support": "Support",
      "Admin Panel": "Admin Panel",
      "Technical Tutorials": "Technical Tutorials",
      "Course Management": "Course Management",
      "Manage technical tutorials, track engagement, and update curriculum.": "Manage technical tutorials, track engagement, and update curriculum.",
      "Add New Course": "Add New Course",
      "Profile": "Profile",
      "Logout": "Logout",
      "Home": "Home",
      "Courses": "Courses",
      "About": "About",
      "Login": "Login",
      "Privacy": "Privacy",
      "Terms": "Terms",
      "Contact": "Contact",
      "Account menu": "Account menu",
      "Admin menu": "Admin menu",
      "User menu": "User menu",
      "Language": "Language",
      "Email": "Email",
      "Password": "Password",
      "Username": "Username",
      "Registration email": "Registration email",
      "Confirm password": "Confirm password",
      "Login failed": "Login failed",
      "Registration failed": "Registration failed",
      "Logging in...": "Logging in...",
      "Creating...": "Creating...",
      "Forgot password?": "Forgot password?",
      "Continue with Google": "Continue with Google",
      "No account yet?": "No account yet?",
      "Create account": "Create account",
      "Already have an account?": "Already have an account?",
      "Go to login": "Go to login",
      "Log in to save reading progress, CLI Lab sessions, and subscription status.": "Log in to save reading progress, CLI Lab sessions, and subscription status.",
      "Study AI Now! is used only for course accounts, learning progress, and subscription management.": "Study AI Now! is used only for course accounts, learning progress, and subscription management.",
      "Email verification succeeded. You can now log in.": "Email verification succeeded. You can now log in.",
      "The verification link is invalid or expired. Please register again or resend the verification email.": "The verification link is invalid or expired. Please register again or resend the verification email.",
      "Google login is not configured yet. Please use email and password first.": "Google login is not configured yet. Please use email and password first.",
      "Google login failed. Please try again later.": "Google login failed. Please try again later.",
      "After registration, verify your email before logging in and saving learning progress.": "After registration, verify your email before logging in and saving learning progress.",
      "Register and send verification email": "Register and send verification email",
      "Registration successful. Please check {{email}} for the verification email.": "Registration successful. Please check {{email}} for the verification email.",
      "Open development verification link": "Open development verification link",
      "Search...": "Search...",
      "Search courses, articles...": "Search courses, articles...",
      "Search courses, chapters, CLI Lab...": "Search courses, chapters, CLI Lab...",
      "English": "English",
      "French": "Français",
      "Spanish": "Español",
      "Chinese": "中文"
    }
  },
  fr: {
    translation: {
      ...siteCopy.fr,
      'nav.jobs': 'Compétences métiers',
      "Dashboard": "Tableau de bord",
      "Tutorials": "Tutoriels",
      "User Management": "Gestion des utilisateurs",
      "Billing": "Facturation",
      "Settings": "Paramètres",
      "Referral": "Parrainage",
      "Documentation": "Documentation",
      "Support": "Assistance",
      "Admin Panel": "Panneau d'administration",
      "Technical Tutorials": "Tutoriels techniques",
      "Course Management": "Gestion des cours",
      "Manage technical tutorials, track engagement, and update curriculum.": "Gérez les tutoriels techniques, suivez l'engagement et mettez à jour le programme.",
      "Add New Course": "Ajouter un cours",
      "Profile": "Profil",
      "Logout": "Se déconnecter",
      "Home": "Accueil",
      "Courses": "Cours",
      "About": "À propos",
      "Login": "Connexion",
      "Privacy": "Confidentialité",
      "Terms": "Conditions",
      "Contact": "Contact",
      "Account menu": "Menu du compte",
      "Admin menu": "Menu administrateur",
      "User menu": "Menu utilisateur",
      "Language": "Langue",
      "Email": "Email",
      "Password": "Mot de passe",
      "Username": "Nom d'utilisateur",
      "Registration email": "Email d'inscription",
      "Confirm password": "Confirmer le mot de passe",
      "Login failed": "Connexion échouée",
      "Registration failed": "Inscription échouée",
      "Logging in...": "Connexion...",
      "Creating...": "Création...",
      "Forgot password?": "Mot de passe oublié ?",
      "Continue with Google": "Continuer avec Google",
      "No account yet?": "Pas encore de compte ?",
      "Create account": "Créer un compte",
      "Already have an account?": "Vous avez déjà un compte ?",
      "Go to login": "Aller à la connexion",
      "Log in to save reading progress, CLI Lab sessions, and subscription status.": "Connectez-vous pour enregistrer la progression de lecture, les sessions CLI Lab et l'état de l'abonnement.",
      "Study AI Now! is used only for course accounts, learning progress, and subscription management.": "Study AI Now! est utilisé uniquement pour les comptes de cours, la progression d'apprentissage et la gestion des abonnements.",
      "Email verification succeeded. You can now log in.": "La vérification de l'email a réussi. Vous pouvez maintenant vous connecter.",
      "The verification link is invalid or expired. Please register again or resend the verification email.": "Le lien de vérification est invalide ou expiré. Veuillez vous inscrire à nouveau ou renvoyer l'email de vérification.",
      "Google login is not configured yet. Please use email and password first.": "La connexion Google n'est pas encore configurée. Veuillez d'abord utiliser l'email et le mot de passe.",
      "Google login failed. Please try again later.": "La connexion Google a échoué. Veuillez réessayer plus tard.",
      "After registration, verify your email before logging in and saving learning progress.": "Après l'inscription, vérifiez votre email avant de vous connecter et d'enregistrer la progression d'apprentissage.",
      "Register and send verification email": "S'inscrire et envoyer l'email de vérification",
      "Registration successful. Please check {{email}} for the verification email.": "Inscription réussie. Veuillez vérifier l'email de vérification envoyé à {{email}}.",
      "Open development verification link": "Ouvrir le lien de vérification de développement",
      "Search...": "Rechercher...",
      "Search courses, articles...": "Rechercher des cours, articles...",
      "Search courses, chapters, CLI Lab...": "Rechercher des cours, chapitres, CLI Lab...",
      "English": "English",
      "French": "Français",
      "Spanish": "Español",
      "Chinese": "中文"
    }
  },
  es: {
    translation: {
      ...siteCopy.es,
      'nav.jobs': 'Mapa de habilidades laborales',
      "Dashboard": "Panel de control",
      "Tutorials": "Tutoriales",
      "User Management": "Gestión de usuarios",
      "Billing": "Facturación",
      "Settings": "Ajustes",
      "Referral": "Referencias",
      "Documentation": "Documentación",
      "Support": "Soporte",
      "Admin Panel": "Panel de administrador",
      "Technical Tutorials": "Tutoriales técnicos",
      "Course Management": "Gestión de cursos",
      "Manage technical tutorials, track engagement, and update curriculum.": "Gestione tutoriales técnicos, haga un seguimiento de la participación y actualice el plan de estudios.",
      "Add New Course": "Añadir nuevo curso",
      "Profile": "Perfil",
      "Logout": "Cerrar sesión",
      "Home": "Inicio",
      "Courses": "Cursos",
      "About": "Acerca de",
      "Login": "Iniciar sesión",
      "Privacy": "Privacidad",
      "Terms": "Términos",
      "Contact": "Contacto",
      "Account menu": "Menú de cuenta",
      "Admin menu": "Menú de administrador",
      "User menu": "Menú de usuario",
      "Language": "Idioma",
      "Email": "Correo electrónico",
      "Password": "Contraseña",
      "Username": "Nombre de usuario",
      "Registration email": "Correo de registro",
      "Confirm password": "Confirmar contraseña",
      "Login failed": "Error al iniciar sesión",
      "Registration failed": "Error al registrarse",
      "Logging in...": "Iniciando sesión...",
      "Creating...": "Creando...",
      "Forgot password?": "¿Olvidaste tu contraseña?",
      "Continue with Google": "Continuar con Google",
      "No account yet?": "¿Aún no tienes cuenta?",
      "Create account": "Crear cuenta",
      "Already have an account?": "¿Ya tienes cuenta?",
      "Go to login": "Ir a iniciar sesión",
      "Log in to save reading progress, CLI Lab sessions, and subscription status.": "Inicia sesión para guardar el progreso de lectura, las sesiones de CLI Lab y el estado de la suscripción.",
      "Study AI Now! is used only for course accounts, learning progress, and subscription management.": "Study AI Now! se usa solo para cuentas de cursos, progreso de aprendizaje y gestión de suscripciones.",
      "Email verification succeeded. You can now log in.": "Verificación de correo completada. Ya puedes iniciar sesión.",
      "The verification link is invalid or expired. Please register again or resend the verification email.": "El enlace de verificación no es válido o ha caducado. Regístrate de nuevo o vuelve a enviar el correo de verificación.",
      "Google login is not configured yet. Please use email and password first.": "El inicio de sesión con Google aún no está configurado. Usa primero correo y contraseña.",
      "Google login failed. Please try again later.": "El inicio de sesión con Google falló. Inténtalo de nuevo más tarde.",
      "After registration, verify your email before logging in and saving learning progress.": "Después de registrarte, verifica tu correo antes de iniciar sesión y guardar el progreso de aprendizaje.",
      "Register and send verification email": "Registrarse y enviar correo de verificación",
      "Registration successful. Please check {{email}} for the verification email.": "Registro completado. Revisa el correo de verificación enviado a {{email}}.",
      "Open development verification link": "Abrir enlace de verificación de desarrollo",
      "Search...": "Buscar...",
      "Search courses, articles...": "Buscar cursos, artículos...",
      "Search courses, chapters, CLI Lab...": "Buscar cursos, capítulos, CLI Lab...",
      "English": "English",
      "French": "Français",
      "Spanish": "Español",
      "Chinese": "中文"
    }
  },
  'zh-CN': {
    translation: {
      ...siteCopy['zh-CN'],
      'nav.jobs': '岗位能力地图',
      "Dashboard": "仪表盘",
      "Tutorials": "课程管理",
      "User Management": "用户管理",
      "Billing": "财务",
      "Settings": "设置",
      "Referral": "推荐",
      "Documentation": "文档",
      "Support": "支持",
      "Admin Panel": "管理面板",
      "Technical Tutorials": "技术教程",
      "Course Management": "课程管理",
      "Manage technical tutorials, track engagement, and update curriculum.": "管理技术教程，跟踪参与度并更新课程。",
      "Add New Course": "添加新课程",
      "Profile": "个人资料",
      "Logout": "退出登录",
      "Home": "首页",
      "Courses": "课程",
      "About": "关于",
      "Login": "登录",
      "Privacy": "隐私",
      "Terms": "条款",
      "Contact": "联系",
      "Account menu": "账户菜单",
      "Admin menu": "管理员菜单",
      "User menu": "用户菜单",
      "Language": "语言",
      "Email": "邮箱",
      "Password": "密码",
      "Username": "用户名",
      "Registration email": "注册邮箱",
      "Confirm password": "再次输入密码",
      "Login failed": "登录失败",
      "Registration failed": "注册失败",
      "Logging in...": "登录中...",
      "Creating...": "创建中...",
      "Forgot password?": "忘记密码？",
      "Continue with Google": "使用 Google 继续",
      "No account yet?": "还没有账户？",
      "Create account": "创建账户",
      "Already have an account?": "已有账户？",
      "Go to login": "去登录",
      "Log in to save reading progress, CLI Lab sessions, and subscription status.": "登录后可以保存阅读进度、CLI Lab 会话和订阅状态。",
      "Study AI Now! is used only for course accounts, learning progress, and subscription management.": "Study AI Now! 仅用于课程账户、学习进度和订阅管理。",
      "Email verification succeeded. You can now log in.": "邮箱验证成功，现在可以登录。",
      "The verification link is invalid or expired. Please register again or resend the verification email.": "验证链接无效或已过期，请重新注册或重新发送验证邮件。",
      "Google login is not configured yet. Please use email and password first.": "Google 登录尚未完成配置，请先使用邮箱密码登录。",
      "Google login failed. Please try again later.": "Google 登录失败，请稍后重试。",
      "After registration, verify your email before logging in and saving learning progress.": "注册后需要先完成邮箱验证，才能登录并保存学习进度。",
      "Register and send verification email": "注册并发送验证邮件",
      "Registration successful. Please check {{email}} for the verification email.": "注册成功，请检查 {{email}} 的验证邮件。",
      "Open development verification link": "打开开发环境验证链接",
      "Search...": "搜索...",
      "Search courses, articles...": "搜索课程、章节、练习...",
      "Search courses, chapters, CLI Lab...": "搜索课程、章节、CLI Lab...",
      "Welcome back, Alex.": "欢迎回来，Alex。",
      "COURSES IN PROGRESS": "学习中的课程",
      "TOTAL POINTS": "积分余额",
      "LEARNING HOURS": "学习时长",
      "Continue Learning": "继续学习",
      "View All": "查看全部",
      "Module 4": "第 4 模块",
      "Mastering the CLI Agent": "掌握 CLI Agent",
      "65% Completed": "已完成 65%",
      "2h left": "剩余 2 小时",
      "Learning Activity": "学习活动",
      "Hours spent last 7 days": "最近 7 天学习时长",
      "+12% vs last week": "比上周增加 12%",
      "Referral Program": "推荐计划",
      "Invite & Earn": "邀请并获得奖励",
      "Get 500 pts for every friend who joins.": "每邀请一位朋友加入可获得 500 积分。",
      "Referrals": "推荐人数",
      "Earned": "已获得",
      "Your unique link": "你的专属链接",
      "English": "English",
      "French": "Français",
      "Spanish": "Español",
      "Chinese": "中文"
    }
  },
  'zh-TW': {
    translation: {
      ...siteCopy['zh-TW'],
      'nav.jobs': '職位能力地圖',
      "Dashboard": "儀表板", "Tutorials": "課程管理", "User Management": "使用者管理", "Billing": "帳務", "Settings": "設定", "Referral": "推薦", "Documentation": "文件", "Support": "支援", "Admin Panel": "管理面板", "Technical Tutorials": "技術教學", "Course Management": "課程管理", "Manage technical tutorials, track engagement, and update curriculum.": "管理技術教學、追蹤參與情況並更新課程。", "Add New Course": "新增課程", "Profile": "個人資料", "Logout": "登出", "Home": "首頁", "Courses": "課程", "About": "關於", "Login": "登入", "Privacy": "隱私權", "Terms": "服務條款", "Contact": "聯絡我們", "Account menu": "帳號選單", "Admin menu": "管理員選單", "User menu": "使用者選單", "Language": "語言", "Email": "電子郵件", "Password": "密碼", "Username": "使用者名稱", "Registration email": "註冊電子郵件", "Confirm password": "再次輸入密碼", "Login failed": "登入失敗", "Registration failed": "註冊失敗", "Logging in...": "登入中…", "Creating...": "建立中…", "Forgot password?": "忘記密碼？", "Continue with Google": "使用 Google 繼續", "No account yet?": "還沒有帳號？", "Create account": "建立帳號", "Already have an account?": "已有帳號？", "Go to login": "前往登入", "Log in to save reading progress, CLI Lab sessions, and subscription status.": "登入後可儲存閱讀進度、CLI Lab 工作階段與訂閱狀態。", "Study AI Now! is used only for course accounts, learning progress, and subscription management.": "Study AI Now! 僅用於課程帳號、學習進度與訂閱管理。", "Email verification succeeded. You can now log in.": "電子郵件驗證成功，現在可以登入。", "The verification link is invalid or expired. Please register again or resend the verification email.": "驗證連結無效或已過期，請重新註冊或再次傳送驗證電子郵件。", "Google login is not configured yet. Please use email and password first.": "Google 登入尚未完成設定，請先使用電子郵件與密碼。", "Google login failed. Please try again later.": "Google 登入失敗，請稍後再試。", "After registration, verify your email before logging in and saving learning progress.": "註冊後請先完成電子郵件驗證，才能登入並儲存學習進度。", "Register and send verification email": "註冊並傳送驗證電子郵件", "Registration successful. Please check {{email}} for the verification email.": "註冊成功，請查看寄往 {{email}} 的驗證電子郵件。", "Open development verification link": "開啟開發環境驗證連結", "Search...": "搜尋…", "Search courses, articles...": "搜尋課程、文章…", "Search courses, chapters, CLI Lab...": "搜尋課程、章節、CLI Lab…", "Welcome back, Alex.": "歡迎回來，Alex。", "COURSES IN PROGRESS": "進行中的課程", "TOTAL POINTS": "點數餘額", "LEARNING HOURS": "學習時數", "Continue Learning": "繼續學習", "View All": "查看全部", "Module 4": "第 4 模組", "Mastering the CLI Agent": "掌握 CLI Agent", "65% Completed": "已完成 65%", "2h left": "剩餘 2 小時", "Learning Activity": "學習活動", "Hours spent last 7 days": "最近 7 天學習時數", "+12% vs last week": "較上週增加 12%", "Referral Program": "推薦計畫", "Invite & Earn": "邀請並獲得獎勵", "Get 500 pts for every friend who joins.": "每邀請一位朋友加入即可獲得 500 點。", "Referrals": "推薦人數", "Earned": "已獲得", "Your unique link": "你的專屬連結", "English": "English", "French": "Français", "Spanish": "Español", "Chinese": "簡體中文"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: initialLocale,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

if (typeof document !== 'undefined') document.documentElement.lang = initialLocale;

i18n.on('languageChanged', (language) => {
  const locale = APP_LOCALES.some((item) => item.code === language) ? language : 'zh-CN';
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  if (typeof window !== 'undefined') window.localStorage.setItem('studyai.now.locale', locale);
});

export default i18n;
