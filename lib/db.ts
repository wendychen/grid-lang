import Dexie, { type EntityTable } from "dexie"

// ===== Database Entities =====

export interface SentenceProgressEntity {
  id: string
  reps: number
  listens: number
  streak: number
  dueDate: string
  interval: number
  ease: number
  position: number
  lastPracticed: string | null
}

export interface SettingsEntity {
  id: string // always "settings"
  ttsSpeed: number
  autoPlay: boolean
  gridCols: number
  gridRows: number
}

export interface StreakEntity {
  id: string // always "streak"
  currentStreak: number
  longestStreak: number
  lastPracticeDate: string | null
  practiceDays: string[]
}

export interface DailyActivityEntity {
  date: string // primary key YYYY-MM-DD
  practiceCount: number
  listenCount: number
  sentenceIds: string[]
}

export interface PushedQueueEntity {
  id: string // always "pushed"
  sentenceIds: string[]
}

export interface GraphEdgeEntity {
  id: string
  source: string
  target: string
  label: string
}

export interface CustomSentenceEntity {
  id: string
  german: string
  english: string
  phonetic: string
  theme: string
  createdAt: string
}

export interface NotebookEntryEntity {
  date: string // primary key YYYY-MM-DD
  content: string
  media: {
    id: string
    type: "image" | "video"
    name: string
    path: string
    size: number
    addedAt: string
  }[]
  updatedAt: string
}

// ===== Dexie Database Class =====

class GridLangDB extends Dexie {
  progress!: EntityTable<SentenceProgressEntity, "id">
  settings!: EntityTable<SettingsEntity, "id">
  streak!: EntityTable<StreakEntity, "id">
  activity!: EntityTable<DailyActivityEntity, "date">
  pushedQueue!: EntityTable<PushedQueueEntity, "id">
  edges!: EntityTable<GraphEdgeEntity, "id">
  customSentences!: EntityTable<CustomSentenceEntity, "id">
  notebook!: EntityTable<NotebookEntryEntity, "date">

  constructor() {
    super("GridLangDB")

    this.version(1).stores({
      progress: "id, dueDate, reps",
      settings: "id",
      streak: "id",
      activity: "date",
      pushedQueue: "id",
      edges: "id, source, target",
      customSentences: "id, theme, createdAt",
      notebook: "date, updatedAt",
    })
  }
}

// Singleton instance
export const db = new GridLangDB()

// ===== Migration from localStorage =====

export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return

  const migrated = localStorage.getItem("gridlang_dexie_migrated")
  if (migrated === "true") return

  try {
    // Migrate progress
    const progressData = localStorage.getItem("gridlang_progress")
    if (progressData) {
      const progress: Record<string, SentenceProgressEntity> = JSON.parse(progressData)
      const entries = Object.values(progress)
      if (entries.length > 0) {
        await db.progress.bulkPut(entries)
      }
    }

    // Migrate settings
    const settingsData = localStorage.getItem("gridlang_settings")
    if (settingsData) {
      const settings = JSON.parse(settingsData)
      await db.settings.put({ id: "settings", ...settings })
    }

    // Migrate streak
    const streakData = localStorage.getItem("gridlang_streak")
    if (streakData) {
      const streak = JSON.parse(streakData)
      await db.streak.put({ id: "streak", ...streak })
    }

    // Migrate activity
    const activityData = localStorage.getItem("gridlang_activity")
    if (activityData) {
      const activity: Record<string, DailyActivityEntity> = JSON.parse(activityData)
      const entries = Object.values(activity)
      if (entries.length > 0) {
        await db.activity.bulkPut(entries)
      }
    }

    // Migrate pushed queue
    const pushedData = localStorage.getItem("gridlang_pushed")
    if (pushedData) {
      const sentenceIds: string[] = JSON.parse(pushedData)
      await db.pushedQueue.put({ id: "pushed", sentenceIds })
    }

    // Migrate graph edges
    const edgesData = localStorage.getItem("gridlang_graph_edges")
    if (edgesData) {
      const edges: GraphEdgeEntity[] = JSON.parse(edgesData)
      if (edges.length > 0) {
        await db.edges.bulkPut(edges)
      }
    }

    // Migrate custom sentences
    const customData = localStorage.getItem("gridlang_custom_sentences")
    if (customData) {
      const customs: CustomSentenceEntity[] = JSON.parse(customData)
      if (customs.length > 0) {
        await db.customSentences.bulkPut(customs)
      }
    }

    // Migrate notebook
    const notebookData = localStorage.getItem("gridlang_notebook")
    if (notebookData) {
      const notebook: Record<string, NotebookEntryEntity> = JSON.parse(notebookData)
      const entries = Object.values(notebook)
      if (entries.length > 0) {
        await db.notebook.bulkPut(entries)
      }
    }

    // Mark as migrated
    localStorage.setItem("gridlang_dexie_migrated", "true")
    console.log("[v0] Successfully migrated localStorage data to Dexie")
  } catch (error) {
    console.error("[v0] Migration from localStorage failed:", error)
  }
}

// ===== Reset Database =====

export async function resetDatabase(): Promise<void> {
  await db.progress.clear()
  await db.streak.clear()
  await db.activity.clear()
  await db.pushedQueue.clear()
  await db.edges.clear()
  await db.customSentences.clear()
  await db.notebook.clear()
  // Don't clear settings
}
