# news.studyai.now P0-3 验收记录

> 里程碑：P0-3 去重、分类、实体与基础编辑管理闭环
>
> 完成日期：2026-09-03
>
> 结论：**通过，已部署 Staging 与 Production；等待用户指令开始 P0-4**

## 1. 目标与范围

P0-3 的基础目标是把 P0-2 的可信候选转为可管理的故事：完成重复检测、事件聚类、
有限一级分类、标签和实体规范化，并保证人工锁定结果不会被自动重跑覆盖。根据本轮用户
要求，同时把原计划 P0-6 中最关键的基础编辑闭环提前交付：管理员可以创建和修改稿件、
提交审核、批准、上架、纠错、下架和重新打开，并管理标签与分类。

主站 [`https://studyai.now/admin/news`](https://studyai.now/admin/news) 作为受主站管理员
身份保护的入口，跳转到独立 Newsroom；实际编辑功能位于
[`https://news.studyai.now/admin/news`](https://news.studyai.now/admin/news)。新闻业务数据、
修订和审计仍只进入 `studyai-news-db`，不复制或写入 StudyAINow Core D1。

## 2. 已交付内容

### 2.1 去重、分类与实体

- 规范文本、64-bit SimHash、Hamming/Jaccard 阈值和跨源故事聚类；同一故事保留每条来源证据。
- 固定 `rules-v1` 分类器，只能从 8 个锁定一级分类中选择，模型或管理员均不能新增一级分类。
- 12 个初始受控标签、标签别名和 8 个规范组织实体；分类、标签、实体均保留置信度和证据摘录。
- `story_metadata_revision` 保存不可变元数据历史；人工修改会锁定字段，批量重跑不会覆盖。
- 置信度低于 0.60 的候选在编辑台显示“待人工复核”，不能被当作高置信自动结果。

### 2.2 编辑、审核与发布

- Candidates：查看来源证据、聚类、分类置信度、标签和实体；人工修改并锁定分类/标签；创建草稿。
- Articles：编辑标题、slug、摘要和 Markdown 正文，使用乐观版本号拒绝并发覆盖，并保存不可变修订。
- 状态动作：提交审核、退回、拒绝、批准、排期、上架、纠错、下架及重新打开。
- 发布门禁：数据库状态机与服务层都拒绝未经人工批准的发布；重复请求由幂等记录保护。
- 已发布文章的新草稿不会提前覆盖公开投影；只有批准后的发布或纠错才更新公开标题、摘要和 slug。
- Taxonomy：编辑分类/标签名称与别名、创建标签、软退役标签、合并标签并重定向已有关系；锁定一级分类不可退役。
- Revision/Audit：文章修订、批准记录、发布事件和管理员操作均可在详情侧栏追踪。

### 2.3 管理入口与会话边界

- `studyai-news-web` 提供 `/admin/news`、`/candidates`、`/articles`、`/taxonomy` 及文章详情路径。
- `studyai.now/admin/news` 已加入主站 Admin 路由与侧栏“新闻管理”，提供候选、文章、分类标签三个入口。
- P0 bootstrap bearer 只用于换取 8 小时 `HttpOnly; Secure; SameSite=Strict` Cookie；浏览器端不写入 localStorage/sessionStorage。
- Cookie 写操作同时要求同源检查与 `X-News-CSRF: 1`；篡改 Cookie、跨源写入和无凭据读取均被拒绝。
- 主站会话与 Newsroom 会话保持独立；正式 Cloudflare Access JWT、角色映射和高风险双人审核仍属于 P0-6。

## 3. 数据质量与实采结果

Staging 对 P0-2 的 170 条真实官方 Feed 候选完成重跑：形成 168 个故事和 168 条元数据
修订，其中 2 个故事包含多来源关系；生成 135 条 story-tag 与 55 条 story-entity 关系。
8 个一级分类和 12 个标签全部来自受控词表。

分类固定样本 Macro-F1 达到测试阈值 `>= 0.85`；重复样本 precision/recall 均为 1.0。
真实数据中 50 条候选的分类置信度低于 0.60，主要来自标题/摘要信号较弱的 Feed；这些条目
已明确进入人工复核视觉状态，不自动晋级为可发布内容。该结果符合安全 Gate，但也说明
P0-4 需要依靠 Claim/evidence 补证，而不能把分类置信度当作事实置信度。

## 4. 测试与远程证据

| 层级 | 验证 | 结果 |
|---|---|---|
| News API | SimHash、分类/标签/实体、锁定、Cookie/CSRF、完整 SQLite 编辑发布流程、OpenAPI、dry-run | 7 个文件、33 项测试全部通过；`npm run check` 通过 |
| News Web | API 客户端、路由、管理 UI 契约、Astro build、生产 dry-run | 5 项测试全部通过；`npm run check` 通过 |
| 全新本地迁移 | Wrangler 顺序执行 `0001 → 0006` | 全部成功；schema v6 |
| Staging 垂直流程 | 登录、Cookie 会话、无 CSRF 写入、建稿、提交、未批准发布、批准、发布、下架 | 预期状态码全部通过；最终稿件为 `withdrawn`，保留 1 条修订和 5 条审计记录 |
| 主站 Admin 集成 | TypeScript、Admin 契约、Vite production build、生产 bundle | 全部通过；生产 bundle 包含 Newsroom 路由与三个管理入口 |
| 生产边界 | 健康、schema、管理页、未授权管理 API、D1 迁移 | API `0.4.0`、schema `6/6`；管理页 HTTP 200；无凭据 Dashboard HTTP 401；无待执行迁移 |
| 视觉与响应式 | Newsroom 登录页桌面及 390×844 | 无横向溢出；标题、表单和操作入口可见 |

Staging 的鉴权编辑流程由实际 HTTP Session 完成；浏览器视觉检查没有输入或持久化管理员
Token，因此不把它表述为“已完成生产浏览器登录”。Production 的既有管理员 secret 未被
替换；Staging 测试 secret 已在测试后重新轮换。

## 5. Cloudflare 部署

- Staging API 当前版本（测试后 secret rotation）：`2c4bbb91-fbf0-47ca-8c9c-5a0ec74c9507`
- Staging News Web：`0b9b7baa-a94a-4762-8157-0418687ba1e9`
- Production API：`ddcb97e9-8750-44b4-a58a-9e54115c832e`
- Production News Web：`3ae8363c-d01a-41cf-aee9-2ee57a9f3736`
- Production StudyAINow Web（主站入口）：`1294e48e-3171-4606-adc3-e65dc58a0365`

主站使用干净的临时 Git worktree 从提交快照构建和部署，本地未提交的 Jobs 代码没有进入
本次生产包。生产健康接口：
[`https://news.studyai.now/api/news/v1/health`](https://news.studyai.now/api/news/v1/health)。

## 6. Git、备份与回滚

开发分支：`feat/news-p0-editorial-admin`，已推送至 `origin`。

- `c8217ab feat(news-api): add P0 editorial workflow`
- `19eba00 feat(news-web): add editorial admin console`
- `ecdb656 fix(news-web): flag low-confidence candidates`
- `d87fcac feat(admin): link Newsroom editorial console`
- 本验收记录与计划状态由后续文档提交固化。

Production 与 Staging 在迁移前均完成 D1 SQL 导出：

- `Backups/news-d1/studyai-news-db-pre-p0-3-20260903T2235-0400.sql`，约 330 KiB，SHA-256 `65c2989448ef37bc43b85753f5ad3138dab537872b2355bb07b787a9d4eadee3`。
- `Backups/news-d1/studyai-news-db-staging-pre-p0-3-20260903T2235-0400.sql`，约 330 KiB，SHA-256 `10c17c796bae0d412deda36193555fcf285580e91e0b05cc6260b2b883cd6de8`。

迁移采用前滚策略：可把三个 Worker 回滚到此前版本，但 schema v6 和不可变历史保留；数据库
恢复需先停写，再使用已验证 SQL 导出或 D1 Time Travel。主仓原有 Jobs 未提交改动保持原样，
没有进入 News 提交。

## 7. P0-4 需求提案

下一阶段建议执行 **P0-4 Claim Ledger 与来源约束生成**：

- 从故事来源生成研究包，并把数字、日期、引语、价格和关键事实拆为原子 Claim；
- 每个 Claim 必须链接证据、来源等级、证据摘录和支持/冲突/未验证状态；
- 在现有文章编辑器加入 Claim/evidence 面板、人工复核状态和来源缺失阻断提示；
- 建立 Prompt Registry、模型/成本/输入 hash 与结构化输出失败降级；
- 无来源的新事实不得进入可提交审核的草稿，高风险 Claim 进入专门人工队列。

在用户明确发出“执行 P0-4”前，不继续实现 P0-4。
