import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

function uncachedRecoveryRedirect(invalid = false) {
  // Keep the token hash out of redirects and avoid reconstructed internal
  // hosts: the browser must receive the session cookie for its own origin.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: invalid ? "/redefinir-senha?error=invalid" : "/redefinir-senha",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "recovery") {
    return uncachedRecoveryRedirect(true);
  }

  // The verification callback has to attach Set-Cookie to the response that
  // is actually returned; the generic RSC client cannot enforce this.
  const response = uncachedRecoveryRedirect();
  const { url, publishableKey } = getSupabasePublicConfig();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Referrer-Policy", "no-referrer");
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  // Reject invalid or consumed links without any incidental session cookies.
  if (error) return uncachedRecoveryRedirect(true);
  return response;
}
