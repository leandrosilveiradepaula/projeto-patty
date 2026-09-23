import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  generateTotp,
  loginAdminWithMfa,
} from "./helpers/admin-auth.mjs";

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

function createUserClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function listAdminFactors(userId) {
  const result = await admin.auth.admin.mfa.listFactors({ userId });
  if (result.error) throw result.error;
  return result.data.factors ?? [];
}

async function clearAdminFactors(userId) {
  for (const factor of await listAdminFactors(userId)) {
    const deleted = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId,
    });
    if (deleted.error) throw deleted.error;
  }
}

async function enrollAdminMfa(email, password) {
  const userClient = createUserClient();
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const enrolled = await userClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "E2E corrections smoke",
  });
  if (enrolled.error) throw enrolled.error;

  const factorId = enrolled.data.id;
  const secret = enrolled.data.totp.secret;
  const challenge = await userClient.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;

  const verified = await userClient.auth.mfa.verify({
    challengeId: challenge.data.id,
    code: generateTotp(secret),
    factorId,
  });
  if (verified.error) throw verified.error;

  await userClient.auth.signOut();
  return secret;
}

async function loadStableFixture() {
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

  const clientProfileId = profiles.data[0].id;
  const client = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", clientProfileId)
    .single();
  if (client.error) throw client.error;

  const assignment = await admin
    .from("client_assignments")
    .select("staff_profile_id")
    .eq("client_id", client.data.id)
    .is("ended_at", null)
    .single();
  if (assignment.error) throw assignment.error;

  const adminProfileId = assignment.data.staff_profile_id;
  const authUser = await admin.auth.admin.getUserById(adminProfileId);
  if (authUser.error) throw authUser.error;

  const email = authUser.data.user.email;
  if (!email) {
    throw new Error("Persistent E2E Correction Admin has no Auth email.");
  }

  const submission = await admin
    .from("anamnesis_submissions")
    .select("id, submitted_at")
    .eq("client_id", client.data.id)
    .not("submitted_at", "is", null)
    .single();
  if (submission.error) throw submission.error;

  const answer = await admin
    .from("anamnesis_answers")
    .select("id, answer_value")
    .eq("submission_id", submission.data.id)
    .single();
  if (answer.error) throw answer.error;

  const existingCorrections = await admin
    .from("anamnesis_answer_corrections")
    .select("id", { count: "exact", head: true })
    .eq("answer_id", answer.data.id);
  if (existingCorrections.error) throw existingCorrections.error;
  if ((existingCorrections.count ?? 0) !== 0) {
    throw new Error(
      "Persistent E2E correction fixture must not contain correction history.",
    );
  }

  const password = `E2E-Corrections-${Date.now()}-Aa1!`;
  const updated = await admin.auth.admin.updateUserById(adminProfileId, {
    password,
  });
  if (updated.error) throw updated.error;

  await clearAdminFactors(adminProfileId);
  const totpSecret = await enrollAdminMfa(email, password);

  return {
    adminProfileId,
    answerId: answer.data.id,
    email,
    password,
    submissionId: submission.data.id,
    totpSecret,
  };
}

test.use({ baseURL: baseUrl });

test("admin sintetico acessa correcoes e JSON invalido nao cria historico", async ({
  page,
}) => {
  const fixture = await loadStableFixture();

  try {
    await loginAdminWithMfa(page, {
      email: fixture.email,
      password: fixture.password,
      totpSecret: fixture.totpSecret,
    });

    const correctionsResponse = await page.goto(
      `/admin/anamneses/${fixture.submissionId}/correcoes`,
    );
    console.log(
      "corrections-route-status",
      correctionsResponse?.status() ?? null,
      new URL(page.url()).pathname,
    );

    await expect(
      page.getByRole("heading", { name: "Correções da Anamnese" }),
    ).toBeVisible();
    await expect(page.getByText("E2E correction question")).toBeVisible();
    await expect(page.getByText('"Original E2E answer"')).toBeVisible();

    await page.getByLabel("Novo valor corrigido").fill("{");
    await page.getByRole("button", { name: "Registrar correção" }).click();

    await expect(
      page.getByText(
        'Use JSON válido. Exemplo para texto: "resposta corrigida".',
      ),
    ).toBeVisible();

    const correctionRows = await admin
      .from("anamnesis_answer_corrections")
      .select("id", { count: "exact", head: true })
      .eq("answer_id", fixture.answerId);

    if (correctionRows.error) throw correctionRows.error;
    expect(correctionRows.count).toBe(0);
  } finally {
    await clearAdminFactors(fixture.adminProfileId);
  }
});
