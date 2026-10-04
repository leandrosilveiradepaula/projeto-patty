import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function redirectTarget(request: NextRequest, invalid = false) {
  const target = request.nextUrl.clone();
  target.pathname = "/redefinir-senha";
  target.search = "";

  if (invalid) {
    target.searchParams.set("error", "invalid");
  }

  return target;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(redirectTarget(request, true));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  return NextResponse.redirect(redirectTarget(request, Boolean(error)));
}
