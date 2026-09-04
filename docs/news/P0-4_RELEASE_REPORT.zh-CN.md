# news.studyai.now P0-4 验收记录

> 里程碑：P0-4 Claim Ledger、来源约束生成与统一新闻管理后台
>
> 完成日期：2026-09-03
>
> 结论：**通过，已部署 Staging 与 Production；等待用户指令开始 P0-5**

## 1. 目标与边界

本里程碑把候选故事转为可审计的 Research Package 和原子 Claim，并在提交审核、批准、
排期、上架及更正前执行证据覆盖门禁。根据本轮明确要求，新闻管理不再拥有独立后台：

- 唯一管理入口为 [`https://studyai.now/admin/news`](https://studyai.now/admin/news)；
- `news.studyai.now/admin/news/*` 永久 308 跳转到主站对应路径；
- News 子域不再提供管理 UI，`/api/admin/news/*` 在该域固定返回 404；
- 新闻业务数据继续只存入独立 `studyai-news-db`，主站通过 Cloudflare Service Binding 调用
  私有 News API，不复制新闻数据到 Core D1。

主站先校验既有管理员 Session 和角色，再以独立服务密钥及可审计的主站用户 ID 调用
News API。浏览器 Cookie、Authorization 和服务密钥不会穿透错误的信任边界。

## 2. 已交付内容

### 2.1 Research Package 与 Claim Ledger

- 根据故事标题、摘要和已批准来源生成来源约束的 Research Package；输入 hash 相同会幂等复用。
- 将数字、日期、引语、价格和其他事实拆为原子 Claim，保存重要性、风险、验证状态和来源摘录。
- Research Package、来源关系、Claim 修订、Claim evidence 和每次编辑动作的 fact-check 快照均不可变。
- Prompt Registry 记录 workflow、规则/模型标识、Prompt 版本、输入 hash 和审计 actor；当前
  `source-bound-rules-v1` 是确定性来源约束流程，不生成来源中不存在的新事实。
- 检测来源文本中的 Prompt 注入标记；命中后 Claim 保持 `unverified`、高风险和关键级别，不能晋级。
- 支持人工新增/修订 Claim、绑定证据并保留历史；稿件通过 `claimIds` 明确声明所使用的事实。

### 2.2 发布事实门禁

- 至少存在 1 条事实 Claim；普通事实证据覆盖率必须达到 95%，关键事实必须达到 100%。
- 高风险 Claim 不得处于 unsupported/unverified；证据必须明确支持 Claim。
- 门禁在提交审核、批准、排期、上架和更正五个动作重复执行，不能只靠前端提示绕过。
- 每次动作保存不可变 fact-check 结果，便于追溯当时的 Claim、覆盖率和阻断原因。
- 高风险未验证样本会被拒绝；补充支持证据后，同一稿件才能通过提交和发布链路。

### 2.3 主站统一管理后台

`studyai.now/admin/news` 已提供完整统一控制台：

- 编辑总览：候选、草稿、待审核、线上、已下架数量和 Claim Gate 状态；
- 采集来源：来源等级、robots 策略、健康、质量、最近成功时间及合规手工采集；
- 候选与 Claims：来源证据、分类/标签锁定、Research Package、Claim/evidence 人工核验；
- 文章与发布：创建稿件、内容修订、访问级别、人工审核、批准、排期、上架、更正、下架和重新打开；
- 分类与标签：8 个锁定一级分类、标签创建/编辑/停用/合并及使用统计；
- 审计：文章修订、事实门禁结果、批准和发布事件均可查看。

此前 News 子域的 Admin App、Admin Layout 和管理样式已经删除。主站代理只允许预期请求头，
强制同源写操作和 `X-News-CSRF`，并移除上游 `Set-Cookie`/`WWW-Authenticate` 响应头。

## 3. 测试与验收判断

| 层级 | 验证 | 结果 |
|---|---|---|
| News API | TypeScript、Research/Claim、Prompt 注入、幂等、覆盖门禁、发布状态机、OpenAPI | 7 个文件、33 项测试全部通过；API `0.5.0` |
| 全新 D1 | Wrangler 顺序重放 `0001 → 0007` | 全部成功；schema v7，新核心表完整 |
| News Web | Astro 类型检查、路由边界、测试、production build | 0 error；1 个文件、7 项测试全部通过 |
| 主站 | TypeScript、Admin 契约/代理行为、production build | 全部通过；验证 Cookie/Auth 不转发、actor 可追踪、CSRF 可阻断 |
| Cloudflare dry-run | API、News Web、主站三个 Worker | 上传、资源绑定和构建全部通过 |
| 生产边界 | 公共 health、旧 Admin 跳转、旧管理 API、主站未登录 API | schema 7；308、404、401 均符合预期 |
| 生产登录态 | Dashboard、Sources、Candidates、Articles、Taxonomy | 管理员 Session 下全部成功加载，Service Binding 与独立 News D1 可读 |

生产浏览器只读验收确认：10 个活跃来源、168 个候选、8 个受控一级分类和现有标签可见；
文章页正确显示当前无稿件。测试没有为了演示而创建、修改或发布生产新闻。

**验收判断：达成 P0-4 预期标准。** 无来源新事实会被门禁拒绝，关键事实覆盖要求为 100%，
News 子域独立后台已取消，人工审核、上下架、内容编辑和分类标签均已收归主站管理页面。

## 4. Cloudflare 部署

- Staging News API：`99e1a509-4502-4a8f-8c31-f9ada3f19a22`
- Staging News Web：`ca1837fa-bf58-4744-950c-a082da21f7d0`
- Production News API：`baa1fe6b-98ae-4876-bb3c-c85bc70b26f1`
- Production News Web：`7520e0b2-91db-4353-8a2b-a7a242d43aca`
- Production StudyAINow Web：`30f81e30-db67-4761-9371-eac0b2fc79b5`

Production 主站从干净的提交快照 worktree 构建和部署，仓库内未提交的 Jobs 改动没有进入发布包。
生产健康接口：
[`https://news.studyai.now/api/news/v1/health`](https://news.studyai.now/api/news/v1/health)。

## 5. Git、备份与回滚

开发分支：`feat/news-p0-claim-ledger`，已推送至 `origin`。

- `4cf6b48 feat(news): add P0-4 claim ledger gates`
- `a051fc7 feat(admin): unify News management in main console`
- 本验收记录与计划状态由后续文档提交固化。

远程迁移前已导出并用独立 SQLite 恢复验证，`integrity_check=ok`：

- Staging：`Backups/news-d1/studyai-news-db-staging-pre-p0-4-20260903T2335-0400.sql`，
  SHA-256 `c30170590d317b03ec692a087a5cf553a4bc7a47c904e38b3caf6df04ea95db3`；
- Production：`Backups/news-d1/studyai-news-db-pre-p0-4-20260903T2335-0400.sql`，
  SHA-256 `2f2ebaf23ab2e9f2194251b760ed48d20ddf20cde0d5adeb7ea8d26314ccd160`。

迁移采用前滚策略：三个 Worker 可以回滚到既有版本；schema v7 与不可变审计历史保留。
若必须恢复数据，应先停写，再使用已验证导出或 D1 Time Travel。

## 6. P0-5 需求提案

下一阶段建议执行 **P0-5 技能/课程只读关联**：

- 定义 News API 对 StudyAINow Core 技能/课程的只读版本化契约；
- 使用关键词与 Vectorize 召回候选技能/课程，并保存重排分数、证据和模型/索引版本；
- 在统一后台新增 Skill Review 队列，管理员可接受、拒绝、撤回和重算建议；
- Core 不可用、ID 已禁用/合并或证据不足时安全降级，不影响新闻编辑与发布；
- 明确“阅读新闻”不是“掌握技能”，不得写入用户学习进度或能力画像。

在用户明确发出“开始 P0-5”前，不继续实现 P0-5。
