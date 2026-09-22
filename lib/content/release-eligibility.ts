export type ContentReleaseEligibilityFacts = {
  alreadyReleased: boolean;
  publishedAt: string | null;
};

export function isContentVersionReleaseEligible(
  facts: ContentReleaseEligibilityFacts,
) {
  return Boolean(facts.publishedAt) && !facts.alreadyReleased;
}
