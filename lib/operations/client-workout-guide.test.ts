import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync(new URL("../../app/cliente/treino/page.tsx",import.meta.url),"utf8");
const guide=readFileSync(new URL("../../components/client/ClientWorkoutGuide.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../../app/cliente/treino/page.module.css",import.meta.url),"utf8");

test("published workout guide receives exclusively already authorized current version items",()=>{
 assert.match(page, /<ClientWorkoutGuide items=\{workoutGuideItems\} \/>/);
 assert.ok(page.includes("publishedTrainingVersions(trainingVersions)"));
 assert.ok(page.includes("publishedItems[0]?.items ?? []"));
 assert.ok(page.includes("trainingItems.length === 0"));
 assert.ok(page.includes("item.exercise_version_id"));
 assert.ok(page.includes("videoByExerciseVersionId.get(item.exercise_version_id)"));
});
test("client can navigate published exercises without generating adherence data or modifying history",()=>{
 assert.ok(guide.includes("useState(items[0]?.id"));
 assert.ok(guide.includes('aria-current={currentIndex === index ? "step" : undefined}'));
 assert.ok(guide.includes("Exercício anterior"));
 assert.ok(guide.includes("Próximo exercício"));
 assert.ok(guide.includes("document.getElementById"));
 assert.ok(guide.includes("current.execution_notes"));
 assert.doesNotMatch(guide,/fetch\(|localStorage|sessionStorage|setItem\(/);
});
test("guide stays accessible on mobile and respects published free-text exercise notes",()=>{
 assert.match(css,/scroll-snap-type: x proximity/);
 assert.match(css,/@media \(max-width: 640px\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/overflow-wrap: anywhere/);
});
