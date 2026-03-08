// Notebook data layer - stores notes and media per date

const NOTEBOOK_KEY = "gridlang_notebook"

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

// Get all notebook entries
export function getAllEntries(): Record<string, NotebookEntry> {
  if (typeof window === "undefined") return {}
  try {
    const data = localStorage.getItem(NOTEBOOK_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

// Save all entries
function saveAllEntries(entries: Record<string, NotebookEntry>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(entries))
}

// Get entry for a specific date
export function getEntry(date: string): NotebookEntry | null {
  const entries = getAllEntries()
  return entries[date] || null
}

// Save entry for a date
export function saveEntry(date: string, content: string, media: MediaItem[]): NotebookEntry {
  const entries = getAllEntries()
  const entry: NotebookEntry = {
    date,
    content,
    media,
    updatedAt: new Date().toISOString(),
  }
  entries[date] = entry
  saveAllEntries(entries)
  return entry
}

// Add media to an entry
export function addMedia(date: string, media: MediaItem): NotebookEntry {
  const entries = getAllEntries()
  const entry = entries[date] || {
    date,
    content: "",
    media: [],
    updatedAt: new Date().toISOString(),
  }
  entry.media.push(media)
  entry.updatedAt = new Date().toISOString()
  entries[date] = entry
  saveAllEntries(entries)
  return entry
}

// Remove media from an entry
export function removeMedia(date: string, mediaId: string): NotebookEntry | null {
  const entries = getAllEntries()
  const entry = entries[date]
  if (!entry) return null
  entry.media = entry.media.filter((m) => m.id !== mediaId)
  entry.updatedAt = new Date().toISOString()
  entries[date] = entry
  saveAllEntries(entries)
  return entry
}

// Delete an entire entry
export function deleteEntry(date: string): void {
  const entries = getAllEntries()
  delete entries[date]
  saveAllEntries(entries)
}

// Get dates that have entries
export function getDatesWithEntries(): string[] {
  const entries = getAllEntries()
  return Object.keys(entries).filter((date) => {
    const entry = entries[date]
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
export function exportNotebook(): Record<string, NotebookEntry> {
  return getAllEntries()
}

// Import notebook data
export function importNotebook(data: Record<string, NotebookEntry>): void {
  if (typeof window === "undefined") return
  const existing = getAllEntries()
  // Merge: incoming entries override existing
  const merged = { ...existing, ...data }
  saveAllEntries(merged)
}

// Clear all notebook data
export function clearNotebook(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(NOTEBOOK_KEY)
}
