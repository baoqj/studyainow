# Study AI Now! SEO-03 编辑信任信号与课程性能审计

- 日期：2026-08-28
- 模块：编辑政策、内部链接、课程包体诊断

## 实施内容

1. 新增五语言 `/{locale}/editorial-policy` 页面，说明选题与原创性、示例与版本、AI 辅助的边界、广告边界、纠错机制与编辑团队联系入口。
2. 编辑政策同时提供 React 页面和 Worker 初始 HTML，因此禁用 JavaScript 的访问者与爬虫也能看到与 Schema/Meta 一致的正文。
3. 页脚与课程页页脚加入编辑政策链接；主题中心、课程入口、面试练习之间的链接保持同语言 URL。
4. 简中/英文编辑政策通过 8 分质量门控后进入 `sitemap-pages.xml`；其他三种语言保留浏览入口但不进入索引候选集。

## 测试

| 命令 | 结果 | 覆盖 |
| --- | --- | --- |
| `npm run generate:sitemap` | 通过 | 18 个公共说明/主题页 + 23 个课程页，生成 Sitemap Index 和子 Sitemap |
| `npm run verify:seo-foundation` | 通过 | 编辑政策 Canonical、初始 H1、AI 辅助披露、Sitemap 链接、语言 URL 与质量门控 |
| `npm run typecheck` | 通过 | 新页面、路由与数据类型 |

## 课程包体审计

Vite 构建前后均显示名为 `courseAnalytics-*.js` 的共享惰性课程块。FDE 正文已从 eager glob 改为按当前语言动态加载：

- 改造前：约 8.35 MB，gzip 约 1.26 MB。
- 改造后：约 7.88 MB，gzip 约 1.16 MB。

FDE 正文已被拆为当前语言的 12 个独立 Markdown chunk，功能保持由 `loadCourse()` 载入完整课程。剩余大块主要是 Claude Code、Hermes、Codex 的历史 eager Markdown 以及 15 门课程的动态导入映射；它需要独立的课程内容数据层拆分，不能通过删除正文、压缩图片或提高警告阈值伪造性能改善。

该项已记录为后续预渲染试点的前置工作：将核心三门课程改为按课程/章节加载，并从构建数据生成小节 SEO 清单。这样才能同时给小节使用真实标题、输出静态正文并显著降低课程详情传输量。
