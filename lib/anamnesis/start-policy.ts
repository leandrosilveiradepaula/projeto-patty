export const CLIENT_ANAMNESIS_FORM_KEY = "client-anamnesis";

export type PublishedAnamnesisVersionCandidate = {
  id: string;
  published_at: string | null;
  version_number: number;
};

export function selectCurrentPublishedAnamnesisVersion(
  versions: readonly PublishedAnamnesisVersionCandidate[],
) {
  return (
    versions
      .filter((version) => version.published_at !== null)
      .toSorted((left, right) => {
        if (left.version_number !== right.version_number) {
          return right.version_number - left.version_number;
        }

        return (right.published_at ?? "").localeCompare(
          left.published_at ?? "",
        );
      })[0] ?? null
  );
}
