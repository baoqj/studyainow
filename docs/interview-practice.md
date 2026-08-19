# 面试题练习单元 — 技术手册

## 概览

面试题练习单元为公开的 `/interviews` 路由组，将 `Interview/` 下的私有题库（不进入 GitHub 仓库）以多语种、引导式互动形式呈现。

- 数据层：`src/data/interviewContent.ts`
- UI 文案：`src/data/interviewCopy.ts`
- 页面：`src/pages/InterviewCatalog.tsx`、`InterviewSetStart.tsx`、`InterviewLevel.tsx`、`InterviewQuestion.tsx`
- 组件：`src/components/interview/{InterviewCard,RevealSection,DifficultyLadder}.tsx`
- 路由注册：`src/App.tsx`；顶部导航入口：`src/components/layout/Navbar.tsx` + `src/data/navigationCopy.ts`

## 内容与解析

题面 Markdown 位于仓库外 `../../Interview/ai_engineering_progressive_assessment_levels_1_6/locales/{en,zh-CN,zh-TW,fr,es}/Level-{1..6}-Practice-Problems.md`，由 `import.meta.glob(..., { query: '?raw' })` 在构建时打包（与课程内容同模式）。

解析器不依赖各语种的小节标题文本，而是依赖**固定结构顺序**：

- H2 顺序：难度画像 → 本级考察能力 → 题目一览表 → Question 1..6
- 每题 `###` 顺序：题目描述 → 要求 → 示例 → 题目分析 → 常见错误 → 完整解法 → 要点总结

因此新增语种时只需按相同顺序翻译，无需改解析器。校验入口：

```bash
npm run verify:interview   # 结构、围栏闭合、非英文本与英文源代码块逐字节一致
```

封面图从 `Interview/.../assets/cover.*` 通过 glob 引入；缺失时卡片自动使用品牌渐变占位，构建不会失败。

## 练习进度

- 键：`studyai.now.interview.progress`（localStorage）
- 结构：`{ [setId]: { [questionId]: { revealed: string[], assessment?: 'got-it' | 'review' } } }`
- 无后端参与、无 PII；「重置练习进度」删除该键。

## 技能图谱集成

- 每题 2 个技能 slug 定义于 `src/data/interviewContent.ts` 的 `questionSkills`。
- 迁移 `0034_interview_practice.sql` 以 `approved` 状态向共享 `skills` 表插入 13 个新技能（`ON CONFLICT(slug) DO UPDATE`，幂等）；复用 6 个既有技能 slug。
- **刻意不**写入 `lesson_skill_coverage`：该表会流入职位详情页的「技能 → 课程」面板，而该面板只解析课程 ID。待运营明确需求后，再由管理员审核建立题面覆盖关联。

发布流程与回滚与其他迁移一致：先核对远程迁移状态，再 `wrangler d1 execute studyainow-db --remote --file migrations/0034_interview_practice.sql`，随后执行 `PRAGMA foreign_key_check`（本迁移无外键变更）。

## 边界

- 不执行用户代码、无判题、无登录进度。
- 不修改既有课程/职位/简历页面与 API；唯一共享改动是 `Navbar`（新增一个导航链接）与 `App.tsx`（新增四个懒加载路由）。
- `motion/react` 仅用于练习页展开动画（React 19 兼容）。
