import { useState } from "react"
import { KeyboardProvider, useKey } from "keyscope"

function Counter() {
  const [count, setCount] = useState(0)

  useKey("ArrowUp", () => setCount((c) => c + 1))
  useKey("ArrowDown", () => setCount((c) => c - 1))
  useKey("Escape", () => setCount(0))

  return (
    <div>
      <p>Count: {count}</p>
      <p>↑ increment · ↓ decrement · Esc reset</p>
    </div>
  )
}

export default function UseKeyBasic() {
  return (
    <KeyboardProvider>
      <Counter />
    </KeyboardProvider>
  )
}
