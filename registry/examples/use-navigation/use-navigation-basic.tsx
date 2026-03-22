"use client"

import { useRef } from "react"
import { useNavigation } from "keyscope"

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"]

export default function UseNavigationBasic() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isHighlighted, onKeyDown } = useNavigation({
    containerRef,
    role: "option",
    wrap: true,
    onSelect: (value) => alert(`Selected: ${value}`),
  })

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Fruits"
      className="focus:outline-none"
    >
      {items.map((item) => (
        <div
          key={item}
          role="option"
          aria-selected={isHighlighted(item)}
          data-value={item}
          className={`px-3 py-2 ${isHighlighted(item) ? "bg-foreground text-background font-bold" : "text-muted-foreground"}`}
        >
          {item}
        </div>
      ))}
    </div>
  )
}
