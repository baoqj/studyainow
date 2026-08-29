# SEO-04 本地 Worker 与浏览器验证报告

日期：2026-08-29
范围：StudyAI Now SEO 基础改造的构建、HTTP、浏览器与回归验证。

## 验证环境

- 代码目录：`/Users/aibao/Documents/Project/AI-course/studyainow/Code`
- 生产构建：Vite 6.4.2
- 本地运行时：`wrangler@4.127.1 dev --local --port 8788`
- 浏览器：本机 Google Chrome（Playwright 无头模式）

项目锁定的 Wrangler 版本无法识别 `2026-08-07` compatibility date；验证时临时使用新版 Wrangler，未修改项目依赖或 Cloudflare 配置。

## 静态与单元验证

| 命令 | 结果 | 覆盖内容 |
| --- | --- | --- |
| `npm run generate:sitemap` | 通过 | 生成 1 个 sitemap index、18 个公共页面 URL、23 个已审核课程 URL |
| `npm run verify:seo-foundation` | 通过 | 小写语言 URL、301、质量门槛、静态 HTML、Schema、sitemap 与无 meta keywords |
| `npm run verify:localized-seo` | 通过 | 中文/英文已审核页面的 canonical、hreflang、语义正文；未审核法语页 noindex |
| `npm run verify:public-pages` | 通过 | About、Contact、Privacy、Terms、导航、robots 与联系表单 |
| `npm run verify:donations` | 通过 | Stripe webhook 合约未受影响 |
| `npm run typecheck` | 通过 | TypeScript 无错误 |
| `npm run build` | 通过 | 5,349 modules transformed |

构建仅保留非阻断警告：`NotFound.tsx` 同时被动态与静态引用，及少数较大 chunk。课程分析包已从约 8.35 MB（gzip 1.26 MB）降到约 7.88 MB（gzip 1.16 MB）；余下的大包应在后续性能专项中继续按课程内容域拆分，不能为了 SEO 冒险移除课程正文。

## 本地 HTTP 验证

| URL | 状态 | 验证结果 |
| --- | --- | --- |
| `/` | 301 | 定向至 `/zh-cn`，消除无语言 URL 的重复内容 |
| `/zh-cn` | 200 | `index,follow`、canonical、3 个 hreflang、JSON-LD、可抓取 H1 |
| `/en/topics/claude-code` | 200 | 英文 topic hub、FAQ、CollectionPage、语言专属 canonical |
| `/en/courses/claude-code-guide` | 200 | `index,follow`、课程 H1、课程结构化数据 |
| `/fr/courses/claude-code-guide` | 200 | `noindex,nofollow`，不在 sitemap/hreflang 中 |
| `/contact` | 301 | 定向至 `/zh-cn/contact` |
| `/sitemap.xml` | 200 | sitemap index，可发现三个子 sitemap |
| `/does-not-exist` | 404 | `noindex,nofollow` |

HTTP 响应中的 `#root` 已包含服务端注入的语义内容。示例：首页响应有 7,038 字节的可抓取正文，英文 Claude Code 主题页有 5,311 字节；这不是空壳 SPA。

## 浏览器与回归验证

1. 本地 Worker 打开 `/en/topics/claude-code`：页面首屏不自动打开打赏对话框，英文 H1 与 `html[lang=en]` 正确，浏览器未报告 `pageerror`。
2. 点击页脚打赏按钮：对话框正常打开，仍可使用 Stripe、微信和支付宝入口。
3. `npx playwright test --config playwright.config.ts --reporter=line`：13/13 通过。
   - 公共页面、五语种信息页、课程/职位/简历直接 URL；
   - 课程制作到“我的课程”、空间 Logo 返回课程页；
   - 访谈目录、移动端筛选与题目页；
   - 无白屏与无页面脚本错误断言。

## 发布边界

本报告只证明本地构建和本地 Worker 行为。当前工作树已有大量与本次 SEO 无关的未提交文件和修改；为避免将其他进行中的职位、管理后台或课程工作一同发布，本次没有执行 `wrangler deploy`。应在隔离提交或干净部署工作树中发布后，补做线上 HTTP、Search Console 和 sitemap 提交验证。

为避免之后新增课程而遗漏 sitemap，已将 `generate:sitemap` 加入 `prebuild`；今后执行 `npm run build` 或 `npm run deploy` 会先重建 sitemap。
