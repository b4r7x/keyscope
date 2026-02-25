import { useRef, useState } from "react"
import { KeyboardProvider, useScope, useScopedNavigation } from "keyscope"

const commands = ["New File", "Open File", "Save", "Save As", "Close"]

function CommandPalette({ onClose }: { onClose: () => void }) {
  const listRef = useRef<HTMLDivElement>(null)

  useScope("command-palette")

  const { isHighlighted } = useScopedNavigation({
    containerRef: listRef,
    role: "option",
    wrap: true,
    onSelect: (value) => {
      alert(`Executed: ${value}`)
      onClose()
    },
  })

  return (
    <div style={{ border: "1px solid #555", padding: 16 }}>
      <h3>Command Palette</h3>
      <div ref={listRef} role="listbox" tabIndex={0}>
        {commands.map((cmd) => (
          <div
            key={cmd}
            role="option"
            data-value={cmd}
            aria-selected={isHighlighted(cmd)}
            style={{
              padding: "6px 12px",
              background: isHighlighted(cmd) ? "#333" : "transparent",
              color: isHighlighted(cmd) ? "#fff" : "inherit",
            }}
          >
            {cmd}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Command Palette</button>
      {open && <CommandPalette onClose={() => setOpen(false)} />}
    </div>
  )
}

export default function UseScopedNavigationBasic() {
  return (
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  )
}
