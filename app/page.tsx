"use client";

import { FormEvent, useEffect, useState } from "react";

type View = "home" | "apply" | "track" | "status";
type Application = {
  applicationId: string;
  referenceId: string;
  status: string;
  fullName?: string;
  requestedAmount?: number;
};

const statusCopy: Record<string, { eyebrow: string; title: string; body: string }> = {
  SUBMITTED: { eyebrow: "Application received", title: "We’re checking your information", body: "Your application is safely in review. You can leave this page and return anytime using your IDs." },
  UNDER_REVIEW: { eyebrow: "Review in progress", title: "We’re checking your information", body: "A Tesfa Loan officer is reviewing your details and eligibility." },
  VERIFICATION_REQUIRED: { eyebrow: "Initial review passed", title: "Verification required", body: "Your application has moved forward. Please wait while your verification code is prepared." },
  OTP_PENDING: { eyebrow: "Identity check", title: "Enter your verification code", body: "Enter the six-digit code sent to your registered phone number." },
  OTP_VERIFIED: { eyebrow: "Code accepted", title: "Identity verified", body: "Your verification code was accepted. Membership verification is next." },
  MEMBERSHIP_ID_REQUIRED: { eyebrow: "One final check", title: "Verify your membership", body: "Enter your unique membership ID to continue." },
  MEMBERSHIP_VERIFIED: { eyebrow: "Verification complete", title: "Ready for final review", body: "Your identity and membership are verified. Your application is awaiting a final decision." },
  FINAL_APPROVAL_PENDING: { eyebrow: "Final review", title: "Decision in progress", body: "Your application is with the authorized loan administrator for final approval." },
  APPROVED: { eyebrow: "Congratulations", title: "Your loan is approved", body: "Your organization will process the disbursement separately." },
  AWAITING_DISBURSEMENT: { eyebrow: "Approved", title: "Preparing your disbursement", body: "Your funds will be sent manually by the organization." },
  DISBURSED: { eyebrow: "Funds released", title: "Your loan was disbursed", body: "The organization has marked your loan as paid out." },
  REJECTED: { eyebrow: "Application update", title: "Application not approved", body: "Your application was not approved at this time. Contact your organization if you need more information." },
};

const money = new Intl.NumberFormat("en-ET", { maximumFractionDigits: 0 });

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (view !== "status" || !application?.applicationId) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/applications/${application.applicationId}/status`);
        if (response.ok) setApplication(await response.json());
      } catch { /* keep the last known status while offline */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [view, application?.applicationId]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not submit your application.");
      setApplication(data); setView("status"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const id = String(data.get("applicationId") || "").trim().toUpperCase();
      const reference = String(data.get("referenceId") || "").trim().toUpperCase();
      const response = await fetch(`/api/applications/${id}/status?reference=${encodeURIComponent(reference)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application not found.");
      setApplication(result); setView("status");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }

  async function verify(kind: "otp" | "membership", value: string) {
    if (!application) return;
    setLoading(true); setMessage("");
    const response = await fetch(`/api/applications/${application.applicationId}/verify-${kind}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value, referenceId: application.referenceId }),
    });
    const result = await response.json();
    if (response.ok) setApplication(result); else setMessage(result.error || "Verification failed.");
    setLoading(false);
  }

  const current = statusCopy[application?.status || "SUBMITTED"] || statusCopy.SUBMITTED;

  return (
    <main>
      <header className="nav shell">
        <button className="brand" onClick={() => setView("home")} aria-label="Tesfa Loan home">
          <span className="brandMark">ተ</span><span>Tesfa <b>Loan</b></span>
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => setView("home")}>How it works</button>
          <button onClick={() => { setMessage(""); setView("track"); }}>Track application</button>
          <button className="navCta" onClick={() => { setMessage(""); setView("apply"); }}>Apply now <span>→</span></button>
        </nav>
      </header>

      {view === "home" && <>
        <section className="hero shell">
          <div className="heroCopy">
            <div className="pill"><span>●</span> Secure, simple & transparent</div>
            <h1>Move forward with <em>confidence.</em></h1>
            <p>Apply for the support you need with a clear process, fair review, and updates you can follow from start to finish.</p>
            <div className="actions">
              <button className="primary" onClick={() => setView("apply")}>Start your application <span>→</span></button>
              <button className="secondary" onClick={() => setView("track")}>Track an application</button>
            </div>
            <div className="trust"><span>✓ No hidden steps</span><span>✓ Secure verification</span><span>✓ Mobile friendly</span></div>
          </div>
          <div className="heroVisual" aria-label="Tesfa Loan application journey">
            <div className="sun"></div><div className="pattern">፨ ፨ ፨ ፨</div>
            <div className="phoneCard">
              <div className="phoneTop"><span className="miniLogo">ተ</span><span className="secure">● Secure</span></div>
              <small>Welcome to Tesfa</small><h3>What can we help you achieve?</h3>
              <div className="purpose active"><span>▣</span><div><b>Grow my business</b><small>Stock, equipment or expansion</small></div><i>✓</i></div>
              <div className="purpose"><span>⌂</span><div><b>Support my family</b><small>Education, home or wellbeing</small></div></div>
              <div className="purpose"><span>✦</span><div><b>Something else</b><small>Tell us what you need</small></div></div>
              <div className="miniButton">Continue <span>→</span></div>
            </div>
            <div className="float approved"><span>✓</span><div><b>Application approved</b><small>You're ready for the next step</small></div></div>
            <div className="float protected"><span>◆</span><div><b>Your data is protected</b><small>Secure at every step</small></div></div>
          </div>
        </section>
        <section className="steps shell">
          <div><span>01</span><b>Apply in minutes</b><p>Tell us about yourself and what you need.</p></div>
          <div><span>02</span><b>Verify securely</b><p>Complete identity and membership checks.</p></div>
          <div><span>03</span><b>Follow your progress</b><p>Use your private IDs to see every update.</p></div>
        </section>
      </>}

      {view === "apply" && <section className="formPage shell">
        <div className="formIntro"><span className="kicker">Loan application</span><h2>Let’s build your next chapter.</h2><p>Complete the form below. It takes about five minutes, and you can track every step afterward.</p><div className="sideNote"><b>Your information stays private.</b><span>Only authorized administrators can review your application.</span></div></div>
        <form className="formCard" onSubmit={apply}>
          <div className="formHeader"><span>1</span><div><b>About you</b><small>Fields marked * are required</small></div></div>
          <label>Full name *<input name="fullName" required minLength={3} placeholder="As shown on your ID" /></label>
          <div className="grid2"><label>Phone number *<input name="phone" required placeholder="+251 9XX XXX XXX" /></label><label>Email address<input name="email" type="email" placeholder="you@example.com" /></label></div>
          <div className="formHeader divider"><span>2</span><div><b>Your loan</b><small>Choose what works for you</small></div></div>
          <label>Loan product *<select name="loanProduct" required defaultValue=""><option value="" disabled>Select a loan product</option><option>Business Growth Loan</option><option>Personal Support Loan</option><option>Education Loan</option><option>Emergency Loan</option></select></label>
          <div className="grid2"><label>Requested amount (ETB) *<input name="requestedAmount" required type="number" min="1000" max="10000000" placeholder="50,000" /></label><label>Repayment period *<select name="repaymentPeriod" required defaultValue="12"><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option></select></label></div>
          <label>How will you use the loan? *<textarea name="purpose" required minLength={10} placeholder="Tell us briefly about your plans" /></label>
          {message && <p className="error" role="alert">{message}</p>}
          <button className="primary wide" disabled={loading}>{loading ? "Submitting…" : "Submit application"}<span>→</span></button>
          <small className="consent">By submitting, you confirm that the information provided is accurate.</small>
        </form>
      </section>}

      {view === "track" && <section className="centerPage shell">
        <div className="trackIcon">⌕</div><span className="kicker">Application status</span><h2>Pick up where you left off.</h2><p>Enter both IDs from your confirmation screen to securely view your progress.</p>
        <form className="trackCard" onSubmit={track}><label>Application ID<input name="applicationId" required placeholder="LN-000123" /></label><label>Reference ID<input name="referenceId" required placeholder="APP-000456" /></label>{message && <p className="error">{message}</p>}<button className="primary wide" disabled={loading}>{loading ? "Checking…" : "Check my status"}<span>→</span></button></form>
      </section>}

      {view === "status" && application && <section className="centerPage statusPage shell">
        <div className={`statusIcon ${application.status === "REJECTED" ? "bad" : ""}`}>{["APPROVED","DISBURSED"].includes(application.status) ? "✓" : "◌"}</div>
        <span className="kicker">{current.eyebrow}</span><h2>{current.title}</h2><p>{current.body}</p>
        <div className="statusCard">
          <div className="idRow"><div><small>Application ID</small><b>{application.applicationId}</b></div><button onClick={() => navigator.clipboard.writeText(application.applicationId)}>Copy</button></div>
          <div className="idRow"><div><small>Reference ID</small><b>{application.referenceId}</b></div><button onClick={() => navigator.clipboard.writeText(application.referenceId)}>Copy</button></div>
          {application.requestedAmount && <div className="amountRow"><span>Requested amount</span><b>ETB {money.format(application.requestedAmount)}</b></div>}
          <div className="progress"><span className="done"></span><span className={["SUBMITTED","UNDER_REVIEW"].includes(application.status) ? "active" : "done"}></span><span className={["OTP_PENDING","OTP_VERIFIED","MEMBERSHIP_ID_REQUIRED"].includes(application.status) ? "active" : (["MEMBERSHIP_VERIFIED","FINAL_APPROVAL_PENDING","APPROVED","AWAITING_DISBURSEMENT","DISBURSED"].includes(application.status) ? "done" : "")}></span><span className={["APPROVED","AWAITING_DISBURSEMENT","DISBURSED"].includes(application.status) ? "done" : ""}></span></div>
          <div className="progressLabels"><span>Submitted</span><span>Review</span><span>Verification</span><span>Decision</span></div>
          {application.status === "OTP_PENDING" && <VerifyForm label="Verification code" placeholder="6-digit code" button="Verify code" onSubmit={(v) => verify("otp", v)} />}
          {application.status === "MEMBERSHIP_ID_REQUIRED" && <VerifyForm label="Membership ID" placeholder="MEM-123456" button="Verify membership" onSubmit={(v) => verify("membership", v)} />}
          {message && <p className="error">{message}</p>}
        </div>
        <p className="refresh">● This page updates automatically</p>
        <button className="textButton" onClick={() => setView("home")}>← Back to home</button>
      </section>}

      <footer><div className="shell"><div className="brand footerBrand"><span className="brandMark">ተ</span><span>Tesfa <b>Loan</b></span></div><p>ተስፋ means hope. A clearer path to what’s next.</p><span>© 2026 Tesfa Loan</span></div></footer>
    </main>
  );
}

function VerifyForm({ label, placeholder, button, onSubmit }: { label: string; placeholder: string; button: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <form className="verifyBox" onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}><label>{label}<input value={value} onChange={(e) => setValue(e.target.value)} required placeholder={placeholder} /></label><button className="primary wide">{button}<span>→</span></button></form>;
}
