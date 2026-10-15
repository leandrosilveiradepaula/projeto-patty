import assert from "node:assert/strict";
import test from "node:test";
import { cleanupExactJ1PrivateFiles, verifyDisposablePrivateFileSet } from "./j1-private-file-cleanup.mjs";

const clientId="11111111-1111-4111-8111-111111111111";
const profileId="22222222-2222-4222-8222-222222222222";
const fileId="33333333-3333-4333-8333-333333333333";
const sessionId="44444444-4444-4444-8444-444444444444";
const email="e2e-onboarding-aabbccddeeff0011@example.invalid";
const name="e2e-j1-aabbccddeeff0011.png";
const file={id:fileId,client_id:clientId,uploaded_by_profile_id:profileId,client_visibility_set_by_profile_id:profileId,bucket_id:"client-private",file_kind:"photo",original_filename:name,object_path:`clients/${clientId}/photo/${fileId}.png`};
const session={id:sessionId,client_id:clientId,requester_profile_id:profileId,file_kind:"photo",original_filename:name,temp_object_path:`pending/${clientId}/${sessionId}.png`};
function input(overrides={}){return {clientId,profileId,email,files:[file],sessions:[session],accessEvents:[],...overrides};}

function fakeAdmin(overrides={}){
 const tables={client_files:[file],client_file_upload_sessions:[session],client_file_access_events:[],...overrides};
 const mutations=[];
 const admin={
  storage:{from(bucket){assert.equal(bucket,"client-private");return {async remove(paths){mutations.push({type:"storage",paths});return {error:null}}}}},
  from(table){
   assert.ok(Object.hasOwn(tables,table),table);
   const f={action:"select",rules:[],count:Infinity,
    select(){return f},eq(key,value){f.rules.push(x=>x[key]===value);return f},
    limit(n){f.count=n;return f},delete(){f.action="delete";return f},
    then(resolve,reject){
     try{
      const found=tables[table].filter(x=>f.rules.every(rule=>rule(x))).slice(0,f.count);
      if(f.action==="delete"){
       tables[table]=tables[table].filter(x=>!found.includes(x));
       mutations.push({type:"delete",table,ids:found.map(x=>x.id)});
      }
      resolve({data:found,error:null});
     }catch(e){reject(e)}
    },
   };
   return f;
  },
 };
 return {admin,tables,mutations};
}

test("J1 file cleanup verifies exact path, owner, synthetic name, kind and release actor",()=>{
 const plan=verifyDisposablePrivateFileSet(input());
 assert.deepEqual(plan.files,[{id:fileId,path:file.object_path}]);
 assert.deepEqual(plan.sessions,[{id:sessionId,path:session.temp_object_path}]);
 for(const changed of [
  {email:"real-person@example.com"},
  {files:[{...file,client_id:profileId}]},
  {files:[{...file,uploaded_by_profile_id:clientId}]},
  {files:[{...file,client_visibility_set_by_profile_id:clientId}]},
  {files:[{...file,original_filename:"exame-pessoal.pdf"}]},
  {files:[{...file,object_path:`clients/${profileId}/photo/${fileId}.png`}]},
  {files:[{...file,file_kind:"exam"}]},
  {sessions:[{...session,requester_profile_id:clientId}]},
  {sessions:[{...session,original_filename:"different.png"}]},
  {accessEvents:[{id:"audit"}]},
  {files:[file,file]},
  {sessions:[session,session]},
 ]){
  assert.throws(()=>verifyDisposablePrivateFileSet(input(changed)),/Refusing/);
 }
});

test("only exact verified private object and session are deleted, then absence is checked",async()=>{
 const fake=fakeAdmin();
 assert.equal(await cleanupExactJ1PrivateFiles(fake.admin,{clientId,profileId,email}),1);
 assert.deepEqual(fake.tables.client_files,[]);
 assert.deepEqual(fake.tables.client_file_upload_sessions,[]);
 assert.deepEqual(fake.mutations,[
  {type:"storage",paths:[file.object_path,session.temp_object_path]},
  {type:"delete",table:"client_files",ids:[fileId]},
  {type:"delete",table:"client_file_upload_sessions",ids:[sessionId]},
 ]);
 assert.equal(await cleanupExactJ1PrivateFiles(fake.admin,{clientId,profileId,email}),0);
});

test("foreign private files and audited records block all destructive mutations",async()=>{
 for(const patch of [
  {client_files:[{...file,uploaded_by_profile_id:clientId}]},
  {client_files:[{...file,file_kind:"document"}]},
  {client_file_upload_sessions:[{...session,client_id:profileId}]},
  {client_file_access_events:[{id:"audit"}]},
  {client_files:[file,file]},
 ]){
  const fake=fakeAdmin(patch);
  await assert.rejects(cleanupExactJ1PrivateFiles(fake.admin,{clientId,profileId,email}),/Refusing/);
  assert.deepEqual(fake.mutations,[]);
 }
});
