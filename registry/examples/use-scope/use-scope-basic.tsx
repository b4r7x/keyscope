"use client"

import { useState } from "react"
import { KeyboardProvider, useKey, useScope } from "keyscope"

function App() {
  const [modalOpen, setModalOpen] = useState(false)

  useKey("ctrl+k", () => setModalOpen(true))

  return (
    <div>
      <p className="text-sm text-muted-foreground">Press Ctrl+K to open modal</p>
      {modalOpen && <Modal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function Modal({ onClose }: { onClose: () => void }) {
  useScope("modal")
  useKey("Escape", onClose)

  return (
    <div role="dialog" aria-modal="true" className="border border-border p-4 mt-2">
      <h2 className="text-sm font-bold mb-2">Modal</h2>
      <p className="text-sm text-muted-foreground mb-3">Esc closes this modal. Ctrl+K is blocked while this scope is active.</p>
      <button
        onClick={onClose}
        className="px-3 py-1.5 border border-border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Close
      </button>
    </div>
  )
}

export default function UseScopeBasic() {
  return (
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  )
}
