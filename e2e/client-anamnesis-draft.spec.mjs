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

async function cleanupDraft(submissionId) {
  const answers = await admin
    .from("anamnesis_answers")
    .delete()
    .eq("submission_id", submissionId);
  if (answers.error) throw answers.error;

  const submission = await admin
    .from("anamnesis_submissions")
    .delete()
    .eq("id", submissionId)
    .is("submitted_at", null);
  if (submission.error) throw submission.error;
}

async function lockSyntheticClient(userId) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    password: randomBytes(64).toString("base64url"),
  });

  if (updated.error) throw updated.error;
}

async function loadFixture() {
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

  const role = await admin
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .single();
  if (role.error) throw role.error;
  if (role.data.role !== "client") {
    throw new Error("Persistent E2E Correction Client must have client role.");
  }

  const authUser = await admin.auth.admin.getUserById(profileId);
  if (authUser.error) throw authUser.error;

  const email = authUser.data.user.email;
  if (!email) {
    throw new Error("Persistent E2E Correction Client has no Auth email.");
  }

  const submitted = await admin
    .from("anamnesis_submissions")
    .select("id, form_version_id")
    .eq("client_id", client.data.id)
    .not("submitted_at", "is", null)
    .limit(2);

  if (submitted.error) throw submitted.error;
  if (submitted.data.length !== 1) {
    throw new Error(
      "Expected exactly one submitted Anamnese in the correction fixture.",
    );
  }

  const formVersionId = submitted.data[0].form_version_id;

  const questions = await admin
    .from("anamnesis_questions")
    .select("id, label, answer_type")
    .eq("form_version_id", formVersionId)
    .eq("answer_type", "text")
    .limit(2);

  if (questions.error) throw questions.error;
  if (questions.data.length !== 1) {
    throw new Error(
      "Expected exactly one text question in the correction fixture.",
    );
  }

  const staleDrafts = await admin
    .from("anamnesis_submissions")
    .select("id")
    .eq("client_id", client.data.id)
    .eq("form_version_id", formVersionId)
    .is("submitted_at", null);

  if (staleDrafts.error) throw staleDrafts.error;

  for (const draft of staleDrafts.data) {
    await cleanupDraft(draft.id);
  }

  const draft = await admin
    .from("anamnesis_submissions")
    .insert({
      client_id: client.data.id,
      form_version_id: formVersionId,
    })
    .select("id")
    .single();

  if (draft.error) throw draft.error;

  const password = randomBytes(48).toString("base64url");
  const updated = await admin.auth.admin.updateUserById(profileId, {
    password,
  });
  if (updated.error) throw updated.error;

  return {
    email,
    password,
    profileId,
    questionId: questions.data[0].id,
    questionLabel: questions.data[0].label,
    submissionId: draft.data.id,
  };
}

test.use({ baseURL: baseUrl });

test("cliente sintetica retoma rascunho text e persiste insert/update", async ({
  page,
}) => {
  const fixture = await loadFixture();

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Senha").fill(fixture.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/cliente\/?$/);

    await page.goto("/cliente/anamnese");
    await expect(
      page.getByRole("heading", { name: "Anamnese" }),
    ).toBeVisible();

    const resumeLink = page.getByRole("link", { name: "Continuar rascunho" });
    await expect(resumeLink).toHaveCount(1);
    await resumeLink.click();

    await expect(page).toHaveURL(
      new RegExp(`/cliente/anamnese/${fixture.submissionId}$`),
    );
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

    const answerField = page.getByLabel(fixture.questionLabel);
    await expect(answerField).toBeVisible();

    const firstValue = "Resposta E2E de rascunho - primeira versao";
    await answerField.fill(firstValue);
    await page.getByRole("button", { name: "Salvar no rascunho" }).click();
    await expect(page.getByText("Resposta salva no rascunho.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(fixture.questionLabel)).toHaveValue(firstValue);

    const secondValue = "Resposta E2E de rascunho - atualizada";
    await page.getByLabel(fixture.questionLabel).fill(secondValue);
    await page.getByRole("button", { name: "Salvar no rascunho" }).click();
    await expect(page.getByText("Resposta salva no rascunho.")).toBeVisible();

    const saved = await admin
      .from("anamnesis_answers")
      .select("id, answer_value")
      .eq("submission_id", fixture.submissionId)
      .eq("question_id", fixture.questionId);

    if (saved.error) throw saved.error;

    expect(saved.data).toHaveLength(1);
    expect(saved.data[0].answer_value).toBe(secondValue);
  } finally {
    await cleanupDraft(fixture.submissionId);
    await lockSyntheticClient(fixture.profileId);
  }
});
