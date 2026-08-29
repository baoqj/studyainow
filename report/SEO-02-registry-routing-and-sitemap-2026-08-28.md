# Study AI Now! SEO-02 注册表、语言路由与 Sitemap 测试报告

- 日期：2026-08-28
- 模块：统一 SEO 页面注册表、主题中心、语言 URL、索引门控、Sitemap、robots

## 实施内容

1. 新增 `src/lib/seoRegistry.ts`，用 0–10 的可审查质量分决定是否可索引；阈值为 8 分。
2. 新增四个五语言主题中心数据与 React 页面：Claude Code、OpenAI Codex、AI Agent Engineering、FDE Career。
3. 对外语言 URL 规范化为 `/zh-cn/`、`/zh-tw/`、`/en/`、`/fr/`、`/es/`；保留对旧大小写路径和无语言公共路径的单跳 301 兼容逻辑。
4. Sitemap 改为自动生成的 Sitemap Index：页面、简中课程、英文课程三个子 Sitemap。
5. 简中 19 门课程和英文 4 门已审校核心课程进入候选 Sitemap；繁中、法语、西语以及未完成英文课程仍可访问，但返回 `noindex,nofollow`。
6. `/contact` 改为公开可爬但不索引；`robots.txt` 不再阻止爬虫读取其 HTTP `noindex`。
7. 删除 HTML、Worker 和浏览器路由更新中的 `meta keywords`；关键词仅存在于可见课程/主题正文、Title 和 Description 的自然语境中。
8. 首页与主题中心的 Worker 初始 HTML 包含 H1、摘要、面包屑、真实内部链接与可见 FAQ；主题页 Schema 包含 `BreadcrumbList`、`CollectionPage` 和 `FAQPage`。

## 自动化测试

| 命令 | 结果 | 关键断言 |
| --- | --- | --- |
| `npm run generate:sitemap` | 通过 | 生成 3 个 Sitemap；16 个页面入口、23 个课程入口 |
| `npm run verify:seo-foundation` | 通过 | 小写 URL、301、robots、质量门控、Schema、H1/FAQ 回退正文、Sitemap 内容、无 meta keywords |
| `npm run typecheck` | 通过 | TypeScript 无错误 |
| `npm run build` | 通过 | Vite 生产构建成功 |

## 构建观察

构建保留一条既有警告：`NotFound.tsx` 同时被动态和静态导入。它不阻断构建，也不影响路由正确性。

构建还显示 `courseAnalytics-*.js` 约 8.35 MB（gzip 约 1.26 MB）的惰性课程相关块。该块不是首页入口，但会影响课程详情页性能，是后续“内容按页面拆包/预渲染试点”前必须处理的 P1 性能项；本轮不会通过压缩正文或牺牲课程体验来掩盖该问题。

## 未进行的生产动作

尚未部署。当前工作树含大量与 SEO 无关的未提交修改，直接执行部署会把它们一并发布。生产部署必须在隔离这些变更或经明确确认后进行，并重新运行正式 URL 的 HTTP、HTML、CSP、301、Sitemap 和浏览器测试。
