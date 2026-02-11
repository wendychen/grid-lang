export interface SentenceProgress {
  id: string
  reps: number
  listens: number
  streak: number
  dueDate: string // ISO date string YYYY-MM-DD
  interval: number
  ease: number
  position: number
  lastPracticed: string | null // ISO date string
}

const STORAGE_KEY = "gridlang_progress"
const SETTINGS_KEY = "gridlang_settings"
const STREAK_KEY = "gridlang_streak"
const PUSHED_KEY = "gridlang_pushed"
const ACTIVITY_KEY = "gridlang_activity"

export interface DailyActivity {
  date: string
  practiceCount: number
  listenCount: number
  sentenceIds: string[]
}


export interface AppSettings {
  ttsSpeed: number
  autoPlay: boolean
  gridCols: number
  gridRows: number
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastPracticeDate: string | null
  practiceDays: string[] // array of ISO date strings
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsSpeed: 1.0,
  autoPlay: false,
  gridCols: 3,
  gridRows: 4,
}

function getToday(): string {
  return new Date().toISOString().split("T")[0]
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

// ===== Progress Storage =====

export function getAllProgress(): Record<string, SentenceProgress> {
  if (typeof window === "undefined") return {}
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveAllProgress(progress: Record<string, SentenceProgress>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function getProgress(id: string): SentenceProgress {
  const all = getAllProgress()
  return (
    all[id] || {
      id,
      reps: 0,
      listens: 0,
      streak: 0,
      dueDate: getToday(),
      interval: 1,
      ease: 2.5,
      position: 0,
      lastPracticed: null,
    }
  )
}

export function practiceSentence(id: string): SentenceProgress {
  const all = getAllProgress()
  const prog = all[id] || {
    id,
    reps: 0,
    listens: 0,
    streak: 0,
    dueDate: getToday(),
    interval: 1,
    ease: 2.5,
    position: 0,
    lastPracticed: null,
  }

  const today = getToday()

  // Increment reps
  prog.reps += 1

  // Check streak
  if (prog.lastPracticed) {
    const gap = daysBetween(prog.lastPracticed, today)
    if (gap <= 1) {
      prog.streak += 1
    } else {
      // Streak broken
      prog.streak = 1
      prog.interval = 1
      prog.ease = Math.max(1.3, prog.ease - 0.2)
    }
  } else {
    prog.streak = 1
  }

  // Update interval using SRS
  prog.interval = Math.min(365, Math.max(1, Math.round(prog.interval * prog.ease)))
  
  // Set next due date
  const nextDue = new Date(today)
  nextDue.setDate(nextDue.getDate() + prog.interval)
  prog.dueDate = nextDue.toISOString().split("T")[0]

  // Push to end of queue
  prog.position += 100
  prog.lastPracticed = today

  all[id] = prog
  saveAllProgress(all)

  // Update daily streak and activity log
  updateDailyStreak()
  recordDailyActivity(id, "practice")

  return prog
}

export function recordListen(id: string): void {
  const all = getAllProgress()
  const prog = all[id] || {
    id,
    reps: 0,
    listens: 0,
    streak: 0,
    dueDate: getToday(),
    interval: 1,
    ease: 2.5,
    position: 0,
    lastPracticed: null,
  }
  prog.listens += 1
  all[id] = prog
  saveAllProgress(all)
  recordDailyActivity(id, "listen")
}

// ===== Today's Queue =====

export function getTodaysQueue(allSentenceIds: string[], maxItems: number = 12): string[] {
  const today = getToday()
  const allProg = getAllProgress()

  // 0. Start with pushed sentences from themed pages (highest priority)
  const pushed = getPushedQueue()
  const inQueue = new Set<string>()
  const queue: string[] = []

  for (const id of pushed) {
    if (allSentenceIds.includes(id) && !inQueue.has(id)) {
      queue.push(id)
      inQueue.add(id)
    }
  }

  // 1. Get due reviews
  const dueReviews: { id: string; dueDate: string; position: number }[] = []
  const learned: Set<string> = new Set()

  for (const id of allSentenceIds) {
    const prog = allProg[id]
    if (prog && prog.reps > 0) {
      learned.add(id)
      if (prog.dueDate <= today && !inQueue.has(id)) {
        dueReviews.push({ id, dueDate: prog.dueDate, position: prog.position })
      }
    }
  }

  // Sort by due date (oldest first), then position
  dueReviews.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    return a.position - b.position
  })

  const remaining = maxItems - queue.length
  for (const r of dueReviews.slice(0, Math.min(8, remaining))) {
    queue.push(r.id)
    inQueue.add(r.id)
  }

  // 2. Add new sentences if needed
  if (queue.length < maxItems) {
    const unlearned = allSentenceIds.filter((id) => !learned.has(id) && !inQueue.has(id))
    const needed = maxItems - queue.length
    for (let i = 0; i < Math.min(needed, unlearned.length); i++) {
      queue.push(unlearned[i])
    }
  }

  return queue.slice(0, maxItems)
}

// ===== Color Helpers =====

export function getColorForReps(reps: number): string {
  if (reps === 0) return "var(--cell-new)"
  if (reps === 1) return "var(--cell-started)"
  if (reps < 10) return "var(--cell-building)"
  if (reps < 20) return "var(--cell-strong)"
  return "var(--cell-mastered)"
}

export function getColorClass(reps: number): string {
  if (reps === 0) return "cell-new"
  if (reps === 1) return "cell-started"
  if (reps < 10) return "cell-building"
  if (reps < 20) return "cell-strong"
  return "cell-mastered"
}

// ===== Settings =====

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ===== Streak Tracking =====

export function getStreakData(): StreakData {
  if (typeof window === "undefined")
    return { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }
  try {
    const data = localStorage.getItem(STREAK_KEY)
    return data
      ? JSON.parse(data)
      : { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }
  }
}

function updateDailyStreak(): void {
  const streak = getStreakData()
  const today = getToday()

  if (streak.lastPracticeDate === today) return // already updated today

  if (streak.lastPracticeDate) {
    const gap = daysBetween(streak.lastPracticeDate, today)
    if (gap === 1) {
      streak.currentStreak += 1
    } else if (gap > 1) {
      streak.currentStreak = 1
    }
  } else {
    streak.currentStreak = 1
  }

  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
  streak.lastPracticeDate = today

  if (!streak.practiceDays.includes(today)) {
    streak.practiceDays.push(today)
    // Keep only last 400 days
    if (streak.practiceDays.length > 400) {
      streak.practiceDays = streak.practiceDays.slice(-400)
    }
  }

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
}

export function resetAllProgress(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STREAK_KEY)
  localStorage.removeItem(PUSHED_KEY)
  localStorage.removeItem(ACTIVITY_KEY)
}

// ===== Daily Activity Log =====

function getAllActivity(): Record<string, DailyActivity> {
  if (typeof window === "undefined") return {}
  try {
    const data = localStorage.getItem(ACTIVITY_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveAllActivity(activity: Record<string, DailyActivity>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity))
}

function recordDailyActivity(sentenceId: string, type: "practice" | "listen"): void {
  const today = getToday()
  const all = getAllActivity()
  const entry = all[today] || { date: today, practiceCount: 0, listenCount: 0, sentenceIds: [] }

  if (type === "practice") {
    entry.practiceCount += 1
  } else {
    entry.listenCount += 1
  }

  if (!entry.sentenceIds.includes(sentenceId)) {
    entry.sentenceIds.push(sentenceId)
  }

  all[today] = entry

  // Keep only last 400 days of activity to prevent unbounded growth
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 400)
  const cutoffStr = cutoff.toISOString().split("T")[0]
  for (const key of Object.keys(all)) {
    if (key < cutoffStr) delete all[key]
  }

  saveAllActivity(all)
}

export function getActivityForRange(days: number): DailyActivity[] {
  const all = getAllActivity()
  const result: DailyActivity[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    result.push(
      all[dateStr] || { date: dateStr, practiceCount: 0, listenCount: 0, sentenceIds: [] }
    )
  }

  return result
}

// ===== Export / Import =====

export interface GridLangBackup {
  version: 1
  exportedAt: string
  progress: Record<string, SentenceProgress>
  settings: AppSettings
  streak: StreakData
  activity: Record<string, DailyActivity>
  pushed: string[]
}

export function exportAllData(): GridLangBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: getAllProgress(),
    settings: getSettings(),
    streak: getStreakData(),
    activity: getAllActivity(),
    pushed: getPushedQueue(),
  }
}

export function importAllData(backup: GridLangBackup): void {
  if (typeof window === "undefined") return
  if (!backup || backup.version !== 1) {
    throw new Error("Invalid backup file format")
  }
  if (backup.progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.progress))
  }
  if (backup.settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings))
  }
  if (backup.streak) {
    localStorage.setItem(STREAK_KEY, JSON.stringify(backup.streak))
  }
  if (backup.activity) {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(backup.activity))
  }
  if (backup.pushed) {
    localStorage.setItem(PUSHED_KEY, JSON.stringify(backup.pushed))
  }
}

// ===== Pushed Queue (from themed pages to Today's grid) =====

export function getPushedQueue(): string[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(PUSHED_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function pushToTodayQueue(sentenceId: string): void {
  if (typeof window === "undefined") return
  const queue = getPushedQueue()
  if (!queue.includes(sentenceId)) {
    queue.push(sentenceId)
    localStorage.setItem(PUSHED_KEY, JSON.stringify(queue))
  }
}

export function clearPushedQueue(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(PUSHED_KEY)
}

// ===== Stats =====

export function getThemeStats(sentenceIds: string[]): {
  practiced: number
  total: number
  avgReps: number
  avgListens: number
} {
  const allProg = getAllProgress()
  let practiced = 0
  let totalReps = 0
  let totalListens = 0

  for (const id of sentenceIds) {
    const prog = allProg[id]
    if (prog && prog.reps > 0) {
      practiced++
      totalReps += prog.reps
      totalListens += prog.listens
    }
  }

  return {
    practiced,
    total: sentenceIds.length,
    avgReps: practiced > 0 ? Math.round((totalReps / practiced) * 10) / 10 : 0,
    avgListens: practiced > 0 ? Math.round((totalListens / practiced) * 10) / 10 : 0,
  }
}
