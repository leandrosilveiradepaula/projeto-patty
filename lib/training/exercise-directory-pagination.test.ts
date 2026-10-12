import assert from "node:assert/strict";
import test from "node:test";
import { readExerciseDirectoryPage, paginateExerciseDirectory, exerciseDirectoryPageHref } from "./exercise-admin-directory.ts";

test("exercise catalog navigation parses only bounded positive integers",()=>{
  assert.deepEqual(readExerciseDirectoryPage(undefined),{page:1,invalid:false});
  assert.deepEqual(readExerciseDirectoryPage("2"),{page:2,invalid:false});
  for (const raw of ["0","02","-1","1e3",["2"],"9999999",null]) {
    assert.deepEqual(readExerciseDirectoryPage(raw),{page:1,invalid:true});
  }
});

test("pagination includes versionless recovery records in a single global window",()=>{
  const entries=[...Array.from({length:30},(_,i)=>({type:"versioned",id:i})),{type:"incomplete",id:30}];
  const middle=paginateExerciseDirectory(entries,2);
  assert.deepEqual([middle.page,middle.pageCount,middle.total,middle.first,middle.last],[2,2,31,17,31]);
  assert.equal(middle.items.length,15);
  assert.equal(middle.items.at(-1)?.type,"incomplete");
  const out=paginateExerciseDirectory(entries,999);
  assert.equal(out.page,2);
  assert.equal(entries.length,31);
});

test("page URLs preserve validated filters, not sensitive record identifiers",()=>{
  assert.equal(exerciseDirectoryPageHref("Flexão", "draft",2),"/admin/exercicios?q=Flex%C3%A3o&status=draft&pagina=2#biblioteca-exercicios");
  assert.equal(exerciseDirectoryPageHref("", "all",1),"/admin/exercicios#biblioteca-exercicios");
});
