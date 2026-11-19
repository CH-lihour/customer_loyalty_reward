import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiCreateKhqr,
  apiKhqrStatus,
  apiSimulateKhqr,
  type KhqrPayment as Payment,
} from "../data/api";
import type { OrderPayment } from "../data/mockData";
import { QrCode } from "./QrCode";

/** KHQR's brand red. */
const khqrRed = "#E1232E";

const formatAmount = (payment: Payment) =>
  payment.currency === "KHR"
    ? `${Number(payment.amount).toLocaleString()} ៛`
    : `${payment.amount} USD`;

/**
 * The demo KHQR payment step: shows a KHQR code for the amount with a countdown, checks it every few
 * seconds, and lets the customer pretend to pay it. Nothing is charged; the code's account is made up.
 */
export function KhqrPayment({
  token,
  amount,
  currency,
  onPaid,
  onCancel,
}: {
  token: string;
  amount: number;
  currency: "USD" | "KHR";
  /**
   * Called when the code is paid, with the code's MD5 to place the order with. Returns (or resolves to) an
   * error message if the order could not be placed; the customer can then try placing it again.
   */
  onPaid: (payment: OrderPayment, md5: string) => string | null | Promise<string | null>;
  onCancel: () => void;
}) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // The code is paid but placing the order failed, so the customer can retry without paying again.
  const [orderFailed, setOrderFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const handled = useRef(false);

  const create = useCallback(() => {
    setError("");
    setPayment(null);
    let cancelled = false;
    apiCreateKhqr(token, amount, currency).then(
      (created) => !cancelled && setPayment(created),
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [token, amount, currency]);

  useEffect(create, [create]);

  // The status a payment the server reported now has, treating a code past its time as expired.
  const status =
    payment?.status === "PENDING" && now >= Date.parse(payment.expiresAt)
      ? "EXPIRED"
      : payment?.status;

  const settle = useCallback(
    (next: Payment) => {
      setPayment(next);
      if (next.status !== "PAID" || handled.current) return;
      handled.current = true;
      setBusy(true);
      setError("");
      setOrderFailed(false);
      Promise.resolve(
        onPaid(
          {
            method: "KHQR",
            status: "PAID",
            amount: next.amount,
            currency: next.currency,
            billNumber: next.billNumber,
            transactionId: next.transactionId ?? "",
            paidAt: next.paidAt ?? new Date().toISOString(),
          },
          next.md5,
        ),
      )
        .catch((e: Error) => e.message)
        .then((failure) => {
          if (!failure) return;
          handled.current = false;
          setError(failure);
          setOrderFailed(true);
        })
        .finally(() => setBusy(false));
    },
    [onPaid],
  );

  // Tick the countdown, and check the code every 3 seconds as a shop would poll Bakong.
  useEffect(() => {
    if (!payment || status !== "PENDING") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      apiKhqrStatus(token, payment.md5).then(settle, () => {});
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [payment, status, token, settle]);

  const simulate = () => {
    if (!payment) return;
    setBusy(true);
    setError("");
    apiSimulateKhqr(token, payment.md5)
      .then(settle, (e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const secondsLeft = payment
    ? Math.max(0, Math.ceil((Date.parse(payment.expiresAt) - now) / 1000))
    : 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Pay with KHQR</h3>

      <div className="mx-auto w-full max-w-72 overflow-hidden rounded-2xl bg-white text-black shadow-lg">
        <div
          className="flex h-12 items-center justify-center text-xl font-extrabold tracking-wider text-white"
          style={{ backgroundColor: khqrRed }}
        >
          KHQR
        </div>
        <div className="px-6 pt-4 pb-3">
          <div className="text-sm text-neutral-500">
            {payment?.merchantName ?? "Khmer Shop"}
          </div>
          <div className="text-2xl font-bold">
            {payment ? formatAmount(payment) : "…"}
          </div>
        </div>
        <div className="border-t border-dashed border-neutral-300" />
        <div className="relative grid aspect-square place-items-center p-5">
          {payment ? (
            <QrCode
              value={payment.qr}
              label={`KHQR code to pay ${formatAmount(payment)}`}
              className={`h-full w-full ${status === "PENDING" ? "" : "opacity-15"}`}
            />
          ) : (
            <div className="text-sm text-neutral-400">
              {error ? "No code" : "Making your code…"}
            </div>
          )}
          {status === "PAID" && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-green-500 text-4xl text-white">
                ✓
              </div>
            </div>
          )}
          {status === "EXPIRED" && (
            <div className="absolute inset-0 grid place-items-center font-semibold text-neutral-700">
              Code expired
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-sm" aria-live="polite">
        {status === "PENDING" && (
          <>
            <div>
              Expires in{" "}
              <strong className="font-mono-data text-[var(--gold-mid)]">
                {countdown}
              </strong>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Scan with any Bakong member bank app. Waiting for payment…
            </div>
          </>
        )}
        {status === "PAID" && (
          <div className="font-semibold text-green-400">
            {busy ? "Payment received · Placing your order…" : "Payment received"}
          </div>
        )}
        {status === "EXPIRED" && (
          <div className="text-[var(--muted-foreground)]">
            This code has expired. Make a new one to pay.
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Demo payment · No money is charged
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {status === "PAID" && orderFailed && payment && (
        <button
          type="button"
          disabled={busy}
          onClick={() => settle(payment)}
          className="w-full rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-2 font-semibold disabled:opacity-50"
        >
          Try placing the order again
        </button>
      )}

      {status !== "PAID" && (
        <div className="flex gap-2">
          {status === "EXPIRED" || (!payment && error) ? (
            <button
              type="button"
              onClick={create}
              className="flex-1 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-2 font-semibold"
            >
              Make a new code
            </button>
          ) : (
            <button
              type="button"
              disabled={!payment || busy}
              onClick={simulate}
              className="flex-1 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] py-2 font-semibold disabled:opacity-50"
            >
              {busy ? "Paying…" : "Simulate payment"}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-[var(--secondary)] px-4"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
