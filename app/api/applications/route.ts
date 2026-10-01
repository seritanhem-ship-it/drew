import { audit, ensureDatabase, getSql, publicApp, randomPublicId } from "../../../lib/applications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const amount = Number(body.requestedAmount);
    const purpose = String(body.purpose || "General loan request").trim();
    if (fullName.length < 3 || phone.length < 7 || !Number.isFinite(amount) || amount < 1000) return Response.json({ error: "Please check the required information and try again." }, { status: 400 });
    await ensureDatabase();
    const applicationId = randomPublicId("LN");
    const referenceId = randomPublicId("APP");
    const row = { application_id: applicationId, reference_id: referenceId, full_name: fullName, phone, email: body.email || null, loan_product: body.loanProduct, requested_amount: Math.round(amount), repayment_period: Number(body.repaymentPeriod), purpose, status: "SUBMITTED", membership_id: null };
    await getSql()`INSERT INTO loan_applications(application_id,reference_id,full_name,phone,email,loan_product,requested_amount,repayment_period,purpose) VALUES(${applicationId},${referenceId},${fullName},${phone},${body.email || null},${body.loanProduct},${Math.round(amount)},${Number(body.repaymentPeriod)},${purpose})`;
    await audit(applicationId, "APPLICATION_SUBMITTED", "applicant");
    let notificationSent = false;
    try { await notifyTelegram(row); notificationSent = true; } catch (error) { console.error("[telegram:notification] failed", { applicationId, error: String(error) }); }
    return Response.json({ ...publicApp(row), notificationSent });
  } catch (error) {
    console.error("[applications:submit] failed", { error: String(error), stack: error instanceof Error ? error.stack : undefined });
    return Response.json({ error: "We could not submit your application. Please try again." }, { status: 500 });
  }
}

async function notifyTelegram(row: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chat) throw new Error("Telegram production credentials are missing");
  const text = `📥 NEW APPLICATION\n\n👤 ${row.full_name}\n📱 ${row.phone}\n💼 ${row.loan_product}\n💰 DJF ${Number(row.requested_amount).toLocaleString("fr-DJ")}`;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chat, text, reply_markup: { inline_keyboard: [[{ text: "📄 View", callback_data: `view:${row.application_id}` }, { text: "🔐 Verify", callback_data: `verify:${row.application_id}` }, { text: "✖ Reject", callback_data: `reject:${row.application_id}` }]] } }) });
  const result = await response.json() as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !result.ok) throw new Error(`Telegram sendMessage failed (${response.status}): ${result.description || "Unknown Telegram error"}`);
  console.log("[telegram:notification] sent", { applicationId: row.application_id, messageId: result.result?.message_id });
}
