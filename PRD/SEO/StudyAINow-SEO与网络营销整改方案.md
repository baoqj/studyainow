# Study AI Now! SEO 与网络营销整改方案

- 站点：<https://studyai.now>
- 文档日期：2026-08-28
- 文档状态：方案评审稿
- 适用代码根目录：`/Users/aibao/Documents/Project/AI-course/studyainow/Code`
- 适用部署：Cloudflare Worker `studyainow-web`、D1 `studyainow-db`、R2 `studyainow-storage`
- 目标：在不破坏课程、账户、面试、职位、简历、AdSense 和 Cloudflare 安全边界的前提下，建立可持续的自然搜索、内容分发、品牌增长和转化体系

## 1. 文档目的

本文把 2026-08-28 对 Study AI Now! 的代码、正式域名、浏览器渲染、页面内容、路由、Meta、Sitemap、国际化和搜索结果抽样审计，整理为可进入产品与工程排期的整改方案。

本文不是一份通用 SEO 清单，而是针对当前 Vite + React SPA + Cloudflare Worker 架构给出的实施方案。所有建议分为 P1、P2、P3，以避免一次性进行高风险的大规模框架迁移或 URL 迁移。

本文同时明确三个证据层级：

1. **正式站事实**：已在 `https://studyai.now` 的初始 HTML、HTTP 响应或浏览器渲染中验证。
2. **当前工作区事实**：存在于本地工作区，但可能尚未提交、部署或完成验收。
3. **规划建议**：尚未实施，不应在 PRD、市场材料或对外沟通中描述为已上线能力。

## 2. 执行摘要

Study AI Now! 当前最有价值的 SEO 资产不是博客文章数量，而是已经存在的产品闭环：

```text
原创课程
  ↓
章节与小节实战
  ↓
互动练习与面试题
  ↓
职位技能证据
  ↓
学习进度、简历与求职转化
```

当前站点已有 19 门课程、217 章、697 节课，并覆盖 Claude Code、OpenAI Codex、Hermes Agent、AI Agent、上下文工程、Prompt 安全、LLM 成本、AI 可靠性和 FDE 等具备明确搜索需求的主题。

主要问题不是“没有 Meta”，而是：

1. 正式站的初始 HTML 仍只有空 React 根节点，主要正文依赖 JavaScript 渲染。
2. 正式站五种语言仍可能共用同一 URL，Canonical 与语言内容无法一一对应。
3. 课程与小节 Meta 仍主要由路由 ID 拼接，未使用真实课程名、小节标题和搜索意图。
4. Sitemap 只有 41 个 URL，与 697 节内容的规模不匹配。
5. 缺少 hreflang、JSON-LD、Open Graph、作者、审核、来源和更新时间等信任与机器可读信号。
6. 首页仍是课程目录页，存在固定的假进度、无行为按钮、过早打赏弹窗和无行为导航搜索。
7. 课程内容使用 `import.meta.glob(..., { eager: true })` 批量打包，多语言课程页存在较大的 JavaScript 传输和渲染成本。

推荐总体路线：

- **P1：稳定和修复**。不做全站 URL 大迁移，先统一 SEO 数据源、修复首页与 Meta、建立质量门控、完成预渲染试点和数据基线。
- **P2：结构性优化**。正式启用语言独立 URL、静态预渲染优先内容、拆分课程内容包、迁移 Canonical/Sitemap/hreflang，并建立主题中心。
- **P3：规模化增长**。扩展通过人工审校的语言和内容、发布原创数据资产、建立内容运营系统，并根据实际数据决定是否迁移到 Astro、Next.js 或其他内容优先框架。

## 3. 目标、非目标与核心原则

### 3.1 目标

1. 让搜索引擎在首次 HTML 响应中直接获得页面标题、摘要、正文、内部链接和结构化数据。
2. 让每个可索引 URL 只代表一种语言和一个主要搜索意图。
3. 将课程、面试题和原创工具组织为可持续扩展的主题集群。
4. 让搜索流量能够转化为开始课程、完成练习、注册、回访和订阅邮件等真实行为。
5. 保持 AdSense、隐私、职位来源、内容授权、账户安全和 Cloudflare CSP 的现有边界。
6. 用 Search Console、真实用户 Web Vitals 和转化事件驱动后续迭代。

### 3.2 非目标

1. 不为排名批量生成低价值 AI 短文。
2. 不一次性把全部 697 节内容和五种语言全部提交索引。
3. 不购买外链、不使用 PBN、点击交换、流量交换、批量目录或评论垃圾链接。
4. 不为了“GEO/AEO”创建大量查询变体页、隐藏 FAQ、虚假评分或无事实依据的 Schema。
5. 不在 P1 阶段强制迁移整个 React 应用到新框架。
6. 不在第三方职位详情缺少原创编辑层时开放其索引或投放广告。

### 3.3 核心原则

- 搜索意图优先于关键词密度。
- 原创证据优先于文章数量。
- 首次 HTML 可读优先于只在浏览器内修正 Meta。
- 一个 URL 对应一种语言、一个 Canonical 和一个主要意图。
- Sitemap 只提交希望进入搜索结果且通过质量门控的 Canonical URL。
- 结构化数据必须与页面可见内容一致。
- 技术改造必须有兼容路由、301、回归检查和可回滚边界。
- Search Console 是索引状态的权威来源，`site:` 搜索只能作为弱信号。

## 4. 当前架构与产品资产

### 4.1 技术架构

当前公开站点的核心结构为：

- Vite 6 + React 19。
- React Router BrowserRouter。
- Cloudflare Worker 统一处理 API、静态资产、HTMLRewriter、CSP 和真实 404。
- Cloudflare Assets 使用 `not_found_handling = "single-page-application"`。
- 课程 Markdown 通过 Vite `import.meta.glob` 在构建时读取。
- D1 存储账户、进度、职位、知识图谱、简历、组织等结构化数据。
- R2 存储课程和运行时资源。
- Worker Cron 负责官方职位来源、知识图谱和邮件生命周期任务。

主要代码入口：

| 能力 | 当前文件 |
| --- | --- |
| 前端路由 | `src/App.tsx` |
| Worker 静态页与 Meta 重写 | `src/worker.ts` |
| 路由 Meta | `src/lib/routeMetadata.ts` |
| 浏览器端 Meta | `src/components/seo/RouteMetadata.tsx` |
| 多语言路由工具 | `src/lib/localeRoutes.ts` |
| 多语言路由边界 | `src/components/seo/LocalizedPublicRoute.tsx` |
| 首页/课程目录 | `src/pages/Catalog.tsx` |
| 课程介绍 | `src/pages/CourseStart.tsx` |
| 课程详情 | `src/pages/CourseDetail.tsx` |
| 课程内容解析 | `src/data/courseContent.ts` |
| 课程目录数据 | `src/data/courseCatalog.ts` |
| Markdown 渲染 | `src/components/course/MarkdownRenderer.tsx` |
| 国际化初始化 | `src/i18n.ts` |
| robots | `public/robots.txt` |
| sitemap | `public/sitemap.xml` |
| Cloudflare 配置 | `wrangler.toml` |

### 4.2 内容资产

正式浏览器审计确认首页呈现 19 门课程：

- Claude Code：15 章、50 节。
- Hermes Agent：20 章、60 节。
- OpenAI Codex：20 章、76 节。
- Forward Deployed Engineer：12 章、61 节。
- 15 门 AI 基础与工程课：每门 10 章、30 节。

合计：

- 19 门课程。
- 217 章。
- 697 节。

此外还有：

- AI Engineering Progressive Assessment 面试题集。
- LLM Inference Scheduler 面试题与交互执行轨迹。
- 官方职位采集、岗位技能证据和知识图谱。
- 课程进度、CLI Lab、互动课程组件。
- 多简历管理和针对岗位的简历生成。
- 五种 UI/课程语言：简体中文、繁体中文、英文、法文、西班牙文。

### 4.3 用户群

| 用户群 | 当前需求 | 可被搜索承接的内容 | 主要转化 |
| --- | --- | --- | --- |
| AI 初学者 | 建立心智模型、选择学习路径 | AI 入门、Prompt、模型、Agent 基础 | 开始第一节、完成基础课 |
| 软件开发者 | 使用 Claude Code、Codex、MCP、Hooks | 工具教程、安装、配置、Debug、Git/CI | 完成实战、注册保存进度 |
| AI/Agent 工程师 | 架构、可靠性、安全、成本、评测 | Agent Loop、上下文工程、Prompt 安全、模型路由 | 深度课程、互动实验、回访 |
| FDE/AI 求职者 | 面试、岗位技能、作品集、简历 | FDE 课程、面试题、职位技能报告 | 面试练习、收藏岗位、制作简历 |
| 全球学习者 | 需要母语内容和本地场景 | 语言独立课程、案例和指南 | 课程完成、Newsletter、品牌搜索 |
| 团队/组织 | 需要团队学习和内容管理 | 未来的团队学习说明、案例 | 组织试用或合作咨询 |

SEO 第一阶段应优先服务前四类公开用户。账户管理、组织管理、后台和简历编辑器属于产品功能，不应直接作为可索引落地页。

## 5. 审计基线

### 5.1 已完成且应保留的能力

1. 公开 HTML 已有服务端 Title、Description、Canonical、Robots 和 `X-Robots-Tag`。
2. 未知路径返回 HTTP 404，而不是软 404 或自动跳回首页。
3. `/jobs` 和职位详情目前保持 `noindex,nofollow`。
4. 登录、账户、后台、简历、工具和错误页不作为 AdSense 内容页。
5. 只有课程 Lesson 和 Interview Question 允许出现受控手动广告。
6. `robots.txt` 和 `sitemap.xml` 可以从正式域名访问。
7. 课程详情页有 H1、H2/H3、目录、标签、上一节/下一节和较完整正文。
8. 课程介绍页有课程名、简介、章节数、小节数、技能和章节目录。

### 5.2 正式站验证结果

| 检查项 | 结果 | 判断 |
| --- | --- | --- |
| 首页状态 | HTTP 200 | 正常 |
| 课程介绍状态 | HTTP 200 | 正常 |
| 课程小节状态 | HTTP 200 | 正常 |
| 无效路径状态 | HTTP 404 + noindex | 正常 |
| 职位目录 | HTTP 200 + noindex | 策略正确 |
| 首页可见字符 | 约 4,261 | 浏览器渲染后有内容 |
| 课程介绍可见字符 | 约 3,543 | 浏览器渲染后有内容 |
| 课程小节可见字符 | 约 4,023 | 浏览器渲染后有内容 |
| 面试题可见字符 | 约 3,517 | 浏览器渲染后有内容 |
| 初始 HTML 正文 | 空 `#root` | 高优先级问题 |
| JSON-LD | 0 | 缺失 |
| hreflang | 0 | 缺失 |
| Sitemap URL | 41 | 与内容规模不匹配 |
| 首页内部链接 | 36 | 有基础，但缺主题体系 |

实验室浏览器测量：

- 首页脚本传输约 162 KB。
- Claude Code 小节页脚本传输约 1.62 MB。
- 390×844 单次实验室 LCP：首页约 1.0 秒，小节页约 2.8 秒。
- 单次实验室 CLS 为 0。

以上不是真实用户 Core Web Vitals，不能代替 Search Console/CrUX 的 75 分位数据。PageSpeed API 本次返回 429，未取得正式 Lighthouse 报告。

### 5.3 主要问题分级

| 优先级 | 问题 | 影响 |
| --- | --- | --- |
| P0 | 初始 HTML 没有正文 | 抓取和非 Google 搜索引擎依赖二次渲染，分享预览与性能受限 |
| P0 | 多语言内容与 URL 不是稳定一一对应 | Canonical、语言识别、收录和排名可能混乱 |
| P0 | 路由 Meta 使用 ID，而不是真实内容字段 | 无法精确匹配长尾意图，Title/Description 重复和低信息量 |
| P0 | 当前工作区已有 locale 路由，但 Meta/Worker/Sitemap 尚未形成完整闭环 | 半成品若直接发布，可能产生大量 404、错误 Canonical 或重复页 |
| P1 | Sitemap 手写且覆盖极少 | 发现效率低，无法按质量、语言和页面类型管理 |
| P1 | 缺少 Schema、Open Graph、作者、更新时间 | 搜索理解、分享点击率和信任信号不足 |
| P1 | 首页信息架构偏目录工具 | 搜索访客难以快速理解定位和选择路径 |
| P1 | 550ms 后自动弹出打赏窗口 | 干扰首屏、移动体验、课程开始和信任 |
| P1 | 首页固定 65% 进度 | 对匿名访客形成不真实状态 |
| P1 | “查看更多课程”和导航搜索无实际行为 | 降低可用性和转化 |
| P1 | 多语言 Markdown eager import | 小节页脚本体积和解析成本较高 |
| P2 | 缺少主题中心和原创可链接资产 | 权威度和自然外链增长缓慢 |
| P2 | 职位内容缺少可索引原创编辑层 | 无法安全承接职位长尾搜索 |

### 5.4 当前工作区的国际化改造状态

当前工作区已经出现以下未确认上线能力：

- `/:locale` 公共路由组。
- `LocalizedPublicRoute`。
- `localeRoutes.ts`。

但当前 `routeMetadata.ts` 仍主要按无语言前缀的 `/courses/...`、`/interviews/...`、`/jobs/...` 判断已知路由和生成 Canonical。正式发布前必须完成以下闭环：

1. Worker 能识别带语言前缀的公开路径。
2. Meta 能从 URL 语言而不是浏览器偏好产生。
3. 前端导航和语言切换保持语言前缀。
4. Canonical 指向同语言 URL。
5. hreflang 互相完整引用并包含自身和 `x-default`。
6. Sitemap 只包含真实存在、通过审校的语言 URL。
7. 无语言旧路径明确选择保留、301 或作为 `x-default`。
8. API、账户和后台路径不能被 `/:locale` 误匹配。

在这套闭环完成前，不建议只把 `/:locale` 路由单独部署到生产。

## 6. 品牌定位与搜索战略

### 6.1 推荐定位

推荐对外定位：

> Study AI Now! 是连接课程、实战、面试和岗位能力的免费 AI 工程学习平台。

英文定位：

> Free, practical AI engineering courses that connect learning, hands-on work, interviews, and job skills.

不建议把品牌主定位写成泛化的“AI 学习平台”或“最大的 AI 课程网站”。当前更有差异化的价值是：

- 原创、可操作的课程。
- 每节都有任务、练习或可验证产出。
- Claude Code、Codex、Agent 工程等新兴主题的系统深度。
- 课程与职位技能证据连接。
- 面试题、互动实验、简历和学习进度形成闭环。

### 6.2 搜索增长模型

```text
搜索问题
  ↓
主题中心 / 实战指南 / 面试题
  ↓
课程介绍
  ↓
具体小节与互动练习
  ↓
注册保存进度
  ↓
回访、完成课程、Newsletter、简历或岗位行为
```

SEO 的主要转化不应是页面浏览或广告展示，而应是：

- 开始第一节。
- 完成一个练习。
- 完成一个章节。
- 注册保存进度。
- 7 日内回访。
- 完成面试题。
- 收藏岗位或创建简历。

## 7. 关键词与内容集群

### 7.1 关键词选择规则

每个页面设置：

- 一个主要关键词/搜索意图。
- 2–5 个紧密相关的次级表达。
- 若干自然出现的实体、工具、任务和错误名称。

不使用 `meta keywords`。Google 不使用该字段。

长尾词可按以下公式扩展：

```text
[工具或岗位] + [任务] + [环境] + [问题] + [用户阶段]
```

示例：

- Claude Code + 安装 + Windows + 权限错误 + 新手。
- Codex CLI + AGENTS.md + monorepo + 怎么配置。
- AI Agent + checkpoint + 循环卡死 + 如何恢复。
- FDE + 面试 + 客户发现 + 案例题。

这些组合用于发现需求，不代表每种组合都建立一个页面。多个表达应合并到同一个完整页面的 H2、故障排查表和可见 FAQ 中。

### 7.2 第一优先级主题集群

#### 集群 A：Claude Code

主题中心建议 URL：

```text
/zh-CN/topics/claude-code
/en/topics/claude-code
```

主要关键词：

- Claude Code 教程。
- Claude Code 中文教程。
- Claude Code tutorial。

长尾方向：

- Claude Code 安装与第一次启动。
- Claude Code 原生安装和 npm 安装区别。
- Claude Code Windows/WSL/macOS 配置。
- `CLAUDE.md` 怎么写。
- Claude Code 权限、沙盒和安全设置。
- Claude Code MCP 配置。
- Claude Code Hooks。
- Claude Code VS Code、Desktop、CLI 区别。
- Claude Code Git、PR、CI 工作流。
- Claude Code 常见错误与修复。

#### 集群 B：OpenAI Codex

主题中心建议 URL：

```text
/zh-CN/topics/openai-codex
/en/topics/openai-codex
```

主要关键词：

- OpenAI Codex 教程。
- Codex CLI 教程。
- Codex tutorial。

长尾方向：

- Codex CLI 安装、登录和更新。
- Codex `AGENTS.md` 示例。
- Codex sandbox、approval policy 和 permissions。
- Codex MCP 配置。
- Codex App Worktree。
- Codex Cloud Tasks。
- Codex Code Review。
- Codex Git/PR/CI 工作流。
- Codex CLI、IDE、Web、App 如何选择。

#### 集群 C：AI Agent 工程

主题中心建议 URL：

```text
/zh-CN/topics/agent-engineering
/en/topics/agent-engineering
```

主要关键词：

- AI Agent 工程。
- Agent Engineering。
- AI Agent 架构。

长尾方向：

- Agent Loop 原理与实现。
- Agent Loop 卡死、预算和恢复。
- Context Engineering 与 Prompt Engineering 区别。
- Agent 工具调用与权限边界。
- Agent Memory 设计。
- Multi-Agent 架构选型。
- Agent 评测和可观测性。
- Prompt Injection 防御。
- LLM 成本、缓存与模型路由。

#### 集群 D：FDE、面试与求职

主题中心建议 URL：

```text
/zh-CN/topics/fde-career
/en/topics/fde-career
```

主要关键词：

- FDE 是什么。
- Forward Deployed Engineer。
- FDE interview。

长尾方向：

- FDE 和 Solutions Engineer 区别。
- FDE 客户发现与问题定义。
- FDE POC、Pilot、Handoff。
- FDE 面试流程和案例题。
- AI Engineer 系统设计面试。
- LLM inference scheduler interview。
- AI 工程师职位技能。
- AI 工程师简历和作品集。

### 7.3 第二优先级主题

- AI 学习路径与能力定位。
- LLM 核心原理。
- Prompt 工程与结构化输出。
- RAG 与上下文工程。
- AI 幻觉分析与治理。
- AI 图像生成与产品化。
- AI 安全与 Prompt 注入。

第二优先级内容应等待第一批集群获得 Search Console 数据后再扩展，避免同时分散站点主题权重和运营资源。

## 8. 目标信息架构

推荐中期公开信息架构：

```text
/{locale}/
├── topics/
│   ├── claude-code
│   ├── openai-codex
│   ├── agent-engineering
│   └── fde-career
├── courses/
│   └── {courseSlug}/
│       ├── chapters/{chapterSlug}/
│       └── lessons/{lessonSlug}/
├── interviews/
│   └── {setSlug}/...
├── guides/
│   └── {guideSlug}
├── research/
│   └── {reportSlug}
├── tools/
│   └── {toolSlug}
├── about
├── editorial-policy
├── privacy
└── terms
```

私有/工具型路由继续不带 locale 前缀或按应用逻辑处理：

```text
/login
/register
/me/*
/admin/*
/api/*
```

### 8.1 URL 原则

- 使用稳定、可读、短的 slug。
- 课程 ID 如 `claude-code-guide`、`codex-tutorial` 已具备较好语义，可保留。
- 小节 URL 当前使用 `01-01` 等编号，建议新增可读 slug，但必须保留旧 URL 的 301 映射。
- 不在 URL 中加入年份，除非内容确实是按年份发布的报告。
- 过滤器和站内搜索参数不生成可索引页面。
- 旧 `/courses` 可继续 Canonical 到首页，或重构为独立课程目录；两种方案只能选其一。

### 8.2 语言 URL 决策

推荐：

- `/` 作为 `x-default`，显示语言选择或稳定的品牌入口。
- `/zh-CN/` 为简体中文。
- `/zh-TW/` 为繁体中文。
- `/en/` 为英文。
- `/fr/` 为法文。
- `/es/` 为西班牙文。

注意：URL 是否采用大小写语言码需要在发布前统一。SEO 更常见的是小写路径 `/zh-cn/`、`/zh-tw/`，而当前工作区使用 `zh-CN`、`zh-TW`。如果改为小写，应在正式开放索引前一次决定，不要在已收录后反复改变。

推荐最终路径采用：

```text
/zh-cn/
/zh-tw/
/en/
/fr/
/es/
```

应用内部语言代码仍可保持 `zh-CN` 和 `zh-TW`，通过 URL 映射层转换。

## 9. 页面级优化要求

### 9.1 首页

当前 `/` 实际渲染 `Catalog`，不是未使用的 `Landing.tsx`。首页整改必须修改真实路由组件。

推荐首页结构：

1. H1：`免费学习 Claude Code、Codex 与 AI Agent 工程`。
2. 首屏 80–120 字说明平台适合谁、提供什么、能完成什么。
3. 三个“从这里开始”入口：
   - AI 初学者。
   - AI 编程开发者。
   - AI 工程/FDE 求职者。
4. 四个主题中心入口。
5. 真实课程规模：19 门、217 章、697 节，必须自动计算。
6. 精选课程，不再把所有课程平铺成首页唯一主体。
7. 原创资产：模板、互动工具、数据报告、面试题。
8. 最近更新和版本说明。
9. 作者、审核和编辑原则。
10. 可见 FAQ。
11. 单一主要 CTA：开始一条学习路径。

必须整改：

- 匿名用户不显示固定 65% 进度。
- “继续学习”仅在存在真实本地或服务器进度时显示。
- “查看更多课程”必须跳转到真实目录或移除。
- 导航搜索必须接入站内搜索或移除。
- 首次访问不在 550ms 后自动弹打赏；改为用户主动打开、完成练习后或第二次回访后展示。

### 9.2 课程介绍页

每个课程介绍页应包含：

- 唯一 H1。
- 课程一句话价值。
- 适合人群。
- 前置知识。
- 学习成果。
- 章节和小节数量。
- 预计学习时间。
- 至少一个可验证的最终产出。
- 完整章节目录。
- 作者、审核人、发布日期、更新时间。
- 版本和官方来源。
- 相关面试题、职位技能和后续课程。
- 可见 FAQ。

不要添加没有真实数据支持的：

- 虚假学员数。
- 虚假评分。
- 虚假证书。
- “最好”“第一”等无法验证的宣传语。

### 9.3 章节导读页

章节页不应只作为目录中转，应包含：

- 本章解决的问题。
- 前置知识。
- 本章学习成果。
- 小节列表和每节摘要。
- 一个章节级任务或交付物。
- 与上一章和下一章的语义关系。
- 相关主题中心和面试题。

薄章节页应合并到课程页或保持 `noindex`，不能为了路由层级而强制索引。

### 9.4 课程小节页

每个小节应在开头直接回答搜索问题：

- 这节解决什么问题。
- 最终能得到什么结果。
- 适用工具版本和环境。

正文建议包含：

- 概念解释。
- 操作步骤或架构说明。
- 可运行代码或可验证示例。
- 预期输出。
- 常见错误与排查。
- 安全或成本边界。
- 练习和验收标准。
- 结尾检查表。
- 2–4 个上下文相关内部链接。
- 官方来源。
- 作者、审核和更新时间。

当前小节 URL 的 Meta 不能继续使用 `Lesson 01 01`。应读取真实小节字段，例如：

```text
课程：Claude Code 实战指南
小节：选择你的安装路径
主要意图：Claude Code 安装方式怎么选
```

### 9.5 面试目录与题目页

面试目录页：

- 说明适合的岗位和能力层级。
- 展示题型、难度、评估维度和练习路径。
- 链接到对应课程章节。

题目页：

- 题目和约束在静态 HTML 中可见。
- 提示、答案和执行轨迹可以保持交互，但不能让搜索引擎只看到空壳。
- 增加评分标准、常见错误、进一步问题和相关课程。
- 不在答案隐藏时添加与不可见答案不一致的 FAQ Schema。

### 9.6 职位目录与职位详情

当前继续保持 `noindex,nofollow`。

只有满足以下条件的精选职位或职位分析页，才可在 P3 评估开放索引：

- 来源展示权和许可边界明确。
- 不只是复制第三方 JD。
- 有人工审核的技能证据。
- 有岗位能力差距解释。
- 有与课程和面试题的原创连接。
- 有地区、岗位类型和数据时间说明。
- 原始职位失效时有明确过期策略。

优先建立可索引的汇总研究页，而不是逐条开放 JD：

- 加拿大 AI 岗位技能趋势。
- 中国 AI 工程岗位技能趋势。
- FDE 招聘能力模型。
- Agent Engineer 常见技能组合。

### 9.7 About、作者与编辑政策

当前 About 页面说明了免费、实践和可追溯原则，但仍缺少：

- 明确的负责人或作者信息。
- 作者专业背景和实践经历。
- 内容如何创作、测试和审核。
- AI 辅助创作的使用方式。
- 纠错和更新机制。
- 引用和第三方内容边界。

建议新增：

```text
/{locale}/authors/{authorSlug}
/{locale}/editorial-policy
```

如果内容由 AI 辅助，应说明人类如何选题、验证、运行示例、审核事实和批准发布，不能把 AI 作为虚假作者。

## 10. Meta 信息规范

### 10.1 基本要求

每个可索引页面必须有：

- 唯一 `<title>`。
- 唯一 `<meta name="description">`。
- 唯一、自引用 Canonical。
- 正确 `html lang`。
- 对应语言的 Open Graph。
- 对应语言的 hreflang。
- 页面类型匹配的 JSON-LD。

Google 没有固定 Title 字符数限制。编辑规范可将英文 50–60 字符、中文约 24–32 个汉字作为显示测试参考，但最终以准确、简洁和设备宽度为准。

Meta Description 也不是固定排名字段或固定长度要求，应写成能够准确概括页面并促使目标用户点击的一到两句话。

### 10.2 推荐模板

| 页面 | Title 模板 | Description 组成 |
| --- | --- | --- |
| 首页 | `{主要价值} | Study AI Now` | 主题 + 免费/实践 + 结果 |
| 主题中心 | `{主题}学习路径：{三个关键子主题} | Study AI Now` | 适合谁 + 覆盖范围 + CTA |
| 课程页 | `{课程名}：{核心结果} | Study AI Now` | 章/节 + 技能 + 项目结果 |
| 章节页 | `{章节名} - {课程名} | Study AI Now` | 本章问题 + 小节范围 + 结果 |
| 小节页 | `{真实小节标题} - {课程名}` | 问题 + 环境 + 操作结果 |
| 面试题 | `{题目主题}面试题：{核心任务}` | 岗位 + 难度 + 提示/评分/实现 |
| 研究报告 | `{地区/主题}趋势报告 {年份}` | 数据范围 + 方法 + 关键发现 |

示例：

```text
首页 Title
免费 AI 工程实战课程：Claude Code、Codex 与 Agent | Study AI Now

首页 Description
免费学习 Claude Code、OpenAI Codex、AI Agent、上下文工程与 FDE，通过系统课程、互动练习和面试题，把 AI 知识转化为可验证的工程能力。

课程 Title
Claude Code 中文实战教程：从安装到 MCP 与 Hooks | Study AI Now

小节 Title
Claude Code 安装方式怎么选：原生安装、npm 与平台差异

面试题 Title
LLM 推理调度器面试题：Decode-First Atomic Scheduler
```

### 10.3 SEO 数据源统一

当前 `routeMetadata.ts`、课程数据、页面 H1、Sitemap 和 Worker 有多个独立数据源。应建立统一页面注册表：

```ts
type SeoPageRecord = {
  path: string;
  locale: 'zh-CN' | 'zh-TW' | 'en' | 'fr' | 'es';
  pageType: 'home' | 'topic' | 'course' | 'chapter' | 'lesson' | 'interview' | 'guide' | 'research' | 'legal';
  title: string;
  description: string;
  h1: string;
  canonical: string;
  alternates: Array<{ locale: string; href: string }>;
  lastModified?: string;
  image?: string;
  indexable: boolean;
  schema: Record<string, unknown>[];
};
```

这个注册表应同时驱动：

- Worker 初始 HTML。
- 浏览器端路由切换。
- 预渲染页面。
- Canonical。
- hreflang。
- Open Graph。
- JSON-LD。
- Sitemap。
- 自动测试。

## 11. 结构化数据

| 页面类型 | 推荐 Schema | 约束 |
| --- | --- | --- |
| 全站 | `Organization`、`WebSite` | 必须对应真实品牌、URL、Logo 和搜索功能 |
| 首页课程列表 | `ItemList` | 列表项 URL 必须为真实 Canonical |
| 课程介绍 | `Course`、`BreadcrumbList` | 课程必须有明确学习成果和可见描述 |
| 小节 | `LearningResource` 或 `TechArticle`、`BreadcrumbList` | 作者、日期、标题必须可见且真实 |
| 面试题 | `Article`/`LearningResource`、`BreadcrumbList` | 不伪造 FAQ、评分或招聘信息 |
| 可见 FAQ | `FAQPage` | 问题和答案必须在页面中可见 |
| 步骤指南 | `HowTo` | 仅用于真正的逐步任务，不给所有课程机械添加 |
| 原创报告 | `Article` 或 `Report`、`Dataset` | 方法、时间、范围和数据来源必须公开 |

不要使用：

- 没有真实价格和交易对象的 `Product`。
- 虚假 `aggregateRating`。
- 不可见内容的 FAQ。
- 同一对象互相冲突的多个 Schema 类型。

所有 JSON-LD 必须通过 Google Rich Results Test 和 Schema.org Validator。

## 12. 静态网页、SSR 与架构方案

### 12.1 当前方案的限制

Worker 目前通过 HTMLRewriter 修改 Title、Description、Canonical 和 Robots，但返回的正文仍是空的 React 根节点。这个方案解决了软 404 和基础 Meta，但没有解决：

- 初始 HTML 正文。
- 页面级 JSON-LD。
- 真实 H1 和内部链接。
- JavaScript 失败时的可读性。
- 社交抓取器和不能执行 JavaScript 的搜索服务。

### 12.2 方案 A：继续只用 HTMLRewriter

改动：

- 扩展 Worker Meta。
- 添加 Open Graph、hreflang、JSON-LD。

优点：

- 改动最小。
- 与现有 Worker 和 CSP 最兼容。

缺点：

- 仍然没有正文 HTML。
- 课程内容仍大量进入客户端包。
- 不能解决最核心的抓取和性能问题。

结论：只能作为 P1 过渡，不应作为最终 SEO 架构。

### 12.3 方案 B：保留 Vite/React 的构建时预渲染

改动：

1. 增加 Vite SSR entry。
2. 使用 React 服务端渲染和 StaticRouter 为选定路由生成 HTML。
3. 将输出写入每个语言和页面路径的静态文件。
4. Worker 优先返回预渲染文件，再应用 CSP nonce 和响应头。
5. 浏览器 Hydration 后恢复筛选、进度、实验和账户功能。

优点：

- 保留绝大部分现有 React 组件和 Cloudflare 部署。
- 可以逐页扩大，不需要一次迁移全站。
- 首次 HTML 有真实正文。
- 适合 Markdown 构建时已知的课程和面试内容。

风险：

- 当前组件中存在 `window`、`document`、localStorage、ResizeObserver 和浏览器请求，需要隔离到 effect 或客户端组件。
- i18next 必须由 URL 语言初始化，避免 Hydration 不一致。
- CSP nonce 需要继续由 Worker 注入到所有脚本。
- 构建时间和输出文件数量会上升。

结论：推荐方案。P1 试点，P2 规模化。

### 12.4 方案 C：迁移到 Astro、Next.js 或其他内容优先框架

优点：

- 原生支持静态页面、页面级数据加载、内容集合和路由 Meta。
- 更容易让交互组件按岛屿加载。

缺点：

- 需要迁移课程、账户、后台、API、交互实验和 Cloudflare 部署。
- React Router 路由和当前 Worker 分发需要重新设计。
- 容易同时引入认证、CSP、AdSense、D1/R2 和 Hydration 回归。

结论：P1/P2 不建议。只有在 P2 完成后，满足以下条件才进入 P3 技术选型：

- 内容发布频率和页面类型继续快速增长。
- Vite 预渲染构建时间或维护成本不可接受。
- 需要独立编辑系统、预览、草稿和多作者工作流。
- 通过迁移 Spike 证明收益明显高于风险。

### 12.5 推荐混合架构

```text
公开原创内容
  → 构建时生成完整 HTML
  → Worker 注入 CSP/Headers
  → 浏览器只 Hydrate 需要交互的部分

账户/后台/简历
  → 保持 SPA
  → noindex

职位工具
  → 保持动态 API + SPA
  → 默认 noindex

精选原创职位报告
  → 独立静态研究页
  → 通过审核后 index
```

### 12.6 课程内容拆包

当前多语言课程 Markdown 使用 eager glob。P2 应实现：

- 构建工具读取全部内容并生成 SEO 注册表。
- 每个静态页面只输出当前课程/章节/小节正文。
- 客户端不再为查看一节课加载同语言的全部课程正文。
- 互动组件单独懒加载。
- 需要动态切换的小节可按课程或小节拆分 chunk。
- 若改为 R2 动态读取，必须保证初始 HTML 已有主体正文，而不是再次退回客户端请求正文。

## 13. Sitemap、Canonical、robots 与索引门控

### 13.1 自动 Sitemap

Sitemap 应由 `SeoPageRecord` 自动生成，不能继续手工维护。

推荐拆分：

```text
/sitemaps/sitemap-pages.xml
/sitemaps/sitemap-courses-zh-cn.xml
/sitemaps/sitemap-courses-en.xml
/sitemaps/sitemap-interviews.xml
/sitemaps/sitemap-guides.xml
/sitemaps/sitemap-research.xml
/sitemap.xml              # sitemap index
```

每个 URL：

- 必须返回 200。
- 必须是自引用 Canonical。
- 必须允许索引。
- 必须具有完整内容。
- `lastmod` 只在正文、Schema 或重要链接实质变化时更新。

### 13.2 内容质量门控

建议给每个候选页面计算人工可审查的 10 分质量分：

| 项目 | 分值 | 判断 |
| --- | --- | --- |
| 搜索意图明确 | 0–2 | 页面能回答一个明确问题 |
| 内容完整 | 0–2 | 有结论、解释、示例、练习或结果 |
| 原创价值 | 0–2 | 有测试、经验、数据、模板或独特分析 |
| 信任信号 | 0–2 | 作者、日期、来源、版本和审核 |
| 内部链接 | 0–1 | 有入口和相关出口 |
| 技术正确 | 0–1 | 200、Canonical、Meta、Schema、移动端通过 |

建议策略：

- 8–10 分：可进入 Sitemap 并开放索引。
- 6–7 分：保持 noindex，完成补充后再开放。
- 0–5 分：合并、重写或删除，不进入 Sitemap。

Google 没有固定最低字数要求，不能以字数代替完整性和原创性。

### 13.3 robots 与 noindex

当前 `robots.txt` 同时 Disallow 登录/注册页面，而这些页面又返回 noindex。爬虫被 robots 阻止后可能看不到 noindex。

推荐：

- `/api/`、`/admin/`、`/me/` 保持 Disallow 或使用认证阻止。
- 对公开可访问但不希望索引的登录、注册、联系、职位工具页，允许爬取并通过 HTTP `X-Robots-Tag: noindex` 控制索引。
- 发布后检查 Cloudflare Managed Robots/Content Signals 是否改变最终 `robots.txt`。
- 不在 robots.txt 中写 `noindex`，搜索引擎不支持该方式。

### 13.4 Canonical 和旧 URL

URL 迁移要求：

1. 先生成完整旧 URL → 新 URL 映射。
2. 每个旧 URL 只 301 到一个最相关新 URL。
3. 不把全部旧小节重定向到课程首页。
4. 新页面使用自引用 Canonical。
5. hreflang 只引用最终 200 URL。
6. Sitemap 只包含新 Canonical。
7. 保留映射至少 12 个月，优先长期保留。

## 14. 内部链接策略

每个可索引页面应在三次点击内从对应语言首页或主题中心到达。

### 14.1 课程集群链接

```text
首页
  → 主题中心
    → 课程介绍
      → 章节
        → 小节
```

小节页至少包含：

- 面包屑。
- 上一节/下一节。
- 课程介绍。
- 2–4 个相关小节或指南。
- 相关面试题或实践项目。
- 相关官方文档。

### 14.2 Anchor Text

使用描述性锚文本：

- 好：`Claude Code 权限与沙盒配置`。
- 好：`继续学习 Agent Loop 恢复策略`。
- 差：`点击这里`。
- 差：`了解更多`。

不要在全站机械重复完全相同的关键词锚文本。应自然混合品牌、完整标题和部分匹配表达。

### 14.3 防止孤儿页面

构建时自动检查：

- 每个 indexable URL 至少有一个来自首页、主题中心、课程页或正文的内部链接。
- 不把只有 Sitemap 入口的页面视为合格。
- 不让筛选器生成不可达但可索引的组合页。

## 15. 图片、代码和页面体验

### 15.1 图片

- 课程封面提供稳定 URL、宽高和自然 Alt。
- 首屏图片不懒加载；首屏以下图片可 lazy load。
- 使用 WebP/AVIF 或经过压缩的 SVG/PNG。
- 提供 `srcset` 和适合移动端的尺寸。
- `og:image` 使用与页面相关的高质量图，而不是所有页面共用 Logo。
- 装饰性 Logo 使用空 Alt；内容图片必须有描述性 Alt。

### 15.2 代码与互动内容

- 代码块有语言、复制按钮和预期输出。
- 互动组件失效时仍保留文字说明和核心结论。
- 交互执行轨迹不能成为正文唯一来源。
- 不为了加载实验组件阻塞文章主体。

### 15.3 Core Web Vitals

验收目标使用真实用户 75 分位：

- LCP ≤ 2.5 秒。
- INP ≤ 200 毫秒。
- CLS ≤ 0.1。

重点优化：

- 小节页不加载全部课程 Markdown。
- 首屏正文预渲染。
- 课程封面指定宽高。
- 打赏弹窗不在首屏自动出现。
- 广告位预留合理尺寸，避免布局偏移。
- 第三方脚本只在符合条件的路由按需加载。

## 16. P1：稳定基础与低风险整改

### 16.1 目标

在不进行全站 URL 大迁移的前提下，修复当前最明显的 SEO、首页和数据一致性问题，并验证 Vite 预渲染是否可行。

### 16.2 工作范围

#### P1.1 建立数据与监测基线

- 验证 Google Search Console Domain Property。
- 提交当前 Sitemap。
- 接入 Bing Webmaster Tools。
- 建立 GA4 或符合隐私要求的第一方事件体系。
- 使用 Cloudflare Web Analytics/Worker 日志补充技术数据。
- 记录当前已发现、已抓取、已索引 URL。
- 记录当前自然查询、CTR、国家、设备和语言。

#### P1.2 统一 SEO 页面注册表

- 从课程、章节、小节和面试内容读取真实字段。
- 让 Worker 和浏览器 Meta 使用同一数据源。
- 替换基于 `readableSlug` 的泛化 Meta。
- 加入 Open Graph、Twitter Card 和基础 JSON-LD。
- 自动测试 Title、Description、Canonical、Robots 唯一性。

#### P1.3 首页整改

- 重写 H1 和首屏说明。
- 新增三类用户入口和四个主题入口。
- 课程规模自动生成。
- 移除匿名固定 65% 进度。
- 修复或删除“查看更多课程”。
- 修复或删除无行为的导航搜索。
- 关闭首次自动打赏弹窗，只保留主动入口。

#### P1.4 内容信任信号

- 新增作者字段和作者页基础数据。
- 新增发布时间、实质更新时间和版本字段。
- 增加来源区和编辑政策。
- 对使用 AI 辅助的内容说明人工验证流程。

#### P1.5 Sitemap 和 robots

- 从统一注册表生成 Sitemap。
- 第一批只提交 30–50 个高质量页面。
- 修复 robots Disallow 与 noindex 冲突。
- 保留职位页、账户页和工具页 noindex。

#### P1.6 预渲染试点

试点范围：

- 首页。
- 4 个主题中心原型。
- 4 个核心课程介绍页。
- 10–20 个高意图小节。
- 2 个面试题。

试点不改变正式 URL，仅验证：

- 初始 HTML 有正文。
- Hydration 无错误。
- CSP nonce 正常。
- AdSense 白名单无回归。
- 真实 404 正常。
- 构建时间可接受。

### 16.3 P1 不做的事项

- 不开放五种语言全部索引。
- 不大规模改变课程 URL。
- 不开放职位详情索引。
- 不迁移到新框架。
- 不启动大预算 SEM。

### 16.4 P1 验收标准

- [ ] 首页、4 门核心课程和试点小节的初始 HTML 包含 H1、摘要和正文。
- [ ] 试点页面不存在重复 Title、Description 或 Canonical。
- [ ] 小节 Meta 使用真实标题，不再显示 `Lesson 01 01`。
- [ ] 所有结构化数据通过验证。
- [ ] Sitemap 完全由注册表生成，没有 noindex、404 或非 Canonical URL。
- [ ] 无效 URL 仍返回 404 + noindex。
- [ ] 职位、账户、后台和简历仍不进入索引。
- [ ] 首次访问不自动弹出打赏窗口。
- [ ] AdSense 现有白名单和 CSP 验证通过。
- [ ] Search Console、Bing 和转化事件有可使用基线。

## 17. P2：语言 URL、静态化和主题集群

### 17.1 目标

完成对搜索结构影响最大的改造：一个 URL 对应一种语言，优先内容直接返回完整 HTML，并建立系统化主题集群。

### 17.2 工作范围

#### P2.1 完成语言独立 URL

优先开放：

- 简体中文。
- 英文。

暂缓开放索引：

- 繁体中文。
- 法文。
- 西班牙文。

繁中、法文、西班牙文可以继续提供产品内切换，但只有通过内容完整性和人工审校后才进入 hreflang 与 Sitemap。

必须完成：

- URL 语言映射。
- 语言切换生成真实链接，不只是 `i18n.changeLanguage`。
- 自引用 Canonical。
- 双向 hreflang。
- `x-default`。
- 对应语言 `html lang`。
- 旧 URL 301 策略。
- Worker、Router、Meta、Sitemap 和导航一致。

#### P2.2 扩大预渲染

- 4 个主题中心。
- 19 个课程介绍页中通过审核的页面。
- 80–120 个高质量小节。
- 主要章节导读。
- 所有原创面试题页面。
- About、作者和编辑政策。

#### P2.3 内容拆包

- 移除小节页对全部课程 Markdown 的 eager 客户端依赖。
- 以页面、课程或章节为粒度拆分内容。
- 互动实验和图表按需加载。
- 对比 P1 基线，课程小节脚本传输至少下降 50%。

#### P2.4 主题中心与内部链接

- 上线 Claude Code、Codex、Agent Engineering、FDE Career 四个主题中心。
- 为每个中心设置明确学习路径。
- 建立主题 → 课程 → 小节 → 面试 → 职位技能的上下文链接。
- 自动检测孤儿页面和无效内部链接。

#### P2.5 内容生产

- 每周一篇深度实战指南。
- 每月一个原创案例、工具或模板。
- 对高曝光低 CTR 页面重写 Title/Description。
- 对“已抓取但未索引”页面进行合并、补充或 noindex。

### 17.3 P2 结构性风险

| 风险 | 处理 |
| --- | --- |
| URL 迁移流量损失 | 全量映射、301、Canonical、Sitemap 同步发布 |
| 五语言页面爆炸 | 只开放已审校语言，其他语言 noindex |
| 翻译回退导致重复内容 | 不把 fallback 内容作为独立语言页索引 |
| Hydration 不一致 | URL 决定首屏语言，服务端和客户端共享 locale |
| CSP 阻止静态页脚本 | Worker 继续统一注入 nonce |
| 预渲染误放广告 | 静态 HTML 不预置广告请求；沿用路由白名单 |
| 构建时间增长 | 页面注册表增量生成、内容分包、缓存 |
| 旧链接失效 | 保留永久 301 和自动链接检查 |

### 17.4 P2 验收标准

- [ ] 简体中文和英文公开页面分别具有独立 URL。
- [ ] 每个语言页面有自引用 Canonical、完整双向 hreflang 和 `x-default`。
- [ ] Googlebot 不依赖 LocalStorage 或 Accept-Language 才能识别页面语言。
- [ ] 80–120 个优先页面的初始 HTML 包含主要正文。
- [ ] 旧 URL 只跳转一次并到达对应新 URL。
- [ ] Sitemap 中无重定向、noindex、404 或重复 Canonical。
- [ ] 课程小节脚本传输较 P1 基线下降至少 50%。
- [ ] 无 Hydration 错误、CSP 错误、移动端横向溢出和广告范围回归。
- [ ] 每个可索引页面可在三次点击内到达。

## 18. P3：规模化内容、品牌与平台演进

### 18.1 目标

在 P1/P2 已证明索引、排名和转化有效后，扩大语言、主题、原创研究、合作渠道和内容运营能力。

### 18.2 工作范围

- 对繁中、法文和西班牙文完成母语审核后开放索引。
- 建立内容草稿、预览、审核、发布和更新工作流。
- 建立作者、审核人、来源、版本和变更记录后台。
- 发布季度 AI 岗位技能报告。
- 发布 Claude Code/Codex 实际任务对比和 Agent 可靠性基准。
- 上线更多可链接工具、模板和数据资产。
- 对部分职位页增加原创编辑层并试点开放索引。
- 基于 Search Console 数据扩展第二批主题集群。
- 根据 P2 构建和维护数据决定是否进行框架迁移 Spike。

### 18.3 框架迁移决策门槛

只有满足以下至少三项，才建议正式评估迁移：

- 可索引页面规模和语言组合导致 Vite 预渲染难以维护。
- 内容团队需要草稿、预览、审批和定时发布。
- 当前 React 组件难以区分服务器和客户端边界。
- 构建时间持续超过可接受发布窗口。
- 页面级数据加载和缓存策略明显受限。
- Astro/Next 试点证明 LCP、包体和开发效率有显著收益。

迁移必须先覆盖一个独立主题中心或内容子树，不应同时迁移账户、后台、简历和全部 API。

### 18.4 P3 验收标准

- [ ] 新语言只有在完整审校后进入索引。
- [ ] 每季度至少一个具有原创方法和数据范围的研究资产。
- [ ] 自然获得的相关域名链接持续增长。
- [ ] 品牌搜索、Newsletter 和 7 日回访持续增长。
- [ ] 职位索引试点不复制第三方内容、不违反展示权、不产生过期职位垃圾页。
- [ ] 框架迁移决定有实际性能、发布和维护数据支持。

## 19. 网络营销方案

### 19.1 内容分发模型

每一份深度内容应形成一个内容包：

```text
1 篇站内完整指南
  + 1 个代码或模板资产
  + 1 张架构图/检查表
  + 1 个 3–8 分钟演示视频
  + 2–3 个社交平台短内容
  + 1 封 Newsletter 摘要
```

外部渠道不复制整篇正文。每个平台内容应独立有价值，同时链接到对应 Canonical 页面。

### 19.2 渠道矩阵

| 市场 | 渠道 | 内容形式 | 主要目标 |
| --- | --- | --- | --- |
| 简体中文开发者 | 掘金、知乎、Bilibili、微信公众号、技术社群 | 实战总结、错误排查、视频、模板 | 主题词、品牌认知、课程开始 |
| 繁体中文开发者 | YouTube、LinkedIn、台湾技术社群 | 繁中教程、直播、工作流案例 | 课程访问、Newsletter |
| 英文开发者 | GitHub、YouTube、LinkedIn、dev.to、Hashnode | Repo、Benchmark、Case Study | 外链、品牌搜索、课程开始 |
| AI Agent 社群 | Reddit、Discord、开源项目社区 | 经验、失败案例、工具 | 讨论、自然链接、用户反馈 |
| 求职/FDE 用户 | LinkedIn、大学社群、Meetup、Newsletter | 面试题、岗位技能报告、作品集 | 面试练习、简历、回访 |

社区发布必须遵守平台规则，不批量发同一链接，不伪装普通用户，不用机器人灌水。

### 19.3 可链接资产

优先建设：

1. AGENTS.md/CLAUDE.md 可复制模板。
2. Claude Code/Codex 权限与安全检查表。
3. Agent Loop 故障与恢复案例库。
4. Prompt Injection 红队检查清单。
5. LLM 成本与模型路由计算器。
6. 推理调度器交互演示。
7. FDE Discovery、POC 和 Handoff 模板。
8. AI 岗位技能趋势报告。

这些资产比普通“软文”更容易获得自然引用和高质量链接。

### 19.4 外链与合作

推荐：

- 为相关开源项目提供经过测试的教程和示例。
- 与大学 AI 社团、Meetup、技术播客合作。
- 用原创报告向相关媒体、Newsletter 和社区定向沟通。
- 参与技术问答时先解决问题，再在确实相关时链接课程。
- 向官方资料页或资源合集提交真正有价值的工具。

禁止：

- 买链接。
- PBN。
- 大规模互链。
- 低质量目录批量提交。
- 评论和论坛垃圾链接。
- 寄生 SEO。
- 以 AI 批量生成站群文章。

### 19.5 Newsletter 与生命周期营销

用户自主订阅后，按兴趣分组：

- Claude Code。
- Codex。
- Agent Engineering。
- FDE/Career。

建议内容：

- 新课程或实质更新。
- 一道实战题或面试题。
- 工具版本变化和验证记录。
- 岗位技能趋势。
- 新模板或互动工具。

频率以每周或双周为主，不使用高频促销。退订、同意和地区隐私要求必须完整。

### 19.6 SEM

SEM 在 P1 基础和落地页完成前不应扩大投放。

试点要求：

- 为 Claude Code、Codex 和 FDE 建立独立落地页。
- 落地页不显示 AdSense。
- 使用精确匹配和词组匹配。
- 建立负关键词。
- 按语言和地区拆分 Campaign。
- 转化使用开始课程、完成练习、注册和回访。
- 每周查看 Search Terms，排除不相关流量。

不把 SEM 当作提高自然排名的手段，也不以广告点击或浅页面浏览作为成功指标。

## 20. 内容发布节奏

### 20.1 建议节奏

- 每周：1 篇完整实战指南。
- 每周：2–3 个短内容或片段。
- 每两周：1 个视频或互动演示。
- 每月：1 个原创案例、模板或工具。
- 每季度：1 份数据或趋势报告。
- 每月：更新至少 2 篇已有高曝光内容。

### 20.2 12 周主题示例

| 周 | 主内容 | 配套资产 |
| --- | --- | --- |
| 1 | Claude Code 安装方式选择 | 安装决策表 |
| 2 | CLAUDE.md 项目规则 | 模板 Repo |
| 3 | Claude Code 权限与沙盒 | 安全检查表 |
| 4 | Claude Code MCP | 配置示例 |
| 5 | Codex AGENTS.md | 多目录示例 |
| 6 | Codex CLI/App/IDE 选择 | 对比图 |
| 7 | Agent Loop 卡死与恢复 | 状态机图 |
| 8 | Context Engineering | Context 清单 |
| 9 | Prompt Injection 防御 | 红队测试表 |
| 10 | LLM 成本与路由 | 成本计算器 |
| 11 | FDE Discovery 案例 | Discovery 模板 |
| 12 | Inference Scheduler 面试题 | 互动执行轨迹 |

## 21. 衡量体系

### 21.1 技术指标

- 初始 HTML 含正文的页面比例。
- 有效 Canonical 覆盖率。
- hreflang 完整率。
- JSON-LD 验证通过率。
- Sitemap 中 200/indexable/Canonical URL 比例。
- 404、软 404、重定向链和抓取错误。
- LCP、INP、CLS 真实用户 75 分位。
- 页面 JavaScript 传输和执行时间。

### 21.2 搜索指标

- Submitted vs Indexed。
- Crawled - currently not indexed。
- Discovered - currently not indexed。
- 每个主题集群的曝光、点击、CTR 和平均排名。
- 品牌词与非品牌词占比。
- 国家、语言、设备和页面类型表现。
- Title 修改前后的 CTR 变化。

### 21.3 产品转化指标

推荐事件：

```text
view_topic
view_course
start_first_lesson
view_lesson
complete_lesson
complete_chapter
start_lab
complete_lab
start_interview
complete_interview
register
return_7d
bookmark_job
create_resume
newsletter_subscribe
```

核心漏斗：

```text
自然曝光
→ 搜索点击
→ 课程/主题访问
→ 开始第一节
→ 完成练习
→ 注册
→ 7 日回访
```

### 21.4 报表维度

- Locale。
- Topic cluster。
- Page type。
- Course。
- Device。
- Country/region。
- New vs returning visitor。
- Organic vs paid vs referral vs direct。

## 22. 自动化验收与发布门禁

建议新增 SEO 验证脚本并接入 CI：

```text
verify:seo-manifest
verify:seo-meta
verify:seo-sitemap
verify:seo-hreflang
verify:seo-schema
verify:seo-prerender
verify:seo-links
verify:seo-live
```

### 22.1 构建期检查

- 所有 indexable 页面有唯一 Title、Description、Canonical 和 H1。
- 所有语言 URL 有自身 hreflang 和双向引用。
- 所有 Sitemap URL 存在于注册表。
- noindex 页面不进入 Sitemap。
- 404 和重定向不进入 Sitemap。
- 所有 Schema 可序列化且字段完整。
- 所有内部链接指向已知路由。
- 所有图片有宽高和合适 Alt。

### 22.2 本地浏览器检查

- 390×844、768×1024、1440×900。
- JavaScript 开启和禁用两种状态。
- 语言直达和语言切换。
- 登录和未登录。
- 广告拦截和无广告填充。
- 慢速网络。
- 课程锁定和解锁。
- 无效课程、章节、小节和面试题。

### 22.3 正式域名检查

- HTTP 状态。
- 原始 HTML 正文。
- Title/Description/Canonical/Robots。
- hreflang。
- JSON-LD。
- CSP。
- AdSense 请求范围。
- robots.txt。
- Sitemap Index 和子 Sitemap。
- 301 映射。
- Search Console URL Inspection。

## 23. 风险、回滚与发布顺序

### 23.1 风险登记

| 风险 | 等级 | 预防措施 | 回滚 |
| --- | --- | --- | --- |
| locale 路由误判为 404 | 高 | Router、Worker、Meta 共用解析函数 | 关闭 locale 入口，保留旧路由 |
| Canonical 指错语言 | 高 | 注册表生成 + 自动互检 | 回滚 Canonical，不保留错误 Sitemap |
| 旧 URL 权重丢失 | 高 | 逐 URL 301 映射 | 恢复旧 URL 200，保留映射数据 |
| Hydration 文本不一致 | 高 | URL 决定服务端和客户端语言 | 对问题页回退为纯静态正文 |
| CSP 阻止脚本 | 高 | Worker 统一 nonce | 回滚预渲染模板，保留 Meta |
| AdSense 出现在错误页面 | 高 | 原有白名单 + live diagnostic | 移除正文广告组件，不影响所有权 Meta |
| Sitemap 洪泛薄内容 | 中 | 质量分门控 | 删除子 Sitemap 并 noindex |
| 构建时间过长 | 中 | 分语言、分主题、增量生成 | 缩小预渲染白名单 |
| 多语言 fallback 重复 | 高 | 未完成语言不开放索引 | noindex 并移出 hreflang |
| 职位版权/展示问题 | 高 | 继续 noindex，优先汇总分析 | 下线研究页或收窄展示字段 |

### 23.2 发布顺序

1. 数据注册表和自动测试。
2. 首页与 Meta 修复。
3. 单语言预渲染试点。
4. 生产验证和 Search Console 观察。
5. 简中/英文语言 URL。
6. 301、Canonical、hreflang、Sitemap 同批发布。
7. 扩大优先页面。
8. 内容营销和小预算 SEM。
9. 其他语言和职位研究页。

不要先发布语言 URL，再在下一次发布补 Canonical/301/Sitemap；这些必须作为一个原子发布单元。

## 24. 建议的项目拆分

### Epic SEO-01：SEO 数据注册表

- 内容字段规范。
- Meta 生成。
- Canonical/Robots。
- Sitemap。
- JSON-LD。
- 测试。

### Epic SEO-02：首页与内容信任

- 首页信息架构。
- 用户入口。
- 作者与编辑政策。
- 更新与来源。
- 打赏和假状态整改。

### Epic SEO-03：预渲染试点

- Vite SSR entry。
- StaticRouter。
- 浏览器 API 隔离。
- Hydration。
- Worker/CSP。
- 试点页面。

### Epic SEO-04：国际化 URL

- URL locale 映射。
- Router/Worker/Meta 统一。
- 语言切换链接。
- hreflang。
- 301。
- 多语言 Sitemap。

### Epic SEO-05：课程包体与性能

- eager glob 评估。
- 内容分包。
- 互动组件懒加载。
- 图片和字体。
- Core Web Vitals。

### Epic SEO-06：主题中心与内容营销

- 四个主题中心。
- 80–120 个优先页面。
- 模板、工具、报告。
- Newsletter。
- 渠道分发。

### Epic SEO-07：测量和实验

- GSC/Bing/Analytics。
- 事件漏斗。
- Title/Description 实验。
- SEM 试点。
- 月度内容淘汰和更新。

## 25. 需要产品负责人确认的决策

以下决策应在 P1 进入开发前确认：

1. 根路径 `/` 是简体中文首页、英文首页，还是 `x-default` 入口。
2. URL 使用 `/zh-CN/` 还是 `/zh-cn/`。推荐 `/zh-cn/`。
3. 第一批正式开放索引的语言。推荐简体中文和英文。
4. `/courses` 是独立课程目录还是继续 Canonical 到首页。
5. 作者和审核信息使用个人身份、团队身份还是两者结合。
6. 内容中 AI 辅助创作的披露方式。
7. 第一批 30–50 个 P1 页面和 80–120 个 P2 页面名单。
8. Newsletter、GA4、Google Ads 和 CMP 的账号及权限负责人。
9. 是否继续维持所有课程免费，以及主要业务转化是会员、组织、捐赠还是职业工具。

这些决策会影响 URL、Schema、首页 CTA、转化漏斗和内容优先级，不能由工程层单独假设。

## 26. 完成定义

本 SEO 改造不能以“代码已合并”作为完成。每个阶段完成必须同时满足：

1. 源代码和自动测试通过。
2. 构建产物检查通过。
3. Cloudflare 正式部署成功。
4. 正式初始 HTML 和浏览器渲染验证通过。
5. 404、Canonical、hreflang、Schema、Sitemap 和 AdSense 无回归。
6. Search Console 能看到目标 URL，且无明显覆盖错误。
7. 至少经过一个观察周期确认抓取、索引和转化数据。

排名和索引由搜索引擎决定，不能把“提交 Sitemap”描述为“已经收录”，也不能把实验室 Lighthouse 分数描述为真实用户 Core Web Vitals。

## 27. 官方参考

- [Google：创建有帮助、可靠、以用户为中心的内容](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google：面向生成式 AI 搜索功能的优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google：JavaScript SEO 基础](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google：多语言和地区版本](https://developers.google.com/search/docs/advanced/crawling/localized-versions)
- [Google：Title Links 指南](https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets)
- [Google：创建和提交 Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google：Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google：noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google：Course 结构化数据](https://developers.google.com/search/docs/appearance/structured-data/course)
- [Google：图片 SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Web.dev：Core Web Vitals 阈值](https://web.dev/articles/defining-core-web-vitals-thresholds)

## 28. 与现有 AdSense 整改的关系

本方案必须继续遵循 `PRD/ADSENSE-REMEDIATION-AND-SETTINGS.md`：

- 所有权 Meta 与广告加载分离。
- 非内容、登录、账户、后台、简历、工具和错误页不请求 AdSense。
- 课程 Lesson 和 Interview Question 只允许受控手动广告。
- SEM 专用落地页不显示 AdSense。
- 静态化不能把广告脚本重新写回全局模板。
- Auto ads、CMP 和 Policy Center 仍需在 Google 后台独立管理。

SEO 带来的流量增长必须是真实、自然、有用户意图的访问，不能使用付费点击、流量交换或激励广告点击。
