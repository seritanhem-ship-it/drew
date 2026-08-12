# Tesfa Loan

Tesfa Loan is an Ethiopian-branded loan application and verification platform. Applicants apply and track progress on the website; authorized administrators operate the workflow exclusively through Telegram.

## Local development

1. Copy `.env.example` to `.env` and add Telegram credentials.
2. Run `npm install`.
3. Run `npm run dev`.

The site uses a D1-compatible SQLite database through the `DB` binding. Telegram webhooks are accepted at `/webhook/telegram` and verified with `TELEGRAM_WEBHOOK_SECRET`.

## Telegram setup

Set the bot webhook to the deployed `/webhook/telegram` URL and use the same secret configured in `TELEGRAM_WEBHOOK_SECRET`. Only the exact configured Telegram user and chat IDs can execute administrative callbacks.

There is deliberately no web admin dashboard or admin login route.
