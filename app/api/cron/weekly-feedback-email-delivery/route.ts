import { deliverWeeklyFeedbackReminderEmails } from "@/lib/notifications/weekly-feedback-email-delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const result = await deliverWeeklyFeedbackReminderEmails({
    appOrigin: origin,
  });

  return Response.json({
    ok: true,
    ...result,
  });
}
