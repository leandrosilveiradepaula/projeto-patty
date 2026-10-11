/**
 * Cadastro Atual is intentionally separate from login Auth and from historic
 * Anamnesis submissions. These limits are technical input bounds, not clinical
 * requirements. All four contact fields remain optional.
 */
export const CLIENT_REGISTRATION_FIELDS = [
  { key: "city", label: "Cidade", maxLength: 120, autoComplete: "address-level2" },
  { key: "phone", label: "Telefone", maxLength: 40, autoComplete: "tel" },
  { key: "contactEmail", label: "Email de contato", maxLength: 254, autoComplete: "email" },
  { key: "instagram", label: "Instagram", maxLength: 100, autoComplete: "off" },
] as const;

export type ClientRegistrationField = "city" | "phone" | "contactEmail" | "instagram";
export type ClientRegistrationInput = Record<ClientRegistrationField, string | null>;
export type ClientRegistrationDraft = Record<ClientRegistrationField, string>;
export type ClientRegistrationSnapshot = {
  values: ClientRegistrationInput;
  updatedAt: string | null;
};

export type ClientRegistrationEditorState = {
  message: string | null;
  success: boolean;
  outcome?: "saved" | "unchanged" | "invalid" | "conflict" | "error";
  field?: ClientRegistrationField;
  current?: ClientRegistrationSnapshot;
  updatedAt?: string | null;
};

export type ClientRegistrationValidationResult =
  | { ok: true; value: ClientRegistrationInput }
  | { ok: false; field?: ClientRegistrationField; message: string };

export function emptyClientRegistration(): ClientRegistrationInput {
  return { city: null, phone: null, contactEmail: null, instagram: null };
}

export function clientRegistrationSnapshotFromRow(
  row: {
    city: string | null;
    phone: string | null;
    contact_email: string | null;
    instagram: string | null;
    updated_at: string;
  } | null,
): ClientRegistrationSnapshot {
  return {
    values: row
      ? { city: row.city, phone: row.phone, contactEmail: row.contact_email, instagram: row.instagram }
      : emptyClientRegistration(),
    updatedAt: row?.updated_at ?? null,
  };
}

export function normalizedClientRegistrationValue(value: string): string | null {
  return value.trim() || null;
}

export function clientRegistrationDraftFromInput(input: ClientRegistrationInput): ClientRegistrationDraft {
  return {
    city: input.city ?? "",
    phone: input.phone ?? "",
    contactEmail: input.contactEmail ?? "",
    instagram: input.instagram ?? "",
  };
}

export function getClientRegistrationFieldError(
  field: ClientRegistrationField,
  raw: string,
): string | null {
  const definition = CLIENT_REGISTRATION_FIELDS.find(item => item.key === field);
  if (!definition) return "Campo desconhecido.";
  const value = raw.trim();
  if (value.length > definition.maxLength) {
    return "Este campo aceita no máximo " + definition.maxLength + " caracteres.";
  }
  // Control characters are not meaningful in contact fields and must never be
  // silently normalized to something different from the client's input.
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return "Remova quebras de linha e caracteres de controle.";
  }
  if (field === "contactEmail" && value &&
    (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    return "Informe um email de contato válido.";
  }
  return null;
}

export function normalizeClientRegistrationDraft(
  draft: ClientRegistrationDraft,
): ClientRegistrationInput {
  return {
    city: normalizedClientRegistrationValue(draft.city),
    phone: normalizedClientRegistrationValue(draft.phone),
    contactEmail: normalizedClientRegistrationValue(draft.contactEmail),
    instagram: normalizedClientRegistrationValue(draft.instagram),
  };
}

export function equalClientRegistration(a: ClientRegistrationInput, b: ClientRegistrationInput): boolean {
  return CLIENT_REGISTRATION_FIELDS.every(field => a[field.key] === b[field.key]);
}

export function countClientRegistrationChanges(a: ClientRegistrationInput, b: ClientRegistrationInput): number {
  return CLIENT_REGISTRATION_FIELDS.filter(field => a[field.key] !== b[field.key]).length;
}

export function hasClientRegistrationValues(values: ClientRegistrationInput): boolean {
  return CLIENT_REGISTRATION_FIELDS.some(field => values[field.key] !== null);
}

export function parseClientRegistrationForm(formData: FormData): ClientRegistrationValidationResult {
  const values = emptyClientRegistration();
  for (const field of CLIENT_REGISTRATION_FIELDS) {
    const entries = formData.getAll(field.key);
    if (entries.length > 1 || (entries.length === 1 && typeof entries[0] !== "string")) {
      return { ok: false, field: field.key, message: "Informe somente um valor de texto para " + field.label + "." };
    }
    const raw = entries.length === 1 ? entries[0] as string : "";
    const issue = getClientRegistrationFieldError(field.key, raw);
    if (issue) return { ok: false, field: field.key, message: issue };
    values[field.key] = normalizedClientRegistrationValue(raw);
  }
  return { ok: true, value: values };
}
