export type ContentReleaseEligibilityFacts = {
  alreadyReleased: boolean;
  hasAsset: boolean;
  publishedAt: string | null;
};

export function isContentVersionReleaseEligible(
  facts: ContentReleaseEligibilityFacts,
) {
  return Boolean(facts.publishedAt) && facts.hasAsset && !facts.alreadyReleased;
}
