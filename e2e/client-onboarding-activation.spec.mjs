import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { writeFixtureLedger } from "./helpers/j1-fixture-ledger.mjs";
import { cleanupExactJ1PrivateFiles } from "./helpers/j1-private-file-cleanup.mjs";
import { checkJ1SyntheticPrivatePhoto } from "./helpers/j1-private-photo-browser.mjs";

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!baseUrl || !adminEmail || !supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_SUPABASE_URL or E2E_SUPABASE_SECRET_KEY",
  );
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAdminProfileId(email) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    throw new Error("Synthetic admin user was not found in Supabase Auth.");
  }

  const role = await admin
    .from("user_roles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (role.error) throw role.error;
  if (!role.data) {
    throw new Error("Synthetic admin user does not have the admin role.");
  }

  return user.id;
}

async function cleanupSyntheticClient({ clientId, profileId, email }) {
  // Destructive service-role cleanup is reserved for this exact synthetic
  // identity. Never delete a user selected only by a supplied profile ID.
  if (!/^e2e-onboarding-[0-9a-f]{16}@example\.invalid$/.test(email ?? "")) {
    throw new Error("Refusing cleanup of a non-synthetic onboarding identity.");
  }
  const authUser = await admin.auth.admin.getUserById(profileId);
  if (authUser.error || authUser.data.user?.email !== email) {
    throw new Error("Synthetic Auth ownership verification failed.");
  }

  if (clientId) {
    const linkedClient = await admin
      .from("clients")
      .select("id, profile_id")
      .eq("id", clientId)
      .single();
    if (linkedClient.error || linkedClient.data?.profile_id !== profileId) {
      throw new Error("Synthetic client ownership verification failed.");
    }
    // This test now visits Cadastro Atual and creates an unsubmitted
    // Anamnese draft. Refuse cleanup when the synthetic client has any
    // submitted professional history, rather than deleting real history.
    const submissions = await admin.from("anamnesis_submissions")
      .select("id, submitted_at").eq("client_id", clientId);
    if (submissions.error) throw submissions.error;
    if (submissions.data.some(item => item.submitted_at !== null)) {
      throw new Error("Refusing cleanup of a submitted Anamnese.");
    }
    const protocols = await admin.from("protocols")
      .select("id").eq("client_id", clientId).limit(1);
    if (protocols.error) throw protocols.error;
    if (protocols.data.length > 0) {
      throw new Error("Refusing cleanup of professional protocol history.");
    }
    await cleanupExactJ1PrivateFiles(admin,{clientId,profileId,email});
    for (const submission of submissions.data) {
      const answers = await admin.from("anamnesis_answers")
        .delete().eq("submission_id", submission.id);
      if (answers.error) throw answers.error;
      const draft = await admin.from("anamnesis_submissions").delete()
        .eq("id", submission.id).eq("client_id", clientId)
        .is("submitted_at", null).select("id").single();
      if (draft.error || !draft.data) {
        throw draft.error ?? new Error("Synthetic draft deletion was not verified.");
      }
    }
    const registration = await admin.from("client_registration")
      .delete().eq("client_id", clientId);
    if (registration.error) throw registration.error;
    const assignment = await admin
      .from("client_assignments")
      .delete()
      .eq("client_id", clientId);

    if (assignment.error) throw assignment.error;

    const client = await admin.from("clients").delete()
      .eq("id", clientId)
      .eq("profile_id", profileId)
      .select("id")
      .single();

    if (client.error || !client.data) {
      throw client.error ?? new Error("Synthetic client deletion not confirmed.");
    }
  }

  if (profileId) {
    const role = await admin
      .from("user_roles")
      .delete()
      .eq("profile_id", profileId);

    if (role.error) throw role.error;

    const profile = await admin.from("profiles").delete().eq("id", profileId);

    if (profile.error) throw profile.error;

    const deletedAuthUser = await admin.auth.admin.deleteUser(profileId);

    if (deletedAuthUser.error) throw deletedAuthUser.error;
  }
}

test("J1: cliente sintetica ativa acesso, salva Cadastro Atual e retoma Anamnese", async ({
  browser,
}) => {
  // 30s, the default Playwright timeout, is shorter than a full browser
  // journey with real Auth, server actions, verification and safe cleanup.
  test.setTimeout(210_000);
  const unique = randomBytes(8).toString("hex");
  const email = `e2e-onboarding-${unique}@example.invalid`;
  const password = `E2E-Onboarding-${unique}-Aa1!`;

  let profileId = null;
  let clientId = null;
  let activationContext = null;
  let loginContext = null;
  let loginPage = null;
  let anonymousContext = null;
  let activationPage = null;
  let tokenHash = null;
  const ledger = {
    runId: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    startedAt: Date.now(),
    email, profileId: null, clientId: null,
  };

  // Persist before generating Auth: an external cleanup step survives even a
  // Playwright process kill, rather than relying on a JS finally callback.
  await writeFixtureLedger(ledger);
  try {
    await test.step("J1 fixture: provisioning synthetic account and assignment", async () => {
    const staffProfileId = await findAdminProfileId(adminEmail);

    const generated = await admin.auth.admin.generateLink({
      type: "invite",
      email,
    });

    if (generated.error) throw generated.error;

    profileId = generated.data.user.id;
    ledger.profileId = profileId;
    await writeFixtureLedger(ledger);
    tokenHash = generated.data.properties.hashed_token;

    if (!profileId || !tokenHash) {
      throw new Error("Supabase did not return the invite user and token hash.");
    }

    const profile = await admin
      .from("profiles")
      .insert({
        display_name: "E2E Onboarding Client",
        id: profileId,
      })
      .select("id")
      .single();

    if (profile.error) throw profile.error;

    const role = await admin.from("user_roles").insert({
      profile_id: profileId,
      role: "client",
    });

    if (role.error) throw role.error;

    const client = await admin
      .from("clients")
      .insert({ profile_id: profileId, full_name: "E2E Onboarding Client", status: "active" })
      .select("id")
      .single();

    if (client.error) throw client.error;
    clientId = client.data.id;
    ledger.clientId = clientId;
    await writeFixtureLedger(ledger);

    const assignment = await admin.from("client_assignments").insert({
      client_id: clientId,
      staff_profile_id: staffProfileId,
    });

    if (assignment.error) throw assignment.error;
    }, { timeout: 45_000 });

    await test.step("J1 activation: mobile invitation and password", async () => {
    activationContext = await browser.newContext({ baseURL: baseUrl, viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
    activationPage = await activationContext.newPage();

    // Keep the one-time token out of navigation APIs and failure messages.
    // The browser constructs its redirect without passing secrets to the
    // Playwright URL assertion, trace or reporter.
    await activationPage.goto("/login");
    await activationPage.evaluate((hashedToken) => {
      const destination = new URL("/auth/confirm", window.location.origin);
      destination.searchParams.set("token_hash", hashedToken);
      destination.searchParams.set("type", "invite");
      window.location.replace(destination.pathname + destination.search);
    }, tokenHash);
    // An unexpected redirect must not print a one-time activation token
    // into a Playwright failed-URL assertion.
    if (new URL(activationPage.url()).searchParams.has("token_hash")) {
      throw new Error("One-time activation token remained in the browser URL.");
    }
    await expect(
      activationPage.getByRole("heading", { name: "Ativar sua conta" }),
    ).toBeVisible();

    // Do not type into a controlled React form before hydration: server
    // markup may still accept DOM input while client state is not yet wired.
    await expect(activationPage.locator('form[data-interactive="true"]'))
      .toBeVisible({timeout:15_000});
    await activationPage.getByLabel("Crie sua senha").fill(password);
    await activationPage.getByLabel("Confirme sua senha").fill(password);
    const activate = activationPage.getByRole("button", { name: "Criar senha e continuar" });
    await expect(activate).toBeEnabled({timeout:10_000});
    await activate.click();

    await expect(activationPage).toHaveURL(/\/cliente\/anamnese\/?$/);
    await expect(
      activationPage.getByRole("heading", { name: "Anamnese", exact: true }),
    ).toBeVisible();

    const authUser = await admin.auth.admin.getUserById(profileId);

    if (authUser.error) throw authUser.error;
    expect(authUser.data.user.email_confirmed_at).toBeTruthy();
    }, { timeout: 45_000 });

    // The client flow continues through the real UI, without a second
    // admin identity, MFA bypass or user data outside this fixture.
    await test.step("salva e recupera Cadastro Atual no celular", async () => {
      await activationPage.goto("/cliente/perfil");
      await activationPage.getByLabel("Cidade").fill("Cidade Sintética J1");
      await activationPage.getByRole("button", {name:"Salvar Cadastro Atual"}).click();
      await expect.poll(async () => {
        const registration = await admin.from("client_registration")
          .select("city").eq("client_id", clientId).maybeSingle();
        if (registration.error) throw registration.error;
        return registration.data?.city ?? null;
      }, {timeout:20_000}).toBe("Cidade Sintética J1");
      await activationPage.reload();
      await expect(activationPage.getByLabel("Cidade")).toHaveValue("Cidade Sintética J1");
      const layout = await activationPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(layout.scroll, "Cadastro Atual must fit mobile viewport").toBeLessThanOrEqual(layout.viewport + 1);
    }, { timeout: 35_000 });

    let draftId = null;
    let draftFormVersionId = null;
    let cityQuestionId = null;
    await test.step("inicia e retoma a mesma Anamnese versionada", async () => {
      await activationPage.goto("/cliente/anamnese");
      await activationPage.getByRole("button", {name:"Começar Anamnese"}).click();
      await expect(activationPage).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]{36}\/?$/);
      draftId = activationPage.url().split("/").at(-1);
      const rows = await admin.from("anamnesis_submissions")
        .select("id,client_id,form_version_id,submitted_at")
        .eq("client_id",clientId);
      if (rows.error) throw rows.error;
      expect(rows.data).toHaveLength(1);
      expect(rows.data[0].id).toBe(draftId);
      expect(rows.data[0].submitted_at).toBeNull();
      expect(rows.data[0].form_version_id).toBeTruthy();
      draftFormVersionId = rows.data[0].form_version_id;
      await activationPage.goto("/cliente/anamnese");
      const resume = activationPage.getByRole("link",{name:"Continuar rascunho"});
      await expect(resume).toHaveAttribute("href",`/cliente/anamnese/${draftId}`);
      const layout = await activationPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(layout.scroll, "Anamnese must fit mobile viewport").toBeLessThanOrEqual(layout.viewport + 1);
    }, { timeout: 35_000 });

    await test.step("J1 Anamnese: editar resposta informativa e persistir sem duplicar", async () => {
      // Only a non-clinical question from the EXACT published version linked
      // to this synthetic draft. Do not guess question IDs or write health data.
      const question = await admin.from("anamnesis_questions")
        .select("id,question_key,answer_type")
        .eq("form_version_id",draftFormVersionId)
        .eq("question_key","city")
        .single();
      if (question.error) throw question.error;
      expect(question.data.question_key).toBe("city");
      expect(question.data.answer_type).toBe("text");
      cityQuestionId = question.data.id;

      await activationPage.goto(`/cliente/anamnese/${draftId}`);
      const field = activationPage.locator(`#anamnesis-draft-answer-${cityQuestionId}`);
      await expect(field).toBeVisible();
      await field.fill("Cidade Sintética J1 A");
      await field.blur();

      async function storedValues() {
        const answers = await admin.from("anamnesis_answers")
          .select("answer_value")
          .eq("submission_id",draftId)
          .eq("question_id",cityQuestionId);
        if (answers.error) throw answers.error;
        return answers.data.map(answer => answer.answer_value);
      }
      await expect.poll(storedValues,{timeout:20_000}).toEqual(["Cidade Sintética J1 A"]);

      await expect(activationPage.getByText("Salvo automaticamente.", {exact:true})).toBeVisible({timeout:15_000});
      await field.fill("Cidade Sintética J1 B");
      await field.blur();
      await expect.poll(storedValues,{timeout:20_000}).toEqual(["Cidade Sintética J1 B"]);
      await activationPage.reload();
      await expect(activationPage.locator(`#anamnesis-draft-answer-${cityQuestionId}`))
        .toHaveValue("Cidade Sintética J1 B");

      const submission = await admin.from("anamnesis_submissions")
        .select("submitted_at").eq("id",draftId).single();
      if (submission.error) throw submission.error;
      expect(submission.data.submitted_at).toBeNull();
    },{timeout:45_000});

    await test.step("J1 return: independent mobile client login", async () => {
    loginContext = await browser.newContext({ baseURL: baseUrl, viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
    loginPage = await loginContext.newPage();

    await loginPage.goto("/login");
    await loginPage.getByLabel("Email").fill(email);
    await loginPage.getByLabel("Senha").fill(password);
    await loginPage.getByRole("button", { name: "Entrar" }).click();

    await expect(loginPage).toHaveURL(/\/cliente\/?$/);
    await loginPage.goto("/cliente/anamnese");
    await expect(loginPage.getByRole("link",{name:"Continuar rascunho"}))
      .toHaveAttribute("href",`/cliente/anamnese/${draftId}`);
    await loginPage.goto(`/cliente/anamnese/${draftId}`);
    await expect(loginPage.locator(`#anamnesis-draft-answer-${cityQuestionId}`))
      .toHaveValue("Cidade Sintética J1 B");
    }, { timeout: 35_000 });

    let syntheticPrivateFileId = null;
    await test.step("J1 private photo: verified upload and persisted history", async () => {
      syntheticPrivateFileId = await checkJ1SyntheticPrivatePhoto({page:loginPage,admin,clientId,profileId,unique});
    }, {timeout:55000});

    await test.step("J1 authorization: anonymous session and client cannot access privileged records", async () => {
      anonymousContext = await browser.newContext({
        baseURL: baseUrl, viewport: {width:390,height:844}, isMobile:true, hasTouch:true,
      });
      const visitor = await anonymousContext.newPage();
      await visitor.goto(`/cliente/anamnese/${draftId}`);
      await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);
      await visitor.goto("/cliente/perfil");
      await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);
      // No signed URL or private bytes are exposed to anonymous visitors.
      // Do not preview the file in an authenticated session: it must retain audit history.
      expect(syntheticPrivateFileId).toMatch(/^[0-9a-f-]{36}$/i);
      await visitor.goto(`/cliente/arquivos/${syntheticPrivateFileId}?preview=1`);
      await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);
      await visitor.goto(`/cliente/arquivos/${syntheticPrivateFileId}`);
      await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);

      // Existing authenticated client session must not enter Patty's admin UI.
      await loginPage.goto("/admin/pendencias");
      await expect(loginPage).toHaveURL(/\/login\/?(?:[?].*)?$/);
    }, {timeout:30_000});
  } finally {
    // A timed-out Playwright test may already have closed browser contexts.
    // Their errors MUST NOT prevent server-side deletion of the verified
    // disposable synthetic identity. A cleanup failure still fails the job.
    const closeResults = await Promise.allSettled([
      anonymousContext?.close(),
      loginContext?.close(),
      activationContext?.close(),
    ]);
    if (closeResults.some(result => result.status === "rejected")) {
      console.warn("J1 browser context was already closed; proceeding with safe fixture cleanup.");
    }
    if (profileId) {
      await cleanupSyntheticClient({ clientId, profileId, email });
      console.log("J1 synthetic fixture cleanup completed.");
    }
  }
});
