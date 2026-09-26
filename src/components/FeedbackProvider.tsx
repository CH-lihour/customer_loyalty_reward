import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone; leaving: boolean };
type Dialog = {
  kind: "confirm" | "prompt";
  message: string;
  resolve: (value: boolean | string | null) => void;
};
type Feedback = {
  notify: (message: string, tone?: Tone) => void;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string) => Promise<string | null>;
};
const FeedbackContext = createContext<Feedback | null>(null);
let nextToastId = 0;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((items) =>
      items.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    timers.current.push(
      setTimeout(
        () => setToasts((items) => items.filter((item) => item.id !== id)),
        220,
      ),
    );
  }, []);
  const notify = useCallback(
    (message: string, tone: Tone = "info") => {
      const id = ++nextToastId;
      setToasts((items) => [
        ...items.slice(-3),
        { id, message, tone, leaving: false },
      ]);
      timers.current.push(setTimeout(() => dismiss(id), 4000));
    },
    [dismiss],
  );
  const confirm = useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => {
        lastFocus.current = document.activeElement as HTMLElement;
        setAnswer("");
        setDialog({
          kind: "confirm",
          message,
          resolve: (value) => resolve(value === true),
        });
      }),
    [],
  );
  const prompt = useCallback(
    (message: string) =>
      new Promise<string | null>((resolve) => {
        lastFocus.current = document.activeElement as HTMLElement;
        setAnswer("");
        setDialog({
          kind: "prompt",
          message,
          resolve: (value) => resolve(typeof value === "string" ? value : null),
        });
      }),
    [],
  );
  const finish = useCallback(
    (value: boolean | string | null) => {
      dialog?.resolve(value);
      setDialog(null);
      lastFocus.current?.focus();
    },
    [dialog],
  );

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(dialog.kind === "confirm" ? false : null);
      }
      if (event.key === "Tab") {
        const buttons = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".feedback-dialog input, .feedback-dialog button",
          ),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog, finish]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <FeedbackContext.Provider value={{ notify, confirm, prompt }}>
      {children}
      <div className="feedback-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`feedback-toast feedback-toast-${toast.tone} ${toast.leaving ? "feedback-toast-leaving" : ""}`}
          >
            <span className="feedback-icon" aria-hidden="true">
              {toast.tone === "success"
                ? "✓"
                : toast.tone === "error"
                  ? "!"
                  : "i"}
            </span>
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="feedback-close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <div
          className="feedback-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              finish(dialog.kind === "confirm" ? false : null);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="feedback-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              finish(dialog.kind === "confirm" ? true : answer.trim() || null);
            }}
          >
            <div className="feedback-dialog-mark" aria-hidden="true">
              ?
            </div>
            <h2
              id="feedback-dialog-title"
              className="font-display text-xl font-semibold"
            >
              {dialog.kind === "confirm" ? "Please confirm" : "Reason required"}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {dialog.message}
            </p>
            {dialog.kind === "prompt" && (
              <input
                ref={inputRef}
                required
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Enter a reason"
                className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-mid)]"
              />
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => finish(dialog.kind === "confirm" ? false : null)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                autoFocus={dialog.kind === "confirm"}
                type="submit"
                className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("FeedbackProvider is missing");
  return feedback;
}
