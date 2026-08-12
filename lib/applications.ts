import { env } from "cloudflare:workers";

export type AppRow = {
  application_id: string; reference_id: string; full_name: string; phone: string;
  email: string | null; loan_product: string; requested_amount: number;
  repayment_period: number; purpose: string; status: string; membership_id: string | null;
};

let ready = false;

export async function ensureDatabase() {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS loan_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT NOT NULL UNIQUE,
      reference_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      loan_product TEXT NOT NULL,
      requested_amount INTEGER NOT NULL,
      repayment_period INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      membership_id TEXT,
      otp_hash TEXT,
      otp_expires_at INTEGER,
      otp_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_public_id ON loan_applications(application_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_applications_status ON loan_applications(status)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_audit_application ON audit_logs(application_id)"),
  ]);
  ready = true;
}

export function publicApp(row: AppRow) {
  return { applicationId: row.application_id, referenceId: row.reference_id, fullName: row.full_name, requestedAmount: row.requested_amount, status: row.status };
}

export async function findApplication(id: string) {
  await ensureDatabase();
  return env.DB.prepare("SELECT * FROM loan_applications WHERE application_id = ?").bind(id).first<AppRow>();
}

export async function audit(applicationId: string, action: string, actor: string, details = "") {
  await env.DB.prepare("INSERT INTO audit_logs (application_id, action, actor, details) VALUES (?, ?, ?, ?)").bind(applicationId, action, actor, details).run();
}

export async function setStatus(id: string, status: string) {
  await env.DB.prepare("UPDATE loan_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?").bind(status, id).run();
  await audit(id, `STATUS_${status}`, "telegram_admin");
  return findApplication(id);
}

export function randomPublicId(prefix: string) {
  const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
  return `${prefix}-${String(bytes[0] % 1000000).padStart(6, "0")}`;
}

export async function sha256(value: string) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(data)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
