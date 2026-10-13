import { deliverWeeklyFeedbackReminderEmails } from "@/lib/notifications/weekly-feedback-email-delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const result = await deliverWeeklyFeedbackReminderEmails();

  return Response.json({
    ok: result.configured && result.failed === 0,
    ...result,
  }, { status: !result.configured ? 503 : result.failed > 0 ? 207 : 200 });
}
