import { useRef } from "react"
import { KeyboardProvider, useFocusZone, useScopedNavigation } from "keyscope"

type Zone = "sidebar" | "main"

function Layout() {
  const { zone, inZone } = useFocusZone<Zone>({
    initial: "sidebar",
    zones: ["sidebar", "main"],
    transitions: ({ zone, key }) => {
      if (zone === "sidebar" && key === "ArrowRight") return "main"
      if (zone === "main" && key === "ArrowLeft") return "sidebar"
      return null
    },
  })

  const sidebarItems = ["Dashboard", "Settings", "Profile"]
  const mainItems = ["Item A", "Item B", "Item C", "Item D"]

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <Pane
        title="Sidebar"
        items={sidebarItems}
        active={inZone("sidebar")}
        enabled={zone === "sidebar"}
      />
      <Pane
        title="Main"
        items={mainItems}
        active={inZone("main")}
        enabled={zone === "main"}
      />
    </div>
  )
}

function Pane({
  title,
  items,
  active,
  enabled,
}: {
  title: string
  items: string[]
  active: boolean
  enabled: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { isHighlighted } = useScopedNavigation({
    containerRef,
    role: "option",
    wrap: true,
    enabled,
  })

  return (
    <div style={{ border: `1px solid ${active ? "#0cf" : "#333"}`, padding: 12, minWidth: 160 }}>
      <h3>{title}</h3>
      <div ref={containerRef} role="listbox">
        {items.map((item) => (
          <div
            key={item}
            role="option"
            data-value={item}
            aria-selected={isHighlighted(item)}
            style={{
              padding: "4px 8px",
              background: isHighlighted(item) ? "#333" : "transparent",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UseFocusZoneBasic() {
  return (
    <KeyboardProvider>
      <Layout />
    </KeyboardProvider>
  )
}
