import assert from "node:assert/strict";
import test from "node:test";
import { liquidCorrectionSelection } from "./correction-selection.ts";

test("still-supported historical type stays selected, without inferred changes",()=>{
  assert.deepEqual(liquidCorrectionSelection("water",["water","zero"] ),{defaultValue:"water",requiresChoice:false});
});
test("removed type requires explicit valid selection instead of falling back",()=>{
  assert.deepEqual(liquidCorrectionSelection("old",["water","zero"] ),{defaultValue:"",requiresChoice:true});
  assert.deepEqual(liquidCorrectionSelection("old",[] ),{defaultValue:"",requiresChoice:true});
});
