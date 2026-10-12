export type ValidationResult =
  | { ok: true }
  | { message: string; ok: false };

export function normalizeInvitationEmail(value: string) {
  return value.trim();
}

export function validateClientDisplayName(value: string): ValidationResult {
  const displayName = value.trim();

  if (displayName.length < 2) {
    return { message: "Informe o nome da cliente.", ok: false };
  }

  if (displayName.length > 120) {
    return {
      message: "O nome da cliente deve ter no máximo 120 caracteres.",
      ok: false,
    };
  }

  return { ok: true };
}

export function validateInvitationEmail(value: string): ValidationResult {
  const email = normalizeInvitationEmail(value);

  if (!email) {
    return { message: "Informe o email da cliente.", ok: false };
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Informe um email válido.", ok: false };
  }

  return { ok: true };
}

export function validateActivationPassword(
  password: string,
  confirmation: string,
): ValidationResult {
  if (password.length > 128) {
    return { message: "A senha deve ter no máximo 128 caracteres.", ok: false };
  }
  if (password.length < 8) {
    return {
      message: "A senha deve ter pelo menos 8 caracteres.",
      ok: false,
    };
  }

  if (password !== confirmation) {
    return {
      message: "As senhas informadas não coincidem.",
      ok: false,
    };
  }

  return { ok: true };
}


export type InvitationDraft = { displayName: string; email: string };
export type InvitationField = keyof InvitationDraft;
export type InvitationDraftValidation =
  | { ok: true; value: InvitationDraft }
  | { ok: false; field: InvitationField; message: string };

/** Pure preflight used by browser and server, before provisioning any Auth user. */
export function validateInvitationDraft(draft: InvitationDraft): InvitationDraftValidation {
  const name = validateClientDisplayName(draft.displayName);
  if (!name.ok) return { ok: false, field: "displayName", message: name.message };
  const email = validateInvitationEmail(draft.email);
  if (!email.ok) return { ok: false, field: "email", message: email.message };
  return {
    ok: true,
    value: {
      displayName: draft.displayName.trim(),
      email: normalizeInvitationEmail(draft.email),
    },
  };
}

/** A duplicated FormData key is ambiguous and must not select the first value. */
export function parseInvitationFormFields(data: FormData): InvitationDraftValidation {
  const names = data.getAll("displayName");
  if (names.length !== 1 || typeof names[0] !== "string") {
    return { ok: false, field: "displayName", message: "Informe somente um nome de cliente válido." };
  }
  const emails = data.getAll("email");
  if (emails.length !== 1 || typeof emails[0] !== "string") {
    return { ok: false, field: "email", message: "Informe somente um email de acesso válido." };
  }
  return validateInvitationDraft({ displayName: names[0], email: emails[0] });
}

/**
 * Explicit identity-creation confirmation is required in both invite paths.
 * Do not infer it from an ordinary submit or from account recovery actions.
 */
export function confirmedNewClientInvitation(data: FormData): boolean {
  const entries = data.getAll("confirmNewClient");
  return entries.length === 1 && entries[0] === "yes";
}

/** Exact single-value credentials reject duplicate keys and files before Auth operations. */
export function readSingleStringFormValue(formData: FormData, name: string): string | null {
  const values = formData.getAll(name);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
}
export function parseAccessPasswordForm(formData: FormData):
  | { ok: true; password: string }
  | { ok: false; message: string } {
  const password = readSingleStringFormValue(formData, "password");
  const confirmation = readSingleStringFormValue(formData, "passwordConfirmation");
  if (password === null || confirmation === null) {
    return { ok: false, message: "Informe uma senha e uma confirmação válidas, uma vez cada." };
  }
  const validation = validateActivationPassword(password, confirmation);
  return validation.ok ? { ok: true, password } : { ok: false, message: validation.message };
}
