import { useEffect, useState, type FormEvent } from "react";
import type { RegisterFields } from "../data/api";
import { provinces } from "../data/mockData";
import { useFeedback } from "./FeedbackProvider";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export type LoginRole = "customer" | "admin";

/**
 * An error message, null once signed in, or the email whose sign-up code still has to be entered.
 * `sendCode` asks the page to email a fresh code first; `resendInSeconds` is the wait before another can be sent.
 */
export type AuthResult = string | null | { verifyEmail: string; message: string; resendInSeconds?: number; sendCode?: boolean };

export type ResendResult = { ok: boolean; message: string; resendInSeconds: number };

interface Props {
  role?: LoginRole;
  onLogin: (role: LoginRole, email: string, password: string) => Promise<AuthResult>;
  /** Customer sign-up. Returns an error message, or the email the API sent a code to. */
  onRegister?: (fields: RegisterFields) => Promise<AuthResult>;
  /** Confirms the emailed code. Returns an error message, or null once the new account is signed in. */
  onVerify?: (email: string, code: string) => Promise<string | null>;
  onResend?: (email: string) => Promise<ResendResult>;
  onBrowse: () => void;
}

/** Digits in the emailed sign-up code. */
const codeLength = 6;

const emptyRegistration: RegisterFields = {
  name: "",
  email: "",
  password: "",
  phone: "",
  province: "",
  referralCode: "",
};

/** Per-portal form styling: a soft, rounded storefront look for customers and a compact console look for staff. */
const formStyles: Record<LoginRole, { label: string; input: string; toggle: string; submit: string; placeholder: string }> = {
  customer: {
    label: "block text-sm",
    input:
      "w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold-mid)]",
    toggle: "right-3 text-xs text-[var(--gold-mid)]",
    submit:
      "w-full rounded-xl bg-[var(--gold-mid)] py-3 font-semibold text-[var(--background)] disabled:opacity-60",
    placeholder: "you@example.com",
  },
  admin: {
    label: "block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
    input:
      "w-full rounded-md border border-[var(--hairline)] bg-[var(--field)] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[var(--foreground)] outline-none transition-shadow placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold-mid)]/70 focus:ring-2 focus:ring-[var(--gold-mid)]/20",
    toggle: "right-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
    submit:
      "flex w-full items-center justify-center gap-2 rounded-md bg-[var(--gold-mid)] py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-60",
    placeholder: "name@khmershop.com",
  },
};

export function LoginPage({ role = "customer", onLogin, onRegister, onVerify, onResend, onBrowse }: Props) {
  const { notify } = useFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registration, setRegistration] = useState(emptyRegistration);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const styles = formStyles[role];

  // Counts down the wait before another code may be sent.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const resend = async (email: string) => {
    if (!onResend || submitting) return;
    setSubmitting(true);
    const result = await onResend(email);
    setSubmitting(false);
    setResendIn(result.resendInSeconds);
    if (result.ok) {
      setError("");
      setCode("");
      setVerifyNote(result.message);
      notify(result.message, "success");
    } else if (result.resendInSeconds > 0) {
      setError("");
      setVerifyNote(`We already sent a code to ${email}. You can ask for another in a moment.`);
    } else {
      setError(result.message);
      notify(result.message, "error");
    }
  };

  /** Handles a sign-in or sign-up answer: shows the error, opens the code step, or does nothing once signed in. */
  const handleAuthResult = (result: AuthResult, welcome: string) => {
    if (typeof result === "string") {
      setError(result);
      notify(result, "error");
      return;
    }
    setError("");
    if (!result) {
      notify(welcome, "success");
      return;
    }
    setVerifyEmail(result.verifyEmail);
    setVerifyNote(result.message);
    setCode("");
    setResendIn(result.resendInSeconds ?? 0);
    if (result.sendCode) void resend(result.verifyEmail);
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !onVerify || !verifyEmail) return;
    setSubmitting(true);
    const result = await onVerify(verifyEmail, code);
    setSubmitting(false);
    if (result) {
      setError(result);
      notify(result, "error");
    } else {
      setError("");
      notify("Welcome to KhmerShop! Your account is ready.", "success");
    }
  };

  const leaveVerification = () => {
    setVerifyEmail(null);
    setCode("");
    setError("");
    setResendIn(0);
  };

  const switchMode = (toRegister: boolean) => {
    setRegistering(toRegister);
    setError("");
    setShowPassword(false);
  };

  const editRegistration = (name: keyof RegisterFields, value: string) =>
    setRegistration((fields) => ({ ...fields, [name]: value }));

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !onRegister) return;
    setSubmitting(true);
    const result = await onRegister({
      ...registration,
      name: registration.name.trim(),
      email: registration.email.trim(),
      phone: registration.phone.trim(),
      referralCode: registration.referralCode.trim(),
    });
    setSubmitting(false);
    handleAuthResult(result, "Welcome to KhmerShop! Your account is ready.");
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await onLogin(role, email.trim(), password);
    setSubmitting(false);
    handleAuthResult(result, role === "admin" ? "Welcome to the admin dashboard." : "Welcome back to KhmerShop.");
  };

  const form = (
    <form onSubmit={submitLogin} className="space-y-4">
      <label className={styles.label}>
        Email
        <input
          required
          type="email"
          autoComplete="username"
          className={`mt-1.5 ${styles.input}`}
          placeholder={styles.placeholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className={styles.label}>
        Password
        <div className="relative mt-1.5">
          <input
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`${styles.input} pr-16`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className={`absolute top-1/2 -translate-y-1/2 ${styles.toggle}`}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className={styles.submit}>
        {role === "admin" && <Icon name="lock" className="h-4 w-4" />}
        {submitting ? "Signing in…" : role === "admin" ? "Sign in to dashboard" : "Sign in"}
      </button>
    </form>
  );

  const registerForm = (
    <form onSubmit={submitRegistration} className="space-y-4">
      <label className={styles.label}>
        Full name
        <input
          required
          autoComplete="name"
          maxLength={255}
          className={`mt-1.5 ${styles.input}`}
          value={registration.name}
          onChange={(event) => editRegistration("name", event.target.value)}
        />
      </label>
      <label className={styles.label}>
        Email
        <input
          required
          type="email"
          autoComplete="email"
          maxLength={255}
          className={`mt-1.5 ${styles.input}`}
          placeholder={styles.placeholder}
          value={registration.email}
          onChange={(event) => editRegistration("email", event.target.value)}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={styles.label}>
          Phone <span className="text-[var(--muted-foreground)]">(optional)</span>
          <input
            type="tel"
            autoComplete="tel"
            maxLength={32}
            className={`mt-1.5 ${styles.input}`}
            placeholder="012 345 678"
            value={registration.phone}
            onChange={(event) => editRegistration("phone", event.target.value)}
          />
        </label>
        <label className={styles.label}>
          Province <span className="text-[var(--muted-foreground)]">(optional)</span>
          <select
            className={`mt-1.5 ${styles.input}`}
            value={registration.province}
            onChange={(event) => editRegistration("province", event.target.value)}
          >
            <option value="">Select a province</option>
            {provinces.map((province) => (
              <option key={province}>{province}</option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.label}>
        Password
        <div className="relative mt-1.5">
          <input
            required
            minLength={8}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className={`${styles.input} pr-16`}
            placeholder="At least 8 characters"
            value={registration.password}
            onChange={(event) => editRegistration("password", event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className={`absolute top-1/2 -translate-y-1/2 ${styles.toggle}`}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>
      <label className={styles.label}>
        Referral code <span className="text-[var(--muted-foreground)]">(optional)</span>
        <input
          autoComplete="off"
          className={`mt-1.5 ${styles.input} uppercase placeholder:normal-case`}
          placeholder="A friend's code"
          value={registration.referralCode}
          onChange={(event) => editRegistration("referralCode", event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className={styles.submit}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );

  const verifyForm = verifyEmail && (
    <form onSubmit={submitCode} className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">{verifyNote}</p>
      <label className={styles.label}>
        Verification code
        <input
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`\\d{${codeLength}}`}
          maxLength={codeLength}
          className={`mt-1.5 ${styles.input} text-center font-mono text-2xl tracking-[0.5em]`}
          placeholder="••••••"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, codeLength))}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || code.length !== codeLength} className={styles.submit}>
        {submitting ? "Checking…" : "Verify and continue"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => resend(verifyEmail)}
          disabled={submitting || resendIn > 0}
          className="font-semibold text-[var(--gold-mid)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--muted-foreground)] disabled:no-underline"
        >
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </button>
        <button type="button" onClick={leaveVerification} className="text-[var(--muted-foreground)] hover:underline">
          Use a different email
        </button>
      </div>
    </form>
  );

  const canRegister = role === "customer" && !!onRegister;

  /** The theme switch, pinned to the same top-right corner of the screen on both login pages. */
  const themeCorner = (
    <div className="fixed right-4 top-4 z-20">
      <ThemeToggle />
    </div>
  );

  if (role === "admin") {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--canvas)] px-4 py-10 text-[var(--foreground)]">
        {themeCorner}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="animate-page-enter relative w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center gap-2.5">
            <Icon name="shop" className="h-6 w-6 text-[var(--gold-mid)]" />
            <span className="font-display text-lg font-semibold">KhmerShop</span>
            <span className="rounded border border-[var(--hairline)] bg-[var(--tint)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Admin
            </span>
          </div>

          <div className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--toast-shadow)]">
            <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-6 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--gold-mid)]/10 text-[var(--gold-mid)]">
                <Icon name="lock" className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-base font-semibold">Staff portal</h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Sign in with your staff account.
                </p>
              </div>
            </div>
            <div className="px-6 py-5">{form}</div>
          </div>

          <p className="mt-5 text-center text-xs text-[var(--muted-foreground)]">
            Authorised staff only · Sign-ins are recorded in the activity log.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center bg-[var(--background)] px-4 pb-6 pt-16 text-[var(--foreground)] sm:pb-16">
      {themeCorner}
      <div className="mx-auto grid w-full grid-cols-1 max-w-5xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl lg:min-h-[min(680px,calc(100dvh-8rem))] lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden bg-[image:var(--hero-gradient)] p-5 sm:p-7 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-[var(--gold-mid)]/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <Icon name="shop" className="h-8 w-8 text-[var(--gold-mid)]" />
            <div>
              <div className="font-display text-2xl font-semibold text-[var(--gold-mid)]">
                KhmerShop
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Loyalty & rewards
              </p>
            </div>
          </div>
          <div className="relative my-12 hidden lg:block">
            <div className="mb-4 inline-flex rounded-full border border-[var(--gold-mid)]/30 bg-[var(--gold-mid)]/10 px-3 py-1 text-xs text-[var(--gold-light)]">
              Shop local · Earn more
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome to your local rewards experience.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--hero-muted)]">
              Discover Cambodian products, collect points from completed orders,
              and redeem rewards as your membership grows.
            </p>
          </div>
          <p className="relative hidden text-xs text-[var(--muted-foreground)] lg:block">
            One account for every visit · Points follow you everywhere.
          </p>
        </aside>

        <main className="flex items-center justify-center p-5 sm:p-10">
          <div className="animate-page-enter w-full max-w-md">
            <div className="mb-5 sm:mb-7">
              <h2 className="font-display text-2xl font-semibold">
                {verifyForm ? "Check your email" : registering ? "Create your account" : "Customer sign in"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {verifyForm
                  ? `Enter the ${codeLength}-digit code we sent to ${verifyEmail}.`
                  : registering
                    ? "Join KhmerShop to earn points on every order."
                    : "Sign in with your KhmerShop account."}
              </p>
            </div>
            {verifyForm || (registering && canRegister ? registerForm : form)}
            {canRegister && !verifyForm && (
              <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                {registering ? "Already have an account?" : "New to KhmerShop?"}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(!registering)}
                  className="font-semibold text-[var(--gold-mid)] hover:underline"
                >
                  {registering ? "Sign in" : "Create an account"}
                </button>
              </p>
            )}
            <button type="button" onClick={onBrowse} className="mt-3 w-full py-2 text-sm text-[var(--gold-mid)] hover:underline">
              Continue browsing the shop
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
