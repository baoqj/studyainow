export const ARTICLE_STATUSES = [
  'draft',
  'in_review',
  'scheduled',
  'published',
  'rejected',
  'corrected',
  'distributed',
  'withdrawn',
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface ArticleStatusTransition {
  from: ArticleStatus;
  to: ArticleStatus;
  requiresHumanApproval: boolean;
}

export const ARTICLE_STATUS_TRANSITIONS: readonly ArticleStatusTransition[] = [
  { from: 'draft', to: 'in_review', requiresHumanApproval: false },
  { from: 'in_review', to: 'draft', requiresHumanApproval: false },
  { from: 'in_review', to: 'scheduled', requiresHumanApproval: true },
  { from: 'in_review', to: 'published', requiresHumanApproval: true },
  { from: 'in_review', to: 'rejected', requiresHumanApproval: false },
  { from: 'rejected', to: 'draft', requiresHumanApproval: false },
  { from: 'scheduled', to: 'draft', requiresHumanApproval: false },
  { from: 'scheduled', to: 'in_review', requiresHumanApproval: false },
  { from: 'scheduled', to: 'published', requiresHumanApproval: true },
  { from: 'published', to: 'corrected', requiresHumanApproval: true },
  { from: 'published', to: 'distributed', requiresHumanApproval: true },
  { from: 'published', to: 'withdrawn', requiresHumanApproval: true },
  { from: 'corrected', to: 'published', requiresHumanApproval: true },
  { from: 'corrected', to: 'distributed', requiresHumanApproval: true },
  { from: 'corrected', to: 'withdrawn', requiresHumanApproval: true },
  { from: 'distributed', to: 'corrected', requiresHumanApproval: true },
  { from: 'distributed', to: 'withdrawn', requiresHumanApproval: true },
];

export function canTransitionArticle(from: ArticleStatus, to: ArticleStatus): boolean {
  return ARTICLE_STATUS_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to,
  );
}
