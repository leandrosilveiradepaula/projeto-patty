import {randomBytes} from "node:crypto";
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
const fixtureTables=new Set(["profiles","user_roles","clients","client_assignments"]);
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
async function mobileFit(page){
  const s=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
  }));
  expect(s.scroll,"Protocol workspace must fit a mobile viewport")
    .toBeLessThanOrEqual(s.width+1);
}
async function actionFrom(page,buttonName,callback){
  const form=page.locator("form").filter({
    has:page.getByRole("button",{name:buttonName,exact:true}),
  });
  await expect(form).toHaveCount(1);
  if(callback) await callback(form);
  await form.getByRole("button",{name:buttonName,exact:true}).click();
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
}
function latestVersion(protocolId){
  const items=rows("select id,version_number,submitted_for_review_at from public.protocol_versions"+
    " where protocol_id="+quote(protocolId)+" order by version_number asc");
  if(!items.length)throw new Error("No J4 protocol version was persisted");
  return items.at(-1);
}
async function openVersion(page,protocolId,number){
  await page.goto("/admin/protocolos/"+protocolId+"?versao="+number);
  const container=page.locator("#versao-"+number);
  await expect(container).toBeVisible();
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
    await expect(clientPage.getByRole("heading",{
      name:"Nenhum protocolo foi publicado para você",
    })).toBeVisible();

    let protocolId;
    let v1;
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
      const doses=await pollRows("select id,dose_type,dose_quantity from public.meal_dose_allocations"+
        " where meal_id="+quote(meal.id),1);
      expect(doses[0].dose_type).toBe("protein");
      expect(Number(doses[0].dose_quantity)).toBe(1.5);
      await mobileFit(adminPage);
    });

    await test.step("Before professional review, nothing becomes visible to the client",async()=>{
      await clientPage.reload();
      await expect(clientPage.getByRole("heading",{
        name:"Nenhum protocolo foi publicado para você",
      })).toBeVisible();
      expect(rows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v1.id))).toEqual([]);
      expect(rows("select id from public.protocol_publications where protocol_version_id="+quote(v1.id))).toEqual([]);
    });

    await test.step("Explicit submission and approval do not publish the draft",async()=>{
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"submit");
      await expect.poll(()=>latestVersion(protocolId).submitted_for_review_at!==null,{timeout:25000}).toBe(true);
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"approve");
      await pollRows("select id from public.protocol_version_approvals where protocol_version_id="+quote(v1.id),1);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading",{
        name:"Nenhum protocolo foi publicado para você",
      })).toBeVisible();
      await mobileFit(adminPage);
    });

    let firstPublication;
    await test.step("Separate publication releases exactly the reviewed v1 snapshot",async()=>{
      await openVersion(adminPage,protocolId,1);
      await lifecycle(adminPage,"publish");
      firstPublication=(await pollRows("select id,protocol_version_id from public.protocol_publications"+
        " where protocol_version_id="+quote(v1.id),1))[0];
      expect(firstPublication.protocol_version_id).toBe(v1.id);
      await clientPage.reload();
      await expect(clientPage.getByRole("heading",{name:"Meu protocolo"})).toBeVisible();
      await expect(clientPage.getByRole("heading",{name:"Nenhum protocolo foi publicado para você"})).toHaveCount(0);
      await expect(clientPage.getByText("J4 Linear sintético").first()).toBeVisible();
      await expect(clientPage.getByText("J4 Almoço sintético").first()).toBeVisible();
      await mobileFit(clientPage);
    });

    let v2;
    await test.step("Clone v1 to editable v2; immutable publication remains current",async()=>{
      await openVersion(adminPage,protocolId,1);
      await actionFrom(adminPage,"Criar novo rascunho a partir desta versão");
      await expect.poll(()=>rows("select count(*)::int as total from public.protocol_versions"+
        " where protocol_id="+quote(protocolId))[0]?.total,{timeout:25000}).toBe(2);
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
      await clientPage.reload();
      expect(rows("select id from public.protocol_publications where client_id="+quote(clientId))).toHaveLength(1);
      await openVersion(adminPage,protocolId,2);
      await lifecycle(adminPage,"publish");
      secondPublication=(await pollRows("select id,protocol_version_id from public.protocol_publications"+
        " where protocol_version_id="+quote(v2.id),1))[0];
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
      if(!privateVersions.error) expect(privateVersions.data).toEqual([]);
      const privatePublications=await apiOther.from("protocol_publications")
        .select("id").eq("client_id",clientId);
      if(!privatePublications.error) expect(privatePublications.data).toEqual([]);

      const publications=rows("select id,protocol_version_id from public.protocol_publications"+
        " where client_id="+quote(clientId)+" order by published_at asc,id asc");
      expect(new Set(publications.map(x=>x.protocol_version_id))).toEqual(new Set([v1.id,v2.id]));
      expect(rows("select id from public.protocol_version_approvals"+
        " where client_id="+quote(clientId))).toHaveLength(2);
      expect(rows("select id from public.protocols where client_id="+quote(otherClientId))).toEqual([]);
    });
  }finally{
    await Promise.allSettled([adminCtx.close(),clientCtx.close(),otherCtx.close(),anonCtx.close()]);
    await apiOther.auth.signOut();
    // The CI workflow destroys this entire disposable local database;
    // do not delete production history or store synthetic secrets in logs.
  }
});
