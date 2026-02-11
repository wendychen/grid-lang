"use client"

import { useState } from "react"
import { BottomNav, type AppView } from "@/components/bottom-nav"
import { TodaysGrid } from "@/components/todays-grid"
import { ThemedPages } from "@/components/themed-pages"
import { ProgressView } from "@/components/progress-view"
import { SettingsView } from "@/components/settings-view"
import { Languages } from "lucide-react"

export function AppShell() {
  const [activeView, setActiveView] = useState<AppView>("today")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Languages className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-foreground">GridLang</h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {activeView === "today" && "Today's Practice"}
            {activeView === "themes" && "Themed Pages"}
            {activeView === "progress" && "Your Progress"}
            {activeView === "settings" && "Settings"}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 py-4 pb-24 lg:px-8">
        {activeView === "today" && <TodaysGrid />}
        {activeView === "themes" && <ThemedPages />}
        {activeView === "progress" && <ProgressView />}
        {activeView === "settings" && <SettingsView />}
      </main>

      {/* Bottom Nav */}
      <BottomNav active={activeView} onChange={setActiveView} />
    </div>
  )
}
