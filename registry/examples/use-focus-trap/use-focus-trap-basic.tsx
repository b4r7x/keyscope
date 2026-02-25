import { useRef, useState } from "react"
import { useFocusTrap } from "keyscope"

export default function UseFocusTrapBasic() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, { enabled: open, restoreFocus: true })

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Dialog</button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          style={{ border: "1px solid #555", padding: 16, marginTop: 8 }}
        >
          <h2>Confirm Action</h2>
          <p>Tab focus is trapped within this dialog.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setOpen(false)}>Cancel</button>
            <button onClick={() => setOpen(false)}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  )
}
