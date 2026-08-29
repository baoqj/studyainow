import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteMetadata } from '../../lib/routeMetadata';

function ensureMeta(name: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  return element;
}

function ensureCanonical() {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  return element;
}

function updateAlternates(alternates: Array<{ hreflang: string; href: string }>) {
  document.head.querySelectorAll('link[data-studyainow-alternate="true"]').forEach((element) => element.remove());
  for (const alternate of alternates) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = alternate.hreflang;
    link.href = alternate.href;
    link.dataset.studyainowAlternate = 'true';
    document.head.appendChild(link);
  }
}

function updateStructuredData(value: Record<string, unknown>) {
  let element = document.head.querySelector<HTMLScriptElement>('script#studyainow-route-structured-data');
  if (!element) {
    element = document.createElement('script');
    element.id = 'studyainow-route-structured-data';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
}

export function RouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    const metadata = getRouteMetadata(location.pathname);
    document.title = metadata.title;
    document.documentElement.lang = metadata.language;
    ensureMeta('description').content = metadata.description;
    document.head.querySelector('meta[name="keywords"]')?.remove();
    ensureMeta('robots').content = metadata.robots;
    ensureMeta('og:title', 'property').content = metadata.title;
    ensureMeta('og:description', 'property').content = metadata.description;
    ensureMeta('og:url', 'property').content = metadata.canonical;
    ensureMeta('og:type', 'property').content = 'website';
    ensureMeta('og:locale', 'property').content = metadata.openGraphLocale;
    ensureMeta('twitter:card', 'name').content = 'summary_large_image';
    ensureMeta('twitter:title', 'name').content = metadata.title;
    ensureMeta('twitter:description', 'name').content = metadata.description;
    ensureCanonical().href = metadata.canonical;
    updateAlternates(metadata.alternates);
    updateStructuredData(metadata.structuredData);
  }, [location.pathname]);

  return null;
}
