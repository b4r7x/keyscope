import { useState } from "react"
import { useScrollLock } from "keyscope"

function Overlay({ onClose }: { onClose: () => void }) {
  useScrollLock()

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "#1a1a1a", padding: 24, borderRadius: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Overlay</h2>
        <p>Background scroll is locked while this overlay is visible.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

export default function UseScrollLockBasic() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ height: 2000 }}>
      <button onClick={() => setOpen(true)}>Show Overlay</button>
      <p>Scroll down to see content. Opening the overlay locks scroll.</p>
      {open && <Overlay onClose={() => setOpen(false)} />}
    </div>
  )
}
