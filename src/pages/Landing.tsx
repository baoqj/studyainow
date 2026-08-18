import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  Globe,
  Languages,
  Mail,
  Pickaxe,
  Scale,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';

type LandingLocale = 'en' | 'fr' | 'es' | 'zh';

interface ProductCard {
  name: string;
  label: string;
  body: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  external?: boolean;
}

interface ProjectCard {
  name: string;
  label: string;
  body: string;
  href: string;
  domain: string;
  icon: LucideIcon;
}

const coreProducts: Record<LandingLocale, ProductCard[]> = {
  zh: [
    {
      name: 'AIBao',
      label: 'AI 编程课程与实战训练',
      body: '面向中文开发者，提供 Claude Code、Vibe Coding、AI Agent 工程课程和可复盘的 CLI 实践环境。',
      href: '/courses',
      cta: '查看课程',
      icon: BookOpen,
    },
    {
      name: 'PineTap',
      label: '智能名片与触达工具',
      body: '用于展示个人或团队资料、联系方式和 NFC/短信触达流程，正式应用运行在 pinetap.me。',
      href: 'https://pinetap.me',
      cta: '打开 PineTap',
      icon: Fingerprint,
      external: true,
    },
  ],
  en: [
    {
      name: 'AIBao',
      label: 'AI programming courses and practice',
      body: 'Courses for developers covering Claude Code, Vibe Coding, AI Agent engineering, and reproducible CLI practice.',
      href: '/courses',
      cta: 'View courses',
      icon: BookOpen,
    },
    {
      name: 'PineTap',
      label: 'Smart business cards and outreach',
      body: 'Profiles, contact details, NFC flows, and SMS outreach for individuals and teams. The live product runs at pinetap.me.',
      href: 'https://pinetap.me',
      cta: 'Open PineTap',
      icon: Fingerprint,
      external: true,
    },
  ],
  fr: [
    {
      name: 'AIBao',
      label: 'Cours de programmation IA et pratique',
      body: "Des cours pour développeurs couvrant Claude Code, Vibe Coding, l'ingénierie des agents IA et des exercices CLI reproductibles.",
      href: '/courses',
      cta: 'Voir les cours',
      icon: BookOpen,
    },
    {
      name: 'PineTap',
      label: 'Cartes intelligentes et prise de contact',
      body: 'Profils, coordonnées, parcours NFC et prise de contact par SMS pour les personnes et les équipes. Le produit en ligne fonctionne sur pinetap.me.',
      href: 'https://pinetap.me',
      cta: 'Ouvrir PineTap',
      icon: Fingerprint,
      external: true,
    },
  ],
  es: [
    {
      name: 'AIBao',
      label: 'Cursos de programación con IA y práctica',
      body: 'Cursos para desarrolladores sobre Claude Code, Vibe Coding, ingeniería de agentes de IA y práctica CLI reproducible.',
      href: '/courses',
      cta: 'Ver cursos',
      icon: BookOpen,
    },
    {
      name: 'PineTap',
      label: 'Tarjetas inteligentes y contacto profesional',
      body: 'Perfiles, datos de contacto, flujos NFC y contacto por SMS para personas y equipos. El producto activo funciona en pinetap.me.',
      href: 'https://pinetap.me',
      cta: 'Abrir PineTap',
      icon: Fingerprint,
      external: true,
    },
  ],
};

const portfolioProjects: Record<LandingLocale, ProjectCard[]> = {
  zh: [
    {
      name: 'OpenMine',
      label: '加拿大矿业资讯分析',
      body: '一个面向加拿大矿业领域的资讯分析平台，帮助用户追踪与自然资源相关的新闻、法规和数据。它利用人工智能技术进行信息汇总、内容分类和分析。',
      href: 'https://openmine.vip',
      domain: 'openmine.vip',
      icon: Pickaxe,
    },
    {
      name: 'GoodGoGlobe 好出海',
      label: '全球市场拓展与贸易智能',
      body: '让企业出海前，先看清市场。面向中国企业的全球市场拓展与贸易智能平台，通过整合国家市场数据、贸易政策、行业机会、合规要求和本地商业资源，帮助企业快速找到适合的海外市场并降低出海风险。',
      href: 'https://goodgoglobal.com',
      domain: 'goodgoglobal.com',
      icon: Globe,
    },
    {
      name: 'CanadaLaw',
      label: '加拿大法律信息平台',
      body: '一个帮助用户更好地了解加拿大法律问题的法律信息平台。它利用人工智能技术解释法律概念、总结文件并引导用户找到相关信息。',
      href: 'https://canadalaw.vip',
      domain: 'canadalaw.vip',
      icon: Scale,
    },
    {
      name: 'Volala',
      label: 'AI 多语言学习',
      body: '一个多语言学习网站，利用人工智能技术生成多种语言的课程内容。学习结束后，用户可以通过问答形式加深和巩固所学知识。',
      href: 'https://volala.app',
      domain: 'volala.app',
      icon: Languages,
    },
  ],
  en: [
    {
      name: 'OpenMine',
      label: 'Canadian mining intelligence',
      body: "An information analysis platform for Canada's mining sector. It helps users track news, regulations, and data related to natural resources, using AI to summarize, classify, and analyze information.",
      href: 'https://openmine.vip',
      domain: 'openmine.vip',
      icon: Pickaxe,
    },
    {
      name: 'GoodGoGlobe',
      label: 'Global expansion and trade intelligence',
      body: 'Know the market before you go global. A global market expansion and trade intelligence platform for Chinese companies, integrating country market data, trade policy, industry opportunities, compliance requirements, and local business resources to help companies find suitable overseas markets and reduce expansion risk.',
      href: 'https://goodgoglobal.com',
      domain: 'goodgoglobal.com',
      icon: Globe,
    },
    {
      name: 'CanadaLaw',
      label: 'Canadian legal information',
      body: 'A legal information platform that helps users better understand Canadian legal issues. It uses AI to explain legal concepts, summarize documents, and guide users to relevant information.',
      href: 'https://canadalaw.vip',
      domain: 'canadalaw.vip',
      icon: Scale,
    },
    {
      name: 'Volala',
      label: 'AI multilingual learning',
      body: 'A multilingual learning website that uses AI to generate course content across languages. After each lesson, learners can reinforce what they learned through Q&A.',
      href: 'https://volala.app',
      domain: 'volala.app',
      icon: Languages,
    },
  ],
  fr: [
    {
      name: 'OpenMine',
      label: 'Analyse minière canadienne',
      body: "Une plateforme d'analyse de l'information pour le secteur minier canadien. Elle aide les utilisateurs à suivre les actualités, la réglementation et les données liées aux ressources naturelles, avec l'IA pour résumer, classer et analyser l'information.",
      href: 'https://openmine.vip',
      domain: 'openmine.vip',
      icon: Pickaxe,
    },
    {
      name: 'GoodGoGlobe',
      label: 'Expansion mondiale et intelligence commerciale',
      body: "Connaître le marché avant de se mondialiser. Une plateforme d'expansion internationale et d'intelligence commerciale pour les entreprises chinoises, qui intègre les données de marché par pays, les politiques commerciales, les opportunités sectorielles, les exigences de conformité et les ressources commerciales locales afin d'aider les entreprises à trouver les marchés étrangers adaptés et à réduire les risques.",
      href: 'https://goodgoglobal.com',
      domain: 'goodgoglobal.com',
      icon: Globe,
    },
    {
      name: 'CanadaLaw',
      label: 'Information juridique canadienne',
      body: "Une plateforme d'information juridique qui aide les utilisateurs à mieux comprendre les questions de droit canadien. Elle utilise l'IA pour expliquer les notions juridiques, résumer les documents et orienter vers les informations pertinentes.",
      href: 'https://canadalaw.vip',
      domain: 'canadalaw.vip',
      icon: Scale,
    },
    {
      name: 'Volala',
      label: "Apprentissage multilingue avec l'IA",
      body: "Un site d'apprentissage multilingue qui utilise l'IA pour générer du contenu de cours dans plusieurs langues. Après chaque leçon, les apprenants peuvent consolider leurs acquis grâce à des questions-réponses.",
      href: 'https://volala.app',
      domain: 'volala.app',
      icon: Languages,
    },
  ],
  es: [
    {
      name: 'OpenMine',
      label: 'Inteligencia minera canadiense',
      body: 'Una plataforma de análisis de información para el sector minero de Canadá. Ayuda a los usuarios a seguir noticias, regulaciones y datos relacionados con los recursos naturales, usando IA para resumir, clasificar y analizar la información.',
      href: 'https://openmine.vip',
      domain: 'openmine.vip',
      icon: Pickaxe,
    },
    {
      name: 'GoodGoGlobe',
      label: 'Expansión global e inteligencia comercial',
      body: 'Conoce el mercado antes de salir al mundo. Una plataforma de expansión global e inteligencia comercial para empresas chinas que integra datos de mercado por país, políticas comerciales, oportunidades sectoriales, requisitos de cumplimiento y recursos comerciales locales para ayudar a las empresas a encontrar mercados extranjeros adecuados y reducir el riesgo de expansión.',
      href: 'https://goodgoglobal.com',
      domain: 'goodgoglobal.com',
      icon: Globe,
    },
    {
      name: 'CanadaLaw',
      label: 'Información legal canadiense',
      body: 'Una plataforma de información legal que ayuda a los usuarios a comprender mejor cuestiones jurídicas de Canadá. Usa IA para explicar conceptos legales, resumir documentos y orientar hacia información relevante.',
      href: 'https://canadalaw.vip',
      domain: 'canadalaw.vip',
      icon: Scale,
    },
    {
      name: 'Volala',
      label: 'Aprendizaje multilingüe con IA',
      body: 'Un sitio de aprendizaje multilingüe que usa IA para generar contenido de cursos en varios idiomas. Después de cada lección, los estudiantes pueden reforzar lo aprendido mediante preguntas y respuestas.',
      href: 'https://volala.app',
      domain: 'volala.app',
      icon: Languages,
    },
  ],
};

const landingCopy = {
  zh: {
    badge: 'PineTap / AIBao 官方站点',
    title: 'AIBao x AI',
    intro:
      'AIBao 是面向开发者的 AI 编程教学与工具平台。aibao.me 提供课程、学习进度和订阅入口；PineTap 是正式上线的智能名片与触达产品。',
    coursesCta: '浏览 AIBao 课程',
    pineTapCta: '进入 PineTap',
    infoTitle: '关于我',
    productNameLabel: '产品与项目',
    productNameValue: 'PineTap / OpenMine / GoodGoGlobal / Volala',
    profileLabel: '个人介绍',
    profileValue: 'AI 工程师、全栈开发者、产品经理与增长实践者，专注把 AI 能力落地为可用、可扩展、可验证的产品。',
    emailLabel: '联系邮箱',
    portfolioEyebrow: '项目组合',
    portfolioTitle: 'AI 驱动的项目组合',
    portfolioBody:
      '这些项目面向资源资讯、专业社交、出海信息和语言学习等不同场景，延续同一套产品原则：信息清晰、用途明确、方便用户验证来源。',
    visitPrefix: '访问',
    trustEyebrow: '信任与审查',
    trustTitle: '干净、可核验的根域名',
    accountTitle: '账户入口',
    accountBody: '登录或注册后可以保存课程进度、CLI Lab 会话和订阅状态。',
    login: '登录',
    register: '注册',
    trustItems: [
      '清晰公开的产品说明、联系方式、隐私政策与服务条款',
      '课程阅读、CLI Lab 和学习进度均服务于 AI 编程教学',
      '登录与注册入口只用于 aibao.me 账户、课程进度和订阅管理',
    ],
  },
  en: {
    badge: 'Official PineTap / AIBao site',
    title: 'AIBao x AI',
    intro:
      'AIBao is an AI programming education and tooling platform for developers. aibao.me hosts courses, learning progress, and subscription access; PineTap is the live smart business card and outreach product.',
    coursesCta: 'Browse AIBao courses',
    pineTapCta: 'Open PineTap',
    infoTitle: 'About me',
    productNameLabel: 'Products and projects',
    productNameValue: 'AIBao / PineTap',
    profileLabel: 'Profile',
    profileValue: 'AI engineer, full-stack developer, product manager, and growth practitioner focused on turning AI capabilities into usable, scalable, verifiable products.',
    emailLabel: 'Contact email',
    portfolioEyebrow: 'Project Portfolio',
    portfolioTitle: 'AI-powered project portfolio',
    portfolioBody:
      'These projects cover natural resource intelligence, professional networking, legal information, and language learning with the same product principles: clear purpose, source awareness, and verifiable user value.',
    visitPrefix: 'Visit',
    trustEyebrow: 'Trust & Review',
    trustTitle: 'A clean, verifiable root domain',
    accountTitle: 'Account access',
    accountBody: 'Log in or register to save course progress, CLI Lab sessions, and subscription status.',
    login: 'Log in',
    register: 'Register',
    trustItems: [
      'Clear public product descriptions, contact details, privacy policy, and terms of service',
      'Course reading, CLI Lab, and learning progress all support AI programming education',
      'Login and registration are used only for aibao.me accounts, course progress, and subscription management',
    ],
  },
  fr: {
    badge: 'Site officiel PineTap / AIBao',
    title: 'AIBao x AI',
    intro:
      "AIBao est une plateforme d'enseignement et d'outils de programmation IA pour les développeurs. aibao.me héberge les cours, la progression d'apprentissage et l'accès aux abonnements; PineTap est le produit en ligne de carte professionnelle intelligente et de prise de contact.",
    coursesCta: 'Parcourir les cours AIBao',
    pineTapCta: 'Ouvrir PineTap',
    infoTitle: 'À propos de moi',
    productNameLabel: 'Produits et projets',
    productNameValue: 'AIBao / PineTap',
    profileLabel: 'Profil',
    profileValue:
      "Ingénieur IA, développeur full-stack, chef de produit et praticien de la croissance, je transforme les capacités de l'IA en produits utilisables, évolutifs et vérifiables.",
    emailLabel: 'Email de contact',
    portfolioEyebrow: 'Portefeuille de projets',
    portfolioTitle: "Portefeuille de projets propulsés par l'IA",
    portfolioBody:
      "Ces projets couvrent l'intelligence des ressources naturelles, le réseautage professionnel, l'information juridique et l'apprentissage des langues avec les mêmes principes produit: une finalité claire, des sources identifiables et une valeur vérifiable pour l'utilisateur.",
    visitPrefix: 'Visiter',
    trustEyebrow: 'Confiance et vérification',
    trustTitle: 'Un domaine racine propre et vérifiable',
    accountTitle: 'Accès au compte',
    accountBody:
      "Connectez-vous ou inscrivez-vous pour enregistrer la progression des cours, les sessions CLI Lab et l'état de l'abonnement.",
    login: 'Connexion',
    register: 'Inscription',
    trustItems: [
      'Descriptions de produit, coordonnées, politique de confidentialité et conditions de service clairement publiées',
      "La lecture des cours, CLI Lab et la progression d'apprentissage servent tous l'enseignement de la programmation IA",
      "La connexion et l'inscription sont utilisées uniquement pour les comptes aibao.me, la progression des cours et la gestion des abonnements",
    ],
  },
  es: {
    badge: 'Sitio oficial de PineTap / AIBao',
    title: 'AIBao x AI',
    intro:
      'AIBao es una plataforma de educación y herramientas de programación con IA para desarrolladores. aibao.me aloja cursos, progreso de aprendizaje y acceso a suscripciones; PineTap es el producto activo para tarjetas profesionales inteligentes y contacto.',
    coursesCta: 'Explorar cursos de AIBao',
    pineTapCta: 'Abrir PineTap',
    infoTitle: 'Sobre mí',
    productNameLabel: 'Productos y proyectos',
    productNameValue: 'AIBao / PineTap',
    profileLabel: 'Perfil',
    profileValue:
      'Ingeniero de IA, desarrollador full-stack, product manager y profesional de crecimiento enfocado en convertir capacidades de IA en productos útiles, escalables y verificables.',
    emailLabel: 'Email de contacto',
    portfolioEyebrow: 'Portafolio de proyectos',
    portfolioTitle: 'Portafolio de proyectos impulsados por IA',
    portfolioBody:
      'Estos proyectos cubren inteligencia sobre recursos naturales, networking profesional, información legal y aprendizaje de idiomas con los mismos principios de producto: propósito claro, fuentes identificables y valor verificable para el usuario.',
    visitPrefix: 'Visitar',
    trustEyebrow: 'Confianza y revisión',
    trustTitle: 'Un dominio raíz limpio y verificable',
    accountTitle: 'Acceso a la cuenta',
    accountBody:
      'Inicia sesión o regístrate para guardar el progreso de los cursos, las sesiones de CLI Lab y el estado de la suscripción.',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    trustItems: [
      'Descripciones de producto, datos de contacto, política de privacidad y términos de servicio publicados con claridad',
      'La lectura de cursos, CLI Lab y el progreso de aprendizaje apoyan la educación en programación con IA',
      'El inicio de sesión y el registro se usan solo para cuentas de aibao.me, progreso de cursos y gestión de suscripciones',
    ],
  },
};

function landingLocale(language: string): LandingLocale {
  if (language.startsWith('zh')) return 'zh';
  if (language.startsWith('fr')) return 'fr';
  if (language.startsWith('es')) return 'es';
  return 'en';
}

const ProductLink: FC<{ product: ProductCard }> = ({ product }) => {
  const Icon = product.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#edf3ea] text-[#176f5b]">
          <Icon className="h-5 w-5" />
        </div>
        {product.external ? <ExternalLink className="h-5 w-5 text-[#7a8a83]" /> : <ArrowRight className="h-5 w-5 text-[#7a8a83]" />}
      </div>
      <p className="mt-7 text-sm font-semibold uppercase tracking-normal text-[#607169]">{product.label}</p>
      <h2 className="mt-2 text-3xl font-black tracking-normal text-[#0b2f6b]">{product.name}</h2>
      <p className="mt-4 min-h-20 text-base leading-7 text-[#465851]">{product.body}</p>
      <span className="mt-6 inline-flex text-sm font-semibold text-[#2f6fed]">{product.cta}</span>
    </>
  );

  return product.external ? (
    <a
      href={product.href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-[#d8ded3] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17221f]"
    >
      {content}
    </a>
  ) : (
    <Link
      to={product.href}
      className="rounded-xl border border-[#d8ded3] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17221f]"
    >
      {content}
    </Link>
  );
};

const ProjectLink: FC<{ project: ProjectCard; visitPrefix: string }> = ({ project, visitPrefix }) => {
  const Icon = project.icon;

  return (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col rounded-lg border border-[#d8ded3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17221f]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f6ef] text-[#176f5b]">
          <Icon className="h-5 w-5" />
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-[#7a8a83]" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-normal text-[#607169]">{project.label}</p>
      <h3 className="mt-2 text-2xl font-black tracking-normal text-[#0b2f6b]">{project.name}</h3>
      <p className="mt-4 flex-1 text-sm leading-6 text-[#465851]">{project.body}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2f6fed]">
        {visitPrefix} {project.domain}
        <ArrowRight className="h-4 w-4" />
      </span>
    </a>
  );
};

export function Landing() {
  const { i18n } = useTranslation();
  const locale = landingLocale(i18n.language);
  const copy = landingCopy[locale];
  const products = coreProducts[locale];
  const projects = portfolioProjects[locale];

  return (
    <div className="min-h-screen bg-[#f8faf7] text-[#17221f] font-body-md flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <section className="border-b border-[#d8ded3] bg-[#fbfcf7]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ccd8cb] bg-white px-3 py-1.5 text-sm text-[#4a5c55] shadow-sm">
                <ShieldCheck className="h-4 w-4 text-[#176f5b]" />
                {copy.badge}
              </div>

              <h1 className="mt-7 max-w-4xl text-[clamp(2rem,7vw,5.2rem)] font-black leading-[0.96] tracking-normal text-[#0b2f6b]">
                {copy.title}
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#40524c] sm:text-xl">
                {copy.intro}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2f6fed] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#255bd0]"
                >
                  {copy.coursesCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://pinetap.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#9aa99f] bg-white px-5 py-3 text-sm font-semibold text-[#17221f] transition hover:border-[#17221f]"
                >
                  {copy.pineTapCta}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <aside className="self-start rounded-xl border border-[#ccd8cb] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f1ff] text-[#2f6fed]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#17221f]">{copy.infoTitle}</p>
                </div>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-[#17221f]">{copy.productNameLabel}</dt>
                  <dd className="mt-1 text-[#53655f]">{copy.productNameValue}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#17221f]">{copy.profileLabel}</dt>
                  <dd className="mt-1 text-[#53655f]">{copy.profileValue}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#17221f]">{copy.emailLabel}</dt>
                  <dd className="mt-1">
                    <a className="inline-flex items-center gap-2 text-[#2f6fed] hover:underline" href="mailto:studyainow@mail.com">
                      <Mail className="h-4 w-4" />
                      studyainow@mail.com
                    </a>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            {products.map((product) => (
              <ProductLink key={product.name} product={product} />
            ))}
          </div>
        </section>

        <section className="border-y border-[#d8ded3] bg-[#fbfcf7]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-14">
            <div className="mb-7 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-normal text-[#607169]">{copy.portfolioEyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-[#0b2f6b] sm:text-4xl">{copy.portfolioTitle}</h2>
              <p className="mt-4 text-base leading-7 text-[#465851] sm:text-lg">{copy.portfolioBody}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {projects.map((project) => (
                <ProjectLink key={project.name} project={project} visitPrefix={copy.visitPrefix} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8ded3] bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-[#607169]">{copy.trustEyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-[#0b2f6b]">{copy.trustTitle}</h2>
            </div>
            <div className="grid gap-3">
              {copy.trustItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-[#d8ded3] bg-[#fbfcf7] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#176f5b]" />
                  <p className="text-sm leading-6 text-[#40524c]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-4 rounded-xl border border-[#d8ded3] bg-[#eef6ff] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-normal text-[#0b2f6b]">{copy.accountTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#465851]">{copy.accountBody}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="rounded-lg border border-[#9aa99f] bg-white px-5 py-3 text-center text-sm font-semibold text-[#17221f] hover:border-[#17221f]">
                {copy.login}
              </Link>
              <Link to="/register" className="rounded-lg bg-[#176f5b] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#105746]">
                {copy.register}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
