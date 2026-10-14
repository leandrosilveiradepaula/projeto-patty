import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cleanupExactJ1Fixture } from "./j1-independent-cleanup.mjs";
import { fixtureLedgerPath, validateFixtureLedger, writeFixtureLedger,
  readFixtureLedger, removeFixtureLedger } from "./j1-fixture-ledger.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const email = "e2e-onboarding-aabbccddeeff0011@example.invalid";
const env = {GITHUB_RUN_ID:"745",GITHUB_RUN_ATTEMPT:"2",RUNNER_TEMP:"/tmp"};
function fixture(fields={}) {
 return {runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,
   startedAt:Date.now(),email,profileId:null,clientId:null,...fields};
}

test("ledger rejects wrong run, expired entries, unknown email, and other identities",()=>{
 assert.equal(validateFixtureLedger(fixture(),env).email,email);
 for(const bad of [
   {runId:"else"}, {attempt:"1"}, {email:"someone@example.com"},
   {email:"e2e-onboarding-abc@example.invalid"},
   {profileId:"abc"}, {clientId:"abc"},
   {startedAt:Date.now()-9*3600*1000}, {startedAt:Date.now()+180000}
 ]) assert.throws(()=>validateFixtureLedger(fixture(bad),env),/not owned/,JSON.stringify(bad));
 assert.throws(()=>fixtureLedgerPath({RUNNER_TEMP:"/tmp",GITHUB_RUN_ID:"no",GITHUB_RUN_ATTEMPT:"1"}));
});

test("atomic ledger survives a killed browser in owner-only temporary file",async()=>{
 const folder=await mkdtemp(join(tmpdir(),"j1-ledger-test-"));
 const isolated={...env,RUNNER_TEMP:folder};
 try {
   await writeFixtureLedger(fixture(),isolated);
   const recorded=fixture({profileId:id,clientId:"22222222-2222-4222-8222-222222222222"});
   await writeFixtureLedger(recorded,isolated);
   assert.equal((await readFixtureLedger(isolated)).clientId,recorded.clientId);
   const info=await stat(fixtureLedgerPath(isolated));
   assert.equal(info.mode & 0o777,0o600);
   await removeFixtureLedger(isolated);
   await assert.rejects(readFixtureLedger(isolated),/ENOENT/);
 } finally {
   const { rm }=await import("node:fs/promises");
   await rm(folder,{recursive:true,force:true});
 }
});

test("a foreign Auth identity fails closed before any database mutation",async()=>{
 let dbReads=0;
 const admin={
  auth:{admin:{getUserById:async()=>({error:null,
    data:{user:{id,email:"real.user@example.com",created_at:new Date().toISOString()}}})}},
  from(){dbReads++;throw new Error("No DB access should occur");}
 };
 await assert.rejects(cleanupExactJ1Fixture(admin,fixture({profileId:id}),env),
   /Auth ID and fixture email disagree/);
 assert.equal(dbReads,0);
});

test("an already deleted synthetic Auth cannot conceal remaining Client state",async()=>{
 const admin={
  auth:{admin:{getUserById:async()=>({error:{status:404},data:null})}},
  from(table){return {
    select(){return {eq(){return Promise.resolve({error:null,
      data:table==="clients"?[{id:"22222222-2222-4222-8222-222222222222"}]:[]});}};}
  };}
 };
 await assert.rejects(cleanupExactJ1Fixture(admin,fixture({profileId:id}),env),
   /Orphaned synthetic profile\/client/);
});
