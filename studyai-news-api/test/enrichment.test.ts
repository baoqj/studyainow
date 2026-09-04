import { describe, expect, it } from 'vitest';
import { areLikelyDuplicates, hammingDistance, simHashHex } from '../src/enrichment/simhash';
import { classifyMetadata } from '../src/enrichment/taxonomy';

describe('P0-3 deterministic enrichment', () => {
  it('recognizes a fixed duplicate sample without merging unrelated headlines', () => {
    const samples = [
      ['OpenAI launches a new agent platform for developers', 'OpenAI launches new agent platform for developers', true],
      ['Anthropic releases Claude safety evaluation report', 'Anthropic releases its Claude safety evaluation report', true],
      ['Google DeepMind publishes Gemini model benchmark', 'Google DeepMind publishes the Gemini model benchmark', true],
      ['Microsoft introduces Azure AI API for enterprises', 'Microsoft introduces Azure AI APIs for enterprises', true],
      ['Hugging Face releases open source multimodal model', 'Hugging Face releases an open-source multimodal model', true],
      ['OpenAI launches a new agent platform for developers', 'EU lawmakers approve a new AI governance framework', false],
      ['Anthropic releases Claude safety evaluation report', 'Apple expands AI education programs for students', false],
      ['Google DeepMind publishes Gemini model benchmark', 'Startup raises funding for healthcare robotics', false],
      ['Microsoft introduces Azure AI API for enterprises', 'Researchers publish a language model training paper', false],
      ['Hugging Face releases open source multimodal model', 'Retailers adopt AI tools for customer support', false],
    ] as const;
    const results = samples.map(([left, right, expected]) => ({
      expected,
      actual: areLikelyDuplicates(left, right),
    }));
    const truePositives = results.filter((item) => item.expected && item.actual).length;
    const falsePositives = results.filter((item) => !item.expected && item.actual).length;
    const falseNegatives = results.filter((item) => item.expected && !item.actual).length;
    const precision = truePositives / (truePositives + falsePositives);
    const recall = truePositives / (truePositives + falseNegatives);
    expect({ precision, recall }).toEqual({ precision: 1, recall: 1 });
  });

  it('produces stable 64-bit hashes', () => {
    expect(simHashHex('Stable title')).toMatch(/^[0-9a-f]{16}$/);
    expect(hammingDistance(simHashHex('Stable title'), simHashHex('Stable title'))).toBe(0);
  });

  it('meets the eight-category gold set and never invents a primary category', () => {
    const gold = [
      ['Researchers publish a reasoning model benchmark paper', 'category:model-research'],
      ['Team launches an AI assistant product feature', 'category:products-tools'],
      ['New cloud API and SDK improve developer infrastructure', 'category:development-infrastructure'],
      ['AI startup closes funding round at new valuation', 'category:business-funding'],
      ['Government publishes AI regulation and governance policy', 'category:policy-governance'],
      ['Apache licensed open source repository released on GitHub', 'category:open-source'],
      ['Hospital deploys medical AI for healthcare workflows', 'category:industry-applications'],
      ['University launches AI education course for students', 'category:education-careers'],
    ] as const;
    const predictions = gold.map(([text, expected]) => ({ expected, actual: classifyMetadata(text).categoryId }));
    const f1Scores = gold.map(([, category]) => {
      const truePositive = predictions.filter((item) => item.expected === category && item.actual === category).length;
      const falsePositive = predictions.filter((item) => item.expected !== category && item.actual === category).length;
      const falseNegative = predictions.filter((item) => item.expected === category && item.actual !== category).length;
      const precision = truePositive / Math.max(1, truePositive + falsePositive);
      const recall = truePositive / Math.max(1, truePositive + falseNegative);
      return (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall);
    });
    expect(f1Scores.reduce((sum, value) => sum + value, 0) / f1Scores.length).toBeGreaterThanOrEqual(0.85);
    expect(new Set(predictions.map((item) => item.actual))).toEqual(new Set(gold.map(([, category]) => category)));
  });

  it('returns relevant controlled tags and canonical entities', () => {
    const metadata = classifyMetadata(
      'OpenAI releases open-source agent SDK',
      'The developer tool includes an API and model evaluation benchmark.',
    );
    expect(metadata.tags.map((tag) => tag.id)).toEqual(expect.arrayContaining([
      'tag:agents',
      'tag:api',
      'tag:benchmark',
      'tag:developer-tools',
      'tag:open-source',
    ]));
    expect(metadata.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'entity:openai' }),
    ]));
  });
});
