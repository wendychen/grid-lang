import { db, type SentenceProgressEntity, type SettingsEntity, type StreakEntity, type DailyActivityEntity } from "./db"
import {
  saveProgressFirestore,
  saveSettingsFirestore,
  saveStreakFirestore,
  saveActivityFirestore,
  savePushedQueueFirestore,
} from "./firestore"

export type SentenceProgress = SentenceProgressEntity

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
  practiceDays: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsSpeed: 1.0,
  autoPlay: false,
  gridCols: 3,
  gridRows: 4,
}

const APP_TIME_ZONE = "Asia/Taipei"

function formatLocalDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function dateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function getToday(): string {
  return formatLocalDate(new Date())
}

// Simple seeded PRNG (mulberry32) for deterministic daily shuffles
function seededRng(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateToSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0
  }
  return hash
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr]
  const rng = seededRng(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

// ===== Progress Storage (Dexie) =====

export async function getAllProgressAsync(): Promise<Record<string, SentenceProgress>> {
  const entries = await db.progress.toArray()
  const result: Record<string, SentenceProgress> = {}
  for (const e of entries) {
    result[e.id] = e
  }
  return result
}

export async function getProgressAsync(id: string): Promise<SentenceProgress> {
  const prog = await db.progress.get(id)
  return (
    prog || {
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

export async function practiceSentenceAsync(id: string): Promise<SentenceProgress> {
  const prog = await getProgressAsync(id)
  const today = getToday()

  // Increment reps
  prog.reps += 1

  // Check streak
  if (prog.lastPracticed) {
    const gap = daysBetween(prog.lastPracticed, today)
    if (gap <= 1) {
      prog.streak += 1
    } else {
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
  const nextDue = dateKeyToDate(today)
  nextDue.setUTCDate(nextDue.getUTCDate() + prog.interval)
  prog.dueDate = formatLocalDate(nextDue)

  // Push to end of queue
  prog.position += 100
  prog.lastPracticed = today

  await db.progress.put(prog)
  saveProgressFirestore(prog)

  // Update daily streak and activity log
  await updateDailyStreakAsync()
  await recordDailyActivityAsync(id, "practice")

  return prog
}

export async function recordListenAsync(id: string): Promise<void> {
  const prog = await getProgressAsync(id)
  prog.listens += 1
  await db.progress.put(prog)
  saveProgressFirestore(prog)
  await recordDailyActivityAsync(id, "listen")
}

// ===== Sync wrappers using useLiveQuery cache =====
// These are for backwards compatibility with sync components

let progressCache: Record<string, SentenceProgress> = {}

export function setProgressCache(data: Record<string, SentenceProgress>): void {
  progressCache = data
}

export function getAllProgress(): Record<string, SentenceProgress> {
  return progressCache
}

export function getProgress(id: string): SentenceProgress {
  return (
    progressCache[id] || {
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

// Sync wrappers that call async versions
export function practiceSentence(id: string): SentenceProgress {
  const prog = getProgress(id)
  const today = getToday()

  prog.reps += 1
  if (prog.lastPracticed) {
    const gap = daysBetween(prog.lastPracticed, today)
    if (gap <= 1) {
      prog.streak += 1
    } else {
      prog.streak = 1
      prog.interval = 1
      prog.ease = Math.max(1.3, prog.ease - 0.2)
    }
  } else {
    prog.streak = 1
  }
  prog.interval = Math.min(365, Math.max(1, Math.round(prog.interval * prog.ease)))
  const nextDue = dateKeyToDate(today)
  nextDue.setUTCDate(nextDue.getUTCDate() + prog.interval)
  prog.dueDate = formatLocalDate(nextDue)
  prog.position += 100
  prog.lastPracticed = today

  // Fire async update
  db.progress.put(prog)
  updateDailyStreakAsync()
  recordDailyActivityAsync(id, "practice")

  progressCache[id] = prog
  return prog
}

export function recordListen(id: string): void {
  const prog = getProgress(id)
  prog.listens += 1
  progressCache[id] = prog
  db.progress.put(prog)
  recordDailyActivityAsync(id, "listen")
}

// ===== Today's Queue =====

export async function getTodaysQueueAsync(allSentenceIds: string[], maxItems: number = 12): Promise<string[]> {
  const today = getToday()
  const seed = dateToSeed(today)
  const allProg = await getAllProgressAsync()

  const pushed = await getPushedQueueAsync()
  const inQueue = new Set<string>()
  const queue: string[] = []

  for (const id of pushed) {
    if (allSentenceIds.includes(id) && !inQueue.has(id)) {
      queue.push(id)
      inQueue.add(id)
    }
  }

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

  dueReviews.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    return 0
  })

  const dueGroups = new Map<string, typeof dueReviews>()
  for (const r of dueReviews) {
    const group = dueGroups.get(r.dueDate) || []
    group.push(r)
    dueGroups.set(r.dueDate, group)
  }
  const shuffledDue: typeof dueReviews = []
  for (const [, group] of dueGroups) {
    shuffledDue.push(...shuffleWithSeed(group, seed))
  }

  const remaining = maxItems - queue.length
  for (const r of shuffledDue.slice(0, Math.min(8, remaining))) {
    queue.push(r.id)
    inQueue.add(r.id)
  }

  if (queue.length < maxItems) {
    const unlearned = allSentenceIds.filter((id) => !learned.has(id) && !inQueue.has(id))
    const shuffledUnlearned = shuffleWithSeed(unlearned, seed)
    const needed = maxItems - queue.length
    for (let i = 0; i < Math.min(needed, shuffledUnlearned.length); i++) {
      queue.push(shuffledUnlearned[i])
    }
  }

  return queue.slice(0, maxItems)
}

// Sync version using cache
export function getTodaysQueue(allSentenceIds: string[], maxItems: number = 12): string[] {
  const today = getToday()
  const seed = dateToSeed(today)
  const allProg = progressCache

  const pushed = pushedQueueCache
  const inQueue = new Set<string>()
  const queue: string[] = []

  for (const id of pushed) {
    if (allSentenceIds.includes(id) && !inQueue.has(id)) {
      queue.push(id)
      inQueue.add(id)
    }
  }

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

  dueReviews.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    return 0
  })

  const dueGroups = new Map<string, typeof dueReviews>()
  for (const r of dueReviews) {
    const group = dueGroups.get(r.dueDate) || []
    group.push(r)
    dueGroups.set(r.dueDate, group)
  }
  const shuffledDue: typeof dueReviews = []
  for (const [, group] of dueGroups) {
    shuffledDue.push(...shuffleWithSeed(group, seed))
  }

  const remaining = maxItems - queue.length
  for (const r of shuffledDue.slice(0, Math.min(8, remaining))) {
    queue.push(r.id)
    inQueue.add(r.id)
  }

  if (queue.length < maxItems) {
    const unlearned = allSentenceIds.filter((id) => !learned.has(id) && !inQueue.has(id))
    const shuffledUnlearned = shuffleWithSeed(unlearned, seed)
    const needed = maxItems - queue.length
    for (let i = 0; i < Math.min(needed, shuffledUnlearned.length); i++) {
      queue.push(shuffledUnlearned[i])
    }
  }

  return queue.slice(0, maxItems)
}

// ===== Color Helpers =====

export function getColorForReps(reps: number): string {
  if (reps === 0) return "var(--cell-new)"
  if (reps <= 10) return "var(--cell-lv1)"
  if (reps <= 20) return "var(--cell-lv2)"
  if (reps <= 30) return "var(--cell-lv3)"
  if (reps <= 40) return "var(--cell-lv4)"
  if (reps <= 50) return "var(--cell-lv5)"
  if (reps <= 60) return "var(--cell-lv6)"
  if (reps <= 70) return "var(--cell-lv7)"
  if (reps <= 80) return "var(--cell-lv8)"
  return "var(--cell-lv9)"
}

export function getColorClass(reps: number): string {
  if (reps === 0) return "cell-new"
  if (reps <= 10) return "cell-lv1"
  if (reps <= 20) return "cell-lv2"
  if (reps <= 30) return "cell-lv3"
  if (reps <= 40) return "cell-lv4"
  if (reps <= 50) return "cell-lv5"
  if (reps <= 60) return "cell-lv6"
  if (reps <= 70) return "cell-lv7"
  if (reps <= 80) return "cell-lv8"
  return "cell-lv9"
}

// ===== Settings (Dexie) =====

let settingsCache: AppSettings = DEFAULT_SETTINGS

export function setSettingsCache(data: AppSettings): void {
  settingsCache = data
}

export async function getSettingsAsync(): Promise<AppSettings> {
  const data = await db.settings.get("settings")
  return data ? { ttsSpeed: data.ttsSpeed, autoPlay: data.autoPlay, gridCols: data.gridCols, gridRows: data.gridRows } : DEFAULT_SETTINGS
}

export async function saveSettingsAsync(settings: AppSettings): Promise<void> {
  await db.settings.put({ id: "settings", ...settings })
}

export function getSettings(): AppSettings {
  return settingsCache
}

export function saveSettings(settings: AppSettings): void {
  settingsCache = settings
  db.settings.put({ id: "settings", ...settings })
}

// ===== Streak Tracking (Dexie) =====

let streakCache: StreakData = { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }

export function setStreakCache(data: StreakData): void {
  streakCache = data
}

export async function getStreakDataAsync(): Promise<StreakData> {
  const data = await db.streak.get("streak")
  return data
    ? { currentStreak: data.currentStreak, longestStreak: data.longestStreak, lastPracticeDate: data.lastPracticeDate, practiceDays: data.practiceDays }
    : { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }
}

export function getStreakData(): StreakData {
  return streakCache
}

async function updateDailyStreakAsync(): Promise<void> {
  const streak = await getStreakDataAsync()
  const today = getToday()

  if (streak.lastPracticeDate === today) return

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
    if (streak.practiceDays.length > 400) {
      streak.practiceDays = streak.practiceDays.slice(-400)
    }
  }

  await db.streak.put({ id: "streak", ...streak })
  streakCache = streak
}

// ===== Reset (Dexie) =====

export async function resetAllProgressAsync(): Promise<void> {
  await db.progress.clear()
  await db.streak.clear()
  await db.activity.clear()
  await db.pushedQueue.clear()
  await db.edges.clear()
  await db.customSentences.clear()
  await db.notebook.clear()
  progressCache = {}
  streakCache = { currentStreak: 0, longestStreak: 0, lastPracticeDate: null, practiceDays: [] }
  pushedQueueCache = []
}

export function resetAllProgress(): void {
  resetAllProgressAsync()
}

// ===== Daily Activity Log (Dexie) =====

async function recordDailyActivityAsync(sentenceId: string, type: "practice" | "listen"): Promise<void> {
  const today = getToday()
  let entry = await db.activity.get(today)
  if (!entry) {
    entry = { date: today, practiceCount: 0, listenCount: 0, sentenceIds: [] }
  }

  if (type === "practice") {
    entry.practiceCount += 1
  } else {
    entry.listenCount += 1
  }

  if (!entry.sentenceIds.includes(sentenceId)) {
    entry.sentenceIds.push(sentenceId)
  }

  await db.activity.put(entry)

  // Update activity cache
  activityCache[today] = entry

  // Cleanup old entries
  const cutoff = dateKeyToDate(getToday())
  cutoff.setUTCDate(cutoff.getUTCDate() - 400)
  const cutoffStr = formatLocalDate(cutoff)
  await db.activity.where("date").below(cutoffStr).delete()
}

export async function getActivityForRangeAsync(days: number): Promise<DailyActivity[]> {
  const allEntries = await db.activity.toArray()
  const activityMap: Record<string, DailyActivity> = {}
  for (const e of allEntries) {
    activityMap[e.date] = e
  }

  const result: DailyActivity[] = []
  const today = dateKeyToDate(getToday())

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = formatLocalDate(d)
    result.push(activityMap[dateStr] || { date: dateStr, practiceCount: 0, listenCount: 0, sentenceIds: [] })
  }

  return result
}

// Activity cache
let activityCache: Record<string, DailyActivity> = {}

export function setActivityCache(data: Record<string, DailyActivity>): void {
  activityCache = data
}

export function getActivityForRange(days: number): DailyActivity[] {
  const result: DailyActivity[] = []
  const today = dateKeyToDate(getToday())

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = formatLocalDate(d)
    result.push(activityCache[dateStr] || { date: dateStr, practiceCount: 0, listenCount: 0, sentenceIds: [] })
  }

  return result
}

// ===== Pushed Queue (Dexie) =====

let pushedQueueCache: string[] = []

export function setPushedQueueCache(data: string[]): void {
  pushedQueueCache = data
}

export async function getPushedQueueAsync(): Promise<string[]> {
  const data = await db.pushedQueue.get("pushed")
  return data?.sentenceIds || []
}

export function getPushedQueue(): string[] {
  return pushedQueueCache
}

export async function pushToTodayQueueAsync(sentenceId: string): Promise<void> {
  const queue = await getPushedQueueAsync()
  if (!queue.includes(sentenceId)) {
    queue.push(sentenceId)
    await db.pushedQueue.put({ id: "pushed", sentenceIds: queue })
    pushedQueueCache = queue
  }
}

export function pushToTodayQueue(sentenceId: string): void {
  if (!pushedQueueCache.includes(sentenceId)) {
    pushedQueueCache.push(sentenceId)
    db.pushedQueue.put({ id: "pushed", sentenceIds: pushedQueueCache })
  }
}

export async function clearPushedQueueAsync(): Promise<void> {
  await db.pushedQueue.delete("pushed")
  pushedQueueCache = []
}

export function clearPushedQueue(): void {
  pushedQueueCache = []
  db.pushedQueue.delete("pushed")
}

// ===== Stats =====

export function getThemeStats(sentenceIds: string[]): {
  practiced: number
  total: number
  avgReps: number
  avgListens: number
} {
  const allProg = progressCache
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

// ===== Export / Import (Dexie) =====

export interface GridLangBackup {
  version: 1
  exportedAt: string
  progress: Record<string, SentenceProgress>
  settings: AppSettings
  streak: StreakData
  activity: Record<string, DailyActivity>
  pushed: string[]
  graphEdges?: unknown[]
  customSentences?: unknown[]
  notebook?: unknown
}

export async function exportAllDataAsync(): Promise<GridLangBackup> {
  const progress = await getAllProgressAsync()
  const settings = await getSettingsAsync()
  const streak = await getStreakDataAsync()
  const activityArr = await db.activity.toArray()
  const activity: Record<string, DailyActivity> = {}
  for (const a of activityArr) {
    activity[a.date] = a
  }
  const pushed = await getPushedQueueAsync()
  const graphEdges = await db.edges.toArray()
  const customSentences = await db.customSentences.toArray()
  const notebookArr = await db.notebook.toArray()
  const notebook: Record<string, unknown> = {}
  for (const n of notebookArr) {
    notebook[n.date] = n
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    settings,
    streak,
    activity,
    pushed,
    graphEdges,
    customSentences,
    notebook,
  }
}

export function exportAllData(): GridLangBackup {
  // Sync version - returns cached data
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: progressCache,
    settings: settingsCache,
    streak: streakCache,
    activity: {},
    pushed: pushedQueueCache,
  }
}

export async function importAllDataAsync(backup: GridLangBackup): Promise<void> {
  if (!backup || backup.version !== 1) {
    throw new Error("Invalid backup file format")
  }

  if (backup.progress) {
    await db.progress.clear()
    const entries = Object.values(backup.progress)
    if (entries.length > 0) {
      await db.progress.bulkPut(entries)
    }
  }

  if (backup.settings) {
    await db.settings.put({ id: "settings", ...backup.settings })
  }

  if (backup.streak) {
    await db.streak.put({ id: "streak", ...backup.streak })
  }

  if (backup.activity) {
    await db.activity.clear()
    const entries = Object.values(backup.activity)
    if (entries.length > 0) {
      await db.activity.bulkPut(entries)
    }
  }

  if (backup.pushed) {
    await db.pushedQueue.put({ id: "pushed", sentenceIds: backup.pushed })
  }

  if (backup.graphEdges && Array.isArray(backup.graphEdges)) {
    await db.edges.clear()
    await db.edges.bulkPut(backup.graphEdges as any[])
  }

  if (backup.customSentences && Array.isArray(backup.customSentences)) {
    await db.customSentences.clear()
    await db.customSentences.bulkPut(backup.customSentences as any[])
  }

  if (backup.notebook && typeof backup.notebook === "object") {
    await db.notebook.clear()
    const entries = Object.values(backup.notebook as Record<string, any>)
    if (entries.length > 0) {
      await db.notebook.bulkPut(entries)
    }
  }
}

export function importAllData(backup: GridLangBackup): void {
  importAllDataAsync(backup)
}
