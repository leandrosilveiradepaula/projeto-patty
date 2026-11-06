import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";
import { getHistoricalBatchReconciliation } from "@/lib/imports/historical-batch-report-server";
import { historicalBatchCsv } from "@/lib/imports/historical-batch-reconciliation";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  await requireRole("admin"); // Identity, relational role and MFA AAL2 before reading any data.
  const keys=[...request.nextUrl.searchParams.keys()];
  const batchId=request.nextUrl.searchParams.get("batch");
  if(keys.length!==1||keys[0]!=="batch"||!batchId||!isUuid(batchId)){
    return NextResponse.json({error:"invalid_batch"},{status:400,headers:{"Cache-Control":"private, no-store"}});
  }
  const report=await getHistoricalBatchReconciliation(batchId);
  if(!report){
    return NextResponse.json({error:"reconciliation_unavailable"},{
      status:404,headers:{"Cache-Control":"private, no-store"},
    });
  }
  // No medical values, names, email, paths or role secrets. Even a partial
  // report explicitly labels unavailable domains and never claims completion.
  return new NextResponse(historicalBatchCsv(report),{
    status:200,headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":"attachment; filename=\"reconciliacao-inicial.csv\"",
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
