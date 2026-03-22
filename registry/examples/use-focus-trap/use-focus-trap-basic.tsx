"use client"

import { useRef, useState } from "react"
import { useFocusTrap } from "keyscope"

const btnClass = "px-3 py-1.5 border border-border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"

export default function UseFocusTrapBasic() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, { enabled: open, restoreFocus: true })

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className={btnClass}
      >
        Open Dialog
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className="border border-border p-4 mt-2"
        >
          <h2 className="text-sm font-bold mb-2">Confirm Action</h2>
          <p className="text-sm text-muted-foreground mb-3">Tab focus is trapped within this dialog.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className={btnClass}
            >
              Cancel
            </button>
            <button
              onClick={() => setOpen(false)}
              className={btnClass}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
