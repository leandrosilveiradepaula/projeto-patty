import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";

// The J1 smoke must never run against the hosted Supabase or public Vercel.
// All synthetic identities, submissions and answers die with this local DB.
const baseURL = process.env.J1_E2E_BASE_URL;
const apiURL = process.env.J1_E2E_SUPABASE_URL;
const anonKey = process.env.J1_E2E_ANON_KEY;
const serviceKey = process.env.J1_E2E_SERVICE_ROLE_KEY;
if (
  process.env.J1_E2E_LOCAL_ONLY !== "true" ||
  baseURL !== "http://127.0.0.1:3000" ||
  apiURL !== "http://127.0.0.1:54321" ||
  !anonKey || !serviceKey ||
  process.env.OPENAI_HEALTH_DATA_PROCESSING_ENABLED !== "false" ||
  Boolean(process.env.OPENAI_API_KEY)
) {
  throw new Error("J1 smoke requires disposable localhost services and disabled external AI");
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixtureTables = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  "anamnesis_forms", "anamnesis_form_versions", "anamnesis_sections",
  "anamnesis_questions",
]);
const service = createClient(apiURL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function literal(value) {
  if (value === null) return "NULL";
  if (typeof value !== "number" && typeof value !== "string")
    throw new TypeError("Unsupported synthetic SQL value");
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(statement) {
  if (process.env.J1_E2E_LOCAL_ONLY !== "true" ||
      apiURL !== "http://127.0.0.1:54321")
    throw new Error("J1 local SQL boundary rejected");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql",
    "-X", "-q", "-U", "postgres", "-d", "postgres",
    "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: statement.trimEnd() + "\n", encoding: "utf8", timeout: 15000 }).trim();
}
function rows(query) {
  return JSON.parse(sql(
    "select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from (" + query + ") t;",
  ));
}
function insert(table, fields) {
  if (!fixtureTables.has(table) ||
      !Object.keys(fields).every(key => /^[a-z][a-z0-9_]*$/.test(key)))
    throw new Error("Synthetic fixture table or column denied");
  const key = table === "user_roles" ? "profile_id" : "id";
  const id = sql("insert into public." + table + " (" +
    Object.keys(fields).join(",") + ") values (" +
    Object.values(fields).map(literal).join(",") + ") returning " + key + ";");
  if (!UUID.test(id)) throw new Error("Synthetic fixture insertion did not return UUID");
  return id;
}
async function makeStaff(nonce, label = "staff") {
  if (!["staff", "unassigned"].includes(label)) {
    throw new Error("J1 synthetic staff label rejected");
  }
  const email = "e2e-j1-" + label + "-" + nonce + "@example.invalid";
  const password = "J1-" + randomBytes(16).toString("base64url") + "-Aa1!";
  const result = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (result.error || !result.data?.user?.id)
    throw result.error ?? new Error("Local synthetic staff creation failed");
  const id = result.data.user.id;
  insert("profiles", { id, display_name: "J1 Synthetic " + label });
  insert("user_roles", { profile_id: id, role: "admin" });
  return { id, email, password };
}
async function enrollStaffTotp(staff) {
  const api = createClient(apiURL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const login = await api.auth.signInWithPassword({
    email: staff.email, password: staff.password,
  });
  if (login.error) throw login.error;
  try {
    const factor = await api.auth.mfa.enroll({
      factorType: "totp", friendlyName: "J1 disposable staff MFA",
    });
    if (factor.error) throw factor.error;
    const challenge = await api.auth.mfa.challenge({ factorId: factor.data.id });
    if (challenge.error) throw challenge.error;
    const verified = await api.auth.mfa.verify({
      factorId: factor.data.id,
      challengeId: challenge.data.id,
      code: generateTotp(factor.data.totp.secret),
    });
    if (verified.error) throw verified.error;
    return factor.data.totp.secret;
  } finally {
    await api.auth.signOut();
  }
}
function getPublishedAnamnesisFromMigrations() {
  // The committed migrations already publish the canonical v1 form. Never
  // recreate or modify that form just to make an E2E pass.
  const published = rows(
    "select v.id as version_id, q.id as city_question_id" +
    " from public.anamnesis_forms f" +
    " join public.anamnesis_form_versions v on v.form_id=f.id" +
    " join public.anamnesis_questions q on q.form_version_id=v.id" +
    " where f.form_key='client-anamnesis' and v.published_at is not null" +
    " and q.question_key='city' and q.answer_type='text'" +
    " order by v.version_number desc limit 1",
  );
  if (published.length !== 1 ||
      !UUID.test(published[0].version_id) ||
      !UUID.test(published[0].city_question_id)) {
    throw new Error("Committed canonical Anamnese version or city question missing");
  }
  return {
    versionId: published[0].version_id,
    cityQuestionId: published[0].city_question_id,
  };
}
async function makeInvitedClient(staffId, nonce) {
  const email = "e2e-j1-owner-" + nonce + "@example.invalid";
  const result = await service.auth.admin.generateLink({ type: "invite", email });
  if (result.error || !result.data?.user?.id || !result.data?.properties?.hashed_token)
    throw result.error ?? new Error("Local invite could not be generated");
  const profileId = result.data.user.id;
  insert("profiles", { id: profileId, display_name: "J1 Synthetic client" });
  insert("user_roles", { profile_id: profileId, role: "client" });
  const clientId = insert("clients", {
    profile_id: profileId, full_name: "J1 Synthetic client", status: "active",
  });
  insert("client_assignments", { client_id: clientId, staff_profile_id: staffId });
  return { email, profileId, clientId, token: result.data.properties.hashed_token };
}
test.use({ baseURL });
test("J1 local: invite activation, cadastro, versioned Anamnese draft and isolation", async ({ browser }) => {
  test.setTimeout(420000);
  const nonce = randomBytes(8).toString("hex");
  const staff = await makeStaff(nonce);
  const staffId = staff.id;
  const staffTotp = await enrollStaffTotp(staff);
  const { versionId, cityQuestionId } = getPublishedAnamnesisFromMigrations();
  const invite = await makeInvitedClient(staffId, nonce);
  const password = "J1-" + randomBytes(17).toString("base64url") + "-Aa1!";
  const context = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const page = await context.newPage();
  let callbackCookieHeaderPresent = false;
  page.on("response", (response) => {
    if (new URL(response.url()).pathname !== "/auth/confirm") return;
    void response.allHeaders()
      .then((headers) => {
        // Boolean only; never capture OTPs, actual Set-Cookie or credentials.
        callbackCookieHeaderPresent = Boolean(headers["set-cookie"]);
      })
      .catch(() => {});
  });
  const sessionResponses = [];
  // Capture only HTTP status and whether the server authorized an app role.
  // Never retain or print tokens, cookies, response bodies or profile IDs.
  page.on("response", (response) => {
    if (new URL(response.url()).pathname !== "/ativar-conta/session") return;
    void Promise.all([response.json(), response.request().allHeaders()])
      .then(([payload, headers]) => {
        const roleKind =
          payload?.role === "client" || payload?.role === "admin"
            ? "authorized" : "not-authorized";
        const sentCookieHeader = headers["cookie"] ?? "";
        const sentAuthCookie = sentCookieHeader.includes("sb-") &&
          sentCookieHeader.includes("auth-token");
        sessionResponses.push(
          response.status() + ":" + roleKind + ":cookie-sent=" + sentAuthCookie,
        );
      })
      .catch(() => sessionResponses.push(response.status() + ":unreadable"));
  });

  await test.step("activate invitation without exposing its one-time token", async () => {
    await page.goto("/login");
    const anonymousSession = await page.request.get("/ativar-conta/session");
    expect(anonymousSession.ok()).toBe(true);
    expect(await anonymousSession.json()).toEqual({ role: null });
    expect(anonymousSession.headers()["cache-control"]).toContain("no-store");
    await page.evaluate((token) => {
      const destination = new URL("/auth/confirm", window.location.origin);
      destination.searchParams.set("token_hash", token);
      destination.searchParams.set("type", "invite");
      window.location.replace(destination.pathname + destination.search);
    }, invite.token);
    if (new URL(page.url()).searchParams.has("token_hash"))
      throw new Error("One-time token remained in the browser URL");
    await expect(page.getByRole("heading", { name: "Ativar sua conta" })).toBeVisible();
    // The OTP callback may not move from 127.0.0.1 to an internal localhost
    // alias: host-only session cookies would no longer reach the browser.
    expect(new URL(page.url()).origin).toBe(new URL(baseURL).origin);
    await expect.poll(() => callbackCookieHeaderPresent, {
      timeout: 5000,
      message: "J1 OTP redirect must set an Auth session cookie on its returned response",
    }).toBe(true);
    // Do not leak the one-time token into Playwright diagnostics. Classify
    // the *visible* activation boundary if the form does not become ready:
    // this distinguishes an invalid invite from missing session/hydration.
    let lastPhase = "not-rendered";
    try {
      await expect.poll(async () => {
        if (await page.locator('form[data-interactive="true"]').count()) return lastPhase = "ready";
        if (await page.getByText("Link inválido ou expirado").count()) return lastPhase = "invalid-invite";
        if (await page.getByText("Não foi possível validar o convite").count()) return lastPhase = "auth-error";
        if (await page.getByText("Validando convite").count()) return lastPhase = "checking-session";
        if (await page.locator('form[data-interactive="false"]').count()) return lastPhase = "form-hydrating";
        return lastPhase = "not-rendered";
      }, { timeout: 15000, message: "J1 local activation boundary classification (no tokens)" })
        .toBe("ready");
    } catch {
      // Diagnostics contain only booleans about the disposable identity,
      // never user data, OTP/token values, cookie values or raw SQL errors.
      const account = rows(
        "select (email_confirmed_at is not null) as confirmed," +
        " (last_sign_in_at is not null) as signed" +
        " from auth.users where id=" + literal(invite.profileId),
      )[0];
      const callbackRejected = new URL(page.url()).searchParams.get("error") === "invalid";
      const sessionCookies = (await context.cookies())
        .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
      const authCookiePresent = sessionCookies.length > 0;
      const cookieFlags = [...new Set(sessionCookies.map((cookie) =>
        "secure=" + cookie.secure + ",httpOnly=" + cookie.httpOnly +
        ",sameSite=" + cookie.sameSite + ",path=" + cookie.path +
        ",domainIsLoopback=" + (cookie.domain === "127.0.0.1"),
      ))].join(";");
      const pageIsLoopback = new URL(page.url()).hostname === "127.0.0.1";
      const roleVisible = sql([
        "begin;",
        "set local role authenticated;",
        "set local request.jwt.claim.sub=" + literal(invite.profileId) + ";",
        "select count(*) from public.user_roles where profile_id=" +
          literal(invite.profileId) + " and role='client';",
        "rollback;",
      ].join("\n")) === "1";
      // Probe the server independently while preserving the original browser
      // failure. This does not retry activation or suppress the failed test.
      const browserFetch = await page.evaluate(async () => {
        const response = await fetch("/ativar-conta/session", {
          cache: "no-store", credentials: "same-origin",
        });
        const payload = response.ok ? await response.json().catch(() => null) : null;
        return {
          status: response.status,
          authorized: payload?.role === "client" || payload?.role === "admin",
        };
      });
      const probe = await page.request.get("/ativar-conta/session", {
        failOnStatusCode: false,
      });
      const probeResult = probe.ok() ? await probe.json().catch(() => null) : null;
      const probeAuthorized =
        probeResult?.role === "client" || probeResult?.role === "admin";
      // Check whether a fresh GET with the established cookie repairs a
      // stale server component render. Diagnostic only: original failure is
      // still a failure and cannot be hidden by an automatic retry.
      await page.goto("/ativar-conta");
      const freshFormVisible = await page.locator('form[data-interactive="true"]')
        .isVisible().catch(() => false);
      throw new Error(
        "J1 synthetic invite activation blocked: phase=" + lastPhase +
        ", callbackRejected=" + callbackRejected +
        ", confirmed=" + Boolean(account?.confirmed) +
        ", signed=" + Boolean(account?.signed) +
        ", authCookiePresent=" + authCookiePresent +
        ", roleVisibleUnderRls=" + roleVisible +
        ", freshGetFormVisible=" + freshFormVisible +
        ", sessionEndpointResponses=" + sessionResponses.join(";") +
        ", probeHttp=" + probe.status() +
        ", probeRoleAuthorized=" + probeAuthorized +
        ", browserProbeHttp=" + browserFetch.status +
        ", browserProbeRoleAuthorized=" + browserFetch.authorized +
        ", cookieFlags=" + cookieFlags +
        ", pageIsLoopback=" + pageIsLoopback,
      );
    }
    // The fresh session route derives the authorized role from cookies and
    // RLS, without trusting URL parameters or the stale Server Component.
    const verifiedSession = await page.request.get("/ativar-conta/session");
    expect(verifiedSession.ok()).toBe(true);
    expect(await verifiedSession.json()).toEqual({ role: "client" });
    expect(verifiedSession.headers()["cache-control"]).toContain("no-store");
    await page.getByLabel("Crie sua senha").fill(password);
    await page.getByLabel("Confirme sua senha").fill(password);
    await page.getByRole("button", { name: "Criar senha e continuar" }).click();
    await expect(page).toHaveURL(/\/cliente\/anamnese\/?$/, { timeout: 20000 });
  });

  await test.step("Cadastro Atual persists after mobile reload", async () => {
    await page.goto("/cliente/perfil");
    await page.getByLabel("Cidade").fill("Cidade Sintética Local J1");
    const save = page.getByRole("button", { name: "Salvar Cadastro Atual" });
    // React owns a controlled form. A click before its state has reflected
    // the edit is not evidence of a failed database write.
    await expect(save).toBeEnabled({ timeout: 10000 });
    await save.click();
    // The action revalidates the Server Component after a successful write,
    // so its transient success message can unmount before Playwright polls it.
    // Require durable evidence BOTH in PostgreSQL and in the settled client
    // form, then confirm persistence again after a real page reload.
    await expect.poll(() => {
      const result = rows("select city from public.client_registration where client_id=" +
        literal(invite.clientId));
      return result[0]?.city ?? null;
    }, { timeout: 20000 }).toBe("Cidade Sintética Local J1");
    const registrationForm = page.locator("form").filter({ has: save });
    await expect(registrationForm).toHaveAttribute("aria-busy", "false");
    await expect(page.getByText("Nenhuma mudança em relação aos dados salvos.")).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(page.getByLabel("Cidade")).toHaveValue("Cidade Sintética Local J1");
    await page.reload();
    await expect(page.getByLabel("Cidade")).toHaveValue("Cidade Sintética Local J1");
  });

  let draftId;
  await test.step("one hydrated click starts exactly one versioned Anamnese draft", async () => {
    await page.goto("/cliente/anamnese");
    await expect(page.getByRole("heading", { name: "Anamnese", exact: true })).toBeVisible();
    const form = page.locator('form[data-interactive="true"]')
      .filter({ has: page.getByRole("button", { name: "Começar Anamnese" }) });
    await expect(form).toBeVisible({ timeout: 15000 });
    await form.getByRole("button", { name: "Começar Anamnese" }).click();
    await expect(page).toHaveURL(/\/cliente\/anamnese\/[0-9a-f-]{36}\/?$/, {
      timeout: 20000,
    });
    draftId = page.url().split("/").at(-1);
    if (!UUID.test(draftId)) throw new Error("Draft route did not contain a UUID");
    const drafts = rows("select id,form_version_id,submitted_at from public.anamnesis_submissions" +
      " where client_id=" + literal(invite.clientId));
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toEqual({
      id: draftId, form_version_id: versionId, submitted_at: null,
    });
    await page.goto("/cliente/anamnese");
    await expect(page.getByRole("link", { name: "Continuar rascunho" }))
      .toHaveAttribute("href", "/cliente/anamnese/" + draftId);
  });

  await test.step("save and reopen a synthetic informational answer", async () => {
    await page.goto("/cliente/anamnese/" + draftId);
    const field = page.locator("#anamnesis-draft-answer-" + cityQuestionId);
    await expect(field).toBeVisible();
    await field.fill("Cidade Sintética Editada");
    await field.blur();
    await expect.poll(() => rows(
      "select answer_value from public.anamnesis_answers where submission_id=" +
      literal(draftId) + " and question_id=" + literal(cityQuestionId),
    ).map(item => item.answer_value), { timeout: 20000 }).toEqual(["Cidade Sintética Editada"]);
    await page.reload();
    await expect(page.locator("#anamnesis-draft-answer-" + cityQuestionId))
      .toHaveValue("Cidade Sintética Editada");
  });

  let clientPrivateFile;
  let foreignClientCredentials;
  await test.step("activated client uploads and retrieves only a private synthetic file", async () => {
    // Extend the disposable J1 session into the actual browser-to-Storage
    // upload/finalize path. Nothing is sent to the hosted Supabase.
    const filename = "j1-synthetic-private.png";
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
      "base64",
    );
    const initialFiles = rows("select id from public.client_files where client_id=" +
      literal(invite.clientId));
    expect(initialFiles).toHaveLength(0);
    const bucket = await service.storage.getBucket("client-private");
    if (bucket.error) throw bucket.error;
    expect(bucket.data.public, "Client file bucket must remain private").toBe(false);

    await page.goto("/cliente/arquivos");
    await expect(page.getByRole("heading", { name: "Meus arquivos", exact: true })).toBeVisible();
    await page.locator('input[name="file"]').setInputFiles({
      buffer: png, mimeType: "image/png", name: filename,
    });
    await page.getByRole("checkbox", {
      name: "Conferi o arquivo e a categoria antes de enviar.",
    }).check();
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    const savedFiles = () => rows(
      "select id,original_filename,file_kind,mime_type,byte_size,uploaded_by_profile_id," +
      "client_visible_at,object_path from public.client_files where client_id=" +
      literal(invite.clientId),
    );
    // Distinguish a real persistence delay from a failed action/Storage stage.
    // Report only fixed categories; never include file content or credentials.
    await expect.poll(async () => {
      if (savedFiles().length === 1) return "persisted";
      const errorStages = [
        ["session-authorization", "Não foi possível autorizar este arquivo para upload."],
        ["storage-transfer", "Não foi possível enviar o arquivo para a área temporária. Tente novamente."],
        ["finalization", "Não foi possível confirmar o registro. Confira o histórico antes de enviar novamente."],
        ["uncertain-finalization", "A confirmação do envio não foi concluída. Confira o histórico antes de tentar novamente."],
        ["request-failure", "O envio não foi concluído. Corrija a conexão ou tente novamente."],
        ["invalid-file", "O conteúdo real do arquivo não corresponde a um formato permitido."],
      ];
      for (const [stage, label] of errorStages) {
        if (await page.getByText(label, { exact: true }).count()) return stage;
      }
      return "pending";
    }, { timeout: 30000 }).toBe("persisted");
    const saved = savedFiles()[0];
    expect(saved.id).toMatch(UUID);
    expect(saved.original_filename).toBe(filename);
    expect(saved.file_kind).toBe("photo");
    expect(saved.mime_type).toBe("image/png");
    expect(Number(saved.byte_size)).toBe(png.length);
    expect(saved.uploaded_by_profile_id).toBe(invite.profileId);
    expect(saved.client_visible_at).not.toBeNull();
    expect(saved.object_path.startsWith("clients/" + invite.clientId + "/")).toBe(true);
    clientPrivateFile = { id: saved.id, filename, bytes: png };
    await page.reload();
    await expect(page.getByRole("heading", { name: filename, exact: true })).toBeVisible();

    const object = await service.storage.from("client-private").download(saved.object_path);
    if (object.error || !object.data) throw object.error ?? new Error("Local file bytes missing");
    expect(Buffer.from(await object.data.arrayBuffer())).toEqual(png);
    const fileRoute = "/cliente/arquivos/" + saved.id;
    const redirect = await page.request.get(fileRoute, { maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    expect(redirect.headers()["cache-control"]).toContain("no-store");
    // Check only that the signed URL stays on disposable Supabase. Do not
    // emit its credential or any response body into CI logs.
    expect(new URL(redirect.headers()["location"]).origin).toBe(apiURL);
    const downloaded = await page.request.get(fileRoute);
    expect(downloaded.status()).toBe(200);
    expect(await downloaded.body()).toEqual(png);

    // The actual mobile UI opens an inline preview in a separate tab.
    // Only the route issues the short-lived signed Storage URL; the UI
    // must not embed an unauthenticated object URL in its HTML.
    const previewRoute = fileRoute + "?preview=1";
    const previewLink = page.getByRole("link", { name: "Visualizar " + filename });
    await expect(previewLink).toHaveAttribute("href", previewRoute);
    await expect(previewLink).toHaveAttribute("target", "_blank");
    await expect(previewLink).toHaveAttribute("rel", /noopener.*noreferrer/);
    const previewRedirect = await page.request.get(previewRoute, { maxRedirects: 0 });
    expect(previewRedirect.status()).toBe(307);
    expect(previewRedirect.headers()["cache-control"]).toContain("no-store");
    expect(previewRedirect.headers()["referrer-policy"]).toBe("no-referrer");
    expect(previewRedirect.headers()["x-robots-tag"]).toBe("noindex");
    expect(new URL(previewRedirect.headers().location).origin).toBe(apiURL);
    const previewBytes = await page.request.get(previewRoute);
    expect(previewBytes.status()).toBe(200);
    expect(await previewBytes.body()).toEqual(png);
    const newTab = context.waitForEvent("page");
    await previewLink.tap();
    const previewTab = await newTab;
    try {
      // Compare origins only; never print the signed URL or token to CI.
      await expect.poll(() => {
        try { return new URL(previewTab.url()).origin === apiURL; }
        catch { return false; }
      }, { timeout: 15000 }).toBe(true);
    } finally {
      await previewTab.close();
    }

    // Unsupported file content is rejected before issuing an upload session.
    await page.locator('input[name="file"]').setInputFiles({
      buffer: Buffer.from("synthetic invalid document"),
      mimeType: "text/plain", name: "invalid.txt",
    });
    await expect(page.getByRole("button", { name: "Enviar arquivo" })).toBeDisabled();
    expect(savedFiles()).toHaveLength(1);
    const anonymous = await browser.newContext({ baseURL });
    try {
      const denied = await anonymous.request.get(fileRoute, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(denied.status());
      const loginLocation = new URL(denied.headers()["location"], baseURL);
      expect(loginLocation.origin).toBe(new URL(baseURL).origin);
      expect(loginLocation.pathname).toBe("/login");
    } finally {
      await anonymous.close();
    }
  });

  await test.step("private file remains accessible only with authorized sessions", async () => {
    if (!clientPrivateFile || !UUID.test(clientPrivateFile.id)) {
      throw new Error("Client upload proof missing");
    }
    const fileId = clientPrivateFile.id;
    const adminFileRoute = "/admin/arquivos/" + fileId;
    const clientFileRoute = "/cliente/arquivos/" + fileId;

    // The same admin without AAL2 must be redirected to the MFA challenge.
    const aal1Context = await browser.newContext({ baseURL });
    try {
      const aal1Page = await aal1Context.newPage();
      await aal1Page.goto("/login");
      await aal1Page.getByLabel("Email").fill(staff.email);
      await aal1Page.getByLabel("Senha").fill(staff.password);
      await aal1Page.getByRole("button", { name: "Entrar" }).click();
      await expect(aal1Page).toHaveURL(/\/mfa\/admin\/challenge\/?$/);
      const refused = await aal1Page.request.get(adminFileRoute, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(refused.status());
      expect(new URL(refused.headers()["location"], baseURL).pathname).toBe(
        "/mfa/admin/challenge",
      );
    } finally {
      await aal1Context.close();
    }

    const adminContext = await browser.newContext({
      baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    try {
      const adminPage = await adminContext.newPage();
      await loginAdminWithMfa(adminPage, {
        email: staff.email, password: staff.password, totpSecret: staffTotp,
      });
      await adminPage.goto("/admin/clientes/" + invite.clientId +
        "/arquivos?arquivoHistorico=" + fileId);
      await expect(adminPage.locator("#arquivo-historico-" + fileId)).toBeVisible();
      await expect(adminPage.getByRole("heading", {
        name: clientPrivateFile.filename, exact: true,
      })).toBeVisible();
      const signed = await adminPage.request.get(adminFileRoute, { maxRedirects: 0 });
      expect(signed.status()).toBe(307);
      expect(signed.headers()["cache-control"]).toContain("no-store");
      expect(new URL(signed.headers()["location"]).origin).toBe(apiURL);
      const retrieved = await adminPage.request.get(adminFileRoute);
      expect(retrieved.status()).toBe(200);
      expect(await retrieved.body()).toEqual(clientPrivateFile.bytes);
      const previewLink = adminPage.getByRole("link", {
        name: "Visualizar " + clientPrivateFile.filename,
      });
      await expect(previewLink).toBeVisible();
      await expect(previewLink).toHaveAttribute("target", "_blank");
      const adminPreviewHref = await previewLink.getAttribute("href");
      expect(new URL(adminPreviewHref, baseURL).pathname).toBe(adminFileRoute);
      expect(new URL(adminPreviewHref, baseURL).searchParams.get("preview")).toBe("1");
      const adminPreview = await adminPage.request.get(adminFileRoute + "?preview=1", {
        maxRedirects: 0,
      });
      expect(adminPreview.status()).toBe(307);
      expect(adminPreview.headers()["cache-control"]).toContain("no-store");
      expect(adminPreview.headers()["referrer-policy"]).toBe("no-referrer");
      expect(new URL(adminPreview.headers().location).origin).toBe(apiURL);
      const inlineBytes = await adminPage.request.get(adminFileRoute + "?preview=1");
      expect(inlineBytes.status()).toBe(200);
      expect(await inlineBytes.body()).toEqual(clientPrivateFile.bytes);
      const original = rows(
        "select uploaded_by_profile_id,client_visible_at,client_visibility_set_by_profile_id " +
        "from public.client_files where id=" + literal(fileId),
      );
      expect(original).toHaveLength(1);
      expect(original[0].uploaded_by_profile_id).toBe(invite.profileId);
      expect(original[0].client_visibility_set_by_profile_id).toBe(invite.profileId);
      expect(original[0].client_visible_at).not.toBeNull();
    } finally {
      await adminContext.close();
    }

    // A different authenticated client may not list or download those bytes.
    const foreignEmail = "e2e-j1-foreign-" + nonce + "@example.invalid";
    const foreignPassword = "J1-" + randomBytes(16).toString("base64url") + "-Aa1!";
    foreignClientCredentials = { email: foreignEmail, password: foreignPassword };
    const created = await service.auth.admin.createUser({
      email: foreignEmail, password: foreignPassword, email_confirm: true,
    });
    if (created.error || !created.data?.user?.id)
      throw created.error ?? new Error("Synthetic foreign client Auth failed");
    const foreignId = created.data.user.id;
    insert("profiles", { id: foreignId, display_name: "J1 foreign synthetic client" });
    insert("user_roles", { profile_id: foreignId, role: "client" });
    insert("clients", {
      profile_id: foreignId, full_name: "J1 foreign synthetic client", status: "active",
    });
    const foreignContext = await browser.newContext({ baseURL });
    try {
      const foreignPage = await foreignContext.newPage();
      await foreignPage.goto("/login");
      await foreignPage.getByLabel("Email").fill(foreignEmail);
      await foreignPage.getByLabel("Senha").fill(foreignPassword);
      await foreignPage.getByRole("button", { name: "Entrar" }).click();
      await expect(foreignPage).toHaveURL(/\/cliente\/?$/);
      await foreignPage.goto("/cliente/arquivos");
      await expect(foreignPage.getByRole("heading", {
        name: clientPrivateFile.filename, exact: true,
      })).toHaveCount(0);
      const denied = await foreignPage.request.get(clientFileRoute, { maxRedirects: 0 });
      expect(denied.status()).toBe(404);
      const previewDenied = await foreignPage.request.get(clientFileRoute + "?preview=1", {
        maxRedirects: 0,
      });
      expect(previewDenied.status()).toBe(404);
      expect(rows("select id from public.client_files where client_id=" +
        literal(invite.clientId))).toHaveLength(1);
    } finally {
      await foreignContext.close();
    }
  });

  let releasedAdminFileId;
  await test.step("admin uploads hidden private file then explicitly releases exact bytes", async () => {
    if (!clientPrivateFile || !foreignClientCredentials) {
      throw new Error("Previous synthetic client and isolation proofs missing");
    }
    const filename = "j1-admin-pending-synthetic.png";
    const png = clientPrivateFile.bytes;
    const adminPath = "/admin/clientes/" + invite.clientId + "/arquivos";
    const savedFiles = () => rows(
      "select id,bucket_id,object_path,original_filename,file_kind,mime_type,byte_size," +
      "uploaded_by_profile_id,client_visible_at,client_visibility_set_by_profile_id" +
      " from public.client_files where client_id=" + literal(invite.clientId) +
      " and original_filename=" + literal(filename),
    );
    const initialTotal = rows(
      "select id from public.client_files where client_id=" + literal(invite.clientId),
    ).length;
    expect(savedFiles()).toEqual([]);
    const adminContext = await browser.newContext({
      baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    const foreignContext = await browser.newContext({ baseURL });
    try {
      const adminPage = await adminContext.newPage();
      await loginAdminWithMfa(adminPage, {
        email: staff.email, password: staff.password, totpSecret: staffTotp,
      });
      await adminPage.goto(adminPath);
      await expect(adminPage.getByRole("heading", {
        name: "Enviar arquivo em nome da cliente",
      })).toBeVisible();

      // Upload through the real professional form and browser-to-signed-Storage
      // path. Never seed private-file metadata directly for this proof.
      await adminPage.locator('input[name="file"]').setInputFiles({
        buffer: png, name: filename, mimeType: "image/png",
      });
      await adminPage.getByRole("checkbox", {
        name: "Conferi o arquivo e a categoria antes de enviar.",
      }).check();
      await adminPage.getByRole("button", { name: "Enviar arquivo" }).click();
      await expect.poll(() => savedFiles().length, { timeout: 30000 }).toBe(1);
      const hidden = savedFiles()[0];
      expect(hidden.id).toMatch(UUID);
      expect(hidden.bucket_id).toBe("client-private");
      expect(hidden.original_filename).toBe(filename);
      expect(hidden.file_kind).toBe("photo");
      expect(hidden.mime_type).toBe("image/png");
      expect(Number(hidden.byte_size)).toBe(png.length);
      expect(hidden.uploaded_by_profile_id).toBe(staffId);
      expect(hidden.client_visible_at).toBeNull();
      expect(hidden.client_visibility_set_by_profile_id).toBeNull();
      expect(hidden.object_path.startsWith("clients/" + invite.clientId + "/")).toBe(true);
      const recordedSession = rows(
        "select id,status from public.client_file_upload_sessions where client_id=" +
        literal(invite.clientId) + " and requester_profile_id=" + literal(staffId) +
        " and original_filename=" + literal(filename),
      );
      expect(recordedSession).toHaveLength(1);
      expect(recordedSession[0].status).toBe("accepted");
      expect(rows("select id from public.client_files where client_id=" +
        literal(invite.clientId))).toHaveLength(initialTotal + 1);

      const stored = await service.storage.from("client-private").download(hidden.object_path);
      if (stored.error || !stored.data) throw stored.error ?? new Error("Missing local admin file");
      expect(Buffer.from(await stored.data.arrayBuffer())).toEqual(png);

      // No release yet: even the owning client's authenticated session must
      // neither list the administrative upload nor obtain a signed URL.
      const ownerRoute = "/cliente/arquivos/" + hidden.id;
      await page.goto("/cliente/arquivos");
      await expect(page.getByRole("heading", { name: filename, exact: true })).toHaveCount(0);
      expect((await page.request.get(ownerRoute, { maxRedirects: 0 })).status()).toBe(404);
      expect((await page.request.get(ownerRoute + "?preview=1", {
        maxRedirects: 0,
      })).status()).toBe(404);

      await adminPage.goto(adminPath + "?arquivoPendente=" + hidden.id);
      const pendingCard = adminPage.locator("#arquivo-pendente-" + hidden.id);
      await expect(pendingCard).toBeVisible();
      await expect(pendingCard.getByRole("heading", { name: filename, exact: true }))
        .toBeVisible();
      const privateAdminRoute = "/admin/arquivos/" + hidden.id;
      const adminDownload = await adminPage.request.get(privateAdminRoute);
      expect(adminDownload.status()).toBe(200);
      expect(await adminDownload.body()).toEqual(png);

      // Explicit human confirmation is mandatory. The action cannot publish
      // simply because metadata exists or an admin viewed the file.
      await pendingCard.getByRole("checkbox", {
        name: /Confirmo que o arquivo/,
      }).check();
      const approvalButton = pendingCard.getByRole("button", {
        name: "Liberar para cliente",
      });
      await approvalButton.scrollIntoViewIfNeeded();
      // Fail fast on an obstructed mobile button. Only geometry and DOM tag
      // names are logged; no private content, browser state, IDs or cookies.
      const readSafeGeometry = () => approvalButton.evaluate((button) => {
        const rect = (element) => {
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return {
            x: Math.round(box.x), y: Math.round(box.y),
            w: Math.round(box.width), h: Math.round(box.height),
          };
        };
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2, box.top + box.height / 2,
        );
        const form = button.closest("form");
        const label = form?.querySelector("label");
        const card = button.closest("li");
        return {
          viewport: { width: innerWidth, height: innerHeight },
          mobileLayout: matchMedia("(max-width: 640px)").matches,
          button: rect(button), label: rect(label), form: rect(form),
          actions: rect(form?.parentElement), card: rect(card),
          hitTag: hit?.tagName ?? null,
          hitInLabel: Boolean(label?.contains(hit)),
          hitInButton: button === hit || button.contains(hit),
          actionsDisplay: form?.parentElement
            ? getComputedStyle(form.parentElement).display : null,
          buttonZ: getComputedStyle(button).zIndex,
        };
      });
      const geometry = await readSafeGeometry();
      if (!geometry.hitInButton) {
        console.info("J1 safe approval layout diagnostic:", JSON.stringify(geometry));
      }
      expect(geometry.hitInButton, "Mobile approval button must accept a pointer")
        .toBe(true);
      // Use the actual, browser-hit-tested center instead of Playwright's
      // automatically chosen visible point. Still a normal physical click,
      // with no force, DOM submission or bypass of button actionability.
      try {
        // Playwright boundingBox is in the emulated SCREEN coordinate system;
        // DOM getBoundingClientRect / elementFromPoint operate in layout
        // coordinates. Mobile viewport scaling can make the numbers differ.
        // Never send screen coordinates back into document.elementFromPoint.
        const buttonBox = await approvalButton.boundingBox();
        const viewport = adminPage.viewportSize();
        if (!buttonBox || !viewport)
          throw new Error("Approval button or browser viewport unavailable");
        const clickX = buttonBox.x + buttonBox.width / 2;
        const clickY = buttonBox.y + buttonBox.height / 2;
        expect(clickX > 0 && clickX < viewport.width &&
          clickY > 0 && clickY < viewport.height,
          "Approval button must be inside the visible mobile viewport").toBe(true);
        // The layout-space hit test was already asserted above. The input is
        // a real browser mouse event at the screen-space center, not a DOM
        // submit, injected event, or forced interaction. Persisted state is
        // checked immediately afterward.
        await adminPage.mouse.click(clickX, clickY);
      } catch (error) {
        const after = await readSafeGeometry().catch(() => null);
        console.info("J1 safe approval geometry after physical click:",
          JSON.stringify({ before: geometry, after }));
        throw error;
      }
      await expect.poll(() => savedFiles()[0]?.client_visible_at !== null, {
        timeout: 20000,
      }).toBe(true);
      const released = savedFiles()[0];
      expect(released.id).toBe(hidden.id);
      expect(released.uploaded_by_profile_id).toBe(staffId);
      expect(released.client_visibility_set_by_profile_id).toBe(staffId);
      expect(released.client_visible_at).not.toBeNull();
      releasedAdminFileId = released.id;
      await adminPage.reload();
      await expect(adminPage.locator("#arquivo-pendente-" + hidden.id)).toHaveCount(0);
      await expect(adminPage.locator("#arquivo-historico-" + hidden.id)).toBeVisible();

      await page.reload();
      await expect(page.getByRole("heading", { name: filename, exact: true })).toBeVisible();
      const signed = await page.request.get(ownerRoute, { maxRedirects: 0 });
      expect(signed.status()).toBe(307);
      expect(signed.headers()["cache-control"]).toContain("no-store");
      expect(new URL(signed.headers()["location"]).origin).toBe(apiURL);
      const ownerDownload = await page.request.get(ownerRoute);
      expect(ownerDownload.status()).toBe(200);
      expect(await ownerDownload.body()).toEqual(png);
      const ownerPreview = await page.request.get(ownerRoute + "?preview=1", {
        maxRedirects: 0,
      });
      expect(ownerPreview.status()).toBe(307);
      expect(new URL(ownerPreview.headers().location).origin).toBe(apiURL);
      const previewBytes = await page.request.get(ownerRoute + "?preview=1");
      expect(previewBytes.status()).toBe(200);
      expect(await previewBytes.body()).toEqual(png);

      const foreignPage = await foreignContext.newPage();
      await foreignPage.goto("/login");
      await foreignPage.getByLabel("Email").fill(foreignClientCredentials.email);
      await foreignPage.getByLabel("Senha").fill(foreignClientCredentials.password);
      await foreignPage.getByRole("button", { name: "Entrar" }).click();
      await expect(foreignPage).toHaveURL(/\/cliente\/?$/);
      await foreignPage.goto("/cliente/arquivos");
      await expect(foreignPage.getByRole("heading", { name: filename, exact: true }))
        .toHaveCount(0);
      expect((await foreignPage.request.get(ownerRoute, { maxRedirects: 0 })).status())
        .toBe(404);
      expect((await foreignPage.request.get(ownerRoute + "?preview=1", {
        maxRedirects: 0,
      })).status()).toBe(404);
      // An upload+release cycle creates one physical record, not duplicates.
      expect(savedFiles()).toHaveLength(1);
      expect(rows("select id from public.client_files where client_id=" +
        literal(invite.clientId))).toHaveLength(initialTotal + 1);
    } finally {
      await Promise.allSettled([adminContext.close(), foreignContext.close()]);
    }
  });

  await test.step("sole MVP admin retains private files after assignment ends, only with AAL2", async () => {
    if (!clientPrivateFile || !UUID.test(releasedAdminFileId)) {
      throw new Error("J1 local private-file prerequisites missing");
    }
    // Confirm the documented MVP invariant: there is exactly ONE admin.
    // A second admin is not an eligible production test identity: current
    // private-file RLS intentionally grants all admin roles an exception from
    // active assignment, as documented in RBAC_RLS.md / DECISIONS.md.
    expect(rows("select profile_id from public.user_roles where role='admin'"))
      .toEqual([{ profile_id: staffId }]);
    const assignments = rows("select id from public.client_assignments where client_id=" +
      literal(invite.clientId) + " and staff_profile_id=" + literal(staffId) +
      " and ended_at is null");
    expect(assignments).toHaveLength(1);
    const statusBefore = rows("select status from public.clients where id=" +
      literal(invite.clientId));
    expect(statusBefore).toEqual([{ status: "active" }]);

    const adminContext = await browser.newContext({
      baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    try {
      const adminPage = await adminContext.newPage();
      await loginAdminWithMfa(adminPage, {
        email: staff.email, password: staff.password,
        totpSecret: staffTotp,
      });

      // End the relationship through the SAME professional AAL2 UI used in
      // production. A direct SQL UPDATE would miss the lifecycle boundary that
      // also changes clients.status while preserving Auth and file history.
      await adminPage.goto("/admin/clientes/" + invite.clientId);
      await expect(adminPage.getByRole("heading", {
        name: "Encerrar acompanhamento",
      })).toBeVisible();
      await adminPage.getByRole("checkbox", {
        name: /Confirmo que quero encerrar o acompanhamento atual/,
      }).check();
      await adminPage.getByRole("button", {
        name: "Encerrar e marcar como inativa",
      }).click();
      await expect(adminPage).toHaveURL(/\/admin\/clientes\?assignment=ended$/, {
        timeout: 30000,
      });
      await expect(adminPage.getByRole("status").filter({
        hasText: "Acompanhamento encerrado",
      })).toHaveCount(1);
      await expect.poll(() => {
        const rowsAfter = rows(
          "select id,ended_at from public.client_assignments where id=" +
          literal(assignments[0].id),
        );
        return rowsAfter.length === 1 && rowsAfter[0].ended_at !== null;
      }, { timeout: 25000 }).toBe(true);
      expect(rows("select id from public.client_assignments where client_id=" +
        literal(invite.clientId) + " and ended_at is null")).toHaveLength(0);
      expect(rows("select status from public.clients where id=" +
        literal(invite.clientId))).toEqual([{ status: "inactive" }]);

      await adminPage.goto("/admin/clientes/" + invite.clientId + "/arquivos");
      // The actual Patty exception preserves read access even when the
      // appointment ends. This does NOT authorize any additional admins.
      await expect(adminPage.getByRole("heading", {
        name: clientPrivateFile.filename, exact: true,
      })).toHaveCount(1);
      for (const fileId of [clientPrivateFile.id, releasedAdminFileId]) {
        for (const suffix of ["", "?preview=1"]) {
          const permitted = await adminPage.request.get(
            "/admin/arquivos/" + fileId + suffix, { maxRedirects: 0 },
          );
          expect(permitted.status(), "Patty AAL2 retains private-file access").toBe(307);
          expect(permitted.headers()["cache-control"]).toContain("no-store");
          expect(new URL(permitted.headers().location).origin).toBe(apiURL);
        }
      }
    } finally {
      await adminContext.close();
    }

    // Ending a professional assignment must not revoke the client's own
    // released-file history or make those files visible to another client.
    // The earlier J1 checks ran before the assignment ended; verify this
    // second boundary under real authenticated browser sessions as well.
    const releasedFiles = [
      { id: clientPrivateFile.id, filename: clientPrivateFile.filename },
      { id: releasedAdminFileId, filename: "j1-admin-pending-synthetic.png" },
    ];
    await page.goto("/cliente/arquivos");
    for (const file of releasedFiles) {
      await expect(page.getByRole("heading", { name: file.filename, exact: true }))
        .toBeVisible();
      for (const suffix of ["", "?preview=1"]) {
        const response = await page.request.get("/cliente/arquivos/" + file.id + suffix, {
          maxRedirects: 0,
        });
        expect(response.status(), "Client retains released file after assignment ends")
          .toBe(307);
        expect(response.headers()["cache-control"]).toContain("no-store");
        // Verify origin only: a signed URL or token must never reach CI logs.
        expect(new URL(response.headers().location).origin).toBe(apiURL);
      }
    }
    const foreignAfterEnd = await browser.newContext({ baseURL });
    try {
      const foreignPage = await foreignAfterEnd.newPage();
      await foreignPage.goto("/login");
      await foreignPage.getByLabel("Email").fill(foreignClientCredentials.email);
      await foreignPage.getByLabel("Senha").fill(foreignClientCredentials.password);
      await foreignPage.getByRole("button", { name: "Entrar" }).click();
      await expect(foreignPage).toHaveURL(/\/cliente\/?$/);
      await foreignPage.goto("/cliente/arquivos");
      for (const file of releasedFiles) {
        await expect(foreignPage.getByRole("heading", {
          name: file.filename, exact: true,
        })).toHaveCount(0);
        for (const suffix of ["", "?preview=1"]) {
          const response = await foreignPage.request.get(
            "/cliente/arquivos/" + file.id + suffix, { maxRedirects: 0 },
          );
          expect(response.status(), "Other client stays denied after assignment ends")
            .toBe(404);
        }
      }
    } finally {
      await foreignAfterEnd.close();
    }

    // The global admin-file exception still requires strong MFA; role alone
    // with AAL1 must not reveal rows through the browser-facing Data API.
    const aal1Claims = JSON.stringify({
      sub: staffId, role: "authenticated", aal: "aal1",
    });
    const aal1Count = sql([
      "begin;",
      "set local role authenticated;",
      "set local request.jwt.claims=" + literal(aal1Claims) + ";",
      "set local request.jwt.claim.sub=" + literal(staffId) + ";",
      "select count(*) from public.client_files where id in (" +
        literal(clientPrivateFile.id) + "," + literal(releasedAdminFileId) + ");",
      "rollback;",
    ].join("\n"));
    expect(Number(aal1Count)).toBe(0);
    expect(rows("select id from public.client_files where client_id=" +
      literal(invite.clientId))).toHaveLength(2);
  });

  await test.step("no anonymous or unrelated-client access to the draft", async () => {
    const other = await browser.newContext({ baseURL });
    const visitor = await other.newPage();
    await visitor.goto("/cliente/anamnese/" + draftId);
    await expect(visitor).toHaveURL(/\/login\/?(?:[?].*)?$/);
    await other.close();
    const claims = JSON.stringify({
      sub: staffId, role: "authenticated", aal: "aal1",
    });
    const denied = sql([
      "begin;",
      "set local role authenticated;",
      "set local request.jwt.claims=" + literal(claims) + ";",
      "set local request.jwt.claim.sub=" + literal(staffId) + ";",
      "select count(*) from public.anamnesis_submissions where id=" + literal(draftId) + ";",
      "rollback;",
    ].join("\n"));
    expect(Number(denied)).toBe(0);
  });

  const mobile = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobile.scroll).toBeLessThanOrEqual(mobile.viewport + 1);
  await context.close();
});
