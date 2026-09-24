import { randomBytes } from "node:crypto";

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
    friendlyName: "E2E anamnesis clarification smoke",
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

async function setSyntheticPassword(userId) {
  const password = randomBytes(48).toString("base64url");
  const updated = await admin.auth.admin.updateUserById(userId, { password });
  if (updated.error) throw updated.error;
  return password;
}

async function lockSyntheticUser(userId) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    password: randomBytes(48).toString("base64url"),
  });
  if (updated.error) throw updated.error;
}

async function loadProfileByDisplayName(displayName) {
  const profiles = await admin
    .from("profiles")
    .select("id")
    .eq("display_name", displayName)
    .limit(2);

  if (profiles.error) throw profiles.error;
  if (profiles.data.length !== 1) {
    throw new Error(`Expected exactly one ${displayName} fixture.`);
  }

  return profiles.data[0].id;
}

async function loadFixture() {
  const clientProfileId = await loadProfileByDisplayName(
    "E2E Correction Client",
  );
  const otherClientProfileId = await loadProfileByDisplayName("E2E Client");

  const client = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", clientProfileId)
    .single();
  if (client.error) throw client.error;

  const otherClient = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", otherClientProfileId)
    .single();
  if (otherClient.error) throw otherClient.error;
  if (otherClient.data.id === client.data.id) {
    throw new Error("Isolation fixture must be a different client.");
  }

  const assignment = await admin
    .from("client_assignments")
    .select("staff_profile_id")
    .eq("client_id", client.data.id)
    .is("ended_at", null)
    .single();
  if (assignment.error) throw assignment.error;

  const adminProfileId = assignment.data.staff_profile_id;
  const [adminAuth, clientAuth, otherClientAuth] = await Promise.all([
    admin.auth.admin.getUserById(adminProfileId),
    admin.auth.admin.getUserById(clientProfileId),
    admin.auth.admin.getUserById(otherClientProfileId),
  ]);

  if (adminAuth.error) throw adminAuth.error;
  if (clientAuth.error) throw clientAuth.error;
  if (otherClientAuth.error) throw otherClientAuth.error;

  const adminEmail = adminAuth.data.user.email;
  const clientEmail = clientAuth.data.user.email;
  const otherClientEmail = otherClientAuth.data.user.email;

  if (!adminEmail || !clientEmail || !otherClientEmail) {
    throw new Error("Synthetic E2E Auth users must have email addresses.");
  }

  const submission = await admin
    .from("anamnesis_submissions")
    .select("id, submitted_at")
    .eq("client_id", client.data.id)
    .not("submitted_at", "is", null)
    .limit(2);

  if (submission.error) throw submission.error;
  if (submission.data.length !== 1) {
    throw new Error(
      "Expected exactly one submitted Anamnese in the correction fixture.",
    );
  }

  const answer = await admin
    .from("anamnesis_answers")
    .select("id, answer_value, question_id")
    .eq("submission_id", submission.data[0].id)
    .limit(2);

  if (answer.error) throw answer.error;
  if (answer.data.length !== 1) {
    throw new Error(
      "Expected exactly one answer in the correction fixture.",
    );
  }

  const question = await admin
    .from("anamnesis_questions")
    .select("label")
    .eq("id", answer.data[0].question_id)
    .single();

  if (question.error) throw question.error;

  const adminPassword = await setSyntheticPassword(adminProfileId);
  const clientPassword = await setSyntheticPassword(clientProfileId);
  const otherClientPassword = await setSyntheticPassword(otherClientProfileId);

  await clearAdminFactors(adminProfileId);
  const totpSecret = await enrollAdminMfa(adminEmail, adminPassword);

  return {
    adminEmail,
    adminPassword,
    adminProfileId,
    answerId: answer.data[0].id,
    clientEmail,
    clientPassword,
    clientProfileId,
    originalAnswerValue: answer.data[0].answer_value,
    otherClientEmail,
    otherClientPassword,
    otherClientProfileId,
    questionLabel: question.data.label,
    submissionId: submission.data[0].id,
    totpSecret,
  };
}

async function loginClient(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cliente\/?$/);
}

test("fluxo autenticado admin-cliente-admin preserva historico e isolamento", async ({
  browser,
}) => {
  const fixture = await loadFixture();
  const runId = randomBytes(8).toString("hex");
  const requestText = `E2E pedido de esclarecimento ${runId}`;
  const responseText = `E2E complemento da cliente ${runId}`;
  const contexts = [];

  try {
    const adminContext = await browser.newContext({ baseURL: baseUrl });
    contexts.push(adminContext);
    const adminPage = await adminContext.newPage();

    await loginAdminWithMfa(adminPage, {
      email: fixture.adminEmail,
      password: fixture.adminPassword,
      totpSecret: fixture.totpSecret,
    });

    const adminRoute = await adminPage.goto(
      `/admin/anamneses/${fixture.submissionId}/esclarecimentos`,
    );
    expect(adminRoute?.status()).toBe(200);
    await expect(
      adminPage.getByRole("heading", {
        name: "Esclarecimentos da Anamnese",
      }),
    ).toBeVisible();

    await adminPage
      .getByLabel("Resposta original relacionada")
      .selectOption(fixture.answerId);
    await adminPage.getByLabel("Pedido de esclarecimento").fill(requestText);
    await adminPage
      .getByRole("button", { name: "Enviar pedido à cliente" })
      .click();

    await expect(
      adminPage.getByText("Pedido de esclarecimento registrado para a cliente."),
    ).toBeVisible();
    const adminRequestCard = adminPage
      .getByText(requestText, { exact: true })
      .locator("..");

    await expect(adminRequestCard).toBeVisible();
    await expect(
      adminRequestCard.getByText(fixture.questionLabel, { exact: true }),
    ).toBeVisible();

    const requestRow = await admin
      .from("anamnesis_clarification_requests")
      .select(
        "id, submission_id, source_answer_id, requested_by_profile_id, request_text",
      )
      .eq("submission_id", fixture.submissionId)
      .eq("request_text", requestText)
      .single();

    if (requestRow.error) throw requestRow.error;
    expect(requestRow.data.source_answer_id).toBe(fixture.answerId);
    expect(requestRow.data.requested_by_profile_id).toBe(
      fixture.adminProfileId,
    );

    const clientContext = await browser.newContext({ baseURL: baseUrl });
    contexts.push(clientContext);
    const clientPage = await clientContext.newPage();

    await loginClient(
      clientPage,
      fixture.clientEmail,
      fixture.clientPassword,
    );

    const clientRoute = await clientPage.goto(
      `/cliente/anamnese/${fixture.submissionId}/esclarecimentos`,
    );
    expect(clientRoute?.status()).toBe(200);
    await expect(
      clientPage.getByRole("heading", { name: "Esclarecimentos" }),
    ).toBeVisible();

    const requestCard = clientPage
      .getByText(requestText, { exact: true })
      .locator("..");

    await expect(requestCard).toBeVisible();
    await expect(
      requestCard.getByText(fixture.questionLabel, { exact: true }),
    ).toBeVisible();
    await requestCard.getByLabel("Seu esclarecimento").fill(responseText);
    await requestCard
      .getByRole("button", { name: "Registrar esclarecimento" })
      .click();

    await expect(
      requestCard.getByText("Seu esclarecimento foi registrado."),
    ).toBeVisible();
    await expect(
      clientPage.getByText(responseText, { exact: true }),
    ).toBeVisible();

    const responseRow = await admin
      .from("anamnesis_clarification_responses")
      .select(
        "id, clarification_request_id, responder_profile_id, response_text",
      )
      .eq("clarification_request_id", requestRow.data.id)
      .eq("response_text", responseText)
      .single();

    if (responseRow.error) throw responseRow.error;
    expect(responseRow.data.responder_profile_id).toBe(
      fixture.clientProfileId,
    );

    const originalAnswer = await admin
      .from("anamnesis_answers")
      .select("answer_value")
      .eq("id", fixture.answerId)
      .single();

    if (originalAnswer.error) throw originalAnswer.error;
    expect(originalAnswer.data.answer_value).toEqual(
      fixture.originalAnswerValue,
    );

    const otherContext = await browser.newContext({ baseURL: baseUrl });
    contexts.push(otherContext);
    const otherPage = await otherContext.newPage();

    await loginClient(
      otherPage,
      fixture.otherClientEmail,
      fixture.otherClientPassword,
    );

    const isolatedRoute = await otherPage.goto(
      `/cliente/anamnese/${fixture.submissionId}/esclarecimentos`,
    );

    expect(isolatedRoute?.status()).toBe(404);
    await expect(
      otherPage.getByText(requestText, { exact: true }),
    ).toHaveCount(0);

    await adminPage.goto(
      `/admin/anamneses/${fixture.submissionId}/esclarecimentos`,
    );
    await expect(adminPage.getByText(requestText, { exact: true })).toBeVisible();
    await expect(
      adminPage.getByText(responseText, { exact: true }),
    ).toBeVisible();

    const finalRequest = await admin
      .from("anamnesis_clarification_requests")
      .select("id")
      .eq("id", requestRow.data.id)
      .single();
    if (finalRequest.error) throw finalRequest.error;

    const finalResponse = await admin
      .from("anamnesis_clarification_responses")
      .select("id")
      .eq("id", responseRow.data.id)
      .single();
    if (finalResponse.error) throw finalResponse.error;
  } finally {
    for (const context of contexts) {
      await context.close();
    }

    await clearAdminFactors(fixture.adminProfileId);
    await Promise.all([
      lockSyntheticUser(fixture.adminProfileId),
      lockSyntheticUser(fixture.clientProfileId),
      lockSyntheticUser(fixture.otherClientProfileId),
    ]);
  }
});
