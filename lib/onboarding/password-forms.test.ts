import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accessPasswordIssues, parseAccessPasswordForm, readSingleStringFormValue } from "./validation.ts";

function data(password:string, confirmation:string) {
 const f=new FormData();f.set("password",password);f.set("passwordConfirmation",confirmation);return f;
}

test("valid completed passwords are accepted without returning confirmation",()=>{
 const r=parseAccessPasswordForm(data("novaSenha!2026","novaSenha!2026"));
 assert.deepEqual(r,{ok:true,password:"novaSenha!2026"});
});

test("password input bounds apply before any Auth update, including long values",()=>{
 for(const [a,b] of [["1234567","1234567"],["a".repeat(129),"a".repeat(129)],["senha-corretax","senha-diferentex"]]){
  const r=parseAccessPasswordForm(data(a,b));
  assert.equal(r.ok,false);
 }
});
test("password and confirmation errors distinguish fields without exposing password",()=>{
 assert.match(accessPasswordIssues("123","123").password??"",/8/);
 assert.match(accessPasswordIssues("senha-correta","senha-errada").passwordConfirmation??"",/coincidem/);
 assert.match(accessPasswordIssues("senha-correta","").passwordConfirmation??"",/Confirme/);
 assert.deepEqual(accessPasswordIssues("senha-correta","senha-correta"),{password:null,passwordConfirmation:null});
});
test("missing, duplicate, and file-valued credentials are all rejected",()=>{
 for(const key of ["password","passwordConfirmation"]) {
   const missing=data("senha-correta","senha-correta");missing.delete(key);
   assert.equal(parseAccessPasswordForm(missing).ok,false);
   const dup=data("senha-correta","senha-correta");dup.append(key,"outro");
   assert.equal(parseAccessPasswordForm(dup).ok,false);
   const file=data("senha-correta","senha-correta");file.set(key,new Blob(["secret"]),"secret.txt");
   assert.equal(parseAccessPasswordForm(file).ok,false);
 }
});
test("single-value reader does not pick first of conflicting inputs",()=>{
 const f=new FormData();f.append("email","a@example.com");f.append("email","b@example.com");
 assert.equal(readSingleStringFormValue(f,"email"),null);
 f.delete("email");assert.equal(readSingleStringFormValue(f,"email"),null);
 f.set("email","valid@example.com");assert.equal(readSingleStringFormValue(f,"email"),"valid@example.com");
});

test("senha mínima do Supabase Free continua aceita, recomendação visual não altera a política",()=>{
 const minimum=data("12345678","12345678");
 assert.deepEqual(parseAccessPasswordForm(minimum),{ok:true,password:"12345678"});
 const maximum=data("x".repeat(128),"x".repeat(128));
 assert.equal(parseAccessPasswordForm(maximum).ok,true);
 assert.equal(parseAccessPasswordForm(data("x".repeat(129),"x".repeat(129))).ok,false);

 const form=readFileSync(new URL("../../components/auth/AccessPasswordForm.tsx",import.meta.url),"utf8");
 assert.match(form,/Mínimo de 8 caracteres atendido/);
 assert.match(form,/prefira uma senha longa e exclusiva/);
 assert.match(form,/O comprimento mínimo não garante que uma senha seja segura/);
 assert.equal((form.match(/minLength=\{8\}/g)??[]).length,2);
 assert.equal((form.match(/maxLength=\{128\}/g)??[]).length,2);
 assert.match(form,/disabled=\{pending\|\|!interactive\|\|!canSubmit\}/);
});
