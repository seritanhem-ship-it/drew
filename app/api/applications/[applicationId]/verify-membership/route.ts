import { env } from "cloudflare:workers";
import { audit, findApplication, publicApp } from "../../../../../lib/applications";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await context.params;
  const { value, referenceId } = await request.json() as { value: string; referenceId: string };
  const row = await findApplication(applicationId);
  if (!row || row.reference_id !== referenceId || row.status !== "MEMBERSHIP_ID_REQUIRED") return Response.json({ error: "This verification request is not valid." }, { status: 400 });
  const membership = String(value || "").trim().toUpperCase();
  if (!/^MEM-[A-Z0-9]{4,12}$/.test(membership)) return Response.json({ error: "Membership ID could not be verified. Check it and try again." }, { status: 400 });
  await env.DB.prepare("UPDATE loan_applications SET membership_id = ?, status = 'FINAL_APPROVAL_PENDING', updated_at = CURRENT_TIMESTAMP WHERE application_id = ?").bind(membership, applicationId).run();
  await audit(applicationId, "MEMBERSHIP_VERIFIED", "applicant", membership);
  return Response.json(publicApp({ ...row, status: "FINAL_APPROVAL_PENDING" }));
}
