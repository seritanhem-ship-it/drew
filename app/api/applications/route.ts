import { env } from "cloudflare:workers";
import { audit, ensureDatabase, publicApp, randomPublicId } from "../../../lib/applications";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const amount = Number(body.requestedAmount);
    const purpose = String(body.purpose || "").trim();
    if (fullName.length < 3 || phone.length < 7 || !Number.isFinite(amount) || amount < 1000 || purpose.length < 10) {
      return Response.json({ error: "Please check the required information and try again." }, { status: 400 });
    }
    await ensureDatabase();
    const applicationId = randomPublicId("LN");
    const referenceId = randomPublicId("APP");
    const row = {
      application_id: applicationId, reference_id: referenceId, full_name: fullName, phone,
      email: body.email || null, loan_product: body.loanProduct, requested_amount: Math.round(amount),
      repayment_period: Number(body.repaymentPeriod), purpose, status: "SUBMITTED", membership_id: null,
    };
    await env.DB.prepare(`INSERT INTO loan_applications
      (application_id, reference_id, full_name, phone, email, loan_product, requested_amount, repayment_period, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(applicationId, referenceId, fullName, phone, body.email || null, body.loanProduct, Math.round(amount), Number(body.repaymentPeriod), purpose).run();
    await audit(applicationId, "APPLICATION_SUBMITTED", "applicant");
    await notifyTelegram(row).catch(() => undefined);
    return Response.json(publicApp(row));
  } catch {
    return Response.json({ error: "We could not submit your application. Please try again." }, { status: 500 });
  }
}

async function notifyTelegram(row: Record<string, unknown>) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  const text = `🔔 NEW LOAN APPLICATION\n\nApplication: ${row.application_id}\nApplicant: ${row.full_name}\nReference: ${row.reference_id}\nPhone: ${row.phone}\nLoan: ${row.loan_product}\nRequested: ETB ${Number(row.requested_amount).toLocaleString()}\n\nStatus: PENDING REVIEW`;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text, reply_markup: { inline_keyboard: [[{ text: "🔎 View details", callback_data: `view:${row.application_id}` }], [{ text: "✅ Approve for verification", callback_data: `verify:${row.application_id}` }, { text: "❌ Reject", callback_data: `reject:${row.application_id}` }]] } }) });
}
