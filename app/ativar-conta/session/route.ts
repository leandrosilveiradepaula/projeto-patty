import { NextResponse } from "next/server";

import { getCurrentAuthContext } from "@/lib/supabase/auth";

/**
 * After Supabase invite verification, a prefetched Server Component may still
 * represent the anonymous request. This endpoint reads the newly established
 * cookie on a fresh, uncached request. It NEVER trusts a role from the client,
 * URL, or user-editable JWT metadata.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCurrentAuthContext();
  const role = context?.role === "client" || context?.role === "admin"
    ? context.role
    : null;

  return NextResponse.json(
    { role },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Vary": "Cookie",
      },
    },
  );
}
