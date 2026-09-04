import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export interface LearningEvaluationRow {
  articleId: string;
  goldSkillIds: string[];
  retrievedSkillIds: string[];
  reviewedApproved?: number;
  reviewedTotal?: number;
}

export function evaluateLearningLinks(rows: LearningEvaluationRow[]) {
  if (rows.length === 0) throw new Error('evaluation_set_empty');
  let precision = 0;
  let recall = 0;
  let ndcg = 0;
  let reviewedApproved = 0;
  let reviewedTotal = 0;
  for (const row of rows) {
    if (!row.articleId || !row.goldSkillIds.length) throw new Error('invalid_evaluation_row');
    const gold = new Set(row.goldSkillIds);
    const top5 = row.retrievedSkillIds.slice(0, 5);
    const top10 = row.retrievedSkillIds.slice(0, 10);
    precision += top5.filter((id) => gold.has(id)).length / 5;
    recall += new Set(top10.filter((id) => gold.has(id))).size / gold.size;
    const dcg = top10.reduce((sum, id, index) => sum + (gold.has(id) ? 1 / Math.log2(index + 2) : 0), 0);
    const ideal = Array.from({ length: Math.min(10, gold.size) }, (_, index) => 1 / Math.log2(index + 2)).reduce((sum, value) => sum + value, 0);
    ndcg += ideal ? dcg / ideal : 0;
    reviewedApproved += Math.max(0, Number(row.reviewedApproved ?? 0));
    reviewedTotal += Math.max(0, Number(row.reviewedTotal ?? 0));
  }
  return {
    sampleSize: rows.length,
    precisionAt5: precision / rows.length,
    recallAt10: recall / rows.length,
    ndcgAt10: ndcg / rows.length,
    humanAcceptanceRate: reviewedTotal ? reviewedApproved / reviewedTotal : null,
    releaseGate: rows.length >= 100 && precision / rows.length >= 0.85 && recall / rows.length >= 0.80,
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: npm run learning:evaluate -- /absolute/path/to/gold-set.json');
  const rows = JSON.parse(await readFile(inputPath, 'utf8')) as LearningEvaluationRow[];
  const result = evaluateLearningLinks(rows);
  console.log(JSON.stringify(result, null, 2));
  if (!result.releaseGate) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
