import { useEffect, useId, useRef, type ReactNode } from "react"

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function AdminModal({ title, onClose, children, wide = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose()
        }
      }}
      className={`admin-modal w-[calc(100%-2rem)] ${
        wide ? "max-w-4xl" : "max-w-xl"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
