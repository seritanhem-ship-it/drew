# Waafi Loans

Waafi Loans is a Djibouti-focused loan application and verification platform using Djiboutian francs (DJF). Applicants apply and track progress on the website; authorized administrators operate the workflow through Telegram.

## Local development

1. Copy `.env.example` to `.env` and add Telegram credentials.
2. Run `npm install`.
3. Run `npm run dev`.

The site uses Neon PostgreSQL through `@neondatabase/serverless` and the `DATABASE_URL` environment variable. The required tables are created automatically on the first database request. Telegram webhooks are accepted at `/webhook/telegram` and verified with `TELEGRAM_WEBHOOK_SECRET`.

## Telegram setup

Set the bot webhook to the deployed `/webhook/telegram` URL and use the same secret configured in `TELEGRAM_WEBHOOK_SECRET`. Only the exact configured Telegram user and chat IDs can execute administrative callbacks.

There is deliberately no web admin dashboard or admin login route.
