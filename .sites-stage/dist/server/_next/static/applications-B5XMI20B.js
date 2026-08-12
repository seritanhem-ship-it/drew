import{env as e}from"cloudflare:workers";var t=!1;async function n(){t||=(await e.DB.batch([e.DB.prepare(`CREATE TABLE IF NOT EXISTS loan_applications (
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
    )`),e.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_public_id ON loan_applications(application_id)`),e.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_applications_status ON loan_applications(status)`),e.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),e.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_application ON audit_logs(application_id)`)]),!0)}function r(e){return{applicationId:e.application_id,referenceId:e.reference_id,fullName:e.full_name,requestedAmount:e.requested_amount,status:e.status}}async function i(t){return await n(),e.DB.prepare(`SELECT * FROM loan_applications WHERE application_id = ?`).bind(t).first()}async function a(t,n,r,i=``){await e.DB.prepare(`INSERT INTO audit_logs (application_id, action, actor, details) VALUES (?, ?, ?, ?)`).bind(t,n,r,i).run()}async function o(t,n){return await e.DB.prepare(`UPDATE loan_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?`).bind(n,t).run(),await a(t,`STATUS_${n}`,`telegram_admin`),i(t)}function s(e){let t=new Uint32Array(1);return crypto.getRandomValues(t),`${e}-${String(t[0]%1e6).padStart(6,`0`)}`}async function c(e){let t=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(e));return Array.from(new Uint8Array(t)).map(e=>e.toString(16).padStart(2,`0`)).join(``)}export{s as a,r as i,n,o,i as r,c as s,a as t};