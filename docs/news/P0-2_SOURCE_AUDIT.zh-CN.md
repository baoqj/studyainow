# P0-2 首批新闻来源与实采审计

> 实测日期：2026-09-03
>
> 采集身份：`StudyAI-NewsBot/0.1 (+https://news.studyai.now/about)`
>
> 结论：首批采用 10 个官方 RSS/Atom 来源；只自动获取 Feed，页面正文抓取默认关闭。

## 1. 准入原则

来源按以下顺序接入：官方 RSS/Atom → 官方 API → sitemap → 明确允许的 HTML → 人工提交。首批来源必须同时满足：

- 来源主体是一手发布机构；
- Feed 无需登录、验证码或付费墙；
- `robots.txt` 没有禁止目标 Feed；
- 使用明确 User-Agent 的普通请求能稳定返回；
- 标题、URL、发布日期至少可以确定性提取；
- 全文或原始 Feed 只进入私有 R2 限权快照，不通过公开 API 再分发；
- 没有明确全文再分发授权时，D1 只保存必要元数据、短摘要、质量分和原文链接。

## 2. 首批启用来源

| ID | 官方 Feed | 实测大小/条目 | 条件请求 | 最新文章页探测 | 质量与采集策略 |
|---|---|---:|---|---|---|
| `openai-news` | `https://openai.com/news/rss.xml` | 711 KB / 1169 | 无验证器 | 403 | Feed 元数据完整、短摘要可用；页面有反爬，严格 Feed-only，以响应 hash 实现增量 |
| `google-deepmind` | `https://deepmind.google/blog/rss.xml` | 72 KB / 100 | ETag → 304 | 200，1 次同集团安全跳转 | 官方研究与产品更新；优先 Feed 摘要，不追踪页面跳转抓正文 |
| `google-ai` | `https://blog.google/innovation-and-ai/technology/ai/rss/` | 32 KB / 20 | 无验证器 | 200 | 标题、作者、时间稳定；以响应 hash 去重 |
| `google-research` | `https://research.google/blog/rss/` | 79 KB / 100 | Last-Modified → 304 | 200 | 一手研究价值高；Feed 正文较短，作为研究线索并保留原文链接 |
| `microsoft-research` | `https://www.microsoft.com/en-us/research/feed/` | 278 KB / 10 | ETag/Last-Modified → 304 | 200 | 作者、摘要和正文结构完整；仅私有保存原始 Feed |
| `cloudflare-blog` | `https://blog.cloudflare.com/rss/` | 299 KB / 20 | Last-Modified → 304 | 200 | 工程细节完整，适合 Agent/基础设施主题；只公开后续原创摘要 |
| `nvidia-technical-blog` | `https://developer.nvidia.com/blog/feed/` | 737 KB / 100 | ETag/Last-Modified → 304 | 200 | Atom 结构、作者和技术内容完整；设置 1 MiB 硬上限 |
| `aws-machine-learning` | `https://aws.amazon.com/blogs/machine-learning/feed/` | 603 KB / 20 | Last-Modified → 304 | 200，页面约 1.29 MB | Feed 内容完整；页面体积偏大，因此不做正文页抓取 |
| `github-ai-ml` | `https://github.blog/ai-and-ml/feed/` | 177 KB / 10 | ETag/Last-Modified → 304 | 200 | 开发工具与 Agent 内容质量高，作者和正文结构完整 |
| `apple-machine-learning` | `https://machinelearning.apple.com/rss.xml` | 10 KB / 10 | ETag/Last-Modified → 304 | 200 | 研究更新频率低但信噪比高，摘要约 80 词 |

以上 10 个 Feed 均返回 HTTP 200，MIME 为 RSS/Atom/XML，`robots.txt` 返回 200 且对目标 Feed 判定允许。采集器每次最多处理 Feed 中最新 20 条，避免 OpenAI/NVIDIA 等大历史 Feed 在每次轮询中造成无界工作量。

## 3. 暂缓或拒绝来源

| 来源 | 实测 | 决策 |
|---|---|---|
| Anthropic News | 常见 RSS 地址均 404 | 暂缓；不为补齐来源数抓 HTML，等待官方 Feed/API |
| Hugging Face Blog | Feed 200，但 859 条多数缺作者和摘要，且带 ETag 的条件请求仍返回 200 | 暂缓；后续使用官方组织过滤或更窄的 API，避免把社区低质量内容当一手事实 |
| arXiv `cs.AI` | Feed 200，约 619 KB，更新量大 | 暂缓；P0-3 前先增加主题查询、重复论文版本和相关性过滤 |
| Microsoft AI Blog | Feed 返回 410 | 拒绝失效端点 |
| IBM Research 常见 RSS | Feed 返回 404 | 暂缓，等待确认官方稳定入口 |
| Meta AI、Mistral、Cohere 页面 | 页面可读，但未确认与首批解析契约一致的高质量 Feed | 不做 HTML 兜底；后续单独完成许可和解析评测后再启用 |

## 4. 反爬与稳定性策略

本项目不把“反反爬”理解为规避访问控制。允许的工程措施是：

- 优先官方 Feed，发送可识别的 User-Agent 和联系页；
- 使用 ETag、Last-Modified 和响应 SHA-256，未变化时不解析、不写快照；
- 每来源设置最小轮询间隔，每轮最多处理 2 个到期来源、每个 Feed 最多 20 条；
- 只允许 HTTPS 和审批过的精确 hostname，手动处理最多 3 次跳转并逐跳重新校验；
- 阻止 localhost、内网、链路本地、Cloud metadata、IP literal 和 DNS 到私网的请求；
- 10 秒超时、1 MiB 流式响应上限、XML 类型和结构校验；
- 429/5xx/网络错误进入指数退避，单个来源失败不阻塞其他来源；
- 403、验证码、登录墙或明确禁止自动访问时停止该来源，不切换伪装浏览器、代理池、住宅 IP 或验证码服务。

OpenAI 最新文章页在本次普通请求中返回 403，但官方 RSS 正常，因此首批实现明确采用 Feed-only。AWS 最新文章页约 1.29 MB，超过正文页采集预算，也采用 Feed-only。其余样本文章页均可普通访问，但“可访问”不等于获得全文再分发授权，首批仍不自动抓页面正文。

## 5. 文章质量 Gate

采集质量分只用于候选排序，不代表事实已经核实。评分包含：

- 标题、HTTPS canonical URL、发布日期、作者和摘要的完整性；
- Feed 正文/摘要的有效长度；
- 日期是否未来、过旧或无效；
- 来源信任级别与 parser 版本；
- 过短内容、缺作者、缺日期、正文疑似导航/挑战页等质量标志。

任何来源即使是官方厂商博客，也必须在后续 Claim Ledger 中与独立来源核对；厂商发布不能自动变成 StudyAINow 的事实结论。首批最近文章页样本除 OpenAI 403 外均返回 200，可提取文本约 720–3881 词，但页面全文不会进入公开内容。

## 6. 复核节奏

- 自动：记录每次状态、延迟、字节数、解析数、新增数、重复数、拒绝数、质量均值和退避时间。
- 每周：复核失败率最高、质量下降或 Feed 结构变化的来源。
- 每季度：人工复核 robots、条款、Feed URL、许可备注和全文授权状态。
- 发生 403/410、结构突变或权利人通知：立即暂停，并保留审计记录。

## 7. P0-2 采集器实跑结果

在从 `0001` 全量迁移得到的全新本地 D1 上，调度器使用与 Worker 相同的
网络、解析、D1 和 R2 代码逐一采集了 10 个来源。结果如下：

| 来源 | HTTP | 处理条目 | 新增 | 拒绝 | 平均质量分 | Feed 字节 |
|---|---:|---:|---:|---:|---:|---:|
| Apple Machine Learning | 200 | 10 | 10 | 0 | 75.0 | 10,064 |
| AWS Machine Learning | 200 | 20 | 20 | 0 | 100.0 | 603,409 |
| Cloudflare Blog | 200 | 20 | 20 | 0 | 100.0 | 298,958 |
| GitHub AI & ML | 200 | 10 | 10 | 0 | 100.0 | 177,384 |
| Google AI | 200 | 20 | 20 | 0 | 65.0 | 32,103 |
| Google DeepMind | 200 | 20 | 20 | 0 | 56.5 | 71,969 |
| Google Research | 200 | 20 | 20 | 0 | 55.0 | 78,563 |
| Microsoft Research | 200 | 10 | 10 | 0 | 100.0 | 278,482 |
| NVIDIA Technical Blog | 200 | 20 | 20 | 0 | 84.5 | 736,594 |
| OpenAI News | 200 | 20 | 20 | 0 | 65.0 | 710,884 |

合计新增 170 个规范化来源条目、10 个 `restricted` 快照登记，原始 Feed
约 2.998 MB；外键检查为 0。所有条目质量分均不低于 50。Google
DeepMind、Google Research、Google AI 与 OpenAI 分数较低，主要因为 Feed
只提供较短摘要或缺少作者，并不表示来源主体不可信；它们会在 P0-3/P0-4
作为需要更多证据和人工排序的候选，而不会自动发布。

首次实跑还发现 GitHub 正文 CDATA 内含字面量 HTML `DOCTYPE`。解析器没有
放宽对 XML 文档级 DTD/实体的拦截，而是先排除 CDATA 后再检查声明；修正后
GitHub 10 条全部解析成功，包含真正 XML 实体声明的 XXE 测试仍被拒绝。

生产抽样进一步发现 AWS 的部分 HTML 标签采用实体编码。`rss_atom_v2` 先做
受限实体解码再清除脚本、样式和标签；迁移通过游标中的 parser version 强制
一次安全重处理，响应 hash 相同则复用既有不可变 R2 快照。Staging 与
Production 的 170 条记录均已升级到 v2，疑似 HTML 标签残留为 0；生产平均
质量分 78.1、最低 55、低于 50 的条目为 0。

质量结论不是“170 条都可直接发稿”：AWS、Cloudflare、GitHub、Microsoft
Feed 的结构完整度最高，NVIDIA 与 Apple 可作为高质量候选；OpenAI、Google
AI、DeepMind 与 Google Research 的 Feed 摘要或作者字段不足，保留低分标志，
只进入后续补证与人工审核。生产样本共有 81 条 `thin_content`、70 条
`missing_author`、57 条 `thin_summary`，任何条目都不会因来源官方而自动发布。
