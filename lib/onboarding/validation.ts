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

/**
 * Client and admin account access share the same technical password bounds.
 * This never stores, logs, returns, or serializes a submitted password.
 */
export type AccessPasswordField = "password" | "passwordConfirmation";
export type AccessPasswordIssues = { password: string | null; passwordConfirmation: string | null };

export function accessPasswordIssues(password: string, confirmation: string): AccessPasswordIssues {
  const passwordResult = validateActivationPassword(password, password);
  const passwordError = passwordResult.ok ? null : passwordResult.message;
  const confirmationError = !confirmation
    ? "Confirme a senha para continuar."
    : password !== confirmation
      ? "As senhas informadas não coincidem."
      : null;
  return { password: passwordError, passwordConfirmation: confirmationError };
}

/**
 * Reject duplicates and uploaded files before any Supabase Auth mutation.
 * Do not echo a credential back to a caller, even on validation errors.
 */
export function readSingleStringFormValue(formData: FormData, name: string): string | null {
  const entries = formData.getAll(name);
  return entries.length === 1 && typeof entries[0] === "string" ? entries[0] : null;
}
export type ParsedAccessPassword =
  | { ok: true; password: string }
  | { ok: false; message: string; field: AccessPasswordField };

export function parseAccessPasswordForm(formData: FormData): ParsedAccessPassword {
  const password = readSingleStringFormValue(formData, "password");
  const confirmation = readSingleStringFormValue(formData, "passwordConfirmation");
  if (password === null) return { ok: false, field: "password", message: "Informe apenas uma senha válida." };
  if (confirmation === null) return { ok: false, field: "passwordConfirmation", message: "Informe apenas uma confirmação válida." };
  const validation = validateActivationPassword(password, confirmation);
  if (!validation.ok) {
    const field: AccessPasswordField = password.length < 8 || password.length > 128 ? "password" : "passwordConfirmation";
    return { ok: false, field, message: validation.message };
  }
  return { ok: true, password };
}
