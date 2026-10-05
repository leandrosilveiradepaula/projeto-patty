export type ExerciseVersionSummary = {
  created_at: string;
  exercise_id: string;
  id: string;
  name: string;
  published_at: string | null;
  version_number: number;
};

export function nextExerciseVersionNumber(
  versions: Array<Pick<ExerciseVersionSummary, "version_number">>,
) {
  return versions.reduce(
    (highest, version) => Math.max(highest, version.version_number),
    0,
  ) + 1;
}

export function findSingleDraftExerciseVersion<
  T extends Pick<ExerciseVersionSummary, "published_at">,
>(versions: T[]) {
  const drafts = versions.filter((version) => version.published_at === null);

  if (drafts.length > 1) {
    throw new Error("Exercise has more than one draft version");
  }

  return drafts[0] ?? null;
}

export function selectLatestPublishedExerciseVersions<
  T extends ExerciseVersionSummary,
>(versions: T[]) {
  const latestByExercise = new Map<string, T>();

  for (const version of versions) {
    if (!version.published_at) {
      continue;
    }

    const current = latestByExercise.get(version.exercise_id);

    if (!current || version.version_number > current.version_number) {
      latestByExercise.set(version.exercise_id, version);
    }
  }

  return [...latestByExercise.values()].sort((left, right) => {
    const byPublishedAt =
      (right.published_at ?? "").localeCompare(left.published_at ?? "");

    if (byPublishedAt !== 0) {
      return byPublishedAt;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}
