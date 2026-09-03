# P0-0 仓库与双 Worker 基线验收记录

> 里程碑：P0-0
>
> 完成日期：2026-09-03
>
> 结论：通过；已部署 Staging 与 Production
>
> 下一状态：等待用户指令，不自动开始 P0-1

## 1. 交付范围

- 前端位于 `studyai-news-web/`：Astro 7 + React Islands + Cloudflare Workers；负责服务端渲染、交互状态卡和同源 API 转发。
- 后端位于 `studyai-news-api/`：TypeScript + Hono + Cloudflare Workers；负责版本化健康接口、统一 trace ID 和结构化错误。
- Web 只允许转发 `/api/news/v1/*` 与 `/api/admin/news/*`，并通过 `NEWS_API` Service Binding 调用 API Worker。
- API OpenAPI 权威契约位于 `studyai-news-api/openapi/news-api.yaml`。
- Node 固定为 `24.15.0`，两个项目分别维护 `package-lock.json`、TypeScript、Wrangler 和测试配置。
- P0-0 未创建 D1、R2、KV、Images、Queue、Workflow 或 Vectorize；Astro 的隐式 KV/Images 自动配置已显式关闭。
- 新闻采集、数据库 schema、Claim Ledger、后台编辑、文章发布、账号和付费不属于本里程碑。

## 2. Git 边界与版本

唯一 Git 根：`/Users/aibao/Documents/Project/AI-course/studyainow/Code`

分支：`feat/news-p0-foundation`，已推送至 `origin/feat/news-p0-foundation`。

| Commit | 内容 |
|---|---|
| `6c8c4c3` | 建立 News 目录边界、AGENTS 规则和 Codex 开发计划 |
| `5c2eadc` | 建立 `studyai-news-api` P0-0 Worker 基线 |
| `ea1e88f` | 建立 `studyai-news-web` P0-0 Worker 基线 |

工作区原有 Jobs 改动没有暂存、提交或移动：

- `functions/_lib/jobs.ts`
- `scripts/verify-job-presentation.ts`
- `src/worker.ts`
- `migrations/0043_publish_complete_official_job_descriptions.sql`

## 3. 自动门禁结果

| 项目 | 验证 | 结果 |
|---|---|---|
| API | `npm run cf-typegen`、TypeScript、Vitest | 通过；1 个测试文件、4 个测试 |
| API | OpenAPI YAML 结构与版本/路径校验 | 通过 |
| API | Production Wrangler dry-run | 通过；无秘密值与数据资源 binding |
| Web | `npm run cf-typegen`、Astro check、Vitest | 通过；0 诊断、1 个测试文件、5 个测试 |
| Web | Production build 与部署配置校验 | 通过；强制确认 Worker 名、环境和 `NEWS_API=studyai-news-api` |
| Web | Production Wrangler dry-run | 通过；只有 `NEWS_API`、Assets 与非秘密环境变量 |
| 依赖 | 两个项目 `npm audit` | 通过；0 个已知漏洞 |

## 4. 本地功能与视觉验收

- API 直连 `GET /api/news/v1/health`：200，含 API/version/release/environment/trace ID。
- Web 同源 `GET /api/news/v1/health`：200，Service Binding 显示 `[connected]`。
- JSON `POST /api/news/v1/health`：405，含 `Allow: GET` 与结构化错误。
- 代理边界外 `/api/not-news`：404。
- 点击“重新检查”：实际重新请求 API，正常状态保持为“双 Worker 通道已连接”。
- 中断 API Worker：页面显示“API 通道等待连接”与 HTTP 503；恢复 API 后可通过按钮回到正常状态。
- 1280×720：无横向溢出，标题、说明与完整健康状态卡均在首屏内。
- 390×844：无横向溢出，完整健康状态卡与 44px 高刷新按钮在首屏内。
- 截图检查未发现标题孤行、首屏核心卡片裁切、按钮遮挡或文字不可读问题。

## 5. Cloudflare 部署与远程验收

部署顺序严格为 API → Web。

| 环境 | Worker | Version ID | 入口 |
|---|---|---|---|
| Staging | `studyai-news-api-staging` | `db283680-201a-4ddc-9fd0-7d5edb00de10` | 由 Staging Web binding 调用 |
| Staging | `studyai-news-web-staging` | `035972a0-10fd-4854-864f-3382a642847a` | `https://studyai-news-web-staging.polluxbao.workers.dev` |
| Production | `studyai-news-api` | `8a2f3317-503c-4628-8e7e-1f1525dd5c81` | 私有 Service Binding，无公开 route |
| Production | `studyai-news-web` | `1549c76d-7ef6-455f-a1c6-9835f981527b` | `https://news.studyai.now` |

远程结果：

- Staging 页面 200，初始 HTML 显示 `staging` 与“双 Worker 通道已连接”。
- Staging 同源健康接口 200，返回 `environment: staging`。
- Production 页面 200，初始 HTML 显示 `production` 与“双 Worker 通道已连接”。
- Production 同源健康接口 200，返回 `environment: production`、`cache-control: no-store` 和 trace ID。
- Production JSON POST 健康接口返回预期 405。
- Production 浏览器在 1280×720 与 390×844 均无横向溢出；刷新按钮完成真实线上请求后保持正常状态。

## 6. 是否达到预期标准

达到。两个指定本地目录已经成为可独立安装、检查、测试、构建、部署和回滚的 Cloudflare Worker 项目；Web→API 私有通道、本地/远程健康接口、环境隔离和版本化契约均已得到运行时证据。P0-0 没有越界实现 P0-1 数据模型或后续业务功能。

## 7. 下一里程碑：P0-1 News schema 与发布状态机

等待用户下达开始指令后再执行。开始前需要沿用以下已确定需求：

1. 创建独立 D1 `studyai-news-db`，迁移只位于 `studyai-news-api/migrations/`，从 `0001` 开始。
2. 建模来源、抓取游标、source item/snapshot 元数据、story cluster、Claim/evidence、article/revision、taxonomy、技能/课程关联、workflow run、audit/idempotency、podcast/media。
3. 将公开状态机与审核状态机定义为显式约束，非法跳转必须被拒绝。
4. 不复制 StudyAINow 用户、课程或技能主表；仅保存规范 ID、关联证据、审核状态和版本。
5. 从空本地 D1 重放全部迁移，并测试外键、唯一约束、索引、升级路径和幂等性；远程先迁移 Staging，验证后再迁移 Production。
6. 更新 OpenAPI/运行文档与验收记录，继续使用精确路径提交，保持 Jobs 未提交改动不进入 News 版本。

P0-1 开始时仍需先向用户说明本阶段内容与预期标准；完成后测试、Git 提交、Cloudflare 部署并报告是否达标，然后再次等待下一阶段指令。
