import { readFile } from 'node:fs/promises';

const targetEnvironment = process.argv[2];
const expected = {
  staging: {
    name: 'studyai-news-web-staging',
    apiService: 'studyai-news-api-staging',
  },
  production: {
    name: 'studyai-news-web',
    apiService: 'studyai-news-api',
  },
}[targetEnvironment];

if (!expected) {
  throw new Error('Expected deployment environment: staging or production');
}

const rawConfig = await readFile(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8');
const config = JSON.parse(rawConfig);
const apiBinding = config.services?.find((binding) => binding.binding === 'NEWS_API');

if (config.targetEnvironment !== targetEnvironment) {
  throw new Error(
    `Built for ${String(config.targetEnvironment)}, expected ${targetEnvironment}`,
  );
}

if (config.name !== expected.name) {
  throw new Error(`Built Worker ${String(config.name)}, expected ${expected.name}`);
}

if (config.vars?.ENVIRONMENT !== targetEnvironment) {
  throw new Error(
    `Built ENVIRONMENT=${String(config.vars?.ENVIRONMENT)}, expected ${targetEnvironment}`,
  );
}

if (apiBinding?.service !== expected.apiService) {
  throw new Error(
    `Built NEWS_API=${String(apiBinding?.service)}, expected ${expected.apiService}`,
  );
}

if ((config.kv_namespaces?.length ?? 0) !== 0 || config.images) {
  throw new Error('P0-0 must not provision implicit KV or Images resources');
}

console.log(
  `Validated ${targetEnvironment} deploy config: ${config.name} -> ${apiBinding.service}`,
);
