/// <reference types="astro/client" />

interface CloudflareBindings {
  ASSETS: Fetcher;
  NEWS_API: Fetcher;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  RELEASE_VERSION: string;
}

declare namespace Cloudflare {
  interface Env extends CloudflareBindings {}
}
