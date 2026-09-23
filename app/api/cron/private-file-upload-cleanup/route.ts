import { cleanupExpiredClientFileUploadSessions } from "@/lib/files/private-file-cleanup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const result = await cleanupExpiredClientFileUploadSessions();

  return Response.json({
    ok: true,
    ...result,
  });
}
