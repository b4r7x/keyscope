import { useRef, useState } from "react"
import { useNavigation } from "keyscope"

const tabs = ["General", "Security", "Notifications", "Billing"]

export default function UseNavigationTabs() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("General")

  const { isHighlighted, onKeyDown } = useNavigation({
    containerRef,
    role: "tab",
    orientation: "horizontal",
    wrap: true,
    onSelect: (value) => setActiveTab(value),
  })

  return (
    <div>
      <div
        ref={containerRef}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="tablist"
        style={{ display: "flex", gap: 4, borderBottom: "1px solid #333" }}
      >
        {tabs.map((tab) => (
          <div
            key={tab}
            role="tab"
            data-value={tab}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              borderBottom: activeTab === tab ? "2px solid #0cf" : "2px solid transparent",
              background: isHighlighted(tab) ? "#222" : "transparent",
              cursor: "pointer",
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div role="tabpanel" style={{ padding: 16 }}>
        Content for {activeTab}
      </div>
    </div>
  )
}
