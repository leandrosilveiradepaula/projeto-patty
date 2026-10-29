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
// The production finalization boundary requires two versioned snapshots.
// The fixture uses the same active catalog and definition instead of direct
// state edits or weakening any constraints in the disposable local database.
function activeTemplate(key) {
  const rows = select(
    "select v.id, v.configuration from public.method_configuration_versions v " +
    "join public.method_configuration_templates t on t.id = v.template_id " +
    "where t.template_key = " + literal(key) +
    " and v.activated_at is not null and v.retired_at is null",
  );
  if (rows.length !== 1 || !UUID.test(rows[0].id))
    throw new Error("Expected exactly one active synthetic method version");
  return rows[0];
}
function basicMethod() {
  const catalog = activeTemplate("evaluation.assessment_kind_catalog");
  const kind = catalog.configuration?.entries?.find(entry =>
    entry.historicalCode === "fortnightly" && entry.semanticKey === "basic");
  if (!kind) throw new Error("Basic assessment absent from active local catalog");
  const definition = activeTemplate("evaluation.assessment_definition." + kind.semanticKey);
  if (definition.configuration?.kindKey !== kind.semanticKey ||
      !Array.isArray(definition.configuration.requiredMeasurements))
    throw new Error("Active local assessment definition is inconsistent");
  return { catalog, kind, definition };
}
function createDraft(clientId, creator, date) {
  return insert("client_assessments", {
    client_id: clientId, assessed_at: date,
    assessment_kind: "fortnightly", created_by_profile_id: creator,
  });
}
async function satisfyRequiredSyntheticItems(id, clientId, staffId, method) {
  const keys = new Set(select(
    "select measurement_key from public.assessment_measurements where assessment_id = " +
    literal(id),
  ).map(row=>row.measurement_key));
  for (const requirement of method.definition.configuration.requiredMeasurements) {
    if (keys.has(requirement.key)) continue;
    // Local-only synthetic sample to satisfy the current versioned definition;
    // never a clinical default and never copied to another environment.
    insert("assessment_measurements", {
      assessment_id:id, measurement_key:requirement.key,
      measurement_value:88, unit:"cm",
    });
  }
  const minimum=method.definition.configuration.photoRequirement?.minimumCount ?? 0;
  if (!Number.isSafeInteger(minimum) || minimum<0 || minimum>15)
    throw new Error("Unexpected local assessment photo requirement");
  const count=select(
    "select client_file_id from public.assessment_files where assessment_id = " +
    literal(id),
  ).length;
  for(let index=count;index<minimum;index++)
    await addPhoto(id,clientId,staffId,"required-"+index);
}
function finalize(assessmentId, actor, method) {
  if (!UUID.test(assessmentId) || !UUID.test(actor))
    throw new Error("Invalid synthetic finalization");
  const {catalog,kind,definition}=method;
  const result=sql("select public.finalize_assessment_from_method_snapshot(" +
    literal(assessmentId)+"::uuid,"+literal(actor)+"::uuid," +
    literal(catalog.id)+"::uuid," +
    literal(JSON.stringify(catalog.configuration))+"::jsonb," +
    literal(JSON.stringify({
      historical_code:kind.historicalCode,semantic_key:kind.semanticKey,label:kind.label,
    }))+"::jsonb," +
    literal(definition.id)+"::uuid," +
    literal(JSON.stringify(definition.configuration))+"::jsonb," +
    literal(JSON.stringify({kind_key:kind.semanticKey,can_finalize:true}))+"::jsonb);");
  if (!UUID.test(result)) throw new Error("Method snapshot was not persisted");
  expect(select(
    "select id from public.client_assessments where id = "+literal(assessmentId) +
    " and finalized_at is not null and method_configuration_snapshot_set_id = "+literal(result),
  )).toHaveLength(1);
  const fragments=select(
    "select template_key from public.method_configuration_snapshots where snapshot_set_id = " +
    literal(result),
  ).map(row=>row.template_key).sort();
  expect(fragments).toEqual([
    "evaluation.assessment_definition.basic","evaluation.assessment_kind_catalog",
  ]);
}
async function addPhoto(assessmentId, clientId, uploaderProfileId, label) {
  if (![assessmentId, clientId, uploaderProfileId].every(id => UUID.test(id)))
    throw new Error("Invalid local synthetic photo ownership");
  const id = randomUUID();
  const path = "clients/" + clientId + "/photo/" + id + ".png";
  const uploaded = await service.storage.from("client-private")
    .upload(path, png, { contentType: "image/png", upsert: false });
  if (uploaded.error) throw uploaded.error;
  insert("client_files", {
    id, client_id: clientId, file_kind: "photo", bucket_id: "client-private",
    object_path: path, original_filename: "j3-" + label + ".png",
    mime_type: "image/png", byte_size: png.length,
    uploaded_by_profile_id: uploaderProfileId,
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

async function loginClientMobile(page, identity) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Senha").fill(identity.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Wait for the real server action to establish auth cookies before navigation.
  await expect(page).toHaveURL(/\/cliente\/?$/, { timeout: 20000 });
}

test.use({ baseURL });
test("J3: MFA, corrected measurements, two private photos, return and RLS", async ({browser}) => {
  test.setTimeout(360_000);
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
  // Second professional is assigned only to a different local test client.
  insert("client_assignments", { client_id: foreignClientId, staff_profile_id: unassigned.id });
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
  // Additional observation is intentionally absent from the older assessment.
  insert("assessment_measurements", {
    assessment_id: newerId, measurement_key: "j3_medida_sem_referencia",
    measurement_value: 55, unit: "cm",
  });
  const photoA = await addPhoto(olderId, clientId, admin.id, "reference");
  const photoB = await addPhoto(newerId, clientId, admin.id, "comparison");
  const photoForeign = await addPhoto(foreignId, foreignClientId, unassigned.id, "foreign");
  const method=basicMethod();
  for(const [assessId,subjectId,staffId] of [
    [olderId,clientId,admin.id],
    [newerId,clientId,admin.id],
    [foreignId,foreignClientId,unassigned.id],
  ]) {
    await satisfyRequiredSyntheticItems(assessId,subjectId,staffId,method);
    finalize(assessId,staffId,method);
  }
  // Only the original assessment is a SQL fixture; the historical
  // correction must be submitted through the real MFA-protected admin UI.
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
    await test.step("Finalized J3 record is read-only and MFA UI appends a correction", async () => {
      await page.goto("/admin/avaliacoes/" + olderId);
      await expect(page.getByRole("heading", {name:"Editar rascunho"})).toHaveCount(0);
      await expect(page.getByRole("heading", {name:"Adicionar ou atualizar medida"})).toHaveCount(0);
      await expect(page.getByRole("button", {name:"Finalizar avaliação"})).toHaveCount(0);

      const weightItem = page.locator("#medidas li").filter({
        has: page.locator("dt").getByText("Peso", {exact:true}),
      });
      await expect(weightItem).toHaveCount(1);
      await weightItem.getByText("Corrigir lançamento", {exact:true}).click();
      await weightItem.locator('input[name="correctedMeasurementValue"]').fill("71");
      await weightItem.locator('input[name="correctedUnit"]').fill("kg");
      await weightItem.locator('input[name="correctionNote"]').fill("Correção sintética J3");
      await weightItem.getByRole("button", {name:"Registrar correção"}).click();

      await expect.poll(() => select("select id from public.assessment_measurement_corrections"+
        " where assessment_measurement_id="+literal(oldWeightId)).length, {timeout:25000}).toBe(1);
      const corrections = select("select assessment_measurement_id,corrected_measurement_value,"+
        "corrected_unit,corrected_by_profile_id,note from public.assessment_measurement_corrections"+
        " where assessment_measurement_id="+literal(oldWeightId));
      expect(corrections).toHaveLength(1);
      expect(corrections[0].assessment_measurement_id).toBe(oldWeightId);
      expect(Number(corrections[0].corrected_measurement_value)).toBe(71);
      expect(corrections[0].corrected_unit).toBe("kg");
      expect(corrections[0].corrected_by_profile_id).toBe(admin.id);
      expect(corrections[0].note).toBe("Correção sintética J3");
      expect(select("select measurement_value from public.assessment_measurements"+
        " where id="+literal(oldWeightId)).map(row=>Number(row.measurement_value)))
        .toEqual([70]);

      await page.reload();
      await expect(page.getByRole("heading", {name:"Histórico de correções"})).toBeVisible();
      await expect(page.getByText("Corrigido para 71 kg.", {exact:false})).toBeVisible();
      await mobileWidth(page);
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
      const unmatched = page.getByRole("row",{name:/j3_medida_sem_referencia \(cm\)/});
      await expect(unmatched.getByRole("cell",{name:"Não comparável"})).toBeVisible();
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

    await test.step("Forged record, wrong-client photo selection and draft never reveal comparison",async()=>{
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
      // The comparison page itself must reject a foreign photo. Direct
      // /admin/fotos authorization is intentionally governed by the separate
      // sole-admin private-file exception, not by J3 assignment RLS. This
      // disposable fixture has two administrative roles for assessment
      // isolation, so asserting an admin 404 here would contradict RBAC_RLS.
      // Never infer that a second admin is authorized in production.
    });

    await test.step("Unassigned admin and other client cannot read J3 records; client private files stay isolated",async()=>{
      const wrongPage = await denied.newPage();
      await loginAdminWithMfa(wrongPage,{
        email: unassigned.email,password:unassigned.password,totpSecret:otherTotp,
      });
      await wrongPage.goto(pairRoute+"?referencia="+olderId+"&comparacao="+newerId);
      await expect(wrongPage.getByText("Página ou registro indisponível",{exact:true})).toBeVisible();
      await expect(wrongPage.getByText("71 kg",{exact:true})).toHaveCount(0);
      // J3 assessment data must be denied without assignment. File download
      // authorization for admins is a separate exception tested by J1 under
      // the sole-admin MVP; this fixture's second admin must not redefine it.
      const visitor = await anonymous.newPage();
      await visitor.goto(pairRoute);
      await expect(visitor).toHaveURL(/\/login\/?$/);
      const otherLogin = await otherClient.auth.signInWithPassword({
        email:foreign.email,password:foreign.password,
      });
      if (otherLogin.error) throw otherLogin.error;
      const unauthorized = await otherClient.from("client_assessments")
        .select("id").in("id",[olderId,newerId]);
      // Only an explicit RLS denial or an empty result is acceptable; a
      // transport/backend error must not masquerade as privacy protection.
      if (unauthorized.error && unauthorized.error.code !== "42501") throw unauthorized.error;
      expect(unauthorized.data ?? []).toEqual([]);
      const foreignPhotos = await otherClient.from("client_files")
        .select("id").in("id",[photoA,photoB]);
      if (foreignPhotos.error && foreignPhotos.error.code !== "42501") throw foreignPhotos.error;
      expect(foreignPhotos.data ?? []).toEqual([]);
    });

    await test.step("Client mobile reviews exact corrected history and returns to filtered evolution", async () => {
      // J3 previously covered the professional UI on mobile but only used an
      // API token to confirm the client's RLS scope. Use real authenticated
      // client pages for both the owner and a different client.
      const mobileOwner = await browser.newContext({
        baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      });
      const mobileForeign = await browser.newContext({
        baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      });
      try {
        const ownerPage = await mobileOwner.newPage();
        await loginClientMobile(ownerPage, owner);
        await ownerPage.goto("/cliente/avaliacoes");
        await expect(ownerPage.getByRole("heading", {
          name: "Avaliações e medidas",
        })).toBeVisible();
        await expect(ownerPage.locator("#avaliacao-" + newerId)).toHaveCount(1);
        await expect(ownerPage.locator("#avaliacao-" + olderId)).toHaveCount(1);
        await expect(ownerPage.locator("#avaliacao-" + draftId)).toHaveCount(0);
        await expect(ownerPage.locator("#avaliacao-" + foreignId)).toHaveCount(0);
        await mobileWidth(ownerPage);

        await test.step("Client compares own finalized assessments without leaking draft or foreign data", async () => {
          await ownerPage.getByRole("link", { name: "Comparar duas avaliações" }).tap();
          await expect(ownerPage.getByRole("heading", { name: "Comparar avaliações" })).toBeVisible();
          await expect(ownerPage.locator('select[name="referencia"]')).toHaveValue(olderId);
          await expect(ownerPage.locator('select[name="comparacao"]')).toHaveValue(newerId);
          await expect(ownerPage.locator("#comparacao-resultados")).toBeVisible();
          const peso = ownerPage.locator("#comparacao-resultados tbody tr").filter({
            has: ownerPage.getByRole("rowheader", { name: "Peso (kg)" }),
          });
          await expect(peso.locator('td[data-label="Referência"]')).toContainText("71 kg");
          await expect(peso.locator('td[data-label="Comparação"]')).toContainText("69 kg");
          await expect(peso.locator('td[data-label="Diferença matemática"]')).toContainText("-2 kg");
          // The configured basic assessment can require quadril on both dates.
          // This synthetic key is intentionally present ONLY on the newer date.
          const semReferencia = ownerPage.locator("#comparacao-resultados tbody tr").filter({
            has: ownerPage.getByRole("rowheader", {
              name: "j3_medida_sem_referencia (cm)",
            }),
          });
          await expect(semReferencia.locator('td[data-label="Referência"]'))
            .toContainText("Sem registro");
          await expect(semReferencia.locator('td[data-label="Comparação"]'))
            .toContainText("55 cm");
          await expect(semReferencia.locator('td[data-label="Diferença matemática"]'))
            .toContainText("Não comparável");
          await expect(ownerPage.locator("#comparacao-resultados img")).toHaveCount(0);
          await mobileWidth(ownerPage);

          const pairRoute = "/cliente/avaliacoes/comparar";
          for (const invalid of [
            "?referencia=" + olderId + "&comparacao=" + foreignId,
            "?referencia=" + olderId + "&comparacao=" + draftId,
            "?referencia=" + olderId + "&comparacao=" + olderId,
            "?referencia[]=" + olderId + "&comparacao=" + newerId,
          ]) {
            await ownerPage.goto(pairRoute + invalid);
            await expect(ownerPage.locator("#comparacao-resultados")).toHaveCount(0);
            await expect(ownerPage.getByText("Seleção indisponível", { exact: true })).toBeVisible();
          }
          await ownerPage.goto(pairRoute + "?referencia=" + olderId + "&comparacao=" + newerId);
          await ownerPage.getByRole("link", { name: "Abrir avaliação de referência" }).tap();
          await expect(ownerPage).toHaveURL(new RegExp("avaliacao=" + olderId));
          await expect(ownerPage.locator("#avaliacao-" + olderId)).toBeVisible();
          await mobileWidth(ownerPage);
        });

        await ownerPage.goto("/cliente/avaliacoes?avaliacao=" + olderId +
          "#avaliacao-" + olderId);
        const correctedAssessment = ownerPage.locator("#avaliacao-" + olderId);
        await expect(correctedAssessment).toBeVisible();
        await expect(correctedAssessment.getByText("71 kg", { exact: true }))
          .toBeVisible();
        await expect(correctedAssessment.getByText("70 kg", { exact: true }))
          .toHaveCount(0);
        await mobileWidth(ownerPage);

        // Only the current authorized assessment can produce the measure link.
        const measureLink = correctedAssessment.getByRole("link", {
          name: "Ver histórico de Peso (kg)",
        });
        await expect(measureLink).toBeVisible();
        await measureLink.tap();
        await expect(ownerPage.getByRole("heading", {
          name: "Evolução", exact: true,
        })).toBeVisible();
        const selectedMeasure = new URL(ownerPage.url()).searchParams.get("serie");
        expect(Number.isSafeInteger(Number(selectedMeasure)) &&
          Number(selectedMeasure) > 0).toBe(true);
        await expect(ownerPage.locator('select[name="serie"]'))
          .toHaveValue(selectedMeasure);
        await ownerPage.locator('select[name="janela"]').selectOption("3");
        await ownerPage.getByRole("button", { name: "Aplicar filtros" }).tap();
        await expect(ownerPage.locator('select[name="janela"]')).toHaveValue("3");
        await mobileWidth(ownerPage);

        const seriesCard = ownerPage.locator("#medida-" +
          (Number(selectedMeasure) - 1));
        const exactLinks = seriesCard.getByRole("link", {
          name: /Abrir avaliação de/,
        });
        await expect(exactLinks).toHaveCount(2);
        const chosenLink = exactLinks.first();
        const target = new URL(await chosenLink.getAttribute("href"), baseURL);
        expect(target.pathname).toBe("/cliente/avaliacoes");
        expect([olderId, newerId]).toContain(target.searchParams.get("avaliacao"));
        expect(target.searchParams.get("origemSerie")).toBe(selectedMeasure);
        expect(target.searchParams.get("origemJanela")).toBe("3");
        await chosenLink.tap();
        await expect(ownerPage.getByRole("heading", {
          name: "Avaliações e medidas",
        })).toBeVisible();
        await expect(ownerPage.getByRole("link", {
          name: "Voltar à mesma medida e observações",
        })).toBeVisible();
        await mobileWidth(ownerPage);
        await ownerPage.getByRole("link", {
          name: "Voltar à mesma medida e observações",
        }).tap();
        // Next.js client navigation may commit after the touch event resolves.
        // Wait for the *real* destination instead of reading the old URL;
        // this still fails if the return never reaches the correct page.
        await expect(ownerPage).toHaveURL(/\/cliente\/evolucao(?:[?#]|$)/, {
          timeout: 20000,
        });
        const returned = new URL(ownerPage.url());
        expect(returned.pathname).toBe("/cliente/evolucao");
        expect(returned.searchParams.get("serie")).toBe(selectedMeasure);
        expect(returned.searchParams.get("janela")).toBe("3");
        await ownerPage.reload();
        await expect(ownerPage.locator('select[name="janela"]')).toHaveValue("3");
        await mobileWidth(ownerPage);

        // Even a forged exact assessment ID must never reveal another client's
        // assessment or give it a valid contextual return link.
        await ownerPage.goto("/cliente/avaliacoes?avaliacao=" + foreignId +
          "&origemSerie=" + selectedMeasure + "&origemJanela=3");
        await expect(ownerPage.locator("#avaliacao-" + foreignId)).toHaveCount(0);
        await expect(ownerPage.getByRole("link", {
          name: "Voltar à mesma medida e observações",
        })).toHaveCount(0);
        await mobileWidth(ownerPage);

        const foreignPage = await mobileForeign.newPage();
        await loginClientMobile(foreignPage, foreign);
        await foreignPage.goto("/cliente/avaliacoes?avaliacao=" + olderId +
          "#avaliacao-" + olderId);
        await expect(foreignPage.getByRole("heading", {
          name: "Avaliações e medidas",
        })).toBeVisible();
        await expect(foreignPage.locator("#avaliacao-" + foreignId)).toHaveCount(1);
        await expect(foreignPage.locator("#avaliacao-" + olderId)).toHaveCount(0);
        await expect(foreignPage.locator("#avaliacao-" + newerId)).toHaveCount(0);
        await mobileWidth(foreignPage);
        await foreignPage.goto("/cliente/avaliacoes/comparar?referencia=" + olderId +
          "&comparacao=" + newerId);
        await expect(foreignPage.locator("#comparacao-resultados")).toHaveCount(0);
        await expect(foreignPage.getByText("Seleção indisponível", { exact: true })).toBeVisible();
        await expect(foreignPage.getByText("71 kg", { exact: true })).toHaveCount(0);
        await mobileWidth(foreignPage);
        await foreignPage.goto("/cliente/evolucao");
        await expect(foreignPage.getByText("71 kg", { exact: true })).toHaveCount(0);
        await expect(foreignPage.getByText("69 kg", { exact: true })).toHaveCount(0);
        await mobileWidth(foreignPage);
      } finally {
        await Promise.allSettled([mobileOwner.close(), mobileForeign.close()]);
      }
      // Reading the mobile history cannot revise professional corrections,
      // publish protocols, or create professional follow-ups.
      expect(select("select id from public.assessment_measurement_corrections" +
        " where assessment_measurement_id=" + literal(oldWeightId))).toHaveLength(1);
      expect(select("select id from public.professional_follow_ups" +
        " where assessment_id in (" + literal(olderId) + "," +
        literal(newerId) + ")")).toHaveLength(0);
      expect(select("select id from public.protocol_publications" +
        " where client_id=" + literal(clientId))).toHaveLength(0);
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
