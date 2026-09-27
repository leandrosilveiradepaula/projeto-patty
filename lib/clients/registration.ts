export type ClientRegistrationInput = {
  city: string | null;
  contactEmail: string | null;
  instagram: string | null;
  phone: string | null;
};

export type ClientRegistrationValidationResult =
  | { ok: true; value: ClientRegistrationInput }
  | { ok: false; message: string };

function normalizeOptionalText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new Error("too_long");
  }

  return trimmed;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseClientRegistrationForm(
  formData: FormData,
): ClientRegistrationValidationResult {
  try {
    const city = normalizeOptionalText(formData.get("city"), 120);
    const phone = normalizeOptionalText(formData.get("phone"), 40);
    const contactEmail = normalizeOptionalText(
      formData.get("contactEmail"),
      254,
    );
    const instagram = normalizeOptionalText(formData.get("instagram"), 100);

    if (contactEmail && !isValidEmail(contactEmail)) {
      return {
        message: "Informe um email de contato válido.",
        ok: false,
      };
    }

    return {
      ok: true,
      value: {
        city,
        contactEmail,
        instagram,
        phone,
      },
    };
  } catch {
    return {
      message:
        "Um dos campos ultrapassa o limite permitido. Revise o cadastro e tente novamente.",
      ok: false,
    };
  }
}
