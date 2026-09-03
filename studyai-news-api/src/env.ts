export interface Env {
  DB: D1Database;
  ENVIRONMENT: 'development' | 'staging' | 'production' | 'test';
  RELEASE_VERSION: string;
}
