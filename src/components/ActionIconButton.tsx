import { Icon } from "./Icon";

type Props = {
  action: "edit" | "delete" | "activate" | "deactivate";
  label: string;
  onClick: () => void;
};

export function ActionIconButton({ action, label, onClick }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        action === "delete"
          ? "border-red-400/20 text-red-400 hover:border-red-400/50 hover:bg-red-400/10 focus-visible:outline-red-400"
          : action === "activate"
            ? "border-green-400/20 text-green-400 hover:border-green-400/50 hover:bg-green-400/10 focus-visible:outline-green-400"
            : action === "deactivate"
              ? "border-amber-400/20 text-amber-400 hover:border-amber-400/50 hover:bg-amber-400/10 focus-visible:outline-amber-400"
              : "border-[var(--border)] text-[var(--gold-mid)] hover:border-[var(--gold-mid)]/40 hover:bg-[var(--gold-mid)]/10 focus-visible:outline-[var(--gold-mid)]"
      }`}
    >
      <Icon name={{ edit: "edit", delete: "trash", activate: "check", deactivate: "pause" }[action]} className="h-4 w-4" />
    </button>
  );
}
