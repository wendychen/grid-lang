// Notebook data layer - stores notes and media per date
// Persisted in Dexie (IndexedDB)

import { db, type NotebookEntryEntity } from "./db"

export interface MediaItem {
  id: string
  type: "image" | "video"
  name: string
  path: string // Data URL or blob URL
  size: number
  addedAt: string
}

export interface NotebookEntry {
  date: string // YYYY-MM-DD
  content: string // Rich text / markdown content
  media: MediaItem[]
  updatedAt: string
}

// ===== Cache for sync access =====

let notebookCache: Record<string, NotebookEntry> = {}

export function setNotebookCache(data: Record<string, NotebookEntry>): void {
  notebookCache = data
}

// ===== Async Dexie operations =====

export async function getAllEntriesAsync(): Promise<Record<string, NotebookEntry>> {
  const entries = await db.notebook.toArray()
  const result: Record<string, NotebookEntry> = {}
  for (const e of entries) {
    result[e.date] = e
  }
  return result
}

export function getAllEntries(): Record<string, NotebookEntry> {
  return notebookCache
}

export async function getEntryAsync(date: string): Promise<NotebookEntry | null> {
  const entry = await db.notebook.get(date)
  return entry || null
}

export function getEntry(date: string): NotebookEntry | null {
  return notebookCache[date] || null
}

export async function saveEntryAsync(date: string, content: string, media: MediaItem[]): Promise<NotebookEntry> {
  const entry: NotebookEntry = {
    date,
    content,
    media,
    updatedAt: new Date().toISOString(),
  }
  await db.notebook.put(entry as NotebookEntryEntity)
  notebookCache[date] = entry
  return entry
}

export function saveEntry(date: string, content: string, media: MediaItem[]): NotebookEntry {
  const entry: NotebookEntry = {
    date,
    content,
    media,
    updatedAt: new Date().toISOString(),
  }
  notebookCache[date] = entry
  db.notebook.put(entry as NotebookEntryEntity)
  return entry
}

export async function addMediaAsync(date: string, media: MediaItem): Promise<NotebookEntry> {
  let entry = await db.notebook.get(date)
  if (!entry) {
    entry = {
      date,
      content: "",
      media: [],
      updatedAt: new Date().toISOString(),
    }
  }
  entry.media.push(media)
  entry.updatedAt = new Date().toISOString()
  await db.notebook.put(entry)
  notebookCache[date] = entry
  return entry
}

export function addMedia(date: string, media: MediaItem): NotebookEntry {
  let entry = notebookCache[date]
  if (!entry) {
    entry = {
      date,
      content: "",
      media: [],
      updatedAt: new Date().toISOString(),
    }
  }
  entry.media.push(media)
  entry.updatedAt = new Date().toISOString()
  notebookCache[date] = entry
  db.notebook.put(entry as NotebookEntryEntity)
  return entry
}

export async function removeMediaAsync(date: string, mediaId: string): Promise<NotebookEntry | null> {
  const entry = await db.notebook.get(date)
  if (!entry) return null
  entry.media = entry.media.filter((m) => m.id !== mediaId)
  entry.updatedAt = new Date().toISOString()
  await db.notebook.put(entry)
  notebookCache[date] = entry
  return entry
}

export function removeMedia(date: string, mediaId: string): NotebookEntry | null {
  const entry = notebookCache[date]
  if (!entry) return null
  entry.media = entry.media.filter((m) => m.id !== mediaId)
  entry.updatedAt = new Date().toISOString()
  notebookCache[date] = entry
  db.notebook.put(entry as NotebookEntryEntity)
  return entry
}

export async function deleteEntryAsync(date: string): Promise<void> {
  await db.notebook.delete(date)
  delete notebookCache[date]
}

export function deleteEntry(date: string): void {
  delete notebookCache[date]
  db.notebook.delete(date)
}

export async function getDatesWithEntriesAsync(): Promise<string[]> {
  const entries = await db.notebook.toArray()
  return entries
    .filter((entry) => entry.content.trim() !== "" || entry.media.length > 0)
    .map((entry) => entry.date)
}

export function getDatesWithEntries(): string[] {
  return Object.keys(notebookCache).filter((date) => {
    const entry = notebookCache[date]
    return entry.content.trim() !== "" || entry.media.length > 0
  })
}

// Generate unique ID
export function generateMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Convert file to data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Export notebook data
export async function exportNotebookAsync(): Promise<Record<string, NotebookEntry>> {
  return await getAllEntriesAsync()
}

export function exportNotebook(): Record<string, NotebookEntry> {
  return notebookCache
}

// Import notebook data
export async function importNotebookAsync(data: Record<string, NotebookEntry>): Promise<void> {
  const entries = Object.values(data)
  if (entries.length > 0) {
    await db.notebook.bulkPut(entries as NotebookEntryEntity[])
  }
  // Update cache
  for (const e of entries) {
    notebookCache[e.date] = e
  }
}

export function importNotebook(data: Record<string, NotebookEntry>): void {
  const entries = Object.values(data)
  for (const e of entries) {
    notebookCache[e.date] = e
  }
  db.notebook.bulkPut(entries as NotebookEntryEntity[])
}

// Clear all notebook data
export async function clearNotebookAsync(): Promise<void> {
  await db.notebook.clear()
  notebookCache = {}
}

export function clearNotebook(): void {
  notebookCache = {}
  db.notebook.clear()
}
