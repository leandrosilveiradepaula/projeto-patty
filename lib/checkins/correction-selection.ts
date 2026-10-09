/**
 * A correction must never silently convert a historical liquid type that is
 * no longer configured into the first available option. The client or Patty
 * must choose a currently supported type explicitly.
 */
export function liquidCorrectionSelection(
  effectiveKind: string,
  allowedKinds: readonly string[],
): { defaultValue: string; requiresChoice: boolean } {
  const supported = allowedKinds.includes(effectiveKind);
  return { defaultValue: supported ? effectiveKind : "", requiresChoice: !supported };
}
