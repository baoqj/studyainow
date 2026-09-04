export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  INGEST_ADMIN_TOKEN?: string;
  ENVIRONMENT: 'development' | 'staging' | 'production' | 'test';
  RELEASE_VERSION: string;
}
