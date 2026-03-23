"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"

const tabs = ["General", "Security", "Notifications", "Billing"]

export default function UseNavigationTabs() {
  return (
    <Card size="md">
      <CardContent>
        <Tabs defaultValue="General">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab} value={tab}>
              <p className="text-sm text-muted-foreground py-2">
                Content for {tab}
              </p>
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-xs text-muted-foreground mt-3">
          <Kbd size="sm">←</Kbd> <Kbd size="sm">→</Kbd> navigate tabs
        </p>
      </CardContent>
    </Card>
  )
}
