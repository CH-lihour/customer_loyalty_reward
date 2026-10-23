import { useState, type FormEvent } from "react";
import { useFeedback } from "./FeedbackProvider";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export type LoginRole = "customer" | "admin";

interface Props {
  role?: LoginRole;
  onLogin: (role: LoginRole, email: string, password: string) => Promise<string | null>;
  onBrowse: () => void;
}

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

export function LoginPage({ role = "customer", onLogin, onBrowse }: Props) {
  const { notify } = useFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const styles = formStyles[role];

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await onLogin(role, email.trim(), password);
    setSubmitting(false);
    if (result) {
      setError(result);
      notify(result, "error");
    } else {
      setError("");
      notify(
        role === "admin"
          ? "Welcome to the admin dashboard."
          : "Welcome back to KhmerShop.",
        "success",
      );
    }
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
              <h2 className="font-display text-2xl font-semibold">Customer sign in</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Sign in with your KhmerShop account.
              </p>
            </div>
            {form}
            <button type="button" onClick={onBrowse} className="mt-3 w-full py-2 text-sm text-[var(--gold-mid)] hover:underline">
              Continue browsing the shop
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
