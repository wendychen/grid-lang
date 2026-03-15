"use client"

import { useEffect, useState, type ReactNode } from "react"
import { db, migrateFromLocalStorage } from "@/lib/db"
import {
  setProgressCache,
  setSettingsCache,
  setStreakCache,
  setPushedQueueCache,
  setActivityCache,
} from "@/lib/srs"
import { setEdgesCache, setCustomSentencesCache } from "@/lib/graph"
import { setNotebookCache } from "@/lib/notebook"
import { setCustomSentencesForMerge } from "@/lib/sentences"

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        // Run migration from localStorage if needed
        await migrateFromLocalStorage()

        // Load all data from Dexie into caches
        const [progress, settings, streak, pushed, activity, edges, customSentences, notebook] =
          await Promise.all([
            db.progress.toArray(),
            db.settings.get("settings"),
            db.streak.get("streak"),
            db.pushedQueue.get("pushed"),
            db.activity.toArray(),
            db.edges.toArray(),
            db.customSentences.toArray(),
            db.notebook.toArray(),
          ])

        // Set SRS caches
        const progressMap: Record<string, (typeof progress)[0]> = {}
        for (const p of progress) {
          progressMap[p.id] = p
        }
        setProgressCache(progressMap)

        if (settings) {
          setSettingsCache({
            ttsSpeed: settings.ttsSpeed,
            autoPlay: settings.autoPlay,
            gridCols: settings.gridCols,
            gridRows: settings.gridRows,
          })
        }

        if (streak) {
          setStreakCache({
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastPracticeDate: streak.lastPracticeDate,
            practiceDays: streak.practiceDays,
          })
        }

        setPushedQueueCache(pushed?.sentenceIds || [])

        // Set activity cache
        const activityMap: Record<string, (typeof activity)[0]> = {}
        for (const a of activity) {
          activityMap[a.date] = a
        }
        setActivityCache(activityMap)

        // Set graph caches
        setEdgesCache(edges)
        setCustomSentencesCache(customSentences)

        // Set custom sentences for sentence merging
        setCustomSentencesForMerge(customSentences)

        // Set notebook cache
        const notebookMap: Record<string, (typeof notebook)[0]> = {}
        for (const n of notebook) {
          notebookMap[n.date] = n
        }
        setNotebookCache(notebookMap)

        setReady(true)
      } catch (error) {
        console.error("[v0] Failed to initialize data from Dexie:", error)
        // Still render app even if initialization fails
        setReady(true)
      }
    }

    init()
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
