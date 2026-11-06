"use client"

import React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { useLiveQuery } from "dexie-react-hooks"
import { Button } from "@/components/ui/button"
import { SentenceCell } from "@/components/sentence-cell"
import { ThemeSentenceEditor } from "@/components/theme-sentence-editor"
import { db, type ThemeCardOverrideEntity } from "@/lib/db"
import { getAllThemes, type ThemePage } from "@/lib/sentences"
import { normalizeThemeCardImage, type ThemeCardImage } from "@/lib/theme-card-images"
import {
  createThemeCardOverrideId,
  saveThemeCardOverrides,
} from "@/lib/theme-card-overrides"
import {
  getProgress,
  practiceSentence,
  recordListen,
  getSettings,
  getThemeStats,
  pushToTodayQueue,
  type SentenceProgress,
} from "@/lib/srs"
import { orderThemeQueue } from "@/lib/theme-queue"
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
  Pencil,
  Save,
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

async function fetchSharedThemeImages(url: string): Promise<Record<string, ThemeCardImage>> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load shared theme card images.")

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {}

  const images = (payload as Record<string, unknown>).images
  if (!images || typeof images !== "object" || Array.isArray(images)) return {}

  const normalizedImages: Record<string, ThemeCardImage> = {}
  for (const [sentenceId, value] of Object.entries(images)) {
    if (!/^page\d+-s\d+$/.test(sentenceId)) continue
    const image = normalizeThemeCardImage(value)
    if (image) normalizedImages[sentenceId] = image
  }
  return normalizedImages
}

export function ThemedPages() {
  const { data: sharedImages = {} } = useSWR<Record<string, ThemeCardImage>>(
    "/api/theme-images",
    fetchSharedThemeImages,
  )
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
  const [isEditing, setIsEditing] = useState(false)
  const [draftOverrides, setDraftOverrides] = useState<Record<string, ThemeCardOverrideEntity>>({})
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved")
  const [uploadingSentenceIds, setUploadingSentenceIds] = useState<string[]>([])
  const draftOverridesRef = useRef<Record<string, ThemeCardOverrideEntity>>({})
  const loadedThemeIdRef = useRef<string | null>(null)
  const selectedThemeIdRef = useRef<string | null>(null)
  const draftRevisionRef = useRef(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedThemeId = selectedTheme?.id ?? null
  const storedOverrides = useLiveQuery(
    async () => {
      if (!selectedThemeId) {
        return { themeId: null, items: [] as ThemeCardOverrideEntity[] }
      }
      const items = await db.themeCardOverrides.where("themeId").equals(selectedThemeId).toArray()
      return { themeId: selectedThemeId, items }
    },
    [selectedThemeId],
  )

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

  useEffect(() => {
    selectedThemeIdRef.current = selectedThemeId

    if (!selectedThemeId) {
      loadedThemeIdRef.current = null
      draftOverridesRef.current = {}
      setDraftOverrides({})
      setSaveState("saved")
      return
    }

    if (
      storedOverrides?.themeId !== selectedThemeId ||
      (loadedThemeIdRef.current === selectedThemeId && isEditing)
    ) {
      return
    }

    const nextOverrides: Record<string, ThemeCardOverrideEntity> = Object.fromEntries(
      storedOverrides.items.map((override) => [override.sentenceId, override]),
    )
    loadedThemeIdRef.current = selectedThemeId
    draftOverridesRef.current = nextOverrides
    setDraftOverrides(nextOverrides)
    setSaveState("saved")
  }, [selectedThemeId, storedOverrides, isEditing])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        if (selectedThemeIdRef.current) {
          void saveThemeCardOverrides(Object.values(draftOverridesRef.current))
        }
      }
    }
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
      loadedThemeIdRef.current = null
      selectedThemeIdRef.current = theme.id
      draftRevisionRef.current += 1
      draftOverridesRef.current = {}
      setDraftOverrides({})
      setSaveState("saved")
      setUploadingSentenceIds([])
      setIsEditing(false)
      setSelectedTheme(theme)
      loadThemeProgress(theme)
      const ids = theme.sentences.map((s) => s.id)
      setSecretId(pickRandomSecret(ids))
    },
    [loadThemeProgress, pickRandomSecret],
  )

  const handleCardChange = useCallback(
    (
      sentenceId: string,
      patch: Partial<Pick<ThemeCardOverrideEntity, "german" | "english" | "phonetic" | "image">>,
    ) => {
      if (!selectedTheme) return

      const themeId = selectedTheme.id
      const previous = draftOverridesRef.current[sentenceId] ?? {
        id: createThemeCardOverrideId(themeId, sentenceId),
        themeId,
        sentenceId,
        updatedAt: new Date().toISOString(),
      }
      const updated = { ...previous, ...patch, updatedAt: new Date().toISOString() }
      const nextOverrides = { ...draftOverridesRef.current, [sentenceId]: updated }
      const revision = ++draftRevisionRef.current
      draftOverridesRef.current = nextOverrides
      setDraftOverrides(nextOverrides)
      setSaveState("saving")

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void saveThemeCardOverrides(Object.values(nextOverrides))
          .then(() => {
            if (
              selectedThemeIdRef.current === themeId &&
              draftRevisionRef.current === revision
            ) {
              setSaveState("saved")
            }
          })
          .catch(() => {
            if (
              selectedThemeIdRef.current === themeId &&
              draftRevisionRef.current === revision
            ) {
              setSaveState("error")
            }
          })
      }, 700)
    },
    [selectedTheme],
  )

  const handleUploadStatusChange = useCallback((sentenceId: string, uploading: boolean) => {
    setUploadingSentenceIds((current) => {
      if (uploading) {
        return current.includes(sentenceId) ? current : [...current, sentenceId]
      }
      return current.filter((id) => id !== sentenceId)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedTheme || uploadingSentenceIds.length > 0) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const revision = draftRevisionRef.current
    setSaveState("saving")

    try {
      await saveThemeCardOverrides(Object.values(draftOverridesRef.current))
      if (draftRevisionRef.current === revision) {
        setSaveState("saved")
        setIsEditing(false)
      }
    } catch {
      if (draftRevisionRef.current === revision) setSaveState("error")
    }
  }, [selectedTheme, uploadingSentenceIds.length])

  const handleBack = useCallback(async () => {
    if (selectedTheme && isEditing) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const revision = draftRevisionRef.current
      setSaveState("saving")

      try {
        await saveThemeCardOverrides(Object.values(draftOverridesRef.current))
        if (draftRevisionRef.current !== revision) return
      } catch {
        setSaveState("error")
        return
      }
    }

    setIsEditing(false)
    setSelectedTheme(null)
    selectedThemeIdRef.current = null
  }, [isEditing, selectedTheme])

  const handlePractice = useCallback(
    (id: string) => {
      const updated = practiceSentence(id)
      pushToTodayQueue(id)
      setProgressMap((prev) => ({ ...prev, [id]: updated }))
    },
    [],
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
    const currentSentences = selectedTheme.sentences.map((sentence) => {
      const override = draftOverrides[sentence.id]
      return {
        ...sentence,
        german: override?.german ?? sentence.german,
        english: override?.english ?? sentence.english,
        phonetic: override?.phonetic ?? sentence.phonetic,
      }
    })
    const themeProgress: Record<string, SentenceProgress> = {}
    for (const sentence of currentSentences) {
      themeProgress[sentence.id] = progressMap[sentence.id] || getProgress(sentence.id)
    }
    const orderedSentences = orderThemeQueue(currentSentences, themeProgress)
    const overridesReady =
      storedOverrides?.themeId === selectedTheme.id && loadedThemeIdRef.current === selectedTheme.id

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleBack()}
            className="flex size-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
            aria-label="Back to themes"
          >
            <ChevronLeft className="size-4 text-secondary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{selectedTheme.label}</h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {isEditing && (
              <span aria-live="polite" className="text-xs text-muted-foreground">
                {uploadingSentenceIds.length > 0
                  ? "Uploading image…"
                  : saveState === "saving"
                    ? "Autosaving…"
                    : saveState === "error"
                      ? "Auto-save failed"
                      : "Auto-saved"}
              </span>
            )}
            <div className="text-xs text-muted-foreground">
              {stats.practiced}/{stats.total} practiced
            </div>
            {isEditing ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={uploadingSentenceIds.length > 0}
              >
                <Save data-icon="inline-start" />
                Save
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setIsEditing(true)}
                disabled={!overridesReady}
                title={overridesReady ? "Edit sentence cards" : "Loading saved card edits"}
              >
                <Pencil data-icon="inline-start" />
                Edit cards
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(stats.practiced / stats.total) * 100}%` }}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {orderedSentences.map((sentence) => {
            const progress = progressMap[sentence.id] || getProgress(sentence.id)
            const image = draftOverrides[sentence.id]?.image ?? sharedImages[sentence.id]

            if (isEditing) {
              return (
                <ThemeSentenceEditor
                  key={sentence.id}
                  sentence={sentence}
                  image={image}
                  onChange={(patch) => handleCardChange(sentence.id, patch)}
                  onUploadStatusChange={(uploading) =>
                    handleUploadStatusChange(sentence.id, uploading)
                  }
                />
              )
            }

            return (
              <SentenceCell
                key={sentence.id}
                sentence={sentence}
                progress={progress}
                ttsSpeed={settings.ttsSpeed}
                onPractice={handlePractice}
                onListen={handleListen}
                image={image}
                secretImage={sentence.id === secretId ? "/images/secret-cat.png" : undefined}
                onSecretFound={sentence.id === secretId ? handleSecretFound : undefined}
              />
            )
          })}
        </div>

        {/* Footer stats */}
        <div className="border-t border-border pt-2 text-center text-xs text-muted-foreground">
          {stats.practiced}/{stats.total} practiced | Avg reps: {stats.avgReps} | Avg listens: {stats.avgListens}
        </div>
      </div>
    )
  }

  // Theme list view
  return (
    <div className="flex flex-col gap-3">
      <h2 className="px-1 text-lg font-semibold text-foreground">Themed Pages</h2>
      <p className="px-1 text-sm text-muted-foreground">
        Explore 240 German sentences across 10 themed categories.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {themes.map((theme) => {
          const stats = getThemeStats(theme.sentences.map((s) => s.id))
          const Icon = ICON_MAP[theme.icon] || Hash
          const pct = Math.round((stats.practiced / stats.total) * 100)

          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent",
                "active:scale-[0.98] transition-transform",
              )}
            >
              <div className="flex w-full items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{pct}%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{theme.label}</p>
                <p className="text-xs text-muted-foreground">{theme.sentences.length} sentences</p>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
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
