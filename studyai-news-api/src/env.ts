export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  /** News-owned semantic recall index; canonical skill/course IDs remain in StudyAINow Core. */
  LEARNING_VECTORS?: VectorizeIndex;
  INGEST_ADMIN_TOKEN?: string;
  /** Shared only with the authenticated studyai.now admin proxy. */
  STUDYAI_ADMIN_SERVICE_TOKEN?: string;
  ENVIRONMENT: 'development' | 'staging' | 'production' | 'test';
  RELEASE_VERSION: string;
}
