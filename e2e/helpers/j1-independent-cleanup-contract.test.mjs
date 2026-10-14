import assert from "node:assert/strict";
import test from "node:test";
import { cleanupExactJ1Fixture } from "./j1-independent-cleanup.mjs";

const profileId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const draftId = "33333333-3333-4333-8333-333333333333";
const email = "e2e-onboarding-aabbccddeeff0011@example.invalid";
const env = { GITHUB_RUN_ID: "93402", GITHUB_RUN_ATTEMPT: "1", RUNNER_TEMP: "/tmp" };
function ledger() {
  return {runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,
    startedAt:Date.now()-1000,email,profileId,clientId};
}

function fakeStore({privileged=false,submitted=false,protocol=false,foreignClient=false}={}) {
  const tables = {
    profiles:[{id:profileId}],
    user_roles:[{profile_id:profileId,role:privileged?"admin":"client"}],
    clients:[{id:clientId,profile_id:foreignClient?"44444444-4444-4444-8444-444444444444":profileId}],
    client_assignments:[{client_id:clientId,staff_profile_id:"55555555-5555-4555-8555-555555555555"}],
    client_registration:[{client_id:clientId,city:"Cidade Sintetica"}],
    anamnesis_submissions:[{id:draftId,client_id:clientId,submitted_at:submitted?"2026-10-14T13:00:00Z":null}],
    anamnesis_answers:[{submission_id:draftId}],
    protocols:protocol?[{id:"66666666-6666-4666-8666-666666666666",client_id:clientId}]:[],
  };
  let authPresent=true;
  const mutations=[];
  const admin={
    auth:{admin:{
      async getUserById(id){
        if(id!==profileId) throw new Error("Unexpected Auth ID");
        return authPresent
          ? {data:{user:{id:profileId,email,created_at:new Date(Date.now()-1000).toISOString()}},error:null}
          : {data:null,error:{status:404}};
      },
      async deleteUser(id){
        if(id!==profileId) throw new Error("Unexpected Auth delete");
        authPresent=false;mutations.push({table:"auth.users",id});return {data:{},error:null};
      },
    }},
    from(table){
      if(!(table in tables))throw new Error("Unexpected table "+table);
      const q={action:"select",conditions:[],max:Infinity,
        select(){return q},
        eq(key,value){q.conditions.push(row=>row[key]===value);return q},
        is(key,value){q.conditions.push(row=>row[key]===value);return q},
        limit(n){q.max=n;return q},
        delete(){q.action="delete";return q},
        then(resolve,reject){
          try{
            const found=tables[table].filter(row=>q.conditions.every(f=>f(row))).slice(0,q.max);
            if(q.action==="delete"){
              const removed=new Set(found);
              tables[table]=tables[table].filter(row=>!removed.has(row));
              mutations.push({table,count:found.length});
            }
            resolve({data:found,error:null});
          }catch(e){reject(e)}
        },
      };return q;
    },
  };
  return {admin,tables,mutations,authPresent:()=>authPresent};
}

test("independent cleanup removes only the exact validated synthetic fixture and verifies its Auth deletion",async()=>{
  const fake=fakeStore();
  const result=await cleanupExactJ1Fixture(fake.admin,ledger(),env);
  assert.equal(result,"cleaned");
  assert.equal(fake.authPresent(),false);
  for(const [table,rows] of Object.entries(fake.tables)){
    assert.deepEqual(rows,[],table);
  }
  assert.deepEqual(fake.mutations.map(x=>x.table),[
    "anamnesis_answers","anamnesis_submissions","client_registration",
    "client_assignments","clients","user_roles","profiles","auth.users",
  ]);
  assert.equal(await cleanupExactJ1Fixture(fake.admin,ledger(),env),"already-clean");
});

test("cleanup rejects all privileged or clinical history cases before its first delete",async()=>{
  for(const [scenario,reason] of [
    [{privileged:true},/non-client privileges/],
    [{submitted:true},/submitted clinical Anamnese/],
    [{protocol:true},/professional protocol/],
    [{foreignClient:true},/ledger Client belongs to another identity/],
  ]){
    const fake=fakeStore(scenario);
    await assert.rejects(cleanupExactJ1Fixture(fake.admin,ledger(),env),reason);
    assert.deepEqual(fake.mutations,[],JSON.stringify(scenario));
    assert.equal(fake.authPresent(),true);
  }
});

test("cleanup cannot be redirected to a different Auth UUID or email",async()=>{
  const fake=fakeStore();
  await assert.rejects(cleanupExactJ1Fixture(fake.admin,{...ledger(),email:"person@example.com"},env),/not owned/);
  await assert.rejects(cleanupExactJ1Fixture(fake.admin,{
    ...ledger(),clientId:"77777777-7777-4777-8777-777777777777",
  },env),/Client ownership mismatch/);
  assert.equal(fake.mutations.length,0);
});
