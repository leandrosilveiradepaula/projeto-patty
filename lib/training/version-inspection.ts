/** Factual comparison of recorded manual training prescriptions.
 * Position is a slot, NOT proof that two items describe the same exercise.
 * No exercise selection, progress assessment, dosage or clinical rule here.
 */
export type TrainingComparisonVersion = {
  id: string;
  version_number: number;
  title: string;
  notes: string | null;
};
export type TrainingComparisonItem = {
  id: string;
  position: number;
  exercise_name: string;
  exercise_version_id: string | null;
  sets_text: string;
  repetitions_text: string;
  rest_text: string | null;
  execution_notes: string | null;
};
export type TrainingComparisonChange = {
  key: keyof Omit<TrainingComparisonItem, "id" | "position"> | "title" | "notes";
  label: string;
  before: string;
  after: string;
};
export type TrainingPositionComparison = {
  position: number;
  before: Pick<TrainingComparisonItem, "position" | "exercise_name"> | null;
  after: Pick<TrainingComparisonItem, "position" | "exercise_name"> | null;
  state: "included" | "removed" | "changed" | "unchanged" | "ambiguous";
  changes: TrainingComparisonChange[];
  beforeCount: number;
  afterCount: number;
};
export type TrainingVersionComparison = {
  beforeVersion: number | null;
  afterVersion: number;
  beforeItemCount: number;
  afterItemCount: number;
  metadata: TrainingComparisonChange[];
  positions: TrainingPositionComparison[];
  included: number;
  removed: number;
  changed: number;
  unchanged: number;
  ambiguous: number;
  totalDifferences: number;
};

const FIELDS = [
  ["exercise_name", "Nome do exercício"],
  ["sets_text", "Séries"],
  ["repetitions_text", "Repetições"],
  ["rest_text", "Descanso"],
  ["execution_notes", "Orientações de execução"],
  ["exercise_version_id", "Referência da biblioteca"],
] as const satisfies ReadonlyArray<readonly [keyof TrainingComparisonItem, string]>;

function printable(value: string | null) {
  return value === null || value.trim() === "" ? "Não informado" : value;
}

function comparable(
  key: TrainingComparisonChange["key"],
  label: string,
  before: string | null,
  after: string | null,
): TrainingComparisonChange | null {
  if (before === after) return null;
  // A client can know a library reference changed, but internal catalog UUIDs
  // should not be placed in presentation or copied into browser-facing text.
  if (key === "exercise_version_id") {
    return {
      key, label,
      before: before ? "Referência vinculada anteriormente" : "Nome manual, sem referência",
      after: after ? "Referência vinculada nesta versão" : "Nome manual, sem referência",
    };
  }
  return { key, label, before: printable(before), after: printable(after) };
}

function byPosition(items: readonly TrainingComparisonItem[]) {
  const grouped = new Map<number, TrainingComparisonItem[]>();
  for (const item of items) {
    const group = grouped.get(item.position) ?? [];
    group.push(item);
    grouped.set(item.position, group);
  }
  return grouped;
}

export function compareTrainingVersions(
  beforeVersion: TrainingComparisonVersion | null,
  beforeItems: readonly TrainingComparisonItem[],
  afterVersion: TrainingComparisonVersion,
  afterItems: readonly TrainingComparisonItem[],
): TrainingVersionComparison {
  if (!beforeVersion) {
    return {
      beforeVersion: null, afterVersion: afterVersion.version_number,
      beforeItemCount: 0, afterItemCount: afterItems.length,
      metadata: [], positions: [], included: 0, removed: 0,
      changed: 0, unchanged: 0, ambiguous: 0, totalDifferences: 0,
    };
  }
  const metadata = [
    comparable("title", "Título do treino", beforeVersion.title, afterVersion.title),
    comparable("notes", "Orientações gerais", beforeVersion.notes, afterVersion.notes),
  ].filter((value): value is TrainingComparisonChange => value !== null);

  const before = byPosition(beforeItems);
  const after = byPosition(afterItems);
  const numbers = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a - b);
  const positions = numbers.map((position): TrainingPositionComparison => {
    const previous = before.get(position) ?? [];
    const current = after.get(position) ?? [];
    const common = {
      position,
      beforeCount: previous.length,
      afterCount: current.length,
      before: previous[0] ? { position, exercise_name: previous[0].exercise_name } : null,
      after: current[0] ? { position, exercise_name: current[0].exercise_name } : null,
    };
    if (previous.length > 1 || current.length > 1) return { ...common, state: "ambiguous", changes: [] };
    if (previous.length === 0) return { ...common, state: "included", changes: [] };
    if (current.length === 0) return { ...common, state: "removed", changes: [] };
    const changes = FIELDS.map(([field, label]) =>
      comparable(field, label, previous[0][field], current[0][field]),
    ).filter((value): value is TrainingComparisonChange => value !== null);
    return { ...common, state: changes.length > 0 ? "changed" : "unchanged", changes };
  });

  const count = (state: TrainingPositionComparison["state"]) => positions.filter((entry) => entry.state === state).length;
  const included = count("included"), removed = count("removed"),
    changed = count("changed"), unchanged = count("unchanged"), ambiguous = count("ambiguous");

  return {
    beforeVersion: beforeVersion.version_number, afterVersion: afterVersion.version_number,
    beforeItemCount: beforeItems.length, afterItemCount: afterItems.length,
    metadata, positions, included, removed, changed, unchanged, ambiguous,
    totalDifferences: metadata.length + included + removed + ambiguous +
      positions.reduce((total, row) => total + row.changes.length, 0),
  };
}

/** Compare independently persisted position slots without pairing by global catalog or row UUID. */
export function trainingComparePreviousPublishedIndex(selectedIndex: number, total: number) {
  if (!Number.isSafeInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= total) return null;
  const olderIndex = selectedIndex + 1;
  return olderIndex < total ? olderIndex : null;
}

export type TrainingRequestHistoryPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  previous: number | null;
  next: number | null;
  invalid: boolean;
};

/** Interface-only size, not a professional threshold or retention policy. */
export const TRAINING_REQUESTS_PER_PAGE = 10;

export function parseTrainingHistoryPage(raw: unknown): { page: number; invalid: boolean } {
  if (raw === undefined || raw === "1") return { page: 1, invalid: false };
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,5}$/.test(raw)) return { page: 1, invalid: true };
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number > 100000) return { page: 1, invalid: true };
  return { page: number, invalid: false };
}

export function paginateTrainingRequests<T>(
  ordered: readonly T[],
  rawPage: unknown,
  size = TRAINING_REQUESTS_PER_PAGE,
): TrainingRequestHistoryPage<T> {
  const requested = parseTrainingHistoryPage(rawPage);
  const total = ordered.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requested.page, pageCount);
  const offset = (page - 1) * size;
  return {
    items: ordered.slice(offset, offset + size), page, pageCount, total,
    from: total ? offset + 1 : 0,
    to: total ? Math.min(total, offset + size) : 0,
    previous: page > 1 ? page - 1 : null,
    next: page < pageCount ? page + 1 : null,
    invalid: requested.invalid || requested.page > pageCount,
  };
}

export function trainingRequestHistoryHref(
  path: string,
  page: number,
  anchor: "suas-solicitacoes" | "historico-solicitacoes-treino",
) {
  return path + (page > 1 ? "?pedidos=" + page : "") + "#" + anchor;
}
