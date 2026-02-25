import { useState } from "react"
import { KeyboardProvider, useKey } from "keyscope"

function TextFormatter() {
  const [style, setStyle] = useState("normal")

  useKey({
    "ctrl+b": () => setStyle("bold"),
    "ctrl+i": () => setStyle("italic"),
    "ctrl+u": () => setStyle("underline"),
    Escape: () => setStyle("normal"),
  })

  return (
    <div>
      <p style={{ fontWeight: style === "bold" ? "bold" : undefined,
                  fontStyle: style === "italic" ? "italic" : undefined,
                  textDecoration: style === "underline" ? "underline" : undefined }}>
        The quick brown fox jumps over the lazy dog.
      </p>
      <p>Active style: {style}</p>
      <p>Ctrl+B bold · Ctrl+I italic · Ctrl+U underline · Esc reset</p>
    </div>
  )
}

export default function UseKeyMap() {
  return (
    <KeyboardProvider>
      <TextFormatter />
    </KeyboardProvider>
  )
}
