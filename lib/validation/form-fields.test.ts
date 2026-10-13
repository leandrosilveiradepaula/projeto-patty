import assert from "node:assert/strict";
import test from "node:test";
import { readSingleStringFormValue, isSingleConfirmedFormValue } from "./form-fields.ts";

test("accepts one exact string and explicit confirmation", () => {
 const data=new FormData();data.set("confirmPublication","yes");data.set("doseQuantity","1.5");
 assert.equal(readSingleStringFormValue(data,"doseQuantity"),"1.5");
 assert.equal(isSingleConfirmedFormValue(data,"confirmPublication"),true);
});
test("rejects missing, duplicated and file-valued sensitive inputs",()=>{
 const data=new FormData();
 assert.equal(readSingleStringFormValue(data,"doseQuantity"),null);
 data.set("doseQuantity","1");data.append("doseQuantity","2");
 assert.equal(readSingleStringFormValue(data,"doseQuantity"),null);
 data.set("confirmPublication","yes");data.append("confirmPublication","yes");
 assert.equal(isSingleConfirmedFormValue(data,"confirmPublication"),false);
 data.set("confirmPublication",new Blob(["yes"]),"confirmation.txt");
 assert.equal(isSingleConfirmedFormValue(data,"confirmPublication"),false);
 data.set("confirmPublication","no");
 assert.equal(isSingleConfirmedFormValue(data,"confirmPublication"),false);
});
