export type ValidationResult =
  | { ok: true }
  | { message: string; ok: false };

export function normalizeInvitationEmail(value: string) {
  return value.trim();
}

export function validateInvitationEmail(value: string): ValidationResult {
  const email = normalizeInvitationEmail(value);

  if (!email) {
    return { message: "Informe o email da cliente.", ok: false };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Informe um email válido.", ok: false };
  }

  return { ok: true };
}

export function validateActivationPassword(
  password: string,
  confirmation: string,
): ValidationResult {
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
