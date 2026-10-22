import { useState, type FormEvent } from "react";
import { useFeedback } from "./FeedbackProvider";
import { Icon } from "./Icon";

export type LoginRole = "customer" | "admin";

interface Props {
  initialRole?: LoginRole;
  onRoleChange?: (role: LoginRole) => void;
  onLogin: (role: LoginRole, email: string, password: string) => Promise<string | null>;
  onBrowse: () => void;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold-mid)]";

export function LoginPage({ initialRole = "customer", onRoleChange, onLogin, onBrowse }: Props) {
  const { notify } = useFeedback();
  const [role, setRole] = useState<LoginRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const chooseRole = (next: LoginRole) => {
    setRole(next);
    onRoleChange?.(next);
    setError("");
    setEmail("");
    setPassword("");
  };
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

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:py-12">
      <div className="mx-auto grid min-h-[min(680px,calc(100vh-6rem))] max-w-5xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#272238] via-[#1c2230] to-[#111722] p-7 sm:p-10">
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
          <div className="relative my-12">
            <div className="mb-4 inline-flex rounded-full border border-[var(--gold-mid)]/30 bg-[var(--gold-mid)]/10 px-3 py-1 text-xs text-[var(--gold-light)]">
              Shop local · Earn more
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome to your local rewards experience.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b5b5bc]">
              Discover Cambodian products, collect points from completed orders,
              and redeem rewards as your membership grows.
            </p>
          </div>
          <p className="relative text-xs text-[#9e9da7]">
            One account for every visit · Points follow you everywhere.
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="animate-page-enter w-full max-w-md">
            <div className="mb-7">
              <h2 className="font-display text-2xl font-semibold">
                {role === "admin" ? "Admin sign in" : "Customer sign in"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Choose your portal and sign in with your KhmerShop account.
              </p>
            </div>

            <div
              className="mb-6 grid grid-cols-2 rounded-xl bg-[var(--secondary)] p-1"
              role="tablist"
              aria-label="Sign in as"
            >
              {(["customer", "admin"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={role === option}
                  onClick={() => chooseRole(option)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${role === option ? "bg-[var(--gold-mid)] text-[var(--background)]" : "text-[var(--muted-foreground)]"}`}
                >
                  {option === "customer" ? "Customer" : "Admin"}
                </button>
              ))}
            </div>

            <form onSubmit={submitLogin} className="space-y-4">
              <label className="block text-sm">
                Email
                <input
                  required
                  type="email"
                  autoComplete="username"
                  className={`mt-1 ${inputClass}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Password
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`${inputClass} pr-16`}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--gold-mid)]"
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[var(--gold-mid)] py-3 font-semibold text-[var(--background)] disabled:opacity-60"
              >
                {submitting
                  ? "Signing in…"
                  : `Sign in as ${role === "admin" ? "Admin" : "Customer"}`}
              </button>
            </form>
            <button type="button" onClick={onBrowse} className="mt-5 w-full py-2 text-sm text-[var(--gold-mid)] hover:underline">
              Continue browsing the shop
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
