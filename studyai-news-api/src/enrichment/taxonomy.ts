export const CLASSIFIER_VERSION = 'rules-v1';

export interface ClassifiedTag {
  id: string;
  confidence: number;
  evidence: string;
}

export interface ClassifiedEntity extends ClassifiedTag {}

export interface ClassifiedMetadata {
  categoryId: string;
  categoryConfidence: number;
  categoryEvidence: string;
  tags: ClassifiedTag[];
  entities: ClassifiedEntity[];
}

interface Rule {
  id: string;
  keywords: string[];
}

const CATEGORY_RULES: Rule[] = [
  { id: 'category:model-research', keywords: ['research', 'paper', 'model', 'benchmark', 'evaluation', 'reasoning', 'training', '研究', '模型', '论文', '基准'] },
  { id: 'category:products-tools', keywords: ['product', 'tool', 'assistant', 'agent', 'copilot', 'launch', 'feature', '产品', '工具', '助手', '智能体'] },
  { id: 'category:development-infrastructure', keywords: ['developer', 'infrastructure', 'cloud', 'api', 'sdk', 'platform', 'database', 'gpu', '开发', '基础设施', '云', '算力'] },
  { id: 'category:business-funding', keywords: ['business', 'funding', 'investment', 'valuation', 'revenue', 'acquisition', 'startup', '商业', '融资', '投资', '收购'] },
  { id: 'category:policy-governance', keywords: ['policy', 'regulation', 'governance', 'safety', 'law', 'act', 'risk', '政策', '治理', '监管', '安全', '法案'] },
  { id: 'category:open-source', keywords: ['open source', 'open-source', 'github', 'repository', 'apache', 'mit license', '开源', '仓库'] },
  { id: 'category:industry-applications', keywords: ['healthcare', 'finance', 'manufacturing', 'enterprise', 'robotics', 'retail', 'medical', '医疗', '金融', '制造', '行业', '机器人'] },
  { id: 'category:education-careers', keywords: ['education', 'learning', 'career', 'job', 'course', 'student', 'teacher', '教育', '学习', '职业', '就业', '课程'] },
];

const TAG_RULES: Rule[] = [
  { id: 'tag:agents', keywords: ['agent', 'agentic', '智能体'] },
  { id: 'tag:api', keywords: ['api', 'apis', 'sdk'] },
  { id: 'tag:benchmark', keywords: ['benchmark', 'evaluation', 'eval', '基准', '评测'] },
  { id: 'tag:developer-tools', keywords: ['developer tool', 'coding', 'code generation', '开发者工具', '编程'] },
  { id: 'tag:funding', keywords: ['funding', 'investment', 'valuation', '融资', '投资'] },
  { id: 'tag:generative-ai', keywords: ['generative ai', 'genai', 'text generation', '生成式'] },
  { id: 'tag:governance', keywords: ['governance', 'regulation', 'policy', '治理', '监管', '政策'] },
  { id: 'tag:large-language-models', keywords: ['llm', 'large language model', 'language model', '大语言模型'] },
  { id: 'tag:multimodal', keywords: ['multimodal', 'vision language', '多模态'] },
  { id: 'tag:open-source', keywords: ['open source', 'open-source', 'github', '开源'] },
  { id: 'tag:research', keywords: ['research', 'paper', 'study', '研究', '论文'] },
  { id: 'tag:safety', keywords: ['safety', 'alignment', 'risk', '安全', '对齐', '风险'] },
];

const ENTITY_RULES: Rule[] = [
  { id: 'entity:openai', keywords: ['openai', 'open ai'] },
  { id: 'entity:anthropic', keywords: ['anthropic', 'claude'] },
  { id: 'entity:google-deepmind', keywords: ['google deepmind', 'deepmind', 'google ai', 'gemini'] },
  { id: 'entity:meta-ai', keywords: ['meta ai', 'llama'] },
  { id: 'entity:microsoft', keywords: ['microsoft', 'azure ai'] },
  { id: 'entity:apple', keywords: ['apple intelligence', 'apple'] },
  { id: 'entity:hugging-face', keywords: ['hugging face', 'huggingface'] },
  { id: 'entity:aws', keywords: ['amazon web services', 'amazon bedrock', 'aws'] },
];

function matches(text: string, keyword: string): boolean {
  if (/^[a-z0-9 ]+$/i.test(keyword)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(text);
  }
  return text.includes(keyword);
}

function scoredRules(text: string, rules: Rule[]): Array<{ rule: Rule; hits: string[] }> {
  return rules
    .map((rule) => ({ rule, hits: rule.keywords.filter((keyword) => matches(text, keyword)) }))
    .filter(({ hits }) => hits.length > 0)
    .sort((left, right) => right.hits.length - left.hits.length || left.rule.id.localeCompare(right.rule.id));
}

export function classifyMetadata(title: string, summary = ''): ClassifiedMetadata {
  const text = `${title}\n${summary}`.normalize('NFKC').toLocaleLowerCase('en-US');
  const categoryMatches = scoredRules(text, CATEGORY_RULES);
  const winningCategory = categoryMatches[0] ?? { rule: CATEGORY_RULES[1]!, hits: [] };
  const categoryConfidence = winningCategory.hits.length === 0
    ? 0.35
    : Math.min(0.98, 0.64 + winningCategory.hits.length * 0.09);

  const tags = scoredRules(text, TAG_RULES).slice(0, 5).map(({ rule, hits }) => ({
    id: rule.id,
    confidence: Math.min(0.98, 0.68 + hits.length * 0.08),
    evidence: hits.join(', '),
  }));

  const entities = scoredRules(text, ENTITY_RULES).map(({ rule, hits }) => ({
    id: rule.id,
    confidence: Math.min(0.99, 0.84 + hits.length * 0.05),
    evidence: hits.join(', '),
  }));

  return {
    categoryId: winningCategory.rule.id,
    categoryConfidence,
    categoryEvidence: winningCategory.hits.join(', ') || 'fallback:products-tools',
    tags,
    entities,
  };
}
