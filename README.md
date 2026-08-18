# StudyAINow / Study AI Now

StudyAINow is the production web application behind [studyai.now](https://studyai.now). It is a Cloudflare-native learning and career platform built with React, Vite, Cloudflare Workers, D1, and R2.

This repository contains application code only. Private course source files, lesson Markdown, course media, API keys, Worker secrets, environment files, build output, and local test artifacts are intentionally excluded.

## English

### What This App Does

- Publishes the Study AI Now course catalog and course-reading experience.
- Provides AI career tooling, including job detail pages, job bookmarking, resume creation, resume export, and member dashboards.
- Includes account registration, login, password reset, email delivery, donation checkout, referral, notification, and admin workflows.
- Runs as a Vite single-page app served through a Cloudflare Worker.
- Uses Cloudflare D1 for structured application data and Cloudflare R2 for course/runtime storage.
- Includes global AdSense loader support and the root `ads.txt` asset for `studyai.now`.

### Repository Scope

Included:

- React/Vite frontend source in `src/`
- Cloudflare Worker entrypoint in `src/worker.ts`
- Cloudflare Pages-style API handlers in `functions/`
- D1 migrations in `migrations/`
- Public static assets in `public/`
- Verification and maintenance scripts in `scripts/`
- Playwright route checks in `e2e/`

Not included:

- Private course source directories such as `Course/` or `Courses/`
- Lesson Markdown files, course images, generated course bundles, and private course datasets
- Course authoring scripts and generated seed migrations that embed private curriculum text
- `.env` files, API keys, OAuth secrets, Stripe secrets, Resend secrets, LLM provider keys, and Cloudflare local state
- `node_modules/`, `dist/`, Wrangler cache, Playwright reports, screenshots, and other generated artifacts

### Local Development

```bash
npm install
npm run dev
```

The local development server uses Vite. Some course detail routes expect the private sibling course source directory used by the production build process. That content is not part of this public repository.

### Validation

```bash
npm run typecheck
npm run build
npm run test:e2e:routes
```

Some verification scripts depend on private course source files or production Cloudflare bindings and may require the private workspace layout.

### Cloudflare Deployment

The app is configured through `wrangler.toml` for:

- Worker: `studyainow-web`
- Production origin: `https://studyai.now`
- D1 binding: `DB`
- R2 binding: `COURSE_STORAGE`
- Static asset binding: `ASSETS`

Secrets must be configured with Cloudflare Workers secrets, not committed to Git. Typical secret families include email delivery, OAuth, Stripe, and LLM provider credentials.

```bash
npm run deploy
```

## 中文

### 项目用途

StudyAINow 是 [studyai.now](https://studyai.now) 的生产网站代码。它是一个基于 Cloudflare 的 AI 学习与职业发展平台，使用 React、Vite、Cloudflare Workers、D1 和 R2 构建。

主要功能包括：

- AI 课程目录、课程详情页和学习阅读体验
- 职位 JD 页面、职位收藏、简历制作、简历导出和会员中心
- 注册、登录、密码重置、邮件投递、赞助支付、推荐、通知和后台管理
- 通过 Cloudflare Worker 托管 Vite 单页应用
- 使用 Cloudflare D1 保存结构化业务数据，使用 R2 保存课程/运行时资源
- 支持 Google AdSense 全站加载代码和网站根路径 `ads.txt`

### 仓库范围

本仓库上传：

- `src/` 中的 React/Vite 前端代码
- `src/worker.ts` 中的 Cloudflare Worker 入口
- `functions/` 中的 API 处理代码
- `migrations/` 中的 D1 数据库迁移
- `public/` 中的公开静态资源
- `scripts/` 中的验证和维护脚本
- `e2e/` 中的 Playwright 路由测试

本仓库不上传：

- `Course/`、`Courses/` 等私有课程源目录
- 课程 Markdown、课程图片、生成后的课程包和私有课程数据集
- 会嵌入私有课程正文的课程生成脚本和课程种子迁移
- `.env`、API Key、OAuth Secret、Stripe Secret、Resend Secret、LLM Provider Key 和 Cloudflare 本地状态
- `node_modules/`、`dist/`、Wrangler 缓存、Playwright 报告、截图和其他生成产物

### 本地开发

```bash
npm install
npm run dev
```

本地开发使用 Vite。部分课程详情路由依赖生产构建流程使用的私有同级课程目录；这些课程内容不属于本公开代码仓库。

### 验证

```bash
npm run typecheck
npm run build
npm run test:e2e:routes
```

部分验证脚本依赖私有课程源文件或生产 Cloudflare 绑定，需要在完整私有工作区中运行。

### Cloudflare 部署

`wrangler.toml` 已配置：

- Worker：`studyainow-web`
- 生产域名：`https://studyai.now`
- D1 绑定：`DB`
- R2 绑定：`COURSE_STORAGE`
- 静态资源绑定：`ASSETS`

所有密钥都应通过 Cloudflare Workers Secrets 配置，不能提交到 Git。常见密钥包括邮件服务、OAuth、Stripe 和 LLM Provider 凭据。

```bash
npm run deploy
```
