import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const [packageSource, contractSource] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../openapi/news-api.yaml', import.meta.url), 'utf8'),
]);

const packageJson = JSON.parse(packageSource);
const contract = YAML.parse(contractSource);
const healthOperation = contract?.paths?.['/api/news/v1/health']?.get;
const healthSchema = contract?.components?.schemas?.HealthResponse;
const requiredOperations = {
  listNewsSources: contract?.paths?.['/api/admin/news/sources']?.get,
  createNewsSource: contract?.paths?.['/api/admin/news/sources']?.post,
  probeNewsSource: contract?.paths?.['/api/admin/news/sources/probe']?.post,
  updateNewsSource: contract?.paths?.['/api/admin/news/sources/{sourceId}']?.patch,
  retireNewsSource: contract?.paths?.['/api/admin/news/sources/{sourceId}']?.delete,
  runNewsSource: contract?.paths?.['/api/admin/news/sources/{sourceId}/run']?.post,
  createNewsAdminSession: contract?.paths?.['/api/admin/news/session']?.post,
  getNewsEditorialDashboard: contract?.paths?.['/api/admin/news/dashboard']?.get,
  listNewsCandidates: contract?.paths?.['/api/admin/news/candidates']?.get,
  enrichNewsCandidates: contract?.paths?.['/api/admin/news/candidates/enrich']?.post,
  updateNewsCandidateMetadata: contract?.paths?.['/api/admin/news/candidates/{storyId}']?.patch,
  listNewsArticles: contract?.paths?.['/api/admin/news/articles']?.get,
  createNewsArticle: contract?.paths?.['/api/admin/news/articles']?.post,
  getNewsArticle: contract?.paths?.['/api/admin/news/articles/{articleId}']?.get,
  reviseNewsArticle: contract?.paths?.['/api/admin/news/articles/{articleId}']?.patch,
  performNewsArticleAction: contract?.paths?.['/api/admin/news/articles/{articleId}/actions/{action}']?.post,
  listNewsTaxonomy: contract?.paths?.['/api/admin/news/taxonomy']?.get,
  createNewsTag: contract?.paths?.['/api/admin/news/taxonomy/tags']?.post,
  updateNewsTaxonomy: contract?.paths?.['/api/admin/news/taxonomy/{taxonomyId}']?.patch,
  mergeNewsTag: contract?.paths?.['/api/admin/news/taxonomy/{taxonomyId}/merge']?.post,
};

const failures = [];
if (contract?.openapi !== '3.1.0') failures.push('OpenAPI version must be 3.1.0');
if (contract?.info?.version !== packageJson.version) failures.push('Contract version must match package version');
if (healthOperation?.operationId !== 'getNewsApiHealth') failures.push('Health operationId is missing');
if (!healthOperation?.responses?.['200']) failures.push('Health 200 response is missing');
if (!healthOperation?.responses?.['503']) failures.push('Health 503 response is missing');
if (!healthOperation?.responses?.['405']) failures.push('Health 405 response is missing');
if (contract?.components?.securitySchemes?.ingestionOperator?.scheme !== 'bearer') {
  failures.push('Ingestion operator bearer security scheme is missing');
}

for (const [operationId, operation] of Object.entries(requiredOperations)) {
  if (operation?.operationId !== operationId) failures.push(`${operationId} operation is missing`);
  if (!operation?.security?.some((entry) => Object.hasOwn(entry, 'ingestionOperator') || Object.hasOwn(entry, 'adminSession'))) {
    failures.push(`${operationId} must require News administrator authentication`);
  }
}

for (const requiredField of ['ok', 'service', 'version', 'release', 'environment', 'database', 'traceId']) {
  if (!healthSchema?.required?.includes(requiredField)) {
    failures.push(`HealthResponse must require ${requiredField}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${contract.info.title} ${contract.info.version}`);
}
