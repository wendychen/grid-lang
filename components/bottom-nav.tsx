"use client"

import React from "react"

import { LayoutGrid, BookOpen, BarChart3, Settings, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type AppView = "today" | "themes" | "graph" | "progress" | "settings"

interface BottomNavProps {
  active: AppView
  onChange: (view: AppView) => void
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "today", label: "Today", icon: LayoutGrid },
  { id: "themes", label: "Themes", icon: BookOpen },
  { id: "graph", label: "Graph", icon: Share2 },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
