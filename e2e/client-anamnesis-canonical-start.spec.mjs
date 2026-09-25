import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!baseUrl || !supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const canonicalEmail = process.env.E2E_CANONICAL_EMAIL;
const canonicalPassword = process.env.E2E_CANONICAL_PASSWORD;
const canonicalProfileId = process.env.E2E_CANONICAL_PROFILE_ID;
const canonicalClientId = process.env.E2E_CANONICAL_CLIENT_ID;

if (
  !canonicalEmail ||
  !canonicalPassword ||
  !canonicalProfileId ||
  !canonicalClientId
) {
  throw new Error("Missing ephemeral canonical E2E client environment.");
}

const syntheticClient = {
  clientId: canonicalClientId,
  email: canonicalEmail,
  password: canonicalPassword,
  profileId: canonicalProfileId,
};

async function loadCanonicalV1() {
  const form = await admin
    .from("anamnesis_forms")
    .select("id")
    .eq("form_key", "client-anamnesis")
    .single();

  if (form.error) throw form.error;

  const version = await admin
    .from("anamnesis_form_versions")
    .select("id, version_number, published_at")
    .eq("form_id", form.data.id)
    .eq("version_number", 1)
    .not("published_at", "is", null)
    .single();

  if (version.error) throw version.error;

  return version.data;
}

async function cleanupCanonicalDraft(clientId, formVersionId) {
  const drafts = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", clientId)
    .eq("form_version_id", formVersionId)
    .is("submitted_at", null);

  if (drafts.error) throw drafts.error;

  for (const draft of drafts.data) {
    const answers = await admin
      .from("anamnesis_answers")
      .delete()
      .eq("submission_id", draft.id);
    if (answers.error) throw answers.error;

    const submission = await admin
      .from("anamnesis_submissions")
      .delete()
      .eq("id", draft.id)
      .is("submitted_at", null);
    if (submission.error) throw submission.error;
  }
}

test.use({ baseURL: baseUrl });

test("cliente sintetica inicia e retoma draft da client-anamnesis v1 publicada", async ({
  page,
}) => {
  const client = syntheticClient;
  const canonical = await loadCanonicalV1();

  await cleanupCanonicalDraft(client.clientId, canonical.id);

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(client.email);
    await page.getByLabel("Senha").fill(client.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/cliente\/?$/);

    await page.goto("/cliente/anamnese");

    await expect(
      page.getByRole("button", { name: "Começar Anamnese" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Começar Anamnese" }).click();

    await expect(page).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]+$/);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

    const draftId = page.url().split("/").at(-1);
    if (!draftId) throw new Error("Could not resolve created draft id.");

    const created = await admin
      .from("anamnesis_submissions")
      .select("id, client_id, form_version_id, submitted_at")
      .eq("id", draftId)
      .single();

    if (created.error) throw created.error;
    expect(created.data.client_id).toBe(client.clientId);
    expect(created.data.form_version_id).toBe(canonical.id);
    expect(created.data.submitted_at).toBeNull();

    await page.goto("/cliente/anamnese");

    await expect(
      page.getByRole("button", { name: "Começar Anamnese" }),
    ).toHaveCount(0);

    const resume = page.getByRole("link", { name: "Continuar rascunho" });
    await expect(resume).toHaveCount(1);
    await expect(resume).toHaveAttribute(
      "href",
      `/cliente/anamnese/${draftId}`,
    );

    await resume.click();
    await expect(page).toHaveURL(
      new RegExp(`/cliente/anamnese/${draftId}$`),
    );
  } finally {
    await cleanupCanonicalDraft(client.clientId, canonical.id);
  }

  const residue = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", client.clientId)
    .eq("form_version_id", canonical.id)
    .is("submitted_at", null);

  if (residue.error) throw residue.error;
  expect(residue.data).toHaveLength(0);
});
