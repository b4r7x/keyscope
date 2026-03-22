"use client"

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
    <div className="space-y-2">
      <p
        className={
          style === "bold" ? "font-bold" :
          style === "italic" ? "italic" :
          style === "underline" ? "underline" :
          ""
        }
      >
        The quick brown fox jumps over the lazy dog.
      </p>
      <p className="text-sm text-muted-foreground">Active style: {style}</p>
      <p className="text-xs text-muted-foreground">Ctrl+B bold · Ctrl+I italic · Ctrl+U underline · Esc reset</p>
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
