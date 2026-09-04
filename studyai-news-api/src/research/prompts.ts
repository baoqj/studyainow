/**
 * P0-4 deliberately uses a deterministic, source-bound research rule instead
 * of asking a model to invent or rewrite facts. This metadata is persisted so
 * a later reviewed model workflow can be compared without storing full prompts.
 */
export const CLAIM_RESEARCH_PROMPT_VERSION = 'source-bound-v1';
export const CLAIM_RESEARCH_GENERATOR_VERSION = 'source-bound-rules-v1';
export const CLAIM_RESEARCH_SCHEMA_VERSION = 'claim-ledger-v1';

export const CLAIM_RESEARCH_POLICY = Object.freeze({
  untrustedSourceTextIsEvidenceOnly: true,
  supportedSourceTiers: ['A', 'B'],
  factualClaimTypes: ['fact', 'number', 'quote'],
  publicationCoveragePercent: 95,
  criticalCoveragePercent: 100,
});
