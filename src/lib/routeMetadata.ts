import { COURSE_SEO, getCourseSeoCopy, SITE_SEO } from '../data/courseSeo';
import { EDITORIAL_POLICY } from '../data/editorialPolicy';
import { getTopicSeoCopy, isTopicSeoSlug, TOPIC_SEO } from '../data/topicSeo';
import { indexableLocalesForPath, isSeoIndexable } from './seoRegistry';
import {
  isLocalizablePublicPath,
  localeFromPathname,
  localizedPublicPath,
  normalizePathname,
  withoutLocalePrefix,
  type PublicLocale,
} from './localeRoutes';

const SITE_ORIGIN = 'https://studyai.now';

const PUBLIC_COURSE_IDS = new Set([
  'agent-design-patterns', 'agent-engineering', 'agent-loop-control', 'ai-beginner-question-map', 'ai-image-production',
  'ai-learning-orientation', 'ai-literacy-and-boundaries', 'chat-completion-systems', 'claude-code-guide', 'codex-tutorial',
  'communicating-with-ai', 'context-engineering', 'forward-deployed-engineering', 'hallucination-mitigation',
  'hermes-agent-guide', 'llm-core-principles', 'llm-cost-model-selection', 'prompt-engineering-production', 'prompt-security',
]);

const INTERVIEW_SETS: Record<string, { levels: number; questionsPerLevel: number }> = {
  'ai-engineering-progressive-assessment': { levels: 6, questionsPerLevel: 6 },
  'inference-engine-scheduler': { levels: 5, questionsPerLevel: 1 },
};

const PRIVATE_OR_BEHAVIOR_PATHS = [
  /^\/admin(?:\/|$)/, /^\/me(?:\/|$)/, /^\/login$/, /^\/register$/, /^\/forgot-password$/, /^\/reset-password$/,
  /^\/dashboard(?:\/|$)/, /^\/mycourse$/, /^\/creator(?:\/|$)/, /^\/resume(?:\/|$)/, /^\/myjob$/,
];

const EXACT_PUBLIC_PATHS = new Set([
  '/', '/courses', '/jobs', '/interviews', '/privacy', '/terms', '/about', '/contact', '/editorial-policy', '/login', '/register',
  '/forgot-password', '/reset-password', '/dashboard', '/dashboard/referrals', '/dashboard/settings', '/dashboard/billing',
  '/mycourse', '/creator', '/creator/new', '/resume', '/myjob',
]);

const routeCopy: Record<PublicLocale, {
  about: string; aboutDescription: string; chapter: string; contact: string; contactDescription: string; course: string;
  interview: string; interviewDescription: string; lesson: string; privacy: string; privacyDescription: string;
  terms: string; termsDescription: string;
}> = {
  'zh-CN': {
    about: '关于 Study AI Now!', aboutDescription: '了解 Study AI Now! 如何连接原创 AI 课程、实战练习与职业能力。', chapter: '第 {number} 章', contact: '联系 Study AI Now!', contactDescription: '联系 Study AI Now! 获取课程、账户、合作或技术支持。', course: '课程', interview: 'AI 工程面试练习', interviewDescription: '通过原创 AI 工程面试题、提示和解析进行练习。', lesson: '第 {number} 节', privacy: '隐私政策', privacyDescription: '了解 Study AI Now! 如何处理账户、学习、联系与广告信息。', terms: '服务条款', termsDescription: '使用 Study AI Now! 课程、职位信息和学习工具的条款。',
  },
  'zh-TW': {
    about: '關於 Study AI Now!', aboutDescription: '了解 Study AI Now! 如何連結原創 AI 課程、實作練習與職涯能力。', chapter: '第 {number} 章', contact: '聯絡 Study AI Now!', contactDescription: '聯絡 Study AI Now! 取得課程、帳戶、合作或技術支援。', course: '課程', interview: 'AI 工程面試練習', interviewDescription: '透過原創 AI 工程面試題、提示與解析進行練習。', lesson: '第 {number} 節', privacy: '隱私權政策', privacyDescription: '了解 Study AI Now! 如何處理帳戶、學習、聯絡與廣告資訊。', terms: '服務條款', termsDescription: '使用 Study AI Now! 課程、職缺資訊與學習工具的條款。',
  },
  en: {
    about: 'About Study AI Now!', aboutDescription: 'Learn how Study AI Now! connects original AI courses, practical exercises, and job-ready capabilities.', chapter: 'Chapter {number}', contact: 'Contact Study AI Now!', contactDescription: 'Contact Study AI Now! about courses, accounts, partnerships, or technical support.', course: 'Course', interview: 'AI Engineering Interview Practice', interviewDescription: 'Practice original AI engineering interview questions with guided hints and explanations.', lesson: 'Lesson {number}', privacy: 'Privacy Policy', privacyDescription: 'How Study AI Now! handles account, learning, contact, and advertising information.', terms: 'Terms of Service', termsDescription: 'Terms for using Study AI Now! courses, job information, and learning tools.',
  },
  fr: {
    about: 'À propos de Study AI Now!', aboutDescription: 'Découvrez comment Study AI Now! relie cours IA originaux, exercices pratiques et compétences métier.', chapter: 'Chapitre {number}', contact: 'Contacter Study AI Now!', contactDescription: 'Contactez Study AI Now! pour les cours, comptes, partenariats ou le support technique.', course: 'Cours', interview: 'Entraînement aux entretiens en ingénierie IA', interviewDescription: 'Entraînez-vous avec des questions originales d’entretien en ingénierie IA et des explications guidées.', lesson: 'Leçon {number}', privacy: 'Politique de confidentialité', privacyDescription: 'Comment Study AI Now! traite les informations de compte, d’apprentissage, de contact et de publicité.', terms: 'Conditions d’utilisation', termsDescription: 'Conditions d’utilisation des cours, informations d’emploi et outils d’apprentissage Study AI Now!.',
  },
  es: {
    about: 'Acerca de Study AI Now!', aboutDescription: 'Conoce cómo Study AI Now! conecta cursos originales de IA, práctica y capacidades profesionales.', chapter: 'Capítulo {number}', contact: 'Contacta con Study AI Now!', contactDescription: 'Contacta con Study AI Now! sobre cursos, cuentas, alianzas o soporte técnico.', course: 'Curso', interview: 'Práctica de entrevistas de ingeniería de IA', interviewDescription: 'Practica preguntas originales de entrevistas de ingeniería de IA con pistas y explicaciones.', lesson: 'Lección {number}', privacy: 'Política de privacidad', privacyDescription: 'Cómo Study AI Now! gestiona información de cuentas, aprendizaje, contacto y publicidad.', terms: 'Términos de servicio', termsDescription: 'Términos para usar los cursos, información de empleo y herramientas de aprendizaje de Study AI Now!.',
  },
};

export type RouteAlternate = { href: string; hreflang: string };
export type RouteBreadcrumb = { name: string; url: string };

export type RouteMetadata = {
  alternates: RouteAlternate[];
  canonical: string;
  description: string;
  isKnownRoute: boolean;
  keywords: string[];
  language: PublicLocale;
  openGraphLocale: string;
  robots: 'index,follow' | 'noindex,nofollow';
  structuredData: Record<string, unknown>;
  title: string;
};

function readableSlug(value: string) {
  return decodeURIComponent(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const FULLY_LOCALIZED_COURSES = new Set([
  'claude-code-guide',
  'codex-tutorial',
  'forward-deployed-engineering',
  'hermes-agent-guide',
]);

function hasLocalizedLessonContent(courseId: string, locale: PublicLocale) {
  return locale === 'zh-CN' || FULLY_LOCALIZED_COURSES.has(courseId);
}

function isKnownCoursePath(pathname: string) {
  const match = pathname.match(/^\/courses\/([^/]+)(?:\/chapters\/[^/]+(?:\/lessons\/[^/]+)?)?$/);
  return Boolean(match && PUBLIC_COURSE_IDS.has(match[1]));
}

function isKnownInterviewPath(pathname: string) {
  const match = pathname.match(/^\/interviews\/([^/]+)(?:\/levels\/([^/]+)(?:\/questions\/([^/]+))?)?$/);
  if (!match) return false;
  const definition = INTERVIEW_SETS[match[1]];
  if (!definition) return false;
  if (!match[2]) return true;
  const level = Number(match[2]);
  if (!Number.isInteger(level) || level < 1 || level > definition.levels) return false;
  if (!match[3]) return true;
  const questionMatch = match[3].match(/^(\d+)-(\d+)$/);
  if (!questionMatch || Number(questionMatch[1]) !== level) return false;
  const question = Number(questionMatch[2]);
  return question >= 1 && question <= definition.questionsPerLevel;
}

function isKnownTopicPath(pathname: string) {
  const match = pathname.match(/^\/topics\/([^/]+)$/);
  return Boolean(match && isTopicSeoSlug(match[1]));
}

export function isKnownDocumentRoute(pathname: string) {
  const path = withoutLocalePrefix(normalizePathname(pathname));
  if (EXACT_PUBLIC_PATHS.has(path)) return true;
  if (PRIVATE_OR_BEHAVIOR_PATHS.some((pattern) => pattern.test(path))) return true;
  return isKnownCoursePath(path) || isKnownInterviewPath(path) || isKnownTopicPath(path) || /^\/jobs\/[^/]+$/.test(path);
}

export function isNoIndexRoute(pathname: string) {
  const path = withoutLocalePrefix(normalizePathname(pathname));
  if (!isKnownDocumentRoute(path)) return true;
  if (PRIVATE_OR_BEHAVIOR_PATHS.some((pattern) => pattern.test(path))) return true;
  return path === '/jobs' || path.startsWith('/jobs/') || path === '/contact';
}

function replaceNumber(template: string, value: string | undefined) {
  return template.replace('{number}', value ? readableSlug(value) : '');
}

function languageCode(locale: PublicLocale) {
  return { 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', fr: 'fr_FR', es: 'es_ES' }[locale];
}

function breadcrumbSchema(items: RouteBreadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })),
    }],
  };
}

function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function staticCopy(locale: PublicLocale) {
  return {
    'zh-CN': { browse: '浏览课程', curriculum: '课程目录', overview: '课程概览', skills: '覆盖技能', outcomes: '你将学会', related: '相关学习路径' },
    'zh-TW': { browse: '瀏覽課程', curriculum: '課程目錄', overview: '課程概覽', skills: '涵蓋技能', outcomes: '你將學會', related: '相關學習路徑' },
    en: { browse: 'Browse courses', curriculum: 'Course catalogue', overview: 'Course overview', skills: 'Covered skills', outcomes: 'What you will learn', related: 'Related learning paths' },
    fr: { browse: 'Parcourir les cours', curriculum: 'Catalogue des cours', overview: 'Présentation du cours', skills: 'Compétences abordées', outcomes: 'Vous apprendrez', related: 'Parcours associés' },
    es: { browse: 'Explorar cursos', curriculum: 'Catálogo de cursos', overview: 'Resumen del curso', skills: 'Habilidades tratadas', outcomes: 'Lo que aprenderás', related: 'Rutas relacionadas' },
  }[locale];
}

/**
 * A compact, server-rendered semantic fallback. React replaces this after the
 * application loads, but crawlers and no-JavaScript clients immediately see a
 * language-specific H1, descriptions, course links and long-tail keywords.
 * It intentionally uses only reviewed catalogue copy, never gated lesson text.
 */
export function getRouteBootstrapHtml(pathname: string) {
  const metadata = getRouteMetadata(pathname);
  if (!metadata.isKnownRoute || metadata.robots !== 'index,follow') return '';

  const requestPath = normalizePathname(pathname);
  const language = localeFromPathname(requestPath) ?? 'zh-CN';
  const path = withoutLocalePrefix(requestPath);
  const site = SITE_SEO[language];
  const copy = staticCopy(language);
  const homePath = localizedPublicPath('/', language);

  if (path === '/' || path === '/courses') {
    const cards = Object.entries(COURSE_SEO).map(([courseId, localized]) => {
      const course = localized[language];
      const href = localizedPublicPath(`/courses/${courseId}`, language);
      return `<article><h2><a href="${escapeHtml(href)}">${escapeHtml(course.title)}</a></h2><p>${escapeHtml(course.subtitle)}</p><p>${escapeHtml(course.description)}</p><p>${escapeHtml(course.keywords.join(' · '))}</p></article>`;
    }).join('');
    const topicLinks = Object.values(TOPIC_SEO).map((topic) => {
      const topicCopy = topic.copy[language];
      return `<li><a href="${escapeHtml(localizedPublicPath(`/topics/${topic.slug}`, language))}">${escapeHtml(topicCopy.h1)}</a></li>`;
    }).join('');
    return `<main data-studyainow-static="true"><header><p>Study AI Now!</p><h1>${escapeHtml(site.homeH1)}</h1><p>${escapeHtml(site.description)}</p></header><section aria-label="${escapeHtml(copy.related)}"><h2>${escapeHtml(copy.related)}</h2><ul>${topicLinks}</ul></section><section aria-label="${escapeHtml(copy.curriculum)}"><h2>${escapeHtml(copy.curriculum)}</h2>${cards}</section></main>`;
  }

  const topicMatch = path.match(/^\/topics\/([^/]+)$/);
  if (topicMatch && isTopicSeoSlug(topicMatch[1])) {
    const topic = TOPIC_SEO[topicMatch[1]];
    const topicCopy = getTopicSeoCopy(topicMatch[1], language);
    if (!topicCopy) return '';
    const courseLinks = topic.courseIds.map((courseId) => {
      const course = getCourseSeoCopy(courseId, language);
      return course ? `<li><a href="${escapeHtml(localizedPublicPath(`/courses/${courseId}`, language))}">${escapeHtml(course.title)}</a> — ${escapeHtml(course.description)}</li>` : '';
    }).join('');
    const outcomes = topicCopy.outcomes.map((outcome) => `<li>${escapeHtml(outcome)}</li>`).join('');
    const faqs = topicCopy.faqs.map((faq) => `<section><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></section>`).join('');
    return `<main data-studyainow-static="true"><nav aria-label="Breadcrumb"><a href="${escapeHtml(homePath)}">${escapeHtml(site.catalogLabel)}</a> › <span>${escapeHtml(topicCopy.eyebrow)}</span></nav><article><p>${escapeHtml(topicCopy.eyebrow)}</p><h1>${escapeHtml(topicCopy.h1)}</h1><p>${escapeHtml(topicCopy.intro)}</p><h2>${escapeHtml(copy.outcomes)}</h2><ul>${outcomes}</ul><h2>${escapeHtml(topicCopy.courseLabel)}</h2><ul>${courseLinks}</ul><h2>${escapeHtml(topicCopy.faqLabel)}</h2>${faqs}</article></main>`;
  }

  const courseMatch = path.match(/^\/courses\/([^/]+)(?:\/chapters\/([^/]+))?(?:\/lessons\/([^/]+))?$/);
  if (courseMatch) {
    const course = getCourseSeoCopy(courseMatch[1], language);
    if (!course) return '';
    const coursePath = localizedPublicPath(`/courses/${courseMatch[1]}`, language);
    const hasUnit = Boolean(courseMatch[2] || courseMatch[3]);
    const unitLabel = courseMatch[3]
      ? replaceNumber(routeCopy[language].lesson, courseMatch[3])
      : courseMatch[2] ? replaceNumber(routeCopy[language].chapter, courseMatch[2]) : '';
    const heading = hasUnit ? `${course.title} — ${unitLabel}` : course.title;
    return `<main data-studyainow-static="true"><nav aria-label="Breadcrumb"><a href="${escapeHtml(homePath)}">${escapeHtml(site.catalogLabel)}</a> › <a href="${escapeHtml(coursePath)}">${escapeHtml(course.title)}</a>${hasUnit ? ` › <span>${escapeHtml(unitLabel)}</span>` : ''}</nav><article><p>${escapeHtml(course.topic)}</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(course.subtitle)}</p><p>${escapeHtml(course.description)}</p><h2>${escapeHtml(copy.skills)}</h2><ul>${course.keywords.map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join('')}</ul><p><a href="${escapeHtml(coursePath)}">${escapeHtml(copy.overview)}</a></p></article></main>`;
  }

  if (path === '/editorial-policy') {
    const editorial = EDITORIAL_POLICY[language];
    const sections = editorial.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('');
    return `<main data-studyainow-static="true"><nav aria-label="Breadcrumb"><a href="${escapeHtml(homePath)}">${escapeHtml(site.catalogLabel)}</a> › <span>${escapeHtml(editorial.eyebrow)}</span></nav><article><p>${escapeHtml(editorial.eyebrow)}</p><h1>${escapeHtml(editorial.h1)}</h1><p>${escapeHtml(editorial.intro)}</p>${sections}<h2>${escapeHtml(editorial.correctionTitle)}</h2><p>${escapeHtml(editorial.correctionBody)}</p><p><a href="${escapeHtml(localizedPublicPath('/contact', language))}">${escapeHtml(editorial.contactLabel)}</a></p></article></main>`;
  }

  if (['/interviews', '/privacy', '/terms', '/about', '/contact'].includes(path)) {
    return `<main data-studyainow-static="true"><nav aria-label="Breadcrumb"><a href="${escapeHtml(homePath)}">${escapeHtml(site.catalogLabel)}</a></nav><article><h1>${escapeHtml(metadata.title.replace(/ \| Study AI Now!$/, ''))}</h1><p>${escapeHtml(metadata.description)}</p><p><a href="${escapeHtml(homePath)}">${escapeHtml(copy.browse)}</a></p></article></main>`;
  }

  return '';
}

export function getRouteMetadata(pathname: string): RouteMetadata {
  const requestPath = normalizePathname(pathname);
  const explicitLocale = localeFromPathname(requestPath);
  const language = explicitLocale ?? 'zh-CN';
  const path = withoutLocalePrefix(requestPath);
  const isKnownRoute = isKnownDocumentRoute(path);
  const isPublicLocalizedRoute = isKnownRoute && isLocalizablePublicPath(path);
  // `/` and `/courses` render the same course catalogue. Retain `/courses`
  // for old links, but give the catalogue exactly one canonical URL per locale.
  const canonicalContentPath = path === '/courses' ? '/' : path;
  const canonicalPath = isPublicLocalizedRoute ? localizedPublicPath(canonicalContentPath, language) : path;
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;
  const site = SITE_SEO[language];
  const copy = routeCopy[language];
  let title = site.title;
  let description = site.description;
  let keywords = site.keywords;
  let breadcrumbs: RouteBreadcrumb[] = [{ name: site.catalogLabel, url: `${SITE_ORIGIN}${localizedPublicPath('/', language)}` }];
  let courseSchema: Record<string, unknown> | undefined;
  let topicSchema: Record<string, unknown> | undefined;
  let topicFaqSchema: Record<string, unknown> | undefined;
  let untranslatedCourseRoute = false;

  if (!isKnownRoute) {
    title = language === 'zh-CN' ? '页面未找到 | Study AI Now!' : language === 'zh-TW' ? '找不到頁面 | Study AI Now!' : 'Page not found | Study AI Now!';
  } else if (path === '/interviews') {
    title = `${copy.interview} | Study AI Now!`;
    description = copy.interviewDescription;
    keywords = [copy.interview, ...site.keywords];
    breadcrumbs = [...breadcrumbs, { name: copy.interview, url: canonical }];
  } else if (path === '/privacy') {
    title = `${copy.privacy} | Study AI Now!`;
    description = copy.privacyDescription;
    breadcrumbs = [...breadcrumbs, { name: copy.privacy, url: canonical }];
  } else if (path === '/terms') {
    title = `${copy.terms} | Study AI Now!`;
    description = copy.termsDescription;
    breadcrumbs = [...breadcrumbs, { name: copy.terms, url: canonical }];
  } else if (path === '/about') {
    title = `${copy.about} | Study AI Now!`;
    description = copy.aboutDescription;
    breadcrumbs = [...breadcrumbs, { name: copy.about, url: canonical }];
  } else if (path === '/contact') {
    title = `${copy.contact} | Study AI Now!`;
    description = copy.contactDescription;
    breadcrumbs = [...breadcrumbs, { name: copy.contact, url: canonical }];
  } else if (path === '/editorial-policy') {
    const editorial = EDITORIAL_POLICY[language];
    title = editorial.title;
    description = editorial.description;
    keywords = [editorial.eyebrow, ...site.keywords];
    breadcrumbs = [...breadcrumbs, { name: editorial.eyebrow, url: canonical }];
  } else {
    const courseMatch = path.match(/^\/courses\/([^/]+)(?:\/chapters\/([^/]+))?(?:\/lessons\/([^/]+))?$/);
    const interviewMatch = path.match(/^\/interviews\/([^/]+)(?:\/levels\/([^/]+))?(?:\/questions\/([^/]+))?$/);
    const jobMatch = path.match(/^\/jobs\/([^/]+)$/);
    const topicMatch = path.match(/^\/topics\/([^/]+)$/);
    if (topicMatch && isTopicSeoSlug(topicMatch[1])) {
      const topic = TOPIC_SEO[topicMatch[1]];
      const topicCopy = getTopicSeoCopy(topicMatch[1], language)!;
      title = topicCopy.title;
      description = topicCopy.description;
      keywords = [topicCopy.h1, topicCopy.eyebrow, ...topic.courseIds.map((courseId) => getCourseSeoCopy(courseId, language)?.topic ?? ''), ...site.keywords].filter(Boolean);
      breadcrumbs = [...breadcrumbs, { name: topicCopy.eyebrow, url: canonical }];
      topicSchema = {
        '@type': 'CollectionPage',
        name: topicCopy.h1,
        description: topicCopy.description,
        url: canonical,
        inLanguage: language,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: topic.courseIds.map((courseId, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_ORIGIN}${localizedPublicPath(`/courses/${courseId}`, language)}`,
            name: getCourseSeoCopy(courseId, language)?.title,
          })),
        },
      };
      topicFaqSchema = faqSchema(topicCopy.faqs);
    } else if (courseMatch) {
      const courseId = courseMatch[1];
      const course = getCourseSeoCopy(courseId, language);
      const courseTitle = course?.title ?? readableSlug(courseId);
      const coursePath = localizedPublicPath(`/courses/${courseId}`, language);
      const unit = courseMatch[3] ? replaceNumber(copy.lesson, courseMatch[3]) : courseMatch[2] ? replaceNumber(copy.chapter, courseMatch[2]) : copy.course;
      title = courseMatch[2] || courseMatch[3] ? `${courseTitle} — ${unit} | Study AI Now!` : `${courseTitle} | Study AI Now!`;
      description = course?.description ?? `${courseTitle} | ${site.description}`;
      keywords = [...(course?.keywords ?? []), courseTitle, course?.topic ?? '', ...site.keywords].filter(Boolean);
      breadcrumbs = [...breadcrumbs, { name: courseTitle, url: `${SITE_ORIGIN}${coursePath}` }];
      if (courseMatch[2]) breadcrumbs.push({ name: replaceNumber(copy.chapter, courseMatch[2]), url: `${SITE_ORIGIN}${localizedPublicPath(`/courses/${courseId}/chapters/${courseMatch[2]}`, language)}` });
      if (courseMatch[3]) breadcrumbs.push({ name: replaceNumber(copy.lesson, courseMatch[3]), url: canonical });
      untranslatedCourseRoute = Boolean(!hasLocalizedLessonContent(courseId, language));
      courseSchema = {
        '@type': 'Course', name: courseTitle, description, url: `${SITE_ORIGIN}${coursePath}`, inLanguage: language,
        provider: { '@type': 'Organization', name: 'Study AI Now!', url: SITE_ORIGIN },
      };
    } else if (interviewMatch) {
      title = `${copy.interview} | Study AI Now!`;
      description = copy.interviewDescription;
      keywords = [copy.interview, ...site.keywords];
      breadcrumbs = [...breadcrumbs, { name: copy.interview, url: canonical }];
    } else if (jobMatch) {
      title = `${readableSlug(jobMatch[1])} | Study AI Now!`;
      description = site.description;
    }
  }

  const routeIndexable = isSeoIndexable(canonicalContentPath, language);
  const indexableLocales = indexableLocalesForPath(canonicalContentPath);
  const alternates = isPublicLocalizedRoute && routeIndexable && !untranslatedCourseRoute
    ? [...indexableLocales.map((locale) => ({ hreflang: locale, href: `${SITE_ORIGIN}${localizedPublicPath(canonicalContentPath, locale)}` })), { hreflang: 'x-default', href: `${SITE_ORIGIN}${localizedPublicPath(canonicalContentPath, 'zh-CN')}` }]
    : [];
  const structuredData = breadcrumbSchema(breadcrumbs);
  if (courseSchema) (structuredData['@graph'] as Array<Record<string, unknown>>).push(courseSchema);
  if (topicSchema && topicFaqSchema) (structuredData['@graph'] as Array<Record<string, unknown>>).push(topicSchema, topicFaqSchema);
  if (canonicalContentPath === '/') {
    (structuredData['@graph'] as Array<Record<string, unknown>>).push(
      { '@type': 'Organization', name: 'Study AI Now!', url: SITE_ORIGIN, logo: `${SITE_ORIGIN}/favicon.png` },
      { '@type': 'WebSite', name: 'Study AI Now!', url: `${SITE_ORIGIN}${localizedPublicPath('/', language)}`, inLanguage: language },
    );
  }

  return {
    alternates,
    canonical,
    description,
    isKnownRoute,
    keywords: [...new Set(keywords)].slice(0, 24),
    language,
    openGraphLocale: languageCode(language),
    // Course/15 currently has a complete learner-facing corpus only in
    // Simplified Chinese. Neither its landing nor lesson URLs are advertised
    // in another language until that locale's corpus is complete.
    robots: isNoIndexRoute(path) || untranslatedCourseRoute || !routeIndexable ? 'noindex,nofollow' : 'index,follow',
    structuredData,
    title,
  };
}
