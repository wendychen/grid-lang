"use client"

import React from "react"

import { LayoutGrid, BookOpen, BarChart3, Settings, Share2, NotebookPen, Dumbbell, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type AppView = "today" | "quiz" | "themes" | "graph" | "notebook" | "progress" | "settings"

interface BottomNavProps {
  active: AppView
  onChange: (view: AppView) => void
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "today", label: "Today", icon: LayoutGrid },
  { id: "quiz", label: "Quiz", icon: Dumbbell },
  { id: "themes", label: "Themes", icon: BookOpen },
  { id: "graph", label: "Graph", icon: Share2 },
  { id: "notebook", label: "Notebook", icon: NotebookPen },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 3)
const MORE_NAV_ITEMS = NAV_ITEMS.slice(3)

function navButtonClass(isActive: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors min-w-[44px]",
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  )
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="hidden md:flex items-center justify-around py-2 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={navButtonClass(isActive)}
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
      <div className="flex md:hidden items-center justify-around py-2 px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={navButtonClass(isActive)}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={navButtonClass(MORE_NAV_ITEMS.some((item) => item.id === active))}
              aria-label="More navigation"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className={cn(
                "text-[10px] font-medium",
                MORE_NAV_ITEMS.some((item) => item.id === active) && "text-primary"
              )}>
                More
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-44">
            {MORE_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <DropdownMenuItem
                  key={item.id}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(isActive && "bg-accent text-accent-foreground")}
                  onSelect={() => onChange(item.id)}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
