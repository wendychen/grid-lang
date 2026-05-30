"use client"

import React from "react"

import { useState, useCallback, useEffect } from "react"
import { SentenceCell, isSentenceLong } from "@/components/sentence-cell"
import { getAllThemes, type ThemePage } from "@/lib/sentences"
import {
  getProgress,
  practiceSentence,
  recordListen,
  getSettings,
  getThemeStats,
  pushToTodayQueue,
  type SentenceProgress,
} from "@/lib/srs"
import {
  Hand,
  Utensils,
  Hash,
  Compass,
  BedDouble,
  Heart,
  Clock,
  Smile,
  Sun,
  Plane,
  Users,
  Briefcase,
  Music,
  Smartphone,
  CalendarDays,
  GraduationCap,
  Dog,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  hand: Hand,
  utensils: Utensils,
  hash: Hash,
  compass: Compass,
  bed: BedDouble,
  heart: Heart,
  clock: Clock,
  smile: Smile,
  sun: Sun,
  plane: Plane,
  users: Users,
  briefcase: Briefcase,
  music: Music,
  smartphone: Smartphone,
  calendar: CalendarDays,
  graduation: GraduationCap,
  dog: Dog,
}

export function ThemedPages() {
  const [themes, setThemes] = useState<ThemePage[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemePage | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, SentenceProgress>>({})
  const [settings, setSettings] = useState(() => ({
    gridCols: 3,
    gridRows: 4,
    ttsSpeed: 1.0,
    autoPlay: false,
  }))
  const [secretId, setSecretId] = useState<string | null>(null)

  const pickRandomSecret = useCallback((ids: string[], excludeId?: string | null) => {
    const candidates = excludeId ? ids.filter((id) => id !== excludeId) : ids
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }, [])

  useEffect(() => {
    const allThemes = getAllThemes()
    setThemes(allThemes)
    setSettings(getSettings())
  }, [])

  const loadThemeProgress = useCallback((theme: ThemePage) => {
    const newMap: Record<string, SentenceProgress> = {}
    for (const s of theme.sentences) {
      newMap[s.id] = getProgress(s.id)
    }
    setProgressMap(newMap)
  }, [])

  const handleSelectTheme = useCallback(
    (theme: ThemePage) => {
      setSelectedTheme(theme)
      loadThemeProgress(theme)
      const ids = theme.sentences.map((s) => s.id)
      setSecretId(pickRandomSecret(ids))
    },
    [loadThemeProgress, pickRandomSecret]
  )

  const handlePractice = useCallback(
    (id: string) => {
      const updated = practiceSentence(id)
      pushToTodayQueue(id)
      setProgressMap((prev) => ({ ...prev, [id]: updated }))
    },
    []
  )

  const handleListen = useCallback((id: string) => {
    recordListen(id)
    pushToTodayQueue(id)
    setProgressMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], listens: (prev[id]?.listens || 0) + 1 },
    }))
  }, [])

  const handleSecretFound = useCallback(() => {
    if (!selectedTheme) return
    const ids = selectedTheme.sentences.map((s) => s.id)
    setSecretId((prev) => pickRandomSecret(ids, prev))
  }, [selectedTheme, pickRandomSecret])

  // Theme detail view
  if (selectedTheme) {
    const stats = getThemeStats(selectedTheme.sentences.map((s) => s.id))
    const Icon = ICON_MAP[selectedTheme.icon] || BookOpen

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTheme(null)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Back to themes"
          >
            <ChevronLeft className="w-4 h-4 text-secondary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{selectedTheme.label}</h2>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {stats.practiced}/{stats.total} practiced
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(stats.practiced / stats.total) * 100}%` }}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {selectedTheme.sentences.map((sentence) => {
            const progress = progressMap[sentence.id] || getProgress(sentence.id)
            const wide = isSentenceLong(sentence.german)
            return (
              <SentenceCell
                key={sentence.id}
                sentence={sentence}
                progress={progress}
                ttsSpeed={settings.ttsSpeed}
                onPractice={handlePractice}
                onListen={handleListen}
                wide={wide}
                secretImage={sentence.id === secretId ? "/images/secret-cat.png" : undefined}
                onSecretFound={sentence.id === secretId ? handleSecretFound : undefined}
              />
            )
          })}
        </div>

        {/* Footer stats */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          {stats.practiced}/{stats.total} practiced | Avg reps: {stats.avgReps} | Avg listens: {stats.avgListens}
        </div>
      </div>
    )
  }

  // Theme list view
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground px-1">Themed Pages</h2>
      <p className="text-sm text-muted-foreground px-1">
        Explore 240 German sentences across 10 themed categories.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {themes.map((theme) => {
          const stats = getThemeStats(theme.sentences.map((s) => s.id))
          const Icon = ICON_MAP[theme.icon] || Hash
          const pct = Math.round((stats.practiced / stats.total) * 100)

          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme)}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-xl border border-border",
                "bg-card hover:bg-accent transition-colors text-left",
                "active:scale-[0.98] transition-transform"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground ml-auto">{pct}%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{theme.label}</p>
                <p className="text-xs text-muted-foreground">{theme.sentences.length} sentences</p>
              </div>
              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}
