"use client"

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
    <div className="border border-border p-4">
      <h3 className="text-sm font-bold mb-2">Command Palette</h3>
      <div ref={listRef} role="listbox" tabIndex={0}>
        {commands.map((cmd) => (
          <div
            key={cmd}
            role="option"
            data-value={cmd}
            aria-selected={isHighlighted(cmd)}
            className={`px-3 py-1.5 ${isHighlighted(cmd) ? "bg-foreground text-background font-bold" : "text-muted-foreground"}`}
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
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 border border-border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
        Open Command Palette
      </button>
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
