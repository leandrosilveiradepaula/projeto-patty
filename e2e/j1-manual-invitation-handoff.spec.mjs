import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAdminWithMfa } from "./helpers/admin-auth.mjs";

/**
 * J1.01-03: real admin invitation UI -> mobile activation -> client account,
 * registration and a draft. No medical data, professional approval or release.
 * This is only a PARTIAL journey E2E; the full J1 remains unhomologated.
 */
const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const adminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseSecretKey = process.env.E2E_SUPABASE_SECRET_KEY;

if (!baseUrl || !adminEmail || !adminPassword || !adminTotpSecret ||
    !supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing J1 E2E production origin, admin MFA or synthetic-cleanup credentials.");
}

const allowedOrigin = new URL(baseUrl).origin;
const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const fixtureEmailPattern = /^e2e-j1-[0-9a-f]{16}@example\.invalid$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function locateExactSyntheticIdentity(email) {
  if (!fixtureEmailPattern.test(email)) {
    throw new Error("Refusing to locate any non-J1 synthetic account.");
  }
  for (let page = 1; page <= 20; page += 1) {
    const response = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (response.error) throw response.error;
    const matches = response.data.users.filter(user => user.email === email);
    if (matches.length > 1) throw new Error("Ambiguous synthetic identity.");
    if (matches.length === 1) return matches[0];
    if (response.data.users.length < 1000) break;
  }
  return null;
}

async function cleanExactSyntheticIdentity(email, expectedClientId) {
  if (!fixtureEmailPattern.test(email)) {
    throw new Error("Synthetic cleanup denied: invalid unique fixture email.");
  }
  const user = await locateExactSyntheticIdentity(email);
  if (!user) {
    if (expectedClientId) throw new Error("Client created but its verified synthetic Auth identity is missing.");
    return;
  }
  const recheck = await admin.auth.admin.getUserById(user.id);
  if (recheck.error || recheck.data.user?.email !== email) {
    throw new Error("Synthetic Auth ownership mismatch; nothing will be deleted.");
  }

  const linked = await admin.from("clients").select("id,profile_id")
    .eq("profile_id",user.id);
  if (linked.error) throw linked.error;
  if (linked.data.length > 1) throw new Error("Unexpected multiple client rows for synthetic identity.");
  const client = linked.data[0] || null;
  if (client && (!uuid.test(client.id) || client.profile_id !== user.id ||
      (expectedClientId && client.id !== expectedClientId))) {
    throw new Error("Refusing cleanup: client/profile ownership mismatch.");
  }
  if (client) {
    const submissions = await admin.from("anamnesis_submissions")
      .select("id,submitted_at").eq("client_id",client.id);
    if (submissions.error) throw submissions.error;
    if (submissions.data.some(row => row.submitted_at !== null)) {
      throw new Error("Refusing cleanup: a submitted historical Anamnesis exists.");
    }
    // No service-role cleanup is allowed for reviewed/submitted professional records.
    const professional = await admin.from("protocols").select("id").eq("client_id",client.id).limit(1);
    if (professional.error) throw professional.error;
    if (professional.data.length) {
      throw new Error("Refusing cleanup: professional protocol records exist.");
    }
    for (const row of submissions.data) {
      const answers = await admin.from("anamnesis_answers").delete().eq("submission_id",row.id);
      if (answers.error) throw answers.error;
      const draft = await admin.from("anamnesis_submissions")
        .delete().eq("id",row.id).eq("client_id",client.id).is("submitted_at",null)
        .select("id").single();
      if (draft.error || !draft.data) throw draft.error ?? new Error("Draft deletion not confirmed");
    }
    const registration = await admin.from("client_registration").delete().eq("client_id",client.id);
    if (registration.error) throw registration.error;
    const assignments = await admin.from("client_assignments").delete().eq("client_id",client.id);
    if (assignments.error) throw assignments.error;
    const removed = await admin.from("clients").delete()
      .eq("id",client.id).eq("profile_id",user.id).select("id").single();
    if (removed.error || !removed.data) throw removed.error ?? new Error("Client deletion not confirmed.");
  } else if (expectedClientId) {
    throw new Error("Client was observed by UI but no longer belongs to this fixture.");
  }
  const role = await admin.from("user_roles").delete().eq("profile_id",user.id).eq("role","client");
  if (role.error) throw role.error;
  const profile = await admin.from("profiles").delete().eq("id",user.id);
  if (profile.error) throw profile.error;
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) throw deleted.error;
  if (await locateExactSyntheticIdentity(email)) {
    throw new Error("Synthetic Auth identity remains after cleanup.");
  }
}

test("J1: convite manual real, ativação móvel, perfil persistido e retomada da Anamnese", async ({ browser }) => {
  test.setTimeout(240_000);
  const suffix = randomBytes(8).toString("hex");
  const email = "e2e-j1-" + suffix + "@example.invalid";
  const name = "Cliente Sintética J1 " + suffix;
  const password = "J1-Valid-" + randomBytes(14).toString("base64url") + "-Aa1!";
  let observedClientId = null;
  let adminContext;
  let clientContext;
  let loginContext;
  try {
    adminContext = await browser.newContext({ baseURL: baseUrl, viewport: {width:1280,height:800} });
    const patty = await adminContext.newPage();
    await test.step("admin autenticado com MFA convida pela interface real", async () => {
      await loginAdminWithMfa(patty,{
        email:adminEmail,password:adminPassword,totpSecret:adminTotpSecret,
      });
      await patty.goto("/admin/clientes/nova");
      await expect(patty.getByRole("heading",{name:"Convidar cliente"})).toBeVisible();
      await patty.getByLabel("Nome da cliente").fill(name);
      await patty.getByLabel("Email da cliente").fill(email);
      await patty.getByRole("checkbox",{name:/Confirmo que este é um cadastro novo/}).check();
      await patty.getByRole("button",{name:"Gerar link de ativação"}).click();
      await expect(patty.getByText("Link gerado",{exact:true})).toBeVisible();
      const href = await patty.getByRole("link",{name:"Abrir acompanhamento desta cliente"}).getAttribute("href");
      const match = /^\/admin\/clientes\/([0-9a-f-]{36})\?onboarding=link-generated$/.exec(href || "");
      expect(match,"Client link must identify exactly the invited client").not.toBeNull();
      observedClientId = match[1];
      expect(uuid.test(observedClientId)).toBe(true);
    });

    const activationLink = await patty.locator("#manual-activation-link").inputValue();
    const activation = new URL(activationLink);
    // Never print or attach this one-time credential to test logs or screenshots.
    expect(activation.origin).toBe(allowedOrigin);
    expect(activation.pathname).toBe("/auth/confirm");
    expect(activation.searchParams.get("type")).toBe("invite");
    expect(activation.searchParams.get("token_hash")).toBeTruthy();

    const identity = await locateExactSyntheticIdentity(email);
    expect(identity?.id,"Unique synthetic Auth identity must exist").toBeTruthy();
    const clientRow = await admin.from("clients").select("id,profile_id")
      .eq("id",observedClientId).single();
    if (clientRow.error) throw clientRow.error;
    expect(clientRow.data.profile_id).toBe(identity.id);
    const assignments = await admin.from("client_assignments")
      .select("client_id,ended_at").eq("client_id",observedClientId);
    if (assignments.error) throw assignments.error;
    expect(assignments.data).toHaveLength(1);
    expect(assignments.data[0].ended_at).toBeNull();

    clientContext = await browser.newContext({
      baseURL:baseUrl, viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    });
    const client = await clientContext.newPage();
    await test.step("cliente ativa a conta pelo link individual no celular", async () => {
      await client.goto(activationLink);
      await expect(client).toHaveURL(/\/ativar-conta\/?$/);
      await client.getByLabel("Crie sua senha").fill(password);
      await client.getByLabel("Confirme sua senha").fill(password);
      await client.getByRole("button",{name:"Criar senha e continuar"}).click();
      await expect(client).toHaveURL(/\/cliente\/anamnese\/?$/);
    });

    await test.step("cliente salva Cadastro Atual e o valor persiste no reload móvel",async()=>{
      await client.goto("/cliente/perfil");
      await client.getByLabel("Cidade").fill("Cidade Sintética J1");
      await client.getByRole("button",{name:"Salvar Cadastro Atual"}).click();
      await expect(client.getByText("Cadastro atualizado")).toBeVisible();
      await client.reload();
      await expect(client.getByLabel("Cidade")).toHaveValue("Cidade Sintética J1");
    });

    await test.step("cliente inicia somente um rascunho versionado e consegue retomá-lo",async()=>{
      await client.goto("/cliente/anamnese");
      await client.getByRole("button",{name:"Começar Anamnese"}).click();
      await expect(client).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]{36}\/?$/);
      await client.goto("/cliente/anamnese");
      await expect(client.getByRole("link",{name:"Continuar rascunho"})).toBeVisible();
      const drafts = await admin.from("anamnesis_submissions")
        .select("id,submitted_at").eq("client_id",observedClientId);
      if (drafts.error) throw drafts.error;
      expect(drafts.data).toHaveLength(1);
      expect(drafts.data[0].submitted_at).toBeNull();
    });

    loginContext = await browser.newContext({
      baseURL:baseUrl,viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    });
    const anotherSession = await loginContext.newPage();
    await test.step("novo login mantém a conta ativa e o acesso ao rascunho",async()=>{
      await anotherSession.goto("/login");
      await anotherSession.getByLabel("Email").fill(email);
      await anotherSession.getByLabel("Senha").fill(password);
      await anotherSession.getByRole("button",{name:"Entrar"}).click();
      await expect(anotherSession).toHaveURL(/\/cliente\/?$/);
      await anotherSession.goto("/cliente/anamnese");
      await expect(anotherSession.getByRole("link",{name:"Continuar rascunho"})).toBeVisible();
    });
  } finally {
    await loginContext?.close();
    await clientContext?.close();
    await adminContext?.close();
    // Fail closed: if historical professional/clinical records appeared, leave
    // them untouched and surface an actionable cleanup blocker.
    await cleanExactSyntheticIdentity(email,observedClientId);
  }
});
