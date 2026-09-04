# news.studyai.now P0-2 验收记录

> 里程碑：P0-2 安全采集垂直切片
>
> 完成日期：2026-09-03
>
> 结论：**通过，已部署 Staging 与 Production；等待用户指令开始 P0-3**

## 1. 目标与范围

P0-2 的目标是先审计一批高质量一手来源，再建立可在 Cloudflare Worker 内
长期运行的 RSS/Atom 采集垂直切片。采集必须遵守来源边界、robots 与频率，
抵抗 SSRF、恶意 XML、无界响应和重定向绕过，同时记录文章候选的完整性质量。

本阶段不规避验证码、登录墙、付费墙或明确的自动访问限制，不使用隐身浏览器、
代理池、住宅 IP 或验证码服务；不公开第三方 Feed 正文。故事聚类、分类、实体、
Claim Ledger、原创文章生成和公开文章 API 仍属于 P0-3 及后续里程碑。

## 2. 已交付内容

### 2.1 来源与合规审计

首批启用 10 个官方 Feed：OpenAI、Google DeepMind、Google AI、Google
Research、Microsoft Research、Cloudflare、NVIDIA、AWS Machine Learning、
GitHub AI & ML、Apple Machine Learning。每个来源均记录精确 Feed URL、允许
hostname、robots 结论、复核日期、用途说明、轮询间隔、响应上限和全文授权状态。

OpenAI 文章页普通请求返回 403，AWS 页面样本超过正文采集预算，因此两者明确
采用 Feed-only；其余来源即使文章页可读，也不等同于获得全文再分发授权。完整
实测与暂缓来源见 [`P0-2_SOURCE_AUDIT.zh-CN.md`](./P0-2_SOURCE_AUDIT.zh-CN.md)。

### 2.2 采集与来源管理

- `0003_ingestion_runtime.sql`：来源策略、采集运行、受限快照、游标健康与质量字段。
- `0004_seed_p0_sources.sql`：10 个已审计且 HTML 抓取关闭的一手来源。
- `0005_parser_reprocessing.sql`：记录 parser version，并支持不复制原始快照的规范化重处理。
- 每 15 分钟触发调度，每轮最多处理 2 个到期来源；每来源最多 20 条，最小间隔 30 分钟至 2 小时。
- ETag、Last-Modified 与响应 SHA-256 三层增量；人工触发还要求 `Idempotency-Key`。
- 来源列表、探测、新建、更新、软退役和单源执行 API；新来源固定以 `paused + review_required` 创建。
- 429/5xx/网络/解析错误按来源隔离，指数退避 5 分钟至 6 小时；`Retry-After` 最长尊重 24 小时。

### 2.3 安全与数据边界

- HTTPS 精确 hostname allowlist；禁止 URL 凭据、非 443 端口、全部 IP literal、localhost、内网、metadata 和内部服务名。
- 最多 3 次手动重定向并逐跳重新校验；Worker 启用 `global_fetch_strictly_public`，阻止 DNS 解析到私网。
- 10 秒超时、1 MiB 流式硬上限、RSS/Atom/XML MIME 与结构校验；XML 文档级 DTD/实体被拒绝。
- HTML/脚本/样式只转换为短纯文本摘要；原 Feed 仅进入私有 R2，D1 登记 `restricted`，公开 API 不提供全文。
- `source-feed/` R2 生命周期为 90 天；审计元数据继续保留。两个 R2 bucket 均未开启公共开发 URL。
- 管理 API 使用至少 32 字符的 Worker secret 做 P0-2 bootstrap 保护；P0-6 仍需用 Cloudflare Access JWT 与角色映射替换。

## 3. 文章质量结论

Production 最终有 170 条 `rss_atom_v2` 候选，平均质量分 78.1，最低 55，低于
50 的条目为 0；不存在检测到的 HTML 标签残留。结构完整度分组如下：

| 结果 | 来源 |
|---|---|
| 平均 100 | AWS、Cloudflare、GitHub、Microsoft Research |
| 平均 75–84.5 | Apple、NVIDIA |
| 平均 55–65 | OpenAI、Google AI、Google DeepMind、Google Research |

低分主要来自 Feed 缺作者、无摘要或摘要过短：170 条中 `thin_content` 81 条、
`missing_author` 70 条、`thin_summary` 57 条。因此 P0-2 只证明“来源可信且候选可追踪”，
不代表文章事实已核验或可直接发布。低分条目必须在后续阶段补充证据并经人工审核。

## 4. 测试与远程证据

| 层级 | 验证 | 结果 |
|---|---|---|
| 单元/集成 | URL/SSRF、跳转、条件请求、超限、429 Retry-After、RSS/Atom、XXE、质量标志、幂等、失败退避、R2 复用 | 4 个文件、26 项测试全部通过 |
| 全新本地迁移 | Wrangler 顺序执行 `0001 → 0005` | 119 条命令成功；schema v5；10 个 v2 来源；外键错误 0 |
| 本地真实采集 | 10 个官方 Feed 通过真实 Worker 调度 | 10/10 成功；170 条；首次拒绝 0；10 个受限快照 |
| Staging | 远程迁移、10 源首次采集、增量、v2 重处理、同源代理与 R2 | schema v5；170 条 v2；HTML 残留 0；外键错误 0 |
| Production | 备份、远程迁移、10 源采集与重处理、增量、同源 API、R2 实物校验 | 全部通过；无待执行迁移 |

增量实测同时覆盖：OpenAI 无 HTTP validator 时由响应 hash 返回 `not_modified`；
DeepMind 由条件请求返回 304。二次执行没有新增条目或快照。Production 最终有
20 次成功采集、2 次 `not_modified`，没有失败运行。

生产公开健康接口：[`https://news.studyai.now/api/news/v1/health`](https://news.studyai.now/api/news/v1/health)，
返回 API/release `0.3.1`、environment `production`、schema `5/5`。未带凭据访问
`/api/admin/news/sources` 返回 HTTP 401。

R2 校验从 Production 私有 bucket 下载 Apple Feed 对象，得到 10,064 字节，
SHA-256 `f4d9273761c4638c8bab9a35805614c20edac81ac840099af5f1175f3f21c092`，
与 D1 快照登记一致。R2 控制面对象统计存在延迟，因此以确定键下载与 hash 为实物证据。

部署版本：

- Staging API code：`d0d443c2-fe80-4ef0-8405-16102b9887a4`
- Production API code：`319d2fc4-707c-478c-a2df-da161b174a85`
- Production 当前 100% 版本（最终 secret rotation）：`71c443a1-1b2a-4609-8f7b-4233c283d8c6`

## 5. Git、备份与回滚

开发分支：`feat/news-p0-ingestion`，已推送至 `origin`。

- `d486547 docs(news): audit initial P0 ingestion sources`
- `591f500 feat(news-api): add safe source ingestion`
- `ec01de9 fix(news-api): version normalized feed parsing`
- 本验收记录与计划状态由后续文档提交固化。

提交只包含 `studyai-news-api/` 与 `docs/news/`。主仓既有 Jobs 未提交改动保持
原样，没有进入 News 提交。

Production 迁移前完成两次独立 D1 导出并用 SQLite 恢复验证：

- `Backups/news-d1/studyai-news-db-pre-p0-2-20260903T204838-0400.sql`，31,359 字节，schema v2，integrity `ok`。
- `Backups/news-d1/studyai-news-db-pre-parser-v2-20260903T205958-0400.sql`，323,631 字节，schema v4，170 条，integrity `ok`。

迁移均为前滚：Worker 可回滚到前一代码版本，但已应用的 schema 与私有快照保留；
发现 schema 问题时新增迁移，不修改 `0001`–`0005`。恢复需要停写后导入经验证的
备份或使用 D1 Time Travel，并同步确认 R2/D1 快照指针。

## 6. P0-3 需求提案

下一阶段建议执行 **P0-3 去重、分类与实体**：

- 规范 URL + 内容指纹/SimHash 去重，区分同源更新与跨源重复；
- 建立 story cluster、有限一级分类、标签别名和实体规范化；
- 固定标注样本，量化重复故事率、分类 Macro-F1、标签相关率和实体误合并；
- 人工锁定的分类、实体与合并决策不可被批量重跑覆盖；
- 低质量 Feed 条目进入补证/人工队列，不直接晋级为可发布内容。

在用户明确发出“执行 P0-3”前，不继续实现 P0-3 代码或创建 Vectorize/Queue 资源。
