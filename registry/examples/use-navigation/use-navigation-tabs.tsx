"use client"

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
        className="flex gap-1 border-b border-border"
      >
        {tabs.map((tab) => (
          <div
            key={tab}
            role="tab"
            data-value={tab}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 cursor-pointer ${
              activeTab === tab
                ? "border-b-2 border-primary font-bold text-foreground"
                : isHighlighted(tab)
                  ? "bg-foreground text-background font-bold"
                  : "text-muted-foreground"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>
      <div role="tabpanel" className="p-4">
        Content for {activeTab}
      </div>
    </div>
  )
}
