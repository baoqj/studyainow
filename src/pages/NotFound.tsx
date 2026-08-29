import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

const copy = {
  'zh-CN': { title: '页面未找到', body: '这个地址不存在，或内容已经移动。', action: '返回课程首页' },
  'zh-TW': { title: '找不到頁面', body: '這個網址不存在，或內容已經移動。', action: '返回課程首頁' },
  en: { title: 'Page not found', body: 'This address does not exist, or the content has moved.', action: 'Return to courses' },
  fr: { title: 'Page introuvable', body: 'Cette adresse n’existe pas ou le contenu a été déplacé.', action: 'Retourner aux cours' },
  es: { title: 'Página no encontrada', body: 'Esta dirección no existe o el contenido se ha movido.', action: 'Volver a los cursos' },
} as const;

export function NotFound() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const content = copy[locale as keyof typeof copy] ?? copy.en;

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-28 text-center">
        <section className="max-w-xl rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">404</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{content.title}</h1>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">{content.body}</p>
          <Link to="/" className="mt-7 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary">
            {content.action}
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
