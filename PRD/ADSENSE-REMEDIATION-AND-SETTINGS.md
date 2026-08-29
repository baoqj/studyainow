# Study AI Now! AdSense 整改与后台设置方案

- 站点：<https://studyai.now>
- 发布商 ID：`pub-2674524487916692` / `ca-pub-2674524487916692`
- 广告单元 ID：`4529179585`
- 文档日期：2026-08-21
- 整改目标：解决 `Verify site ownership`、`Google-served ads on screens without publisher-content` 和 `Low value content`

## 1. 结论与整改原则

本轮整改把“站点所有权验证”和“广告投放”拆成两套独立机制：

1. 所有权验证保留在所有 HTML 文档的 `<head>` 中，不依赖广告展示。
2. AdSense 广告脚本不再全站加载，只在已经渲染出实质原创正文的公开内容页按需加载。
3. 登录、账户、管理、简历工具、联系表单、法律页面、目录/导航页、Loading、锁定内容及错误页不创建广告标签，也不请求 AdSense 脚本。
4. 对可索引内容补充服务端标题、描述、Canonical、Robots 和真实 HTTP 404；对工具性、私有和第三方职位页面设置 `noindex`。
5. AdSense 后台复审前关闭 Auto ads，先采用数量可控的手动广告单元。

Google 没有公布通过审核所需的固定文章数或最低字数。审核重点应放在：原创性、完整性、用户是否能直接阅读、导航是否清晰，以及广告是否只出现在有足够发布商内容的页面。

## 2. 拒审原因与处理映射

| 拒审项 | 主要风险 | 本轮代码处理 | AdSense 后台处理 |
| --- | --- | --- | --- |
| Verify site ownership | 验证代码缺失、爬虫无法稳定读取 | 保留根 HTML 的 `google-adsense-account` 元标签；保留根目录 `ads.txt` | Sites 中确认发布商 ID，触发 Check for updates |
| Screens without publisher-content | Auto ads/全局脚本在登录、导航、工具、Loading、错误页创建广告 | 移除全局脚本；只在课程 Lesson 与 Interview Question 组件按需加载 | 关闭 Auto ads；如暂时不能关闭，配置页面排除项 |
| Low value content | SPA 元信息重复、软 404、目录页/第三方信息被当作主内容 | 路由级 Metadata、Canonical、`noindex`、真实 404、Sitemap 精简、隐私披露 | Search Console 提交 Sitemap；积累更多公开原创长文后再复审 |

## 3. 第一部分：代码修改

### 3.1 所有权验证

根 HTML 保留以下元标签：

```html
<meta name="google-adsense-account" content="ca-pub-2674524487916692" />
```

根目录继续公开：

```text
https://studyai.now/ads.txt
google.com, pub-2674524487916692, DIRECT, f08c47fec0942fa0
```

注意：`ads.txt` 主要用于授权销售商声明，不能完全替代 Sites 页面要求的所有权检查；元标签和 `ads.txt` 应同时保留。

### 3.2 广告加载方式

已从 `index.html` 删除全局 AdSense Loader。现在只有符合条件的 React 内容组件挂载后，才动态创建：

```text
https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2674524487916692
```

广告请求失败或被浏览器拦截时，不影响正文显示。

### 3.3 页面投放白名单

| 页面类型 | 示例 | 广告 | 索引策略 | 原因 |
| --- | --- | --- | --- | --- |
| 课程 Lesson 正文 | `/courses/claude-code-guide/chapters/1/lessons/01-01` | 允许 1 个手动广告 | `index,follow` | 有完整原创教程正文 |
| Interview Question 正文 | `/interviews/.../levels/1/questions/1-1` | 允许 1 个手动广告 | `index,follow` | 有题目、提示、答案与自评内容 |
| 首页/课程目录 | `/`、`/courses` | 禁止 | 首页可索引；`/courses` Canonical 到 `/` | 目录和导航不应成为广告承载页 |
| 课程介绍/章节页 | `/courses/:id`、`.../chapters/:id` | 禁止 | `index,follow` | 主要用于选课和章节导航 |
| Interview 目录/级别页 | `/interviews`、`.../levels/:id` | 禁止 | `index,follow` | 主要用于导航 |
| 登录/注册/找回密码 | `/login` 等 | 禁止 | `noindex,nofollow` | 行为型页面 |
| 账户/管理/创作者 | `/me/*`、`/admin/*`、`/creator/*` | 禁止 | `noindex,nofollow` | 私有或行为型页面 |
| 简历工具 | `/me/resume/*` | 禁止 | `noindex,nofollow` | 工具操作界面，不是发布商正文 |
| 职位页 | `/jobs`、`/jobs/:slug` | 禁止 | `noindex,nofollow` | 搜索工具及第三方职位信息，待增加人工原创编辑层 |
| 联系/法律页 | `/contact`、`/privacy`、`/terms` | 禁止 | Contact noindex；法律页可索引 | 不以广告变现为目的 |
| Loading/锁定/错误页 | 任何路径 | 禁止 | 错误页 `noindex,nofollow` | 不允许无内容屏幕投放广告 |

代码白名单是第一道控制。即使 AdSense 后台误开 Auto ads，非白名单路由也不会加载 AdSense Loader，因此不会由本站主动触发广告代码。

### 3.4 SEO、可抓取性与软 404

Cloudflare Worker 现在按请求路径在服务端写入：

- 独立 `<title>` 和 `<meta name="description">`；
- 页面 Canonical；
- HTML Robots 和响应头 `X-Robots-Tag`；
- 未知路径及无效课程 ID 返回 HTTP `404`，不再返回 200 后跳首页；
- 前端显示真实 Not Found 页面，不再把不存在的课程回退为默认课程。

`robots.txt` 明确允许 `Mediapartners-Google` 与 `Google-Display-Ads-Bot` 访问公开页面，并继续禁止 API、后台及个人账户路径。

`sitemap.xml` 已移除重复或不适合索引的 `/courses`、`/jobs`、`/contact`，补充代表性课程 Lesson 和 Interview Question 正文 URL。

### 3.5 隐私政策

五种语言的 Privacy Policy 已增加 Google AdSense、Cookie/本地存储、个性化广告、Google Ads Settings 及适用地区 CMP 的说明，并提供以下链接：

- [Google 如何使用合作伙伴网站的数据](https://policies.google.com/technologies/partner-sites)
- [Google Ads Settings](https://adssettings.google.com/)
- [Google Privacy Policy](https://policies.google.com/privacy)

### 3.6 自动验收

项目新增/更新以下检查：

```bash
npm run typecheck
npm run verify:adsense
npm run verify:public-pages
npm run build
node scripts/verify-adsense-placements.mjs
```

验收标准：

- `index.html` 有所有权元标签且没有全局广告 Loader；
- 课程 Lesson 与 Interview Question 存在且仅存在预期手动广告位；
- 登录、工具、目录、法律和错误页不出现 `ins.adsbygoogle`；
- 无效 URL 返回 404；
- `ads.txt`、`robots.txt`、`sitemap.xml` 可从正式域名访问。

## 4. 第二部分：AdSense 后台设置

以下操作必须由有权限的 AdSense 账号在后台完成，Wrangler/Cloudflare 部署不能代替。

### 4.1 Sites：重新验证所有权

1. 登录 AdSense，进入 **Sites**。
2. 打开 `studyai.now`，确认显示的发布商账号为 `pub-2674524487916692`。
3. 验证方式优先选择 **Meta tag**；代码已经部署到根 HTML `<head>`。
4. 同时打开 <https://studyai.now/ads.txt>，确认只有正确发布商记录，没有 HTML、重定向或登录墙。
5. 在 Sites 中点击 **Check for updates / Verify**。
6. 若仍显示未验证，检查录入的是裸域名 `studyai.now`，不要填写路径，也不要混用其他 AdSense 账号的发布商 ID。

参考：[连接网站到 AdSense](https://support.google.com/adsense/answer/12169212?hl=en)、[AdSense 网站审批流程](https://support.google.com/adsense/answer/12171612?hl=en)。

### 4.2 Ads：复审阶段关闭 Auto ads

推荐设置：

1. 进入 **Ads → By site → studyai.now → Edit**。
2. 将 **Auto ads** 总开关关闭并保存。
3. 复审阶段不要启用 Anchor、Vignette、Side rail、Multiplex 或 Related search。
4. 只保留代码中的手动 Display ad unit `4529179585`。
5. 页面最多 1 个手动广告，并保证广告位上下有清晰、足量的正文内容。

关闭原因：代码只能控制本站主动加载的广告组件；如果后台 Auto ads 开启，Google 仍可能在加载过 AdSense Loader 的正文页自动插入额外广告，导致数量和位置不可预测。

若业务上暂时无法关闭 Auto ads，至少在 **Page exclusions** 中添加以下排除模式：

```text
studyai.now/login
studyai.now/register
studyai.now/forgot-password
studyai.now/reset-password
studyai.now/me/*
studyai.now/admin/*
studyai.now/creator/*
studyai.now/resume/*
studyai.now/jobs/*
studyai.now/contact
studyai.now/privacy
studyai.now/terms
studyai.now/about
```

但 Page exclusions 只能作为后台保险，不能替代本轮代码白名单。

参考：[排除 Auto ads 页面](https://support.google.com/adsense/answer/99376)、[无发布商内容屏幕政策](https://support.google.com/publisherpolicies/answer/11112688)。

### 4.3 Ads：检查手动广告单元

进入 **Ads → By ad unit → Display ads**，检查广告单元 `4529179585`：

- 类型为 Responsive Display；
- Client 必须是 `ca-pub-2674524487916692`；
- 不再把这段代码复制到全局 Layout、`index.html` 或 Tag Manager；
- 不在菜单、按钮、上一课/下一课导航、答案展开按钮附近投放；
- 不在空白占位符、Loading 或无填充时人为制造巨大空白。

### 4.4 Privacy & messaging：同意管理

1. 进入 **Privacy & messaging**。
2. 对 EEA、英国和瑞士流量创建 Google-certified CMP 消息。
3. 推荐三按钮方案：**Consent / Do not consent / Manage options**。
4. 绑定站点 `studyai.now`，并设置隐私政策 URL：`https://studyai.now/privacy`。
5. 检查消息语言与站点五种语言的覆盖；无法完全覆盖时至少提供英文回退。
6. 发布后以欧洲地区测试环境检查：在用户作出选择前，个性化广告及相关存储行为符合所选同意模式。

参考：[欧洲法规消息](https://support.google.com/adsense/answer/13554020?hl=en)。

### 4.5 Brand safety 与广告体验

复审阶段建议保持保守：

- 检查 **Brand safety → Content → Blocking controls**，屏蔽与教育品牌明显冲突的敏感类别；
- 不使用诱导点击文案，例如“支持本站请点击广告”；
- 广告与课程卡片、下载按钮、答案按钮使用明显不同的视觉区隔；
- 移动端检查广告不遮挡导航、正文和交互控件；
- 不为提高展示数拆分短页或制造自动刷新。

### 4.6 Sites、Policy center 与爬虫错误

1. 在 **Sites** 确认 `studyai.now` 状态不再是 Needs attention。
2. 在 **Policy center** 打开具体问题，确认违规 URL 示例；逐一使用无痕窗口验证。
3. 在 **Account → Access and authorization → Crawler access** 查看是否有登录墙或抓取错误。
4. 检查 `ads.txt` 状态最终变为 Authorized；Google 更新可能有延迟，不要反复更换文件。
5. 如果 Policy center 仍列出旧页面，先等待重新抓取，再申请复审；不要在同一天反复提交。

### 4.7 Search Console 配合

1. 在 Search Console 验证 Domain property `studyai.now`。
2. 提交 `https://studyai.now/sitemap.xml`。
3. 用 URL Inspection 检查首页、至少 3 篇课程 Lesson、1 篇 Interview Question。
4. 确认 Google 选择的 Canonical 与页面声明一致。
5. 确认无效 URL 为 404，登录/账户/职位页为 Excluded by `noindex`。
6. 对主要正文 URL 请求索引，但不要批量提交薄内容或目录页。

### 4.8 重新提交审核前清单

必须全部满足后，再勾选 **I confirm I have fixed the issues**：

- [ ] Sites 已识别 Meta tag，发布商 ID 正确。
- [ ] `https://studyai.now/ads.txt` 返回 HTTP 200、`text/plain` 和正确记录。
- [ ] Auto ads 已关闭；或已完成严格页面排除且通过逐页测试。
- [ ] 登录、注册、密码重置、账户、后台、简历、职位、联系、法律、404 页面均无广告请求。
- [ ] 课程 Lesson 与 Interview Question 在广告上方已有完整正文，不依赖登录。
- [ ] Privacy & messaging 已发布适用地区 CMP。
- [ ] Privacy Policy 已显示 AdSense 和 Cookie/个性化说明。
- [ ] `robots.txt` 没有阻止广告爬虫访问公开正文。
- [ ] Sitemap 已提交，代表性正文 URL 可抓取、Canonical 正确。
- [ ] 手机和桌面无明显布局溢出、遮挡、误导点击或长时间空白。
- [ ] Policy center 中旧违规 URL 已重新抓取或不再可投放广告。

## 5. 内容质量的下一阶段

本轮已经修复广告范围、元信息和软 404，但应用主体仍是客户端渲染 SPA。Google 能执行 JavaScript，不过执行时间和失败场景不可控。如果复审仍反馈 Low value content，下一阶段按以下顺序实施：

1. 为优先课程 Lesson 和 Interview Question 增加 SSG/SSR，使首次 HTML 响应直接包含正文，而不是只有 React 根节点。
2. 首批选择 10–20 篇完整原创内容，每篇包含明确学习目标、概念讲解、代码/案例、练习和作者/更新信息。
3. 增加内容作者、编辑原则、引用来源与内容更新时间，明确与官方文档或第三方素材的边界。
4. 职位页只有在加入足量人工分析、技能差距解释和原创学习建议后，才移除 `noindex` 并考虑广告。
5. 不批量生成结构雷同的 AI 短文；合并重复主题，删除占位、未完成和只有链接的页面。

参考：[打造具有独特内容和良好体验的网站](https://support.google.com/adsense/answer/10015918?hl=en&ref_topic=12129816)、[动态渲染说明](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)。

## 6. 回滚与观察

- 若广告 Loader 导致 CSP 或页面错误，可临时移除两个正文组件中的 `AdSenseAd`，所有权元标签与 `ads.txt` 仍保持有效。
- 部署后连续观察 Cloudflare Worker 错误、浏览器 Console、AdSense Crawler errors 和 Policy center。
- 审核通过后也不要立刻全开 Auto ads。先维持手动广告 1–2 周，根据内容长度、可见率和用户体验逐步调整。

## 7. 2026-08-21 部署与正式域名验证记录

- Cloudflare Worker：`studyainow-web`
- 正式版本：`f21549d0-cf76-45ab-a33e-c80cfee3d125`
- 路由：`studyai.now/*`
- 本地结果：TypeScript、AdSense 静态策略、公开页面、Interview 内容、Resume 回归、Vite Production Build 全部通过。
- 正式 HTML：所有受测路由均有所有权 Meta tag，且初始 HTML 不再包含全局 AdSense Loader。
- 正式响应：普通公开页返回 200；未知路径与无效课程返回 404 + `noindex,nofollow` + Not Found 标题。
- 正式广告测试：课程 Lesson 与 Interview Question 各有 1 个配置的手动广告位；章节、登录、隐私、简历入口、未知路径和无效课程均为 0 个广告标签、0 个 AdSense 请求。
- 正式内容测试：4 个 Sitemap 代表性 Lesson 均能在无登录浏览器中渲染，正文可见字符约 4,371–10,592。
- 正式静态文件：`ads.txt` 为 200 `text/plain` 且内容正确；`robots.txt` 明确允许 AdSense 爬虫；`sitemap.xml` 包含代表性 Lesson 和 Interview Question。
- CSP：正文广告页未产生 CSP 拒绝错误。

重要待办：正式浏览器在每个合格正文页检测到 1 个手动广告位之外，还检测到 1 个 Google 自动插入广告，证明 AdSense 后台 **Auto ads 当前仍开启**。请在提交复审前按 4.2 节关闭 Auto ads，关闭后重新运行：

```bash
node scripts/diagnose-adsense-live.mjs
```

理想结果应为正文页 `manualAds: 1`、`allAds: 1`；所有非正文页仍应为 `allAds: 0`、`adRequests: 0`。
