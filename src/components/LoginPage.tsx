import { useState, type FormEvent } from "react";
import { useFeedback } from "./FeedbackProvider";

export type LoginRole = "customer" | "admin";
export type Registration = {
  name: string;
  email: string;
  phone: string;
  province: string;
  referralCode: string;
};

interface Props {
  initialRole?: LoginRole;
  onRoleChange?: (role: LoginRole) => void;
  onLogin: (role: LoginRole, email: string, password: string) => string | null;
  onRegister: (fields: Registration) => string | null;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold-mid)]";
const provinces = [
  "Phnom Penh",
  "Siem Reap",
  "Battambang",
  "Kampong Cham",
  "Kampot",
  "Sihanoukville",
  "Kandal",
  "Takeo",
];

export function LoginPage({ initialRole = "customer", onRoleChange, onLogin, onRegister }: Props) {
  const { notify } = useFeedback();
  const [role, setRole] = useState<LoginRole>(initialRole);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registration, setRegistration] = useState<Registration>({
    name: "",
    email: "",
    phone: "",
    province: "Phnom Penh",
    referralCode: "",
  });
  const [error, setError] = useState("");

  const chooseRole = (next: LoginRole) => {
    setRole(next);
    onRoleChange?.(next);
    setRegistering(false);
    setError("");
    setEmail("");
    setPassword("");
  };
  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onLogin(role, email.trim(), password);
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
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onRegister(registration);
    if (result) {
      setError(result);
      notify(result, "error");
    } else {
      setError("");
      notify("Demo customer account created.", "success");
    }
  };
  const useDemo = () => {
    setEmail(
      role === "admin" ? "admin@khmershop.local" : "sophea.chan@gmail.com",
    );
    setPassword(role === "admin" ? "admin1234" : "demo1234");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:py-12">
      <div className="mx-auto grid min-h-[min(680px,calc(100vh-6rem))] max-w-5xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#272238] via-[#1c2230] to-[#111722] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-[var(--gold-mid)]/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="text-3xl">🇰🇭</span>
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
            Frontend demo sign-in · Accounts and sessions are stored in this
            browser only.
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="animate-page-enter w-full max-w-md">
            <div className="mb-7">
              <h2 className="font-display text-2xl font-semibold">
                {registering
                  ? "Create customer account"
                  : role === "admin"
                    ? "Admin sign in"
                    : "Customer sign in"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {registering
                  ? "Create a local demo account to explore KhmerShop."
                  : "Choose your portal and enter your demo credentials."}
              </p>
            </div>

            {!registering && (
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
            )}

            {registering ? (
              <form onSubmit={submitRegistration} className="space-y-4">
                <label className="block text-sm">
                  Full name
                  <input
                    required
                    autoComplete="name"
                    className={`mt-1 ${inputClass}`}
                    value={registration.name}
                    onChange={(event) =>
                      setRegistration((fields) => ({
                        ...fields,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className={`mt-1 ${inputClass}`}
                    value={registration.email}
                    onChange={(event) =>
                      setRegistration((fields) => ({
                        ...fields,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  Phone
                  <input
                    required
                    autoComplete="tel"
                    className={`mt-1 ${inputClass}`}
                    value={registration.phone}
                    onChange={(event) =>
                      setRegistration((fields) => ({
                        ...fields,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  Province
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={registration.province}
                    onChange={(event) =>
                      setRegistration((fields) => ({
                        ...fields,
                        province: event.target.value,
                      }))
                    }
                  >
                    {provinces.map((province) => (
                      <option key={province}>{province}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Referral code{" "}
                  <span className="text-[var(--muted-foreground)]">
                    (optional)
                  </span>
                  <input
                    className={`mt-1 ${inputClass}`}
                    value={registration.referralCode}
                    onChange={(event) =>
                      setRegistration((fields) => ({
                        ...fields,
                        referralCode: event.target.value,
                      }))
                    }
                  />
                </label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Demo accounts use the shared customer password{" "}
                  <code className="text-[var(--gold-mid)]">demo1234</code>.
                </p>
                {error && (
                  <p role="alert" className="text-sm text-red-400">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--gold-mid)] py-3 font-semibold text-[var(--background)]"
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistering(false);
                    setError("");
                  }}
                  className="w-full py-1 text-sm text-[var(--gold-mid)]"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={submitLogin} className="space-y-4">
                <label className="block text-sm">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    className={`mt-1 ${inputClass}`}
                    placeholder={
                      role === "admin"
                        ? "admin@khmershop.local"
                        : "you@example.com"
                    }
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
                  className="w-full rounded-xl bg-[var(--gold-mid)] py-3 font-semibold text-[var(--background)]"
                >
                  Sign in as {role === "admin" ? "Admin" : "Customer"}
                </button>
                <button
                  type="button"
                  onClick={useDemo}
                  className="w-full rounded-xl border border-[var(--border)] py-2.5 text-sm text-[var(--gold-mid)]"
                >
                  Fill demo credentials
                </button>
                {role === "customer" && (
                  <p className="pt-2 text-center text-sm text-[var(--muted-foreground)]">
                    New customer?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setRegistering(true);
                        setError("");
                      }}
                      className="font-semibold text-[var(--gold-mid)]"
                    >
                      Create a demo account
                    </button>
                  </p>
                )}
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
