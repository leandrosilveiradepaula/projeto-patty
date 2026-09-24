export const ANAMNESIS_CONSENT_ACCEPTED_VALUE = "Concordo";

export function isAnamnesisConsentAccepted(value: FormDataEntryValue | null) {
  return value === ANAMNESIS_CONSENT_ACCEPTED_VALUE;
}
