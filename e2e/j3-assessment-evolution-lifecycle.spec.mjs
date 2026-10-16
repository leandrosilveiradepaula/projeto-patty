import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { generateTotp, loginAdminWithMfa } from "./helpers/admin-auth.mjs";

// CI-only disposable PostgreSQL, Supabase and Next.js. No preview or SaaS
// credentials, no patient data and no outside hosts can pass this guard.
const baseURL = process.env.J3_E2E_BASE_URL;
const supabaseURL = process.env.J3_E2E_SUPABASE_URL;
const anonKey = process.env.J3_E2E_ANON_KEY;
const secret = process.env.J3_E2E_SERVICE_ROLE_KEY;
if (process.env.J3_E2E_LOCAL_ONLY !== "true" ||
    baseURL !== "http://127.0.0.1:3000" ||
    supabaseURL !== "http://127.0.0.1:54321" ||
    !anonKey || !secret) {
  throw new Error("J3 browser journey is limited to isolated local services");
}

const service = createClient(supabaseURL, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const signed = () => createClient(supabaseURL, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tables = new Set([
  "profiles", "user_roles", "clients", "client_assignments",
  "client_assessments", "assessment_measurements", "client_files",
  "assessment_measurement_corrections",
]);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
  "base64",
);

function literal(value) {
  if (typeof value !== "string" && typeof value !== "number" && value !== null)
    throw new TypeError("Unsupported synthetic fixture field");
  return value === null ? "NULL" : "'" + String(value).replaceAll("'", "''") + "'";
}
function sql(statement) {
  if (process.env.J3_E2E_LOCAL_ONLY !== "true" ||
      supabaseURL !== "http://127.0.0.1:54321")
    throw new Error("Local-only database guard failed");
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_projeto-patty", "psql", "-X", "-q",
    "-U", "postgres", "-d", "postgres", "-A", "-t", "-v", "ON_ERROR_STOP=1",
  ], { input: statement.trimEnd() + "\n", encoding: "utf8", timeout: 12000 }).trim();
}
function insert(table, fields) {
  if (!tables.has(table)) throw new Error("Disallowed fixture table");
  const columns = Object.keys(fields);
  if (!columns.every(key => /^[a-z_]+$/.test(key)))
    throw new Error("Invalid fixture column");
  const idColumn = table === "user_roles" ? "profile_id" : "id";
  const id = sql("insert into public." + table + " (" + columns.join(",") +
    ") values (" + Object.values(fields).map(literal).join(",") +
    ") returning " + idColumn + ";");
  if (!UUID.test(id)) throw new Error("Synthetic record did not return UUID");
  return id;
}
function select(statement) {
  return JSON.parse(sql("select coalesce(json_agg(row_to_json(t)),'[]'::json)::text " +
    "from (" + statement + ") t;"));
}
async function identity(role, label, nonce) {
  const email = "e2e-j3-" + label + "-" + nonce + "@example.invalid";
  if (!/^e2e-j3-(staff|unassigned|client|foreign)-[0-9a-f]{16}@example\.invalid$/.test(email))
    throw new Error("Only synthetic identities are permitted");
  const password = "E2E-J3-" + randomBytes(18).toString("base64url") + "-Aa1!";
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (created.error || !created.data?.user?.id)
    throw created.error ?? new Error("Synthetic Auth identity unavailable");
  const id = created.data.user.id;
  insert("profiles", { id, display_name: "Synthetic J3 " + label });
  insert("user_roles", { profile_id: id, role });
  return { id, email, password };
}
async function enrollTotp(user) {
  const api = signed();
  const login = await api.auth.signInWithPassword({
    email: user.email, password: user.password,
  });
  if (login.error) throw login.error;
  try {
    const factor = await api.auth.mfa.enroll({
      factorType: "totp", friendlyName: "Local synthetic J3 account",
    });
    if (factor.error) throw factor.error;
    const challenge = await api.auth.mfa.challenge({ factorId: factor.data.id });
    if (challenge.error) throw challenge.error;
    const verify = await api.auth.mfa.verify({
      factorId: factor.data.id,
      challengeId: challenge.data.id,
      code: generateTotp(factor.data.totp.secret),
    });
    if (verify.error) throw verify.error;
    return factor.data.totp.secret;
  } finally {
    await api.auth.signOut();
  }
}
function createDraft(clientId, creator, date) {
  return insert("client_assessments", {
    client_id: clientId, assessed_at: date,
    assessment_kind: "monthly", created_by_profile_id: creator,
  });
}
function finalize(assessmentId, actor) {
  if (!UUID.test(assessmentId) || !UUID.test(actor))
    throw new Error("Invalid synthetic assessment finalization");
  sql("update public.client_assessments set finalized_at = now()," +
    " finalized_by_profile_id = " + literal(actor) +
    " where id = " + literal(assessmentId) + " and finalized_at is null;");
  if (select("select id from public.client_assessments where id = " +
      literal(assessmentId) + " and finalized_at is not null").length !== 1)
    throw new Error("Synthetic assessment not finalized");
}
async function addPhoto(assessmentId, clientId, label) {
  const id = randomUUID();
  const path = "clients/" + clientId + "/photo/" + id + ".png";
  const uploaded = await service.storage.from("client-private")
    .upload(path, png, { contentType: "image/png", upsert: false });
  if (uploaded.error) throw uploaded.error;
  insert("client_files", {
    id, client_id: clientId, file_kind: "photo", bucket_id: "client-private",
    object_path: path, original_filename: "j3-" + label + ".png",
    mime_type: "image/png", byte_size: png.length,
  });
  sql("insert into public.assessment_files(assessment_id,client_id,client_file_id)" +
    " values (" + literal(assessmentId) + "," + literal(clientId) + "," +
    literal(id) + ");");
  return id;
}
async function mobileWidth(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll, "J3 content must fit the 390px mobile viewport")
    .toBeLessThanOrEqual(dimensions.viewport + 1);
}

test.use({ baseURL });
test("J3: MFA, corrected measurements, two private photos, return and RLS", async ({browser}) => {
  test.setTimeout(270_000);
  const nonce = randomBytes(8).toString("hex");
  const admin = await identity("admin", "staff", nonce);
  const unassigned = await identity("admin", "unassigned", nonce);
  const owner = await identity("client", "client", nonce);
  const foreign = await identity("client", "foreign", nonce);
  const clientId = insert("clients", {
    profile_id: owner.id, full_name: "Cliente sintética J3", status: "active",
  });
  const foreignClientId = insert("clients", {
    profile_id: foreign.id, full_name: "Outra cliente sintética J3", status: "active",
  });
  insert("client_assignments", { client_id: clientId, staff_profile_id: admin.id });
  const olderId = createDraft(clientId, admin.id, "2026-09-10T12:00:00Z");
  const newerId = createDraft(clientId, admin.id, "2026-10-10T12:00:00Z");
  const draftId = createDraft(clientId, admin.id, "2026-10-11T12:00:00Z");
  const foreignId = createDraft(foreignClientId, unassigned.id, "2026-10-05T12:00:00Z");
  const oldWeightId = insert("assessment_measurements", {
    assessment_id: olderId, measurement_key: "peso",
    measurement_value: 70, unit: "kg",
  });
  insert("assessment_measurements", {
    assessment_id: olderId, measurement_key: "cintura",
    measurement_value: 82, unit: "cm",
  });
  insert("assessment_measurements", {
    assessment_id: newerId, measurement_key: "peso",
    measurement_value: 69, unit: "kg",
  });
  insert("assessment_measurements", {
    assessment_id: newerId, measurement_key: "cintura",
    measurement_value: 80, unit: "cm",
  });
  insert("assessment_measurements", {
    assessment_id: newerId, measurement_key: "quadril",
    measurement_value: 100, unit: "cm",
  });
  const photoA = await addPhoto(olderId, clientId, "reference");
  const photoB = await addPhoto(newerId, clientId, "comparison");
  const photoForeign = await addPhoto(foreignId, foreignClientId, "foreign");
  finalize(olderId, admin.id);
  finalize(newerId, admin.id);
  finalize(foreignId, unassigned.id);
  // Existing append-only correction mechanism, synthetic local fixture.
  insert("assessment_measurement_corrections", {
    assessment_measurement_id: oldWeightId,
    corrected_measurement_value: 71, corrected_unit: "kg",
    corrected_by_profile_id: admin.id, note: "Correção sintética J3",
  });
  const originalRows = select("select measurement_value from public.assessment_measurements" +
    " where id = " + literal(oldWeightId));
  expect(Number(originalRows[0].measurement_value)).toBe(70);
  const bucket = await service.storage.getBucket("client-private");
  if (bucket.error) throw bucket.error;
  expect(bucket.data?.public, "Private photos must not be publicly exposed").toBe(false);
  const adminTotp = await enrollTotp(admin);
  const otherTotp = await enrollTotp(unassigned);

  const professional = await browser.newContext({
    baseURL, viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true,
  });
  const denied = await browser.newContext({
    baseURL, viewport: {width: 1280, height: 800},
  });
  const anonymous = await browser.newContext({baseURL});
  const otherClient = signed();
  try {
    const page = await professional.newPage();
    await loginAdminWithMfa(page, {
      email: admin.email, password: admin.password, totpSecret: adminTotp,
    });
    await test.step("Evolution opens exact authorized assessment and returns to filter", async () => {
      await page.goto("/admin/clientes/" + clientId + "/evolucao");
      await expect(page.getByRole("heading", {name: "Evolução", exact: true})).toBeVisible();
      await page.locator('select[name="serie"]').selectOption({label:"Peso (kg)"});
      const seriesNumber = await page.locator('select[name="serie"]').inputValue();
      await page.locator('select[name="janela"]').selectOption("3");
      await page.getByRole("button", {name:"Aplicar filtros"}).click();
      await expect(page.locator('select[name="serie"]')).toHaveValue(seriesNumber);
      await expect(page.locator('select[name="janela"]')).toHaveValue("3");
      const measured = page.locator("#medida-" + (Number(seriesNumber)-1));
      await expect(measured.getByRole("link", {name:/Abrir avaliação de/})).toHaveCount(2);
      await measured.getByRole("link", {name:/Abrir avaliação de/}).last().click();
      await expect(page).toHaveURL(new RegExp("/admin/avaliacoes/" + newerId));
      await expect(page.getByRole("link", {name:"Voltar à medida filtrada: Peso"})).toBeVisible();
      await page.getByRole("link", {name:"Voltar à medida filtrada: Peso"}).click();
      await expect(page).toHaveURL(new RegExp("serie=" + seriesNumber + "&janela=3#medida-" + (Number(seriesNumber)-1) + "$"));
      await mobileWidth(page);
    });

    const pairRoute = "/admin/clientes/" + clientId + "/avaliacoes/comparar";
    await test.step("Manual pair selection displays effective corrections, no clinical inference", async () => {
      await page.goto(pairRoute);
      await expect(page.getByRole("heading", {name:"Comparar duas avaliações"})).toBeVisible();
      await expect(page.locator('select[name="referencia"] option[value="' + draftId + '"]')).toHaveCount(0);
      await expect(page.locator('select[name="referencia"] option[value="' + foreignId + '"]')).toHaveCount(0);
      await page.locator('select[name="referencia"]').selectOption(olderId);
      await page.locator('select[name="comparacao"]').selectOption(newerId);
      await page.getByRole("button",{name:"Comparar avaliações"}).click();
      await expect(page.locator("#comparacao-resultados")).toBeVisible();
      const weight = page.getByRole("row",{name:/Peso \(kg\)/});
      await expect(weight.getByRole("cell",{name:"71 kg"})).toBeVisible();
      await expect(weight.getByRole("cell",{name:"69 kg"})).toBeVisible();
      await expect(weight.getByRole("cell",{name:"-2 kg"})).toBeVisible();
      const hip = page.getByRole("row",{name:/Quadril \(cm\)/});
      await expect(hip.getByRole("cell",{name:"Não comparável"})).toBeVisible();
      await expect(page.locator('img[src^="/admin/fotos/"]')).toHaveCount(0);
      await mobileWidth(page);
    });

    await test.step("Private photo selection, actual image delivery and original assessment roundtrip",async()=>{
      await page.locator('select[name="fotoReferencia"]').selectOption(photoA);
      await page.locator('select[name="fotoComparacao"]').selectOption(photoB);
      await page.getByRole("button",{name:"Comparar fotos escolhidas"}).click();
      await expect(page.locator('img[src^="/admin/fotos/"]')).toHaveCount(2);
      await expect.poll(()=>page.locator('img[src^="/admin/fotos/"]').evaluateAll(
        nodes=>nodes.map(image=>image.complete && image.naturalWidth>0),
      ),{timeout:30000}).toEqual([true,true]);
      const params = new URL(page.url()).searchParams;
      expect([...params.keys()].sort()).toEqual(["comparacao","fotoComparacao","fotoReferencia","referencia"]);
      expect(params.get("fotoReferencia")).toBe(photoA);
      expect(params.get("fotoComparacao")).toBe(photoB);
      await mobileWidth(page);
      await page.getByRole("link",{name:"Abrir avaliação de comparação"}).click();
      await expect(page).toHaveURL(new RegExp("/admin/avaliacoes/" + newerId));
      await expect(page.getByRole("link",{name:"Voltar à comparação de avaliações e fotos"})).toBeVisible();
      await page.getByRole("link",{name:"Voltar à comparação de avaliações e fotos"}).click();
      await expect(page.locator('img[src^="/admin/fotos/"]')).toHaveCount(2);
      const returned = new URL(page.url());
      expect(returned.searchParams.get("fotoReferencia")).toBe(photoA);
      expect(returned.searchParams.get("fotoComparacao")).toBe(photoB);
      await expect.poll(()=>page.locator('img[src^="/admin/fotos/"]').evaluateAll(
        nodes=>nodes.map(image=>image.complete && image.naturalWidth>0),
      ),{timeout:30000}).toEqual([true,true]);
      await page.reload();
      await expect(page.locator('img[src^="/admin/fotos/"]')).toHaveCount(2);
      await mobileWidth(page);
    });

    await test.step("Forged record, wrong-client photo and draft never reveal comparison",async()=>{
      await page.goto(pairRoute + "?referencia=" + olderId + "&comparacao=" + foreignId);
      await expect(page.getByText("Seleção indisponível",{exact:true})).toBeVisible();
      await expect(page.locator("#comparacao-resultados")).toHaveCount(0);
      await page.goto(pairRoute + "?referencia=" + olderId + "&comparacao=" + draftId);
      await expect(page.locator("#comparacao-resultados")).toHaveCount(0);
      await page.goto(pairRoute + "?referencia=" + olderId + "&comparacao=" + newerId +
        "&fotoReferencia=" + photoForeign + "&fotoComparacao=" + photoB);
      await expect(page.getByText("Fotos incompatíveis",{exact:true})).toBeVisible();
      await expect(page.locator('img[src^="/admin/fotos/"]')).toHaveCount(0);
      await page.goto("/admin/avaliacoes/" + newerId +
        "?pareamentoReferencia=" + olderId + "&pareamentoComparacao=" + foreignId);
      await expect(page.getByRole("link",{name:"Voltar à comparação de avaliações e fotos"})).toHaveCount(0);
      const wrongPhoto = await page.request.get("/admin/fotos/" + photoForeign,{maxRedirects:0});
      expect(wrongPhoto.status()).toBe(404);
    });

    await test.step("Unassigned admin and other client cannot read records or private files",async()=>{
      const wrongPage = await denied.newPage();
      await loginAdminWithMfa(wrongPage,{
        email: unassigned.email,password:unassigned.password,totpSecret:otherTotp,
      });
      await wrongPage.goto(pairRoute+"?referencia="+olderId+"&comparacao="+newerId);
      await expect(wrongPage.getByText("Página ou registro indisponível",{exact:true})).toBeVisible();
      await expect(wrongPage.getByText("71 kg",{exact:true})).toHaveCount(0);
      const photoRequest = await wrongPage.request.get("/admin/fotos/" + photoA,{maxRedirects:0});
      expect(photoRequest.status()).toBe(404);
      const visitor = await anonymous.newPage();
      await visitor.goto(pairRoute);
      await expect(visitor).toHaveURL(/\/login\/?$/);
      const otherLogin = await otherClient.auth.signInWithPassword({
        email:foreign.email,password:foreign.password,
      });
      if (otherLogin.error) throw otherLogin.error;
      const unauthorized = await otherClient.from("client_assessments")
        .select("id").in("id",[olderId,newerId]);
      if (!unauthorized.error) expect(unauthorized.data).toEqual([]);
      const foreignPhotos = await otherClient.from("client_files")
        .select("id").in("id",[photoA,photoB]);
      if (!foreignPhotos.error) expect(foreignPhotos.data).toEqual([]);
    });

    const original = select("select measurement_value from public.assessment_measurements" +
      " where id="+literal(oldWeightId));
    expect(Number(original[0].measurement_value)).toBe(70);
    expect(select("select id from public.assessment_measurement_corrections" +
      " where assessment_measurement_id="+literal(oldWeightId))).toHaveLength(1);
    expect(select("select id from public.professional_follow_ups" +
      " where assessment_id in ("+literal(olderId)+","+literal(newerId)+")")).toHaveLength(0);
    expect(select("select id from public.protocol_publications" +
      " where client_id="+literal(clientId))).toHaveLength(0);
  } finally {
    await Promise.allSettled([professional.close(),denied.close(),anonymous.close()]);
    await otherClient.auth.signOut();
    // The CI job destroys local Supabase (no backup) even on test failure.
    // Synthetic images, identities and sensitive fixture values never reach SaaS.
  }
});
