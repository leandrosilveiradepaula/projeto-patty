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
const canonicalClientId = process.env.E2E_CANONICAL_CLIENT_ID;

if (!canonicalEmail || !canonicalPassword || !canonicalClientId) {
  throw new Error("Missing ephemeral canonical E2E client environment.");
}

const SOURCE_KEY = "has_health_plan";
const DETAIL_KEY = "health_plan_details";
const CITY_KEY = "city";

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

  const questions = await admin
    .from("anamnesis_questions")
    .select("id, question_key, label")
    .eq("form_version_id", version.data.id)
    .in("question_key", [CITY_KEY, SOURCE_KEY, DETAIL_KEY]);

  if (questions.error) throw questions.error;

  const byKey = new Map(
    questions.data.map((question) => [question.question_key, question]),
  );

  const city = byKey.get(CITY_KEY);
  const source = byKey.get(SOURCE_KEY);
  const detail = byKey.get(DETAIL_KEY);

  if (!city || !source || !detail) {
    throw new Error("Canonical journey questions are missing.");
  }

  return {
    formVersionId: version.data.id,
    city,
    source,
    detail,
  };
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

async function loadAnswer(submissionId, questionId) {
  const answer = await admin
    .from("anamnesis_answers")
    .select("id, answer_value")
    .eq("submission_id", submissionId)
    .eq("question_id", questionId);

  if (answer.error) throw answer.error;
  return answer.data;
}

test.use({ baseURL: baseUrl });

test("cliente percorre start, resume, edita e aplica condicional da Anamnese canonica v1", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const canonical = await loadCanonicalV1();
  await cleanupCanonicalDraft(canonicalClientId, canonical.formVersionId);

  let draftId = null;

  try {
    await test.step("autentica uma unica vez", async () => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(canonicalEmail);
      await page.getByLabel("Senha").fill(canonicalPassword);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/cliente\/?$/);
    });

    await test.step("inicia o draft canonico pela UI", async () => {
      await page.goto("/cliente/anamnese");

      const start = page.getByRole("button", { name: "Começar Anamnese" });
      await expect(start).toBeVisible();
      await start.click();

      await expect(page).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]+$/);
      await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

      draftId = page.url().split("/").at(-1) ?? null;
      if (!draftId) throw new Error("Could not resolve created draft id.");

      const created = await admin
        .from("anamnesis_submissions")
        .select("id, client_id, form_version_id, submitted_at")
        .eq("id", draftId)
        .single();

      if (created.error) throw created.error;
      expect(created.data.client_id).toBe(canonicalClientId);
      expect(created.data.form_version_id).toBe(canonical.formVersionId);
      expect(created.data.submitted_at).toBeNull();
    });

    await test.step("retoma exatamente o mesmo draft", async () => {
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
    });

    await test.step("insere e atualiza Cidade sem duplicar resposta", async () => {
      const city = page.getByLabel(canonical.city.label, { exact: true });
      const cityForm = city.locator("xpath=ancestor::form");

      await city.fill("Porto Alegre E2E");
      await cityForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(draftId, canonical.city.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Porto Alegre E2E"]);

      await page.getByLabel(canonical.city.label, { exact: true }).fill(
        "Cidade E2E atualizada",
      );
      await page
        .getByLabel(canonical.city.label, { exact: true })
        .locator("xpath=ancestor::form")
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(draftId, canonical.city.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Cidade E2E atualizada"]);
    });

    await test.step("ativa a pergunta condicional com Sim", async () => {
      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toHaveCount(0);

      const sourceForm = page
        .locator("form")
        .filter({ hasText: canonical.source.label });

      await sourceForm.getByLabel("Sim", { exact: true }).check();
      await sourceForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(draftId, canonical.source.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Sim"]);

      await expect(page).toHaveURL(
        new RegExp(`/cliente/anamnese/${draftId}$`),
        { timeout: 20_000 },
      );
      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step("salva o detalhe condicional", async () => {
      const detail = page.getByLabel(canonical.detail.label, { exact: true });
      const detailForm = detail.locator("xpath=ancestor::form");

      await detail.fill("Plano E2E");
      await detailForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(draftId, canonical.detail.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Plano E2E"]);
    });

    await test.step("desativa a pergunta condicional com Nao", async () => {
      const sourceForm = page
        .locator("form")
        .filter({ hasText: canonical.source.label });

      await sourceForm.getByLabel("Nao", { exact: true }).check();
      await sourceForm
        .getByRole("button", { name: "Salvar no rascunho" })
        .click();

      await expect
        .poll(async () => {
          const answers = await loadAnswer(draftId, canonical.source.id);
          return answers.map((answer) => answer.answer_value);
        }, { timeout: 20_000 })
        .toEqual(["Nao"]);

      await expect(page).toHaveURL(
        new RegExp(`/cliente/anamnese/${draftId}$`),
        { timeout: 20_000 },
      );
      await expect(
        page.getByLabel(canonical.detail.label, { exact: true }),
      ).toHaveCount(0, { timeout: 20_000 });
    });

    const submission = await admin
      .from("anamnesis_submissions")
      .select("submitted_at")
      .eq("id", draftId)
      .single();

    if (submission.error) throw submission.error;
    expect(submission.data.submitted_at).toBeNull();
  } finally {
    await cleanupCanonicalDraft(canonicalClientId, canonical.formVersionId);
  }

  const residue = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", canonicalClientId)
    .eq("form_version_id", canonical.formVersionId)
    .is("submitted_at", null);

  if (residue.error) throw residue.error;
  expect(residue.data).toHaveLength(0);
});
