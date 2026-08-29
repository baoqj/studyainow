export type AdminInterviewSet = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  topic: string;
  levelCount: number;
  questionCount: number;
  publicRoute: string;
};

// Keep the admin catalog deliberately small: importing interviewContent.ts in
// the Worker would also bundle every question and Markdown answer into the API.
export const ADMIN_INTERVIEW_SETS: readonly AdminInterviewSet[] = [
  {
    id: 'ai-engineering-progressive-assessment',
    title: 'AI 工程渐进式评估：Python 编程面试题集',
    subtitle: '从入门实现到分布式系统模拟，6 级 36 道原创 Python 题',
    category: 'AI 工程',
    topic: 'Python 编程评估',
    levelCount: 6,
    questionCount: 36,
    publicRoute: '/interviews/ai-engineering-progressive-assessment',
  },
  {
    id: 'inference-engine-scheduler',
    title: 'LLM 推理引擎调度器：Python 递进式面试题',
    subtitle: '用 5 个连续阶段实现从基础批调度到 KV 抢占与优先级准入',
    category: 'AI 基础设施',
    topic: 'LLM 推理调度与 Python',
    levelCount: 5,
    questionCount: 5,
    publicRoute: '/interviews/inference-engine-scheduler',
  },
];
