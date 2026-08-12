import { env } from "cloudflare:workers";
import { audit, findApplication, publicApp, sha256 } from "../../../../../lib/applications";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await context.params;
  const { value, referenceId } = await request.json() as { value: string; referenceId: string };
  const row = await findApplication(applicationId);
  if (!row || row.reference_id !== referenceId || row.status !== "OTP_PENDING") return Response.json({ error: "This verification request is not valid." }, { status: 400 });
  const full = await env.DB.prepare("SELECT otp_hash, otp_expires_at, otp_attempts FROM loan_applications WHERE application_id = ?").bind(applicationId).first<{ otp_hash: string; otp_expires_at: number; otp_attempts: number }>();
  if (!full || full.otp_expires_at < Date.now()) return Response.json({ error: "This code has expired. Ask the administrator to generate a new one." }, { status: 400 });
  if (full.otp_attempts >= 5) return Response.json({ error: "Maximum verification attempts reached." }, { status: 429 });
  if (await sha256(String(value)) !== full.otp_hash) {
    await env.DB.prepare("UPDATE loan_applications SET otp_attempts = otp_attempts + 1 WHERE application_id = ?").bind(applicationId).run();
    await audit(applicationId, "INVALID_OTP", "applicant");
    return Response.json({ error: "That code is not correct. Please try again." }, { status: 400 });
  }
  await env.DB.prepare("UPDATE loan_applications SET status = 'MEMBERSHIP_ID_REQUIRED', otp_hash = NULL, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?").bind(applicationId).run();
  await audit(applicationId, "OTP_VERIFIED", "applicant");
  return Response.json(publicApp({ ...row, status: "MEMBERSHIP_ID_REQUIRED" }));
}
