# Study AI Now! SEO-01 基线与架构评估

- 审计日期：2026-08-28
- 正式域名：`https://studyai.now`
- 代码根目录：`/Users/aibao/Documents/Project/AI-course/studyainow/Code`
- 范围：仅覆盖公开内容的 SEO/GEO；不改变账户、职位、简历、支付或后台的产品权限和交互。

## 1. 已阅读的整改方案与实施原则

完整阅读 `../PRD/SEO/StudyAINow-SEO与网络营销整改方案.md` 后，本轮遵循以下约束：

1. 一个可索引 URL 只表达一种语言和一个主要搜索意图。
2. 不使用 `meta keywords`，关键词只用于真实的页面文案、标题、章节、FAQ 和描述性内部链接。
3. 职位、账户、后台、简历和工具页继续 `noindex`；不因 SEO 改造开放第三方职位 JD 索引。
4. Sitemap 只提交已通过内容质量门控的 canonical URL，不扩大未审校翻译的索引规模。
5. 保留 Vite + React + Cloudflare Worker；不把完整框架迁移与本次 SEO 改造绑定。

## 2. 正式站 HTTP 基线

用未携带会话的 HTTP 请求检查，结果如下：

| URL | HTTP | 初始正文/H1 | hreflang/JSON-LD | 结论 |
| --- | ---: | --- | --- | --- |
| `/` | 200 | 空 `#root`，无 H1 | 0 / 0 | P0：正文依赖客户端 JavaScript |
| `/en` | 404 | 无 | 0 / 0 | P0：语言独立 URL 尚未上线 |
| `/en/courses/claude-code-guide` | 404 | 无 | 0 / 0 | P0：课程语言路由尚未上线 |
| `/en/topics/claude-code` | 404 | 无 | 0 / 0 | 主题中心尚未上线 |
| `/robots.txt` | 200 | - | - | 可访问 |
| `/sitemap.xml` | 200 | - | - | 可访问，但当前为旧版小规模文件 |
| 随机不存在路径 | 404 | 无 | - | 真实 404 正常 |

正式站首页目前保留 `index,follow`，但初始 HTML 长度约 983 字节，正文为空。生产环境与工作区的语言路由/Worker SEO 代码并非同一发布状态，不能把本地实现视为已经上线。

## 3. 当前代码基线

工作区已经有尚未形成发布闭环的基础：

- `src/lib/localeRoutes.ts`：五语言公共路由。
- `src/lib/routeMetadata.ts`：Canonical、hreflang、Open Graph、JSON-LD 和简短服务端语义回退。
- `src/worker.ts`：用 `HTMLRewriter` 注入路由级 head 和根节点回退正文。
- `scripts/generate-localized-sitemap.ts`：从本地路由数据生成 Sitemap。
- `src/data/courseContent.ts`：15 门基础课程已从 eager Markdown 导入改为按课程/语言异步加载；三门核心课程仍在课程路由块内加载。

但仍存在阻断发布的问题：

1. URL 使用 `zh-CN`/`zh-TW` 大小写混合形式，尚未确定最终规范、兼容入口和服务器 301。
2. `routeMetadata` 仍为“路由解析器”，还不是带质量分和索引资格的统一页面注册表。
3. 小节元数据仍可能由 `01-01` 等 ID 派生，不能用于高意图小节的精确 Title/H1。
4. 当前 Sitemap 将五种语言的所有课程入口一起写入，未区分已审校内容与产品内可浏览但不应索引的翻译。
5. 浏览器和 Worker 仍会写入 `meta keywords`，与整改方案不一致。
6. 主题中心、FAQ、作者/编辑政策和强语义内部链接尚未闭环。
7. HTMLRewriter 回退可解决“空根节点”，但不等价于 React 的完整构建时预渲染；完整 SSR 需要单独试点。

## 4. 架构方案、难度、成本与风险

| 方案 | 工作量 | 风险 | 本轮决定 |
| --- | --- | --- | --- |
| 扩展 HTMLRewriter 的 Meta | 低 | 低，但不能提供正文 | 作为基础能力保留 |
| Worker 注入受控的语义 HTML 回退 | 中 | 低到中；必须与可见内容一致 | 立即实施，覆盖首页、主题、课程入口、公开说明页 |
| Vite + React 构建时预渲染试点 | 中到高 | i18n、浏览器 API、CSP nonce、Hydration 可能回归 | 作为下一阶段独立试点；本轮先建立兼容数据源和验收脚本 |
| Astro/Next 全站迁移 | 高 | 账户、D1/R2、AdSense、Worker API、CSP、路由重写均会受影响 | 不实施；只有 P2 数据证明收益后再做独立 Spike |
| 立即索引全部 5 语言 × 全课程/小节 | 中 | 薄内容、翻译回退和重复页面风险高 | 不实施；先仅向 Sitemap 放入通过质量门控的简中/英文页面 |
| 公开职位 JD 索引 | 中到高 | 版权、过期信息和重复内容风险高 | 不实施；继续 noindex |

## 5. 本轮原子发布边界

本轮会把以下变更作为一个整体测试：

1. 小写语言 URL（`/zh-cn/`、`/zh-tw/`、`/en/`、`/fr/`、`/es/`）以及对既有无语言/旧大小写公开 URL 的单跳 301。
2. 统一的 SEO 页面注册表、索引质量分与 Canonical/hreflang/Schema/Sitemap 数据源。
3. 四个主题中心和可见的课程/主题内部链接。
4. Worker 初始 HTML 的语义正文、面包屑和匹配的结构化数据。
5. 仅将质量分达到阈值的页面写入 Sitemap；产品可浏览但未审校的语言页面保持 `noindex`。

在完成构建、静态检查、HTTP 路由检查和浏览器回归前，不部署到正式 Worker。当前工作树已有大量与 SEO 无关的未提交改动；任何生产部署会包含这些改动，必须在最终部署前单独确认和隔离。

## 6. 测试记录

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 整改方案通读 | 通过 | 本报告第 1 节的约束和第 4 节的决策均逐项来自方案 |
| 现有 TypeScript/路由结构检查 | 通过 | `src/App.tsx`、`src/worker.ts`、`routeMetadata.ts`、`localeRoutes.ts` 已检查 |
| 正式 HTTP 基线 | 通过 | 本报告第 2 节；检查时间为 2026-08-28 |
| 生产与本地状态差异确认 | 通过 | 正式 `/en` 返回 404，而本地已有 locale 路由实现 |
