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
    >
      {items.map((item) => (
        <div
          key={item}
          role="option"
          aria-selected={isHighlighted(item)}
          data-value={item}
          style={{
            padding: "8px 12px",
            background: isHighlighted(item) ? "#333" : "transparent",
            color: isHighlighted(item) ? "#fff" : "inherit",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  )
}
