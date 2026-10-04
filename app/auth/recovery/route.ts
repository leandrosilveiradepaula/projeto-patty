import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, pathname: string, invalid = false) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";

  if (invalid) {
    target.searchParams.set("error", "invalid");
  }

  return target;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");

  if (!code) {
    return NextResponse.redirect(redirectTo(request, "/redefinir-senha", true));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  return NextResponse.redirect(
    redirectTo(request, "/redefinir-senha", Boolean(error)),
  );
}
