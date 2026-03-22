"use client"

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
    <div className="flex gap-4">
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
    <div className={`border p-3 min-w-40 ${active ? "border-primary" : "border-border"}`}>
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      <div ref={containerRef} role="listbox">
        {items.map((item) => (
          <div
            key={item}
            role="option"
            data-value={item}
            aria-selected={isHighlighted(item)}
            className={`px-2 py-1 ${isHighlighted(item) ? "bg-foreground text-background font-bold" : "text-muted-foreground"}`}
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
