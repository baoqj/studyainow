# news.studyai.now P0-1 验收记录

> 里程碑：P0-1 News schema 与发布状态机
>
> 完成日期：2026-09-03
>
> 结论：**通过，已部署 Staging 与 Production；等待用户指令开始 P0-2**

## 1. 目标与范围

P0-1 的目标是在不接触 `studyainow-db` 的前提下，建立 News 独立内容数据库、不可变版本与审计边界、人工审批发布状态机，并把数据库版本纳入 Worker 健康检查和自动部署 Gate。

本阶段没有实现来源 CRUD、RSS/Atom 抓取、R2 快照写入、Admin UI 或公开文章 API；这些分别属于 P0-2 及后续里程碑。

## 2. 已交付内容

### 2.1 独立 Cloudflare D1

| 环境 | 数据库 | ID | 区域 |
|---|---|---|---|
| Staging | `studyai-news-db-staging` | `dd2dbc41-0c90-4a0d-ac41-cc19a19d43b7` | ENAM |
| Production | `studyai-news-db` | `58c59b6e-06b0-4300-bde9-f9e9062478a6` | ENAM |

两个库都只绑定到 `studyai-news-api` 对应环境。公开浏览器仍由 `studyai-news-web` 接入，再经 `NEWS_API` Service Binding 调用私有生产 API Worker。

### 2.2 迁移与数据域

- `0001_news_content_schema.sql`：来源、游标、原始项目与限权快照索引；事件簇、Claim Ledger 和证据；文章、语言、不可变修订与审批；分类、实体、技能/知识点/课程 canonical ID 关联；工作流、幂等、审计、发布事件；媒体、播客脚本、章节和转写。
- `0002_article_state_machine.sql`：17 条允许的文章状态边、发布角色审批、活动/发布修订一致性，以及修订、审批、来源快照、审计和发布事件的不可变 trigger。
- `schema_metadata.news_schema_version=2` 是运行时契约。API 期望版本不匹配或数据库不可用时返回 HTTP 503，而不是报告假健康。

生产远端实测为 35 张应用表、17 条状态边、16 个保护 trigger，`PRAGMA foreign_key_check` 返回空结果。

### 2.3 数据边界 Gate

News D1 中不存在 `users`、`organizations`、`skills`、`courses` 或 `knowledge_points` 主数据表。技能、知识点和课程关系只保存 StudyAINow Core 的 `skill_id`、`knowledge_point_id`、`course_id` 及 News 自己的证据、分数、模型版本和审核状态。

本阶段没有读取、复制或写入 `studyainow-db`，也没有改变现有主站 Worker 或 Jobs 迁移。

### 2.4 自动部署链

- `npm run deploy:staging`：Cloudflare 类型生成 → TypeScript → 全部测试 → OpenAPI 契约 → 生产配置 dry-run → Staging D1 迁移 → Staging Worker 部署。
- `npm run deploy`：同一质量门 → Production D1 迁移 → Production Worker 部署。
- 迁移文件一经环境成功应用即只增不改；后续 schema 变化从 `0003` 开始。

## 3. 测试与证据

| 层级 | 验证 | 结果 |
|---|---|---|
| 单元/集成 | Vitest：健康接口、trace ID、404/405、schema 503、空库迁移、索引、约束、外键、非法状态跳转、Publisher/Admin 审批、不可变记录 | 2 个文件、9 项测试全部通过 |
| 本地迁移 | Wrangler 在全新临时持久化目录顺序执行 `0001 → 0002` | 84 条命令成功；schema v2；17 条状态边；16 个 trigger；外键检查为 0 |
| 本地运行 | 真实 Worker + 本地 D1 请求 `/api/news/v1/health` | HTTP 200；`currentVersion=2`；`expectedVersion=2` |
| Staging | 远程迁移、D1 结构检查、API 直连、Web Service Binding | 全部通过 |
| Production | 远程迁移、D1 结构检查、部署状态、公开同源 API | 全部通过；无待执行迁移 |

公开生产验证：[`https://news.studyai.now/api/news/v1/health`](https://news.studyai.now/api/news/v1/health)

部署版本：

- Staging API：`c504a363-0240-4a42-90ad-2a03479261c4`
- Production API：`5bc03545-b979-41f3-901f-caa978a6e235`，部署流量 100%

Staging 首次执行 `0002` 时，D1 远端解析器拒绝了包含嵌套 `CASE` 的 trigger，事务回滚且 Worker 未部署。审批规则随后拆分为三个等价的单一职责 trigger，16 个 trigger 经远端 `EXPLAIN` 验证后重新迁移成功。Production 只执行了修复后的迁移。

## 4. Git 记录

开发分支：`feat/news-p0-schema`，已推送至 `origin`。

- `2020cf2 feat(news-api): add P0 news schema and publication state machine`
- `2131012 fix(news-api): make approval triggers D1 compatible`
- 本验收记录与计划状态由后续文档提交固化。

提交范围只包含 `studyai-news-api/` 与 `docs/news/`。主仓原有 Jobs 未提交改动保持原样，没有进入 News 提交。

## 5. 回滚与恢复

P0-1 操作的是新建且尚无业务数据的独立 News 数据库，迁移全部为新增对象，因此不提供会删除数据的 down migration。

- Worker 回滚：重新部署 P0-0 Worker 版本；P0-1 新表保留，不影响旧 Worker。
- Schema 前滚：发现 schema 问题时新增修复迁移，不修改已应用的 `0001` 或 `0002`。
- 未来含业务数据的迁移：先验证 D1 导出或 Time Travel 恢复点，再迁移 Staging，最后进入 Production Gate。

## 6. P0-2 需求提案

下一阶段建议执行 **P0-2 安全采集垂直切片**，目标是让 10 个经批准的一手 RSS/Atom 来源稳定产生可追踪的 `source_item` 与限权快照元数据。开始前需要确认来源清单及每个来源的采集/保存许可范围。

P0-2 预期包括：

- 来源 CRUD 与启停、健康状态；
- RSS/Atom connector、ETag/Last-Modified、增量游标；
- URL canonical、重复检测、正文大小/超时限制；
- SSRF、重定向到内网/元数据地址、429/5xx、无效 XML 和失败重试测试；
- R2 私有快照资源与公开 API 字段过滤；
- Staging 先跑 10 个来源的连续增量，再进入 Production。

在用户明确发出“开始 P0-2”前，不继续编写 P0-2 业务代码或创建 R2 资源。
