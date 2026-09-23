import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function activationRedirect(request: NextRequest, invalid = false) {
  const target = request.nextUrl.clone();
  target.pathname = "/ativar-conta";
  target.search = "";

  if (invalid) {
    target.searchParams.set("error", "invalid");
  }

  return target;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "invite") {
    return NextResponse.redirect(activationRedirect(request, true));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  return NextResponse.redirect(activationRedirect(request, Boolean(error)));
}
