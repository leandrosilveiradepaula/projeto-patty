import { randomBytes } from "node:crypto";

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

const CITY_KEY = "city";
const SOURCE_KEY = "has_health_plan";
const DETAIL_KEY = "health_plan_details";

async function lockSyntheticClient(userId) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    password: randomBytes(48).toString("base64url"),
  });

  if (updated.error) throw updated.error;
}

async function loadSyntheticClient() {
  const profiles = await admin
    .from("profiles")
    .select("id")
    .eq("display_name", "E2E Correction Client")
    .limit(2);

  if (profiles.error) throw profiles.error;
  if (profiles.data.length !== 1) {
    throw new Error(
      "Expected exactly one persistent E2E Correction Client fixture.",
    );
  }

  const profileId = profiles.data[0].id;
  const client = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (client.error) throw client.error;

  const authUser = await admin.auth.admin.getUserById(profileId);
  if (authUser.error) throw authUser.error;

  const email = authUser.data.user.email;
  if (!email) throw new Error("Persistent E2E client has no Auth email.");

  const password = randomBytes(48).toString("base64url");
  const updated = await admin.auth.admin.updateUserById(profileId, {
    password,
  });

  if (updated.error) throw updated.error;

  return {
    clientId: client.data.id,
    email,
    password,
    profileId,
  };
}

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
    throw new Error("Canonical draft-edit questions are missing.");
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

async function createCanonicalDraft(clientId, formVersionId) {
  await cleanupCanonicalDraft(clientId, formVersionId);

  const submission = await admin
    .from("anamnesis_submissions")
    .insert({
      client_id: clientId,
      form_version_id: formVersionId,
    })
    .select("id")
    .single();

  if (submission.error) throw submission.error;

  return submission.data.id;
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

test("cliente sintetica edita respostas reais e aplica condicional da client-anamnesis v1", async ({
  page,
}) => {
  const client = await loadSyntheticClient();
  const canonical = await loadCanonicalV1();
  const submissionId = await createCanonicalDraft(
    client.clientId,
    canonical.formVersionId,
  );

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(client.email);
    await page.getByLabel("Senha").fill(client.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/cliente\/?$/);

    await page.goto(`/cliente/anamnese/${submissionId}`);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

    const cityInput = page.getByLabel(canonical.city.label, { exact: true });
    const cityForm = cityInput.locator("xpath=ancestor::form");

    await cityInput.fill("Porto Alegre E2E");
    await cityForm.getByRole("button", { name: "Salvar no rascunho" }).click();
    await expect(
      cityForm.getByText("Resposta salva no rascunho."),
    ).toBeVisible();

    let cityAnswers = await loadAnswer(submissionId, canonical.city.id);
    expect(cityAnswers).toHaveLength(1);
    expect(cityAnswers[0].answer_value).toBe("Porto Alegre E2E");

    await cityInput.fill("Cidade E2E atualizada");
    await cityForm.getByRole("button", { name: "Salvar no rascunho" }).click();
    await expect(
      cityForm.getByText("Resposta salva no rascunho."),
    ).toBeVisible();

    cityAnswers = await loadAnswer(submissionId, canonical.city.id);
    expect(cityAnswers).toHaveLength(1);
    expect(cityAnswers[0].answer_value).toBe("Cidade E2E atualizada");

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
    await expect(
      sourceForm.getByText("Resposta salva no rascunho."),
    ).toBeVisible();

    const sourceAnswers = await loadAnswer(submissionId, canonical.source.id);
    expect(sourceAnswers).toHaveLength(1);
    expect(sourceAnswers[0].answer_value).toBe("Sim");

    const detailInput = page.getByLabel(canonical.detail.label, { exact: true });
    await expect(detailInput).toBeVisible();

    const detailForm = detailInput.locator("xpath=ancestor::form");
    await detailInput.fill("Plano E2E");
    await detailForm
      .getByRole("button", { name: "Salvar no rascunho" })
      .click();
    await expect(
      detailForm.getByText("Resposta salva no rascunho."),
    ).toBeVisible();

    const detailAnswers = await loadAnswer(submissionId, canonical.detail.id);
    expect(detailAnswers).toHaveLength(1);
    expect(detailAnswers[0].answer_value).toBe("Plano E2E");

    const refreshedSourceForm = page
      .locator("form")
      .filter({ hasText: canonical.source.label });

    await refreshedSourceForm.getByLabel("Nao", { exact: true }).check();
    await refreshedSourceForm
      .getByRole("button", { name: "Salvar no rascunho" })
      .click();
    await expect(
      page.getByLabel(canonical.detail.label, { exact: true }),
    ).toHaveCount(0);

    const submission = await admin
      .from("anamnesis_submissions")
      .select("submitted_at")
      .eq("id", submissionId)
      .single();

    if (submission.error) throw submission.error;
    expect(submission.data.submitted_at).toBeNull();
  } finally {
    await cleanupCanonicalDraft(client.clientId, canonical.formVersionId);
    await lockSyntheticClient(client.profileId);
  }

  const residue = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", client.clientId)
    .eq("form_version_id", canonical.formVersionId)
    .is("submitted_at", null);

  if (residue.error) throw residue.error;
  expect(residue.data).toHaveLength(0);
});
