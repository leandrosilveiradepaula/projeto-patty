import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(new URL("../../components/auth/AccessPasswordForm.tsx",import.meta.url),"utf8");
const smoke = readFileSync(new URL("../../e2e/client-onboarding-activation.spec.mjs",import.meta.url),"utf8");

test("activation and reset use a hydrated interactive form before accepting credentials",()=>{
 assert.match(form,/const \[interactive,setInteractive\]=useState\(false\)/);
 assert.match(form,/useEffect\(\(\)=>\{setInteractive\(true\)\},\[\]\)/);
 assert.match(form,/data-interactive=\{interactive\?"true":"false"\}/);
 assert.match(form,/aria-busy=\{pending\|\|!interactive\}/);
 assert.match(form,/if\(inFlight\.current\|\|pending\|\|!interactive\|\|!canSubmit\)/);
 assert.equal(form.split("disabled={pending||!interactive}").length-1,4);
 assert.match(form,/disabled=\{pending\|\|!interactive\|\|!canSubmit\}/);
 assert.match(form,/Preparando formulário para digitação/);
});

test("synthetic J1 activation waits for hydration without logging passwords or one-time tokens",()=>{
 assert.match(smoke,/form\[data-interactive="true"\]/);
 assert.match(smoke,/await expect\(activate\)\.toBeEnabled\(\{timeout:10_000\}\)/);
 assert.match(smoke,/await activate\.click\(\)/);
 assert.doesNotMatch(smoke,/console\.(?:log|warn|error)\((?:password|tokenHash|activationLink)/);
});
