import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

function activationRedirect(request: NextRequest, invalid = false) {
  const target = request.nextUrl.clone();
  target.pathname = "/ativar-conta";
  target.search = "";

  if (invalid) {
    target.searchParams.set("error", "invalid");
  }

  return target;
}

function uncachedRedirect(request: NextRequest, invalid = false) {
  const response = NextResponse.redirect(activationRedirect(request, invalid));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "invite") {
    return uncachedRedirect(request, true);
  }

  // verifyOtp establishes the new session by writing cookies. They must be
  // attached to the *returned redirect response*, not to a different Next
  // response or an implicit cookie store that the redirect might discard.
  const response = uncachedRedirect(request);
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
    type: type as EmailOtpType,
  });

  // Never pass cookies from a rejected invitation to the activation page.
  if (error) return uncachedRedirect(request, true);
  return response;
}
