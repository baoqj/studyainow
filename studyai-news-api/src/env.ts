export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production' | 'test';
  RELEASE_VERSION: string;
}
