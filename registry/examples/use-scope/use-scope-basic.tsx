import { useState } from "react"
import { KeyboardProvider, useKey, useScope } from "keyscope"

function App() {
  const [modalOpen, setModalOpen] = useState(false)

  useKey("ctrl+k", () => setModalOpen(true))

  return (
    <div>
      <p>Press Ctrl+K to open modal</p>
      {modalOpen && <Modal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function Modal({ onClose }: { onClose: () => void }) {
  useScope("modal")
  useKey("Escape", onClose)

  return (
    <div role="dialog" aria-modal="true" style={{ border: "1px solid #555", padding: 16 }}>
      <h2>Modal</h2>
      <p>Esc closes this modal. Ctrl+K is blocked while this scope is active.</p>
      <button onClick={onClose}>Close</button>
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
