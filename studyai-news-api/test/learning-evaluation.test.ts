import { describe, expect, it } from 'vitest';
import { evaluateLearningLinks } from '../scripts/evaluate-learning-links';

describe('learning-link offline evaluation', () => {
  it('computes Precision@5, Recall@10, nDCG and the human acceptance rate', () => {
    const rows = Array.from({ length: 100 }, (_, article) => ({
      articleId: `article-${article}`,
      goldSkillIds: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5'],
      retrievedSkillIds: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5', 'noise-1'],
      reviewedApproved: 4,
      reviewedTotal: 5,
    }));
    expect(evaluateLearningLinks(rows)).toMatchObject({
      sampleSize: 100,
      precisionAt5: 1,
      recallAt10: 1,
      ndcgAt10: 1,
      humanAcceptanceRate: 0.8,
      releaseGate: true,
    });
  });

  it('does not pass the PRD release gate without 100 human-labelled rows', () => {
    const result = evaluateLearningLinks([{
      articleId: 'article-1',
      goldSkillIds: ['skill-1'],
      retrievedSkillIds: ['skill-1'],
    }]);
    expect(result.releaseGate).toBe(false);
  });
});
