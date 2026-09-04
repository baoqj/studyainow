# news.studyai.now P0-5 验收记录

> 里程碑：P0-5 技能/课程只读关联、公共新闻站与主站导航统一
>
> 完成日期：2026-09-04
>
> 结论：**工程验收通过并已部署 Staging 与 Production；100 篇人工标注相关性评测待建立数据集后签收；等待用户指令开始 P0-6**

## 1. 目标与边界

本里程碑建立 News 到 StudyAINow Core 技能/课程的单向只读关联，并按本轮要求提前交付公开新闻站的视觉与导航整合：

- Core D1 是技能和课程规范 ID 的唯一权威源，News 不复制、不修改 Core 主表；
- 主站服务端按版本化契约构建已批准技能、别名、公开课程和课程技能覆盖快照，浏览器不能伪造目录；
- Vectorize 只负责候选召回，正式关联必须保存评分、证据、版本和人工审核状态；
- 新闻阅读不写入课程进度、技能掌握或用户能力画像；
- 新闻管理仍只位于 [`https://studyai.now/admin/news`](https://studyai.now/admin/news)，News 子域不提供独立后台；
- [`https://news.studyai.now`](https://news.studyai.now) 使用与主站一致的标题栏、导航、颜色和明暗主题；主站顶部新增“新闻 / News”入口。

公开内容继续遵守人工发布门禁。生产库当前没有已批准 StudyAI 文章，因此页面没有把候选稿伪装成文章；首页以明确标注的“一手来源动态”展示已通过来源政策和 robots 审核的官方 Feed 标题、短摘要、来源、日期和分类。

## 2. 已交付内容

### 2.1 Core 只读目录与检索

- 新增 `studyai-learning-catalog/v1` 契约，包含稳定 checksum、目录版本、已批准技能/别名、公开课程和已批准课程技能覆盖；不包含课程正文或用户数据。
- 目录仅由主站管理员代理在服务端注入；News API 拒绝浏览器管理员或运维 Bearer 修改 Core 目录。
- 对标题、摘要、实体和分类生成确定性 64 维文本向量，使用关键词与 Vectorize 混合召回，再按证据和相关性重排。
- 技能最多保留 5 个建议、课程最多保留 3 个建议，默认阈值为 0.70；Vectorize 不可用时降级到关键词与本地向量，不阻断新闻编辑。
- 对同一目录 checksum 幂等同步，不重复写入向量；已人工批准的关联在重算时保留。

### 2.2 可审计学习关联

- D1 schema v8 新增不可变目录同步、生成运行和关联修订记录，以及当前 `story_learning_link` 投影。
- 每条建议保存 Core ID、类型、标题、URL、分数、证据、目录版本、召回/嵌入版本和审核状态。
- 统一后台新增“技能与课程”页，可按待复核、已批准、已拒绝、已失效筛选，并支持接受、拒绝、撤回和重算。
- Core 中禁用或不存在的 ID 会转为 `stale`；人工批准后的关联才镜像到现有文章技能/课程关系表。
- News API 的学习关联写操作只接受经过主站管理员 Session、同源 CSRF 和服务身份保护的调用。

### 2.3 公共新闻站与主站导航

- News Web 改为 SSR 公开站，交付首页、文章列表、文章详情、空状态、错误状态和 404。
- 标题栏、渐变品牌字标、导航、主题、卡片、按钮和响应式断点与 StudyAINow 主站视觉语言统一。
- 主站桌面和移动导航均新增本地化新闻入口：简体中文“新闻”、繁体中文“新聞”、英文“News”、法文“Actualités”、西班牙文“Noticias”。
- 首页展示 18 条最新一手官方来源信号及 8 个受控分类；已发布文章区域只返回人工批准且处于 published 状态的文章。
- 文章详情显示来源溯源、人工审核说明和已批准的学习关联；Markdown 以转义后的结构化节点渲染，不直接注入原始 HTML。
- `news.studyai.now/admin/news` 保持 308 跳转至主站统一后台；robots 允许公共页面并阻止 `/api` 与 `/admin`。

## 3. 测试与验收判断

| 层级 | 验证 | 结果 |
|---|---|---|
| News API | Cloudflare 类型、TypeScript、Vitest、OpenAPI、production dry-run | 8 个文件、36 项测试全部通过；API `0.6.0` |
| 学习关联 | 混合召回、Vectorize 降级、幂等索引、批准保留、禁用 ID 失效、权限边界 | 全部通过 |
| 全新 D1 | Wrangler 顺序重放 `0001 → 0008`、schema 与外键检查 | 全部成功；schema v8，`foreign_key_check` 为空 |
| News Web | Astro 类型、Vitest、production build、部署配置 | 0 error；11 项测试全部通过；Web `0.4.0` |
| 主站 | TypeScript、Admin 契约/代理验证、production build | 全部通过；可信目录由服务端覆盖浏览器输入 |
| Staging | API health、SSR 首页、18 条来源、8 分类、404、Admin 308 | 全部通过 |
| Production API | health、schema、公开首页接口 | HTTP 200；API/release `0.6.0`；schema `8/8`；数据库正常 |
| Production 浏览器 | 主站桌面/移动新闻入口、跨域跳转、News 390 px、明暗主题、统一后台 | 全部通过；无横向溢出；后台学习审核队列成功加载 |
| 公开门禁 | 未批准文章、撤回文章、来源信号边界 | 未批准内容不公开；生产没有人为创建或发布测试文章 |
| 相关性数值 Gate | 100 篇人工标注集 Precision@5 ≥ 0.85、Recall@10 ≥ 0.80 | **待验收：仓库和生产均无这份人工金标集；评测器和公式测试已交付** |

生产发布后只读检查记录：`source_item=176`、`story_cluster=174`、`story_learning_link=0`，外键检查无异常。浏览器登录态确认统一后台显示待复核、已批准、已拒绝、已失效均为 0。

**验收判断：P0-5 工程预期已达成，数值相关性 Gate 为条件性未签收。** 系统已经满足只读契约、向量仅建议、可审/可撤回/可重算、安全降级、公开人工门禁和全站视觉统一；但在完成 100 篇人工标注前，不能宣称 Precision@5 与 Recall@10 达到 PRD 阈值。

## 4. Cloudflare 部署

新建 Vectorize 资源：

- Staging：`studyai-news-learning-vectors-staging`，64 维、cosine；
- Production：`studyai-news-learning-vectors-v1`，64 维、cosine。

部署版本：

- Staging News API：`eaf39d91-7d5c-42e5-8c3f-acbc4518b76c`
- Staging News Web：`33abfed4-12a3-49b7-b3cb-2c1de139a413`
- Production News API：`db3fd231-6951-4a57-85cf-4bfd98ca2354`
- Production News Web：`3f1215cf-1ebc-4703-9ade-32cf93f8bf5c`
- Production StudyAINow Web：`c3388ea4-dfb6-453a-83c1-87ba5289cb1d`

生产主站从提交 `41eec81` 的独立干净 worktree 构建。主工作区原有 Jobs 改动和未跟踪迁移没有进入构建包。线上入口：

- [`https://news.studyai.now`](https://news.studyai.now)
- [`https://news.studyai.now/api/news/v1/health`](https://news.studyai.now/api/news/v1/health)
- [`https://studyai.now/admin/news/learning`](https://studyai.now/admin/news/learning)

## 5. Git、备份与回滚

开发分支：`feat/news-p0-skill-links`。

- `41eec81 feat(news): add P0-5 learning links and public newsroom`
- 本验收记录与计划状态由后续文档提交固化。

远程迁移前已导出并用独立 SQLite 恢复验证，`integrity_check=ok`：

- Staging：`Backups/news-d1/studyai-news-db-staging-pre-p0-5-20260904T1248-0400.sql`，SHA-256 `1db1c3393c647d71ec26719a02157c735ce1983d2295208bd29ee4b2b7baf6ba`；
- Production：`Backups/news-d1/studyai-news-db-pre-p0-5-20260904T1248-0400.sql`，SHA-256 `8931edea5e939d631b6040325e85629040d08d3f2a0a7dc500446240fa6d52d0`。

迁移采用前滚策略。三个 Worker 可以分别回滚到上一版本；schema v8 只新增表且保留不可变审计历史。若必须恢复数据，应先停写，再使用已验证导出或 D1 Time Travel。

## 6. P0-6 需求提案

下一阶段建议执行 **P0-6 统一 `/admin/news` 的高级编辑闭环**：

- 建立 Viewer、Researcher、Editor、Publisher、Admin 分角色权限及服务端越权测试；
- 对高风险内容增加双人审核，禁止生成者绕过 Publisher 直接发布；
- 增加自动保存、修订版本对比、发布前预览、并发冲突提示和失败恢复；
- 完善 Workflow/Audit 视图、幂等发布、重试和敏感快照字段过滤；
- 评估可选 Cloudflare Access 作为管理后台纵深防御；
- 同时组织 100 篇人工标注集，补签 P0-5 Precision@5 / Recall@10 数值 Gate。

在用户明确发出“开始 P0-6”前，不继续实现 P0-6。
