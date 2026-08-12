import { env } from "cloudflare:workers";
import { findApplication, publicApp, setStatus, sha256 } from "../../../lib/applications";

export async function POST(request: Request) {
  if (env.TELEGRAM_WEBHOOK_SECRET && request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Forbidden", { status: 403 });
  const update = await request.json() as any;
  const actor = String(update.callback_query?.from?.id || update.message?.from?.id || "");
  const chatId = String(update.callback_query?.message?.chat?.id || update.message?.chat?.id || "");
  if (!env.TELEGRAM_ADMIN_USER_ID || actor !== String(env.TELEGRAM_ADMIN_USER_ID) || chatId !== String(env.TELEGRAM_ADMIN_CHAT_ID)) return new Response("OK");
  const callback = String(update.callback_query?.data || "");
  if (!callback) return new Response("OK");
  const [action, applicationId] = callback.split(":");
  const row = await findApplication(applicationId);
  if (!row) return new Response("OK");
  let text = ""; let keyboard: any = undefined;
  if (action === "view") {
    text = `📋 LOAN APPLICATION\n\nApplication: ${row.application_id}\nApplicant: ${row.full_name}\nReference: ${row.reference_id}\nPhone: ${row.phone}\nLoan: ${row.loan_product}\nRequested: ETB ${row.requested_amount.toLocaleString()}\nRepayment: ${row.repayment_period} months\nPurpose: ${row.purpose}\nStatus: ${row.status}`;
    keyboard = { inline_keyboard: [[{ text: "✅ Approve for verification", callback_data: `verify:${applicationId}` }, { text: "❌ Reject", callback_data: `reject:${applicationId}` }]] };
  } else if (action === "verify" && ["SUBMITTED", "UNDER_REVIEW"].includes(row.status)) {
    await setStatus(applicationId, "VERIFICATION_REQUIRED"); text = `✅ APPROVED FOR VERIFICATION\n\nApplication: ${applicationId}\nApplicant: ${row.full_name}`; keyboard = { inline_keyboard: [[{ text: "🔐 Generate OTP", callback_data: `otp:${applicationId}` }]] };
  } else if (action === "otp" && row.status === "VERIFICATION_REQUIRED") {
    const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    await env.DB.prepare("UPDATE loan_applications SET otp_hash = ?, otp_expires_at = ?, otp_attempts = 0, status = 'OTP_PENDING' WHERE application_id = ?").bind(await sha256(otp), Date.now() + 600000, applicationId).run();
    text = `🔐 OTP GENERATED\n\nApplication: ${applicationId}\nApplicant: ${row.full_name}\nOTP: ${otp}\nExpires in: 10 minutes\n\nSend this OTP manually to the applicant.`;
  } else if (action === "reject" && !["DISBURSED", "REJECTED"].includes(row.status)) {
    await setStatus(applicationId, "REJECTED"); text = `❌ APPLICATION REJECTED\n\nApplication: ${applicationId}\nApplicant: ${row.full_name}`;
  } else if (action === "approve" && row.status === "FINAL_APPROVAL_PENDING") {
    await setStatus(applicationId, "APPROVED"); text = `🎉 LOAN APPROVED\n\nApplication: ${applicationId}\nApplicant: ${row.full_name}\nAmount: ETB ${row.requested_amount.toLocaleString()}`; keyboard = { inline_keyboard: [[{ text: "💸 Mark as disbursed", callback_data: `disburse:${applicationId}` }]] };
  } else if (action === "disburse" && ["APPROVED", "AWAITING_DISBURSEMENT"].includes(row.status)) {
    await setStatus(applicationId, "DISBURSED"); text = `💰 LOAN DISBURSED\n\nApplication: ${applicationId}\nApplicant: ${row.full_name}\nAmount: ETB ${row.requested_amount.toLocaleString()}`;
  } else return new Response("OK");
  await editTelegram(update.callback_query.message.chat.id, update.callback_query.message.message_id, text, keyboard);
  return Response.json(publicApp({ ...row, status: action }));
}

async function editTelegram(chatId: number, messageId: number, text: string, replyMarkup?: unknown) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup }) });
}
