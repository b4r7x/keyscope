"use client"

import { useState } from "react"
import { useScrollLock } from "keyscope"

const btnClass = "px-3 py-1.5 border border-border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"

function Overlay({ onClose }: { onClose: () => void }) {
  useScrollLock()

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold mb-2">Overlay</h2>
        <p className="text-sm text-muted-foreground mb-3">Background scroll is locked while this overlay is visible.</p>
        <button
          onClick={onClose}
          className={btnClass}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function UseScrollLockBasic() {
  const [open, setOpen] = useState(false)

  return (
    <div className="h-[500px]">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 border border-border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Show Overlay
      </button>
      <p className="text-sm text-muted-foreground mt-2">Scroll down to see content. Opening the overlay locks scroll.</p>
      {open && <Overlay onClose={() => setOpen(false)} />}
    </div>
  )
}
