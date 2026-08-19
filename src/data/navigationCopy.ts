import type { AppLocale } from './courseContent';

type NavigationCopy = {
  public: {
    courses: string;
    interviews: string;
    jobs: string;
    resume: string;
    login: string;
    register: string;
  };
  member: {
    dashboard: string;
    courses: string;
    creator: string;
    resume: string;
    jobs: string;
    referrals: string;
    settings: string;
    notifications: string;
    profile: string;
    logout: string;
  };
};

const copy: Record<AppLocale, NavigationCopy> = {
  'zh-CN': {
    public: { courses: 'AI课程', interviews: '面试题集', jobs: '工作机会', resume: '简历制作', login: '登录', register: '注册' },
    member: { dashboard: '仪表盘', courses: '我的课程', creator: '课程制作', resume: '简历制作', jobs: '我的职位', referrals: '我的推荐', settings: '设置', notifications: '提醒', profile: '个人资料', logout: '退出登录' },
  },
  'zh-TW': {
    public: { courses: 'AI課程', interviews: '面試題集', jobs: '工作機會', resume: '履歷製作', login: '登入', register: '註冊' },
    member: { dashboard: '儀表板', courses: '我的課程', creator: '課程製作', resume: '履歷製作', jobs: '我的職缺', referrals: '我的推薦', settings: '設定', notifications: '提醒', profile: '個人資料', logout: '登出' },
  },
  en: {
    public: { courses: 'Courses', interviews: 'Interview Prep', jobs: 'Jobs', resume: 'CV Maker', login: 'Login', register: 'Register' },
    member: { dashboard: 'Dashboard', courses: 'My Course', creator: 'Creator', resume: 'CV Maker', jobs: 'My Job', referrals: 'Referrals', settings: 'Settings', notifications: 'Notifications', profile: 'Profile', logout: 'Logout' },
  },
  fr: {
    public: { courses: 'Cours', interviews: 'Entretiens', jobs: 'Offres d’emploi', resume: 'Créateur de CV', login: 'Connexion', register: 'Créer un compte' },
    member: { dashboard: 'Tableau de bord', courses: 'Mes cours', creator: 'Créateur', resume: 'Créateur de CV', jobs: 'Mes offres', referrals: 'Parrainages', settings: 'Paramètres', notifications: 'Notifications', profile: 'Profil', logout: 'Déconnexion' },
  },
  es: {
    public: { courses: 'Cursos', interviews: 'Entrevistas', jobs: 'Empleos', resume: 'Creador de CV', login: 'Iniciar sesión', register: 'Registrarse' },
    member: { dashboard: 'Panel', courses: 'Mis cursos', creator: 'Creador', resume: 'Creador de CV', jobs: 'Mis empleos', referrals: 'Referidos', settings: 'Configuración', notifications: 'Notificaciones', profile: 'Perfil', logout: 'Cerrar sesión' },
  },
};

export function getNavigationCopy(locale: AppLocale): NavigationCopy {
  return copy[locale] ?? copy['zh-CN'];
}
