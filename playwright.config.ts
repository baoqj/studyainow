import { defineConfig } from '@playwright/test';

const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = Number(process.env.PLAYWRIGHT_PORT || '4174');
const baseURL = `http://127.0.0.1:${port}`;
const previewBuild = process.env.PLAYWRIGHT_PREVIEW === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    launchOptions: { executablePath: chromePath },
  },
  webServer: {
    // Markdown lives in the sibling Course directory. Vite dev serves those
    // source files directly, while the production build correctly compiles
    // raw imports into JavaScript chunks. Use preview for route-load tests.
    command: previewBuild
      ? `npx vite preview --host 127.0.0.1 --port ${port}`
      : `npx vite --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
