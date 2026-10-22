import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

function uncachedRecoveryRedirect(invalid = false) {
  // Only use a relative, fixed Location: NextRequest.nextUrl may reconstruct
  // a different internal host than the browser's origin. Never propagate
  // the one-time code, flow ID, request host, or token to the destination.
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
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");

  if (!code) return uncachedRecoveryRedirect(true);

  // PKCE exchanges establish the session via Set-Cookie. Cookies need to be
  // set on the exact redirect response returned to the browser; using a
  // generic server client followed by a separate redirect can lose them.
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

  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  // Failed exchanges must never return cookies written to the success response.
  if (error) return uncachedRecoveryRedirect(true);
  return response;
}
