import {randomBytes,randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import {expect,test} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {generateTotp,loginAdminWithMfa} from "./helpers/admin-auth.mjs";

const baseURL=process.env.J4_E2E_BASE_URL;
const apiURL=process.env.J4_E2E_SUPABASE_URL;
const anonKey=process.env.J4_E2E_ANON_KEY;
const serviceKey=process.env.J4_E2E_SERVICE_ROLE_KEY;
if(process.env.J4_E2E_LOCAL_ONLY!=="true" ||
   baseURL!=="http://127.0.0.1:3000" ||
   apiURL!=="http://127.0.0.1:54321" ||
   !anonKey || !serviceKey) {
  throw new Error("J4 synthetic journey cannot run against remote resources");
}
const service=createClient(apiURL,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
function anonClient(){
  return createClient(apiURL,anonKey,{auth:{autoRefreshToken:false,persistSession:false}});
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixtureTables=new Set([
  "profiles","user_roles","clients","client_assignments",
  "client_assessments","assessment_measurements","client_files",
]);
function quote(x){
  if(typeof x!=="string" && typeof x!=="number" && x!==null)
    throw new TypeError("Invalid local fixture parameter");
  return x===null?"NULL":"'"+String(x).replaceAll("'","''")+"'";
}
function sql(command){
  if(process.env.J4_E2E_LOCAL_ONLY!=="true" || apiURL!=="http://127.0.0.1:54321")
    throw new Error("Local fixture boundary must not run remotely");
  return execFileSync("docker",[
    "exec","-i","supabase_db_projeto-patty","psql","-X","-q",
    "-U","postgres","-d","postgres","-A","-t","-v","ON_ERROR_STOP=1",
  ],{input:command.trimEnd()+"\n",encoding:"utf8",timeout:12000}).trim();
}
function rows(query){
  return JSON.parse(sql("select coalesce(json_agg(row_to_json(t)),'[]'::json)::text from ("+
    query+") t;"));
}
function insert(table,fields){
  if(!fixtureTables.has(table) || !Object.keys(fields).every(x=>/^[a-z_]+$/.test(x)))
    throw new Error("Unapproved synthetic table/column");
  const idColumn=table==="user_roles"?"profile_id":"id";
  const value=sql("insert into public."+table+" ("+Object.keys(fields).join(",")+
    ") values ("+Object.values(fields).map(quote).join(",")+") returning "+idColumn+";");
  if(!UUID.test(value)) throw new Error("Fixture insert did not return a UUID");
  return value;
}
async function createIdentity(role,label,nonce){
  const email="e2e-j4-"+label+"-"+nonce+"@example.invalid";
  if(!/^e2e-j4-(admin|other-admin|client|other-client)-[0-9a-f]{16}@example\.invalid$/.test(email))
    throw new Error("Only synthetic J4 identities are permitted");
  const password="E2E-J4-"+randomBytes(15).toString("base64url")+"-Aa1!";
  const created=await service.auth.admin.createUser({email,password,email_confirm:true});
  if(created.error || !created.data?.user?.id)
    throw created.error ?? new Error("Synthetic Auth creation failed");
  const id=created.data.user.id;
  insert("profiles",{id,display_name:"J4 Synthetic "+label});
  insert("user_roles",{profile_id:id,role});
  return {id,email,password};
}
async function enrollMfa(user){
  const session=anonClient();
  const signed=await session.auth.signInWithPassword({email:user.email,password:user.password});
  if(signed.error) throw signed.error;
  try{
    const factor=await session.auth.mfa.enroll({factorType:"totp",friendlyName:"Disposable J4 MFA"});
    if(factor.error) throw factor.error;
    const challenge=await session.auth.mfa.challenge({factorId:factor.data.id});
    if(challenge.error) throw challenge.error;
    const verified=await session.auth.mfa.verify({
      factorId:factor.data.id,challengeId:challenge.data.id,
      code:generateTotp(factor.data.totp.secret),
    });
    if(verified.error) throw verified.error;
    return factor.data.totp.secret;
  }finally{
    await session.auth.signOut();
  }
}
async function loginClient(page,identity){
  await page.goto("/login");
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Senha").fill(identity.password);
  await page.getByRole("button",{name:"Entrar"}).click();
  // Wait for server action to finish, set its Auth cookies and redirect.
  // Navigating immediately can abort the action and create a false auth failure.
  await expect(page).toHaveURL(/\/cliente\/?$/,{timeout:20000});
  await page.goto("/cliente/protocolo");
  await expect(page.getByRole("heading",{name:"Meu protocolo",exact:true})).toBeVisible();
}
async function pollRows(query,length){
  await expect.poll(()=>rows(query).length,{timeout:25000}).toBe(length);
  return rows(query);
}
// The basic evaluation method is read from the active versioned catalog.
// These weights and measurements are disposable test data, NOT clinical rules.
const assessmentPng=Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcokAAAAASUVORK5CYII=",
  "base64",
);
function activeAssessmentTemplate(key){
  const found=rows("select v.id,v.configuration from public.method_configuration_versions v"+
    " join public.method_configuration_templates t on t.id=v.template_id"+
    " where t.template_key="+quote(key)+
    " and v.activated_at is not null and v.retired_at is null");
  if(found.length!==1||!UUID.test(found[0].id))
    throw new Error("Expected exactly one active local assessment template");
  return found[0];
}
function basicAssessmentMethod(){
  const catalog=activeAssessmentTemplate("evaluation.assessment_kind_catalog");
  const kind=catalog.configuration?.entries?.find(item=>
    item.historicalCode==="fortnightly"&&item.semanticKey==="basic");
  if(!kind)throw new Error("Versioned basic assessment kind unavailable");
  const definition=activeAssessmentTemplate("evaluation.assessment_definition."+kind.semanticKey);
  if(definition.configuration?.kindKey!==kind.semanticKey||
     !Array.isArray(definition.configuration.requiredMeasurements))
    throw new Error("Invalid versioned assessment definition");
  return {catalog,kind,definition};
}
// Exercise the real staff UI at both ends of the integrated J3-J4-J2-J3
// cycle. The only seeded rows are ancillary synthetic comparison/photo data,
// never the assessment draft or its professional finalization.
async function finalizedSyntheticAssessment(input){
  const {page,clientId,staffId,assessedAt,weight,waist,method}=input;
  if(![clientId,staffId].every(id=>UUID.test(id))||
     !Number.isFinite(weight)||!Number.isFinite(waist))
    throw new Error("Invalid disposable J3 fixture");
  const isoDate=assessedAt.slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(isoDate))
    throw new Error("Invalid disposable assessment date");

  const clientAssessments=()=>rows("select id,client_id,created_by_profile_id,"+
    "assessed_at,assessment_kind,finalized_at,method_configuration_snapshot_set_id"+
    " from public.client_assessments where client_id="+quote(clientId));
  const countBefore=clientAssessments().length;
  await page.goto("/admin/clientes/"+clientId+"/avaliacoes");
  const creation=page.locator("#nova-avaliacao form");
  await expect(creation).toHaveCount(1);
  await creation.locator('select[name="assessmentKind"]').selectOption("fortnightly");
  await creation.locator('input[name="assessedAt"]').fill(isoDate);
  await creation.getByRole("button",{name:"Criar rascunho de avaliação"}).click();
  await expect(page).toHaveURL(/\/admin\/avaliacoes\/[0-9a-f-]{36}/i,{timeout:25000});
  const assessmentId=new URL(page.url()).pathname.split("/").at(-1);
  if(!UUID.test(assessmentId))throw new Error("Staff UI did not create a valid assessment");
  await expect.poll(()=>clientAssessments().length,{timeout:25000})
    .toBe(countBefore+1);
  const draft=clientAssessments().find(item=>item.id===assessmentId);
  expect(draft?.client_id).toBe(clientId);
  expect(draft?.created_by_profile_id).toBe(staffId);
  expect(draft?.assessment_kind).toBe("fortnightly");
  expect(draft?.assessed_at.slice(0,10)).toBe(isoDate);
  expect(draft?.finalized_at).toBeNull();
  expect(draft?.method_configuration_snapshot_set_id).toBeNull();
  await expect(page.getByRole("heading",{name:"Editar rascunho"})).toBeVisible();

  // Record active configuration's mandatory measurements through the browser
  // form. Any other comparison keys are ancillary local synthetic fixture rows.
  const recorded=new Set();
  const measures=method.definition.configuration.requiredMeasurements;
  expect(measures.length,"Active basic method must define browser measurements")
    .toBeGreaterThan(0);
  for(const requirement of measures){
    const key=requirement.key;
    const value=key==="peso"?weight:key==="cintura"?waist:88;
    const unit=key==="peso"?"kg":"cm";
    const measureForm=page.locator("form").filter({
      has:page.getByRole("button",{name:"Salvar medida",exact:true}),
    });
    await expect(measureForm).toHaveCount(1);
    await measureForm.locator('select[name="measurementKey"]').selectOption(key);
    await measureForm.locator('input[name="measurementValue"]').fill(String(value));
    await measureForm.locator('input[name="unit"]').fill(unit);
    await measureForm.getByRole("button",{name:"Salvar medida"}).click();
    await expect.poll(()=>rows("select id from public.assessment_measurements"+
      " where assessment_id="+quote(assessmentId)+
      " and measurement_key="+quote(key)).length,{timeout:25000}).toBe(1);
    recorded.add(key);
    await page.reload();
  }
  for(const item of [
    {key:"peso",value:weight,unit:"kg"},
    {key:"cintura",value:waist,unit:"cm"},
  ]){
    if(recorded.has(item.key))continue;
    insert("assessment_measurements",{
      assessment_id:assessmentId,measurement_key:item.key,
      measurement_value:item.value,unit:item.unit,
    });
  }

  // The browser links real private synthetic Storage files. The fixture is
  // the physically uploaded file, not a fake pre-linked assessment.
  const minimum=method.definition.configuration.photoRequirement?.minimumCount??0;
  if(!Number.isSafeInteger(minimum)||minimum<0||minimum>15)
    throw new Error("Unexpected local assessment photo requirement");
  for(let n=0;n<minimum;n++){
    const photoId=randomUUID();
    const objectPath="clients/"+clientId+"/photo/"+photoId+".png";
    const upload=await service.storage.from("client-private").upload(
      objectPath,assessmentPng,{contentType:"image/png",upsert:false});
    if(upload.error)throw upload.error;
    insert("client_files",{
      id:photoId,client_id:clientId,file_kind:"photo",bucket_id:"client-private",
      object_path:objectPath,original_filename:"j4-j3-synthetic-"+n+".png",
      mime_type:"image/png",byte_size:assessmentPng.length,
      uploaded_by_profile_id:staffId,
    });
    await page.reload();
    const photoForm=page.locator("form").filter({
      has:page.getByRole("button",{name:"Vincular foto",exact:true}),
    });
    await expect(photoForm).toHaveCount(1);
    await photoForm.locator('select[name="clientFileId"]').selectOption(photoId);
    await photoForm.getByRole("button",{name:"Vincular foto"}).click();
    await expect.poll(()=>rows("select client_file_id from public.assessment_files"+
      " where assessment_id="+quote(assessmentId)+
      " and client_file_id="+quote(photoId)).length,{timeout:25000}).toBe(1);
  }

  await page.reload();
  const finish=page.locator("form").filter({
    has:page.getByRole("button",{name:"Finalizar avaliação",exact:true}),
  });
  await expect(finish).toHaveCount(1);
  await expect(finish.getByRole("button",{name:"Finalizar avaliação"}))
    .toBeEnabled();
  await finish.getByRole("checkbox",{name:/Revisei data, tipo, medidas e fotos/}).check();
  await finish.getByRole("button",{name:"Finalizar avaliação"}).click();
  await expect.poll(()=>clientAssessments().find(item=>item.id===assessmentId)
    ?.finalized_at??null,{timeout:25000}).not.toBeNull();
  const finalized=clientAssessments().find(item=>item.id===assessmentId);
  expect(UUID.test(finalized?.method_configuration_snapshot_set_id)).toBe(true);
  const snapshots=rows("select template_key,resolved_configuration"+
    " from public.method_configuration_snapshots"+
    " where snapshot_set_id="+quote(finalized.method_configuration_snapshot_set_id));
  expect(new Set(snapshots.map(row=>row.template_key))).toEqual(new Set([
    "evaluation.assessment_definition.basic","evaluation.assessment_kind_catalog",
  ]));
  // The committed snapshot must match the original catalog JSON exactly.
  // UI-normalized aliases are a separate representation, never persisted.
  expect(snapshots.find(row=>row.template_key==="evaluation.assessment_definition.basic")
    ?.resolved_configuration).toEqual(method.definition.configuration);
  expect(snapshots.find(row=>row.template_key==="evaluation.assessment_kind_catalog")
    ?.resolved_configuration).toEqual(method.catalog.configuration);
  await page.reload();
  await expect(page.getByRole("heading",{name:"Continuar para o protocolo"}))
    .toBeVisible();
  return {id:assessmentId,snapshotId:finalized.method_configuration_snapshot_set_id};
}
// Synthetic local-only authorization probe; never print SQL errors or data.
// Inspect query *plans*, never data, solely inside the disposable local DB.
// Compare PostgreSQL's owner (RLS-bypassing baseline) to the authenticated
// session (RLS enabled). This does not change any grants, policies or data.
function compareSyntheticDosePlans(staffProfileId,mealId){
  if(!UUID.test(staffProfileId)||!UUID.test(mealId)||
    apiURL!=="http://127.0.0.1:54321"||
    process.env.J4_E2E_LOCAL_ONLY!=="true")
    throw new Error("Invalid local-only query plan probe");
  const claims=JSON.stringify({sub:staffProfileId,role:"authenticated",aal:"aal2"});
  const query="explain (format json, costs true) "+
    "select id,meal_id,dose_type,dose_quantity "+
    "from public.meal_dose_allocations where meal_id in ("+quote(mealId)+") limit 500;";
  const scenarios=[
    {label:"owner-baseline",setup:[]},
    {label:"authenticated-rls",setup:[
      "set local role authenticated;",
      "set local request.jwt.claims = "+quote(claims)+";",
      "set local request.jwt.claim.sub = "+quote(staffProfileId)+";",
    ]},
  ];
  for(const scenario of scenarios){
    try{
      const raw=sql([
        "begin;","set local statement_timeout = '4s';",
        ...scenario.setup,query,"rollback;",
      ].join("\n"));
      const plan=JSON.parse(raw)?.[0]?.Plan;
      const cost=Number(plan?.["Total Cost"]);
      const estimatedRows=Number(plan?.["Plan Rows"]);
      const safeCost=Number.isFinite(cost)?Math.round(cost):"unavailable";
      const safeRows=Number.isFinite(estimatedRows)?Math.round(estimatedRows):"unavailable";
      // Fixed field names, synthetic-row estimates and numeric costs only.
      console.log("J4_DOSE_QUERY_PLAN:"+scenario.label+
        ":cost="+safeCost+":estimated-rows="+safeRows);
    }catch{
      console.log("J4_DOSE_QUERY_PLAN:"+scenario.label+":unavailable-or-timeout");
    }
  }
}
// Local-only, read-only planner-depth trace. Identify the first RLS table
// whose policy expansion becomes expensive before changing any authorization.
// EXPLAIN does not execute SQL; report only rounded planner estimates.
function traceSyntheticDoseRlsDepth(staffProfileId,ids){
  const candidates=[
    ["protocol-versions","protocol_versions","id",ids.version],
    ["meal-plan-versions","meal_plan_versions","id",ids.plan],
    ["meal-plan-variants","meal_plan_variants","id",ids.variant],
    ["meals","meals","id",ids.meal],
    ["meal-doses","meal_dose_allocations","meal_id",ids.meal],
  ];
  if(process.env.J4_E2E_LOCAL_ONLY!=="true"||
    apiURL!=="http://127.0.0.1:54321"||
    !UUID.test(staffProfileId)||
    candidates.some(([, , ,id])=>!UUID.test(id)))
    throw new Error("RLS trace is restricted to synthetic local identifiers");
  const claims=JSON.stringify({sub:staffProfileId,role:"authenticated",aal:"aal2"});
  for(const [label,table,column,id] of candidates){
    const query="explain (format json, costs true) select id from public."+
      table+" where "+column+" = "+quote(id)+" limit 500;";
    try{
      const raw=sql([
        "begin;","set local statement_timeout = '4s';",
        "set local role authenticated;",
        "set local request.jwt.claims = "+quote(claims)+";",
        "set local request.jwt.claim.sub = "+quote(staffProfileId)+";",
        query,"rollback;",
      ].join("\n"));
      const plan=JSON.parse(raw)?.[0]?.Plan;
      const cost=Number(plan?.["Total Cost"]);
      console.log("J4_RLS_DEPTH:"+label+":cost="+
        (Number.isFinite(cost)?Math.round(cost):"unavailable"));
    }catch{
      console.log("J4_RLS_DEPTH:"+label+":unavailable-or-timeout");
    }
  }
}

// Prove the same row-scoped read restrictions under real authenticated SQL.
// Restricted to the disposable database and fixed synthetic UUID inputs.
function assertDoseRlsVisibility(profileId,mealId,aal,expectedCount){
  if(!UUID.test(profileId)||!UUID.test(mealId)||
    !["aal1","aal2"].includes(aal)||![0,1].includes(expectedCount))
    throw new Error("Invalid synthetic RLS visibility test");
  const claims=JSON.stringify({sub:profileId,role:"authenticated",aal});
  const output=sql([
    "begin;","set local role authenticated;",
    "set local request.jwt.claims = "+quote(claims)+";",
    "set local request.jwt.claim.sub = "+quote(profileId)+";",
    "select count(*) from public.meal_dose_allocations where meal_id="+quote(mealId)+";",
    "rollback;",
  ].join("\n"));
  expect(Number(output)).toBe(expectedCount);
}

function probeAuthenticatedDoseRead(staffProfileId,mealId,stage){
  if(!UUID.test(staffProfileId)||!UUID.test(mealId)||
    !["draft","submitted","approved"].includes(stage))
    throw new Error("Invalid synthetic dose probe");
  const claims=JSON.stringify({sub:staffProfileId,role:"authenticated",aal:"aal2"});
  const command=[
    "begin;",
    "set local role authenticated;",
    "set local statement_timeout = '5s';",
    "set local request.jwt.claims = "+quote(claims)+";",
    "set local request.jwt.claim.sub = "+quote(staffProfileId)+";",
    "select id,meal_id,dose_type,dose_quantity from public.meal_dose_allocations"+
      " where meal_id in ("+quote(mealId)+")"+
      " limit 500;",
    "rollback;",
  ].join("\n");
  try {
    sql(command);
    console.log("J4_AUTH_DOSE_PROBE:"+stage+":completed");
  } catch {
    console.log("J4_AUTH_DOSE_PROBE:"+stage+":failed-or-timed-out");
  }
}
async function mobileFit(page){
  const s=await page.evaluate(()=>{
    const width=document.documentElement.clientWidth;
    const scroll=document.documentElement.scrollWidth;
    // Diagnostics expose only element tag/class and geometry, never protocol
    // values, labels, HTML, URLs, form contents or account identifiers.
    const offenders=[...document.querySelectorAll("body *")]
      .filter(node=>{
        const box=node.getBoundingClientRect();
        return box.width>0 && box.right>width+1 &&
          getComputedStyle(node).display!=="none";
      })
      .slice(0,14)
      .map(node=>{
        const box=node.getBoundingClientRect();
        return {
          tag:node.tagName.toLowerCase(),
          classes:typeof node.className==="string" ? node.className.slice(0,100):"",
          parent:typeof node.parentElement?.className==="string" ?
            node.parentElement.className.slice(0,100):"",
          left:Math.round(box.left),right:Math.round(box.right),
          width:Math.round(box.width),
        };
      });
    return {width,scroll,offenders};
  });
  if(s.scroll>s.width+1){
    throw new Error("J4 mobile overflow (geometry/classes only): "+JSON.stringify(s));
  }
}
async function actionFrom(page,buttonName,callback){
  const form=page.locator("form").filter({
    has:page.getByRole("button",{name:buttonName,exact:true}),
  });
  await expect(form).toHaveCount(1);
  if(callback) await callback(form);
  await form.getByRole("button",{name:buttonName,exact:true}).click();
  // Persisted SQL may become visible before a Server Action has returned.
  // Wait for the browser to acknowledge the action before navigating again.
  if(buttonName==="Iniciar estrutura alimentar") {
    await expect(page.getByRole("button",{name:"Adicionar variação",exact:true}))
      .toBeVisible({timeout:30000});
  }else{
    const successTitle=buttonName==="Criar novo rascunho a partir desta versão"
      ? "Novo rascunho criado" : "Alteração salva";
    await expect(form.getByText(successTitle,{exact:true})).toBeVisible({timeout:30000});
  }
}
async function lifecycle(page,kind){
  const values={
    submit:{button:"Submeter para revisão",check:"confirmSubmission"},
    approve:{button:"Aprovar versão",check:"confirmApproval"},
    publish:{button:"Publicar para a cliente",check:"confirmPublication"},
  };
  const action=values[kind];
  const form=page.locator("form").filter({has:page.getByRole("button",{name:action.button,exact:true})});
  await expect(form).toHaveCount(1);
  await form.locator('input[name="'+action.check+'"]').check();
  await form.getByRole("button",{name:action.button,exact:true}).click();
  // An action is complete only after the refreshed UI moves to the next
  // manual lifecycle state. A database poll alone can race React/Next.js.
  await expect(form).toHaveCount(0,{timeout:30000});
}
function latestVersion(protocolId){
  const items=rows("select id,version_number,submitted_for_review_at from public.protocol_versions"+
    " where protocol_id="+quote(protocolId)+" order by version_number asc");
  if(!items.length)throw new Error("No J4 protocol version was persisted");
  return items.at(-1);
}
async function openVersion(page,protocolId,number){
  // A server-side read can hang without producing a rendered error page.
  // Bound navigation independently from the full E2E timeout and never log
  // request URLs, protocol identifiers or private response bodies.
  let response;
  try {
    response=await page.goto("/admin/protocolos/"+protocolId+"?versao="+number,{
      waitUntil:"domcontentloaded",timeout:25000,
    });
  } catch {
    throw new Error("J4_ADMIN_VERSION_NAVIGATION_TIMEOUT_OR_NETWORK_FAILURE");
  }
  const container=page.locator("#versao-"+number);
  await expect.poll(async()=>{
    if(await container.isVisible()) return "version-visible";
    const path=new URL(page.url()).pathname;
    if(path==="/login")return "redirected-to-login";
    if(response?.status()===500)return "server-http-500";
    if(response && response.status()>=400)return "http-"+response.status();
    if(await page.getByText("Página ou registro indisponível",{exact:true}).count())
      return "access-denied";
    if(await page.getByText("A versão solicitada não corresponde aos filtros. Limpe os filtros para consultá-la.",{exact:true}).count())
      return "selection-filtered-out";
    if(await page.getByText("Não existem versões que correspondam aos filtros.",{exact:true}).count())
      return "no-matching-versions";
    if(await page.getByText("Application error",{exact:false}).count())
      return "application-error";
    if(await page.getByRole("heading",{name:"Não foi possível carregar esta área",exact:true}).count())
      return "admin-error-boundary";
    if(await page.locator('[data-nextjs-dialog-overlay]').count())
      return "nextjs-error-dialog";
    // A nextjs-portal element also exists on HEALTHY dev pages, so it
    // cannot be used to classify a rendering failure.
    // Only categorical observations, never the document text, HTML,
    // cookies, SQL rows, URL parameters or sensitive protocol content.
    const details=await page.locator('[id^="versao-"]').count();
    if(details>0)return "version-missing-from-"+details+"-visible-records";
    if(await page.getByRole("heading",{name:"Versões e histórico",exact:true}).count())
      return "history-rendered-without-version-elements";
    if(await page.locator("main").count())
      return "main-rendered-without-history";
    return "pending-render";
  },{timeout:15000}).toBe("version-visible");
  return container;
}

test.use({baseURL});
test("J4: admin manually drafts/reviews/approves/publishes, client sees exact versions",async({browser})=>{
  test.setTimeout(360000);
  const nonce=randomBytes(8).toString("hex");
  const staff=await createIdentity("admin","admin",nonce);
  const unrelatedStaff=await createIdentity("admin","other-admin",nonce);
  const owner=await createIdentity("client","client",nonce);
  const unrelatedOwner=await createIdentity("client","other-client",nonce);
  const clientId=insert("clients",{
    profile_id:owner.id,full_name:"Cliente sintética protocolo J4",status:"active",
  });
  const otherClientId=insert("clients",{
    profile_id:unrelatedOwner.id,full_name:"Outra cliente sintética J4",status:"active",
  });
  insert("client_assignments",{client_id:clientId,staff_profile_id:staff.id});
  insert("client_assignments",{client_id:otherClientId,staff_profile_id:unrelatedStaff.id});
  const totp=await enrollMfa(staff);
  const otherTotp=await enrollMfa(unrelatedStaff);
  // SQL-level structural checks in the disposable database. In particular,
  // the authorization helper must remain INVOKER (never a privileged bypass).
  expect(sql("select prosecdef from pg_proc where oid='app_private.can_select_meal_doses_for_meal(uuid)'::regprocedure;")).toBe("f");
  expect(sql("select has_table_privilege('anon','public.meal_dose_allocations','SELECT');")).toBe("f");
  expect(sql("select has_function_privilege('anon','app_private.can_select_meal_doses_for_meal(uuid)','EXECUTE');")).toBe("f");

  const adminCtx=await browser.newContext({
    baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  });
  const clientCtx=await browser.newContext({
    baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  });
  const otherCtx=await browser.newContext({baseURL});
  const anonCtx=await browser.newContext({baseURL});
  const apiOther=anonClient();
  try{
    const adminPage=await adminCtx.newPage();
    const clientPage=await clientCtx.newPage();
    const otherPage=await otherCtx.newPage();
    await loginAdminWithMfa(adminPage,{email:staff.email,password:staff.password,totpSecret:totp});
    await loginClient(clientPage,owner);
    await expect(clientPage.getByText("Nenhum protocolo foi publicado para você",{exact:true})).toBeVisible();

    const assessmentMethod=basicAssessmentMethod();
    let initialAssessment;
    await test.step("J3 finalized baseline precedes J4 professional publication",async()=>{
      initialAssessment=await finalizedSyntheticAssessment({
        page:adminPage,clientId,staffId:staff.id,assessedAt:"2026-09-21T12:00:00Z",
        weight:74,waist:84,method:assessmentMethod,
      });
      expect(rows("select id from public.protocol_publications where client_id="+quote(clientId)))
        .toEqual([]);
      expect(rows("select id from public.client_weekly_feedbacks where client_id="+quote(clientId)))
        .toEqual([]);
      await adminPage.goto("/admin/clientes/"+clientId+"/evolucao");
      await expect(adminPage.getByRole("heading",{name:"Evolução",exact:true})).toBeVisible();
      await mobileFit(adminPage);
    });

    let protocolId;
    let v1;
    let firstMealId;
    await test.step("Create first protocol and draft through authenticated admin UI",async()=>{
      await adminPage.goto("/admin/clientes/"+clientId+"/protocolos");
      await adminPage.getByRole("button",{name:"Criar primeiro protocolo"}).click();
      await expect(adminPage).toHaveURL(/\/admin\/protocolos\/[a-f0-9-]{36}/i);
      protocolId=new URL(adminPage.url()).pathname.split("/").at(-1);
      expect(UUID.test(protocolId)).toBe(true);
      v1=latestVersion(protocolId);
      expect(v1.version_number).toBe(1);
      expect(v1.submitted_for_review_at).toBeNull();
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Iniciar estrutura alimentar");
      await pollRows("select id from public.meal_plan_versions where protocol_version_id="+quote(v1.id),1);
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Adicionar variação",async form=>{
        await form.locator('input[name="label"]').fill("J4 Linear sintético");
      });
      const plan=rows("select id from public.meal_plan_versions where protocol_version_id="+quote(v1.id))[0];
      await pollRows("select id from public.meal_plan_variants where meal_plan_version_id="+quote(plan.id),1);
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Adicionar refeição",async form=>{
        await form.locator('input[name="label"]').fill("J4 Almoço sintético");
      });
      const variant=rows("select id from public.meal_plan_variants where meal_plan_version_id="+quote(plan.id))[0];
      await pollRows("select id from public.meals where meal_plan_variant_id="+quote(variant.id),1);
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Adicionar dose",async form=>{
        await form.locator('select[name="doseType"]').selectOption("protein");
        await form.locator('input[name="doseQuantity"]').fill("1.5");
      });
      const meal=rows("select id from public.meals where meal_plan_variant_id="+quote(variant.id))[0];
      firstMealId=meal.id;
      const doses=await pollRows("select id,dose_type,dose_quantity from public.meal_dose_allocations"+
        " where meal_id="+quote(meal.id),1);
      expect(doses[0].dose_type).toBe("protein");
      expect(Number(doses[0].dose_quantity)).toBe(1.5);
      traceSyntheticDoseRlsDepth(staff.id,{version:v1.id,plan:plan.id,variant:variant.id,meal:firstMealId});
      compareSyntheticDosePlans(staff.id,firstMealId);
      probeAuthenticatedDoseRead(staff.id,firstMealId,"draft");
      assertDoseRlsVisibility(staff.id,firstMealId,"aal2",1);
      assertDoseRlsVisibility(staff.id,firstMealId,"aal1",0);
      assertDoseRlsVisibility(unrelatedStaff.id,firstMealId,"aal2",0);
      // Prove revocation, not just non-access with an already-ended record:
      // the same AAL2 administrator can read while assigned and loses access
      // immediately after assignment closure. Everything is local synthetic.
      const revocableAssignmentId=insert("client_assignments",{
        client_id:clientId,
        staff_profile_id:unrelatedStaff.id,
      });
      assertDoseRlsVisibility(unrelatedStaff.id,firstMealId,"aal2",1);
      expect(sql("update public.client_assignments set ended_at=now()"+
        " where id="+quote(revocableAssignmentId)+" returning id;"))
        .toBe(revocableAssignmentId);
      assertDoseRlsVisibility(unrelatedStaff.id,firstMealId,"aal2",0);
      assertDoseRlsVisibility(owner.id,firstMealId,"aal1",0);
      assertDoseRlsVisibility(unrelatedOwner.id,firstMealId,"aal1",0);
      await mobileFit(adminPage);
    });

    await test.step("Before professional review, nothing becomes visible to the client",async()=>{
      await clientPage.reload();
      await expect(clientPage.getByText("Nenhum protocolo foi publicado para você",{exact:true})).toBeVisible();
      expect(rows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v1.id))).toEqual([]);
      expect(rows("select id from public.protocol_publications where protocol_version_id="+quote(v1.id))).toEqual([]);
    });

    await test.step("J2 feedback request remains blocked while J4 is still an unpublished draft",async()=>{
      await adminPage.goto("/admin/clientes/"+clientId+"/feedback-semanal");
      await expect(adminPage.getByRole("heading",{name:"Solicitar Feedback Semanal"})).toBeVisible();
      await expect(adminPage.getByRole("button",{name:"Aguardando primeiro protocolo"})).toBeDisabled();
      expect(rows("select id from public.client_weekly_feedbacks where client_id="+quote(clientId))).toEqual([]);
    });

    await test.step("Explicit submission and approval do not publish the draft",async()=>{
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"submit");
      await expect.poll(()=>latestVersion(protocolId).submitted_for_review_at!==null,{timeout:25000}).toBe(true);
      probeAuthenticatedDoseRead(staff.id,firstMealId,"submitted");
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"approve");
      await pollRows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v1.id),1);
      probeAuthenticatedDoseRead(staff.id,firstMealId,"approved");
      assertDoseRlsVisibility(owner.id,firstMealId,"aal1",0);
      await clientPage.reload();
      await expect(clientPage.getByText("Nenhum protocolo foi publicado para você",{exact:true})).toBeVisible();
      await mobileFit(adminPage);
    });

    let firstPublication;
    await test.step("Separate publication releases exactly the reviewed v1 snapshot",async()=>{
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"publish");
      firstPublication=(await pollRows("select id,protocol_version_id from public.protocol_publications"+
        " where protocol_version_id="+quote(v1.id),1))[0];
      expect(firstPublication.protocol_version_id).toBe(v1.id);
      assertDoseRlsVisibility(owner.id,firstMealId,"aal1",1);
      assertDoseRlsVisibility(staff.id,firstMealId,"aal1",0);
      assertDoseRlsVisibility(unrelatedOwner.id,firstMealId,"aal1",0);
      assertDoseRlsVisibility(unrelatedStaff.id,firstMealId,"aal2",0);
      const publicationResponse=await clientPage.reload();
      // A missing title could mean login redirect, server failure or a
      // render error, not necessarily absent publication. Record only a
      // categorical browser state and HTTP status (never page contents).
      await expect.poll(async()=>{
        if(await clientPage.getByRole("heading",{name:"Meu protocolo",exact:true}).count())
          return "page-rendered";
        const path=new URL(clientPage.url()).pathname;
        if(path==="/login")return "redirected-to-login";
        if(publicationResponse?.status()===500)return "server-http-500";
        if(publicationResponse && publicationResponse.status()>=400)
          return "server-http-"+publicationResponse.status();
        if(await clientPage.getByText("Application error",{exact:false}).count())
          return "render-error";
        if(await clientPage.getByRole("heading",{name:"Algo não carregou corretamente",exact:true}).count())
          return "client-error-boundary";
        if(await clientPage.locator('[data-nextjs-dialog-overlay]').count())
          return "nextjs-error-dialog";
        if(path!=="/cliente/protocolo")return "unexpected-route";
        // Only safe, quantitative DOM evidence: never extract page text,
        // HTML, error messages, tokens, IDs, URLs or nutritional data.
        const h1Count=await clientPage.locator("h1").count();
        const mainCount=await clientPage.locator("main").count();
        const noProtocol=await clientPage.getByText("Nenhum protocolo foi publicado para você",{exact:true}).count();
        const hasCurrent=await clientPage.getByRole("heading",{name:"Plano atual",exact:true}).count();
        const portalCount=await clientPage.locator("nextjs-portal").count();
        return "route-no-title:h1="+h1Count+";main="+mainCount+
          ";empty="+Number(noProtocol>0)+";current="+Number(hasCurrent>0)+
          ";portal="+Number(portalCount>0);
      },{timeout:16000}).toBe("page-rendered");
      await expect(clientPage.getByText("Nenhum protocolo foi publicado para você",{exact:true})).toHaveCount(0);
      await expect(clientPage.getByText("J4 Linear sintético").first()).toBeVisible();
      await expect(clientPage.getByText("J4 Almoço sintético").first()).toBeVisible();
      await mobileFit(clientPage);
    });

    let v2;
    let secondMealId;
    await test.step("Clone v1 to editable v2; immutable publication remains current",async()=>{
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Criar novo rascunho a partir desta versão");
      // Distinguish a rejected server action from delayed persistence without
      // logging responses, client data, credentials or SQL diagnostics.
      await expect.poll(async()=>{
        const saved=rows("select count(*)::int as total from public.protocol_versions"+
          " where protocol_id="+quote(protocolId))[0]?.total;
        if(saved===2)return "created";
        if(saved!==1)return "unexpected-version-count";
        const knownErrors=[
          ["access-denied","Esta versão não está acessível para sua atribuição atual."],
          ["source-not-frozen","Somente versões já submetidas e congeladas podem servir como base para um novo rascunho."],
          ["no-result","A nova versão não foi criada."],
          ["rpc-rejected","Não foi possível criar o novo rascunho. Confirme seu acesso, MFA e tente novamente."],
        ];
        for(const [code,visibleText] of knownErrors) {
          if(await adminPage.getByText(visibleText,{exact:true}).count())
            return "action-rejected:"+code;
        }
        if(await adminPage.getByText("Não foi possível criar o rascunho",{exact:true}).count())
          return "action-rejected:unknown";
        return "pending";
      },{timeout:25000}).toBe("created");
      v2=latestVersion(protocolId);
      expect(v2.version_number).toBe(2);
      expect(v2.submitted_for_review_at).toBeNull();
      expect(rows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v2.id))).toEqual([]);
      expect(rows("select id from public.protocol_publications where protocol_version_id="+quote(v2.id))).toEqual([]);
      const meal2=rows("select m.id from public.meals m"+
        " join public.meal_plan_variants v on v.id=m.meal_plan_variant_id"+
        " join public.meal_plan_versions p on p.id=v.meal_plan_version_id"+
        " where p.protocol_version_id="+quote(v2.id));
      expect(meal2).toHaveLength(1);
      secondMealId=meal2[0].id;
      assertDoseRlsVisibility(owner.id,secondMealId,"aal1",0);
      await openVersion(adminPage,protocolId,2);
      await actionFrom(adminPage,"Salvar dose",async form=>{
        await form.locator('input[name="doseQuantity"]').fill("2.25");
      });
      await expect.poll(()=>rows("select d.dose_quantity from public.meal_dose_allocations d"+
        " join public.meals m on m.id=d.meal_id"+
        " join public.meal_plan_variants v on v.id=m.meal_plan_variant_id"+
        " join public.meal_plan_versions p on p.id=v.meal_plan_version_id"+
        " where p.protocol_version_id="+quote(v2.id))[0]?.dose_quantity,{timeout:25000}).toBe(2.25);
      const savedV1=rows("select d.dose_quantity from public.meal_dose_allocations d"+
        " join public.meals m on m.id=d.meal_id"+
        " join public.meal_plan_variants v on v.id=m.meal_plan_variant_id"+
        " join public.meal_plan_versions p on p.id=v.meal_plan_version_id"+
        " where p.protocol_version_id="+quote(v1.id));
      expect(savedV1).toHaveLength(1);
      expect(Number(savedV1[0].dose_quantity)).toBe(1.5);
      assertDoseRlsVisibility(owner.id,secondMealId,"aal1",0);
      await clientPage.reload();
      await expect(clientPage.getByText("J4 Almoço sintético").first()).toBeVisible();
      expect(rows("select id from public.protocol_publications where client_id="+quote(clientId))).toHaveLength(1);
    });

    let secondPublication;
    await test.step("New v2 requires a fresh submission, approval, and publication",async()=>{
      await openVersion(adminPage,protocolId,2);
      await lifecycle(adminPage,"submit");
      await expect.poll(()=>latestVersion(protocolId).submitted_for_review_at!==null,{timeout:25000}).toBe(true);
      await openVersion(adminPage,protocolId,2);
      await lifecycle(adminPage,"approve");
      await pollRows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v2.id),1);
      assertDoseRlsVisibility(owner.id,secondMealId,"aal1",0);
      await clientPage.reload();
      expect(rows("select id from public.protocol_publications where client_id="+quote(clientId))).toHaveLength(1);
      await openVersion(adminPage,protocolId,2);
      await lifecycle(adminPage,"publish");
      secondPublication=(await pollRows("select id,protocol_version_id from public.protocol_publications"+
        " where protocol_version_id="+quote(v2.id),1))[0];
      assertDoseRlsVisibility(owner.id,secondMealId,"aal1",1);
      assertDoseRlsVisibility(owner.id,firstMealId,"aal1",1);
      assertDoseRlsVisibility(unrelatedOwner.id,secondMealId,"aal1",0);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading",{name:"Plano atual"})).toBeVisible();
      const history=clientPage.getByRole("navigation",{name:"Consultar versões publicadas"});
      await expect(history).toBeVisible();
      await expect(history.getByRole("link",{name:/Versão 1/})).toBeVisible();
      await history.getByRole("link",{name:/Versão 1/}).click();
      await expect(clientPage).toHaveURL(new RegExp("publicacao="+firstPublication.id));
      await expect(clientPage.getByRole("heading",{name:/Plano anterior · versão 1/})).toBeVisible();
      await clientPage.goto("/cliente/protocolo");
      await expect(clientPage.getByRole("heading",{name:"Plano atual"})).toBeVisible();
      expect(rows("select id from public.protocol_publications where client_id="+quote(clientId))).toHaveLength(2);
      await mobileFit(clientPage);
    });

    await test.step("Client and other admin cannot read private or foreign protocol versions",async()=>{
      await loginAdminWithMfa(otherPage,{
        email:unrelatedStaff.email,password:unrelatedStaff.password,totpSecret:otherTotp,
      });
      await otherPage.goto("/admin/protocolos/"+protocolId);
      await expect(otherPage.getByText("Página ou registro indisponível",{exact:true})).toBeVisible();
      await expect(otherPage.getByText("J4 Linear sintético")).toHaveCount(0);
      const anonymous=await anonCtx.newPage();
      await anonymous.goto("/cliente/protocolo");
      await expect(anonymous).toHaveURL(/\/login\/?$/);

      const signed=await apiOther.auth.signInWithPassword({
        email:unrelatedOwner.email,password:unrelatedOwner.password,
      });
      if(signed.error) throw signed.error;
      const privateVersions=await apiOther.from("protocol_versions")
        .select("id").eq("protocol_id",protocolId);
      if(privateVersions.error && privateVersions.error.code!=="42501") throw privateVersions.error;
      expect(privateVersions.data ?? []).toEqual([]);
      const privatePublications=await apiOther.from("protocol_publications")
        .select("id").eq("client_id",clientId);
      if(privatePublications.error && privatePublications.error.code!=="42501") throw privatePublications.error;
      expect(privatePublications.data ?? []).toEqual([]);

      const publications=rows("select id,protocol_version_id from public.protocol_publications"+
        " where client_id="+quote(clientId)+" order by published_at asc,id asc");
      expect(new Set(publications.map(x=>x.protocol_version_id))).toEqual(new Set([v1.id,v2.id]));
      expect(rows("select id from public.protocol_version_approvals"+
        " where client_id="+quote(clientId))).toHaveLength(2);
      expect(rows("select id from public.protocols where client_id="+quote(otherClientId))).toEqual([]);
      expect(rows("select id from public.client_weekly_feedbacks where client_id="+quote(clientId))).toEqual([]);
    });

    await test.step("J4 publication enables one real J2 request, client draft and duplicate prevention",async()=>{
      // Continue with the SAME authorized client and real published protocol
      // created above via the admin browser, not a seeded publication fixture.
      const periodStart="2026-10-05",periodEnd="2026-10-11";
      const feedbackRows=()=>rows("select id,client_id,request_source,requested_by_profile_id,"+
        "period_start,period_end,answers,submitted_at from public.client_weekly_feedbacks"+
        " where client_id="+quote(clientId)+" and period_start="+quote(periodStart));
      expect(feedbackRows()).toEqual([]);
      await adminPage.goto("/admin/clientes/"+clientId+"/feedback-semanal");
      await expect(adminPage.getByRole("heading",{name:"Solicitar Feedback Semanal"})).toBeVisible();
      const startInput=adminPage.getByLabel("Semana de referência · início");
      const endInput=adminPage.getByLabel("Semana de referência · fim");
      const requestButton=adminPage.getByRole("button",{name:"Criar solicitação"});
      await expect(requestButton).toBeEnabled();
      // The min attribute changes only after React hydrates the controlled form.
      await expect.poll(async()=>{
        await startInput.fill(periodStart);
        return endInput.getAttribute("min");
      },{timeout:20000}).toBe(periodStart);
      await endInput.fill(periodEnd);
      await expect(endInput).toHaveValue(periodEnd);
      await requestButton.click();
      await expect.poll(()=>feedbackRows().length,{timeout:30000}).toBe(1);
      const record=feedbackRows()[0];
      expect(record.id).toMatch(UUID);
      expect(record.client_id).toBe(clientId);
      expect(record.request_source).toBe("manual");
      expect(record.requested_by_profile_id).toBe(staff.id);
      expect(record.period_end).toBe(periodEnd);
      expect(record.submitted_at).toBeNull();
      expect(record.answers).toEqual({});
      expect(rows("select protocol_version_id from public.protocol_publications"+
        " where client_id="+quote(clientId))).toHaveLength(2);

      await clientPage.goto("/cliente/feedback-semanal");
      await expect(clientPage.getByRole("heading",{name:"Feedback Semanal",exact:true})).toBeVisible();
      const pending=clientPage.locator("#feedback-pendente-"+record.id);
      await expect(pending).toBeVisible();
      const answer=pending.locator('form [name="q01"]');
      await expect(answer).toBeVisible();
      await answer.fill("2");
      await pending.getByRole("button",{name:"Salvar rascunho"}).click();
      await expect.poll(()=>feedbackRows()[0]?.answers,{timeout:30000}).toEqual({q01:2});
      expect(feedbackRows()[0].submitted_at).toBeNull();
      await clientPage.reload();
      await expect(clientPage.locator("#feedback-pendente-"+record.id+
        ' form [name="q01"]')).toHaveValue("2");
      await mobileFit(clientPage);

      const otherRead=await apiOther.from("client_weekly_feedbacks").select("id").eq("id",record.id);
      if(otherRead.error && otherRead.error.code!=="42501") throw otherRead.error;
      expect(otherRead.data ?? []).toEqual([]);

      // Repeating the same period must return the existing authorized record,
      // not a second request or a modified submission.
      await adminPage.reload();
      await expect.poll(async()=>{
        await startInput.fill(periodStart);
        return endInput.getAttribute("min");
      },{timeout:20000}).toBe(periodStart);
      await endInput.fill(periodEnd);
      await requestButton.click();
      await expect(adminPage.getByText("Solicitação já existente",{exact:true})).toBeVisible();
      expect(feedbackRows()).toHaveLength(1);
      expect(feedbackRows()[0].id).toBe(record.id);
      expect(feedbackRows()[0].answers).toEqual({q01:2});
      expect(feedbackRows()[0].submitted_at).toBeNull();
      expect(rows("select id from public.protocol_publications"+
        " where client_id="+quote(clientId))).toHaveLength(2);
    });

    await test.step("J3 re-evaluation after J4 publication and J2 draft remains independent",async()=>{
      const reevaluation=await finalizedSyntheticAssessment({
        page:adminPage,clientId,staffId:staff.id,assessedAt:"2026-10-12T12:00:00Z",
        weight:72,waist:82,method:assessmentMethod,
      });
      expect(reevaluation.id).not.toBe(initialAssessment.id);
      const twoFinalized=rows("select id,finalized_at,method_configuration_snapshot_set_id"+
        " from public.client_assessments where client_id="+quote(clientId)+
        " order by assessed_at asc,id asc");
      expect(twoFinalized).toHaveLength(2);
      expect(twoFinalized.map(item=>item.id)).toEqual([
        initialAssessment.id,reevaluation.id,
      ]);
      expect(twoFinalized.every(item=>item.finalized_at&&item.method_configuration_snapshot_set_id))
        .toBe(true);

      const compareRoute="/admin/clientes/"+clientId+"/avaliacoes/comparar";
      await adminPage.goto(compareRoute);
      await expect(adminPage.getByRole("heading",{name:"Comparar duas avaliações"}))
        .toBeVisible();
      await adminPage.locator('select[name="referencia"]')
        .selectOption(initialAssessment.id);
      await adminPage.locator('select[name="comparacao"]')
        .selectOption(reevaluation.id);
      await adminPage.getByRole("button",{name:"Comparar avaliações"}).click();
      await expect(adminPage.locator("#comparacao-resultados")).toBeVisible();
      const weights=adminPage.getByRole("row",{name:/Peso \(kg\)/});
      await expect(weights.getByRole("cell",{name:"74 kg"})).toBeVisible();
      await expect(weights.getByRole("cell",{name:"72 kg"})).toBeVisible();
      await expect(weights.getByRole("cell",{name:"-2 kg"})).toBeVisible();
      await mobileFit(adminPage);

      // A finalized assessment is historical evidence, never authorization
      // for an automatic phase change, publication or feedback submission.
      const publications=rows("select protocol_version_id from public.protocol_publications"+
        " where client_id="+quote(clientId));
      expect(publications).toHaveLength(2);
      expect(new Set(publications.map(x=>x.protocol_version_id)))
        .toEqual(new Set([v1.id,v2.id]));
      const existingFeedback=rows("select id,answers,submitted_at from public.client_weekly_feedbacks"+
        " where client_id="+quote(clientId));
      expect(existingFeedback).toHaveLength(1);
      expect(existingFeedback[0].answers).toEqual({q01:2});
      expect(existingFeedback[0].submitted_at).toBeNull();

      // The other client and unrelated AAL2 professional are never granted
      // these client-scoped assessments by the re-evaluation.
      const otherRead=await apiOther.from("client_assessments")
        .select("id").in("id",[initialAssessment.id,reevaluation.id]);
      if(otherRead.error&&otherRead.error.code!=="42501")throw otherRead.error;
      expect(otherRead.data??[]).toEqual([]);
      await otherPage.goto(compareRoute+"?referencia="+initialAssessment.id+
        "&comparacao="+reevaluation.id);
      await expect(otherPage.getByText("Página ou registro indisponível",{exact:true}))
        .toBeVisible();
      expect(rows("select id from public.client_assessments where client_id="+quote(otherClientId)))
        .toEqual([]);
    });
  }finally{
    await Promise.allSettled([adminCtx.close(),clientCtx.close(),otherCtx.close(),anonCtx.close()]);
    await apiOther.auth.signOut();
    // The CI workflow destroys this entire disposable local database;
    // do not delete production history or store synthetic secrets in logs.
  }
});
