"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getEntry,
  saveEntry,
  addMedia,
  removeMedia,
  getDatesWithEntries,
  generateMediaId,
  fileToDataUrl,
  formatFileSize,
  type NotebookEntry,
  type MediaItem,
} from "@/lib/notebook"
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Video,
  Trash2,
  Copy,
  Check,
  FileText,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function NotebookView() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(
    formatDate(today.getFullYear(), today.getMonth(), today.getDate())
  )
  const [entry, setEntry] = useState<NotebookEntry | null>(null)
  const [content, setContent] = useState("")
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load entry when date changes
  useEffect(() => {
    const loaded = getEntry(selectedDate)
    setEntry(loaded)
    setContent(loaded?.content || "")
    setDatesWithEntries(new Set(getDatesWithEntries()))
  }, [selectedDate])

  // Auto-save content with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== (entry?.content || "")) {
        const updated = saveEntry(selectedDate, content, entry?.media || [])
        setEntry(updated)
        setDatesWithEntries(new Set(getDatesWithEntries()))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [content, selectedDate, entry])

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleDateClick = (day: number) => {
    setSelectedDate(formatDate(currentYear, currentMonth, day))
  }

  const handleFileDrop = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/")
        const isVideo = file.type.startsWith("video/")
        if (!isImage && !isVideo) continue

        try {
          const dataUrl = await fileToDataUrl(file)
          const media: MediaItem = {
            id: generateMediaId(),
            type: isImage ? "image" : "video",
            name: file.name,
            path: dataUrl,
            size: file.size,
            addedAt: new Date().toISOString(),
          }
          const updated = addMedia(selectedDate, media)
          setEntry(updated)
          setDatesWithEntries(new Set(getDatesWithEntries()))
        } catch (err) {
          console.error("Failed to process file:", err)
        }
      }
    },
    [selectedDate]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files)
    }
  }

  const handleRemoveMedia = (mediaId: string) => {
    const updated = removeMedia(selectedDate, mediaId)
    if (updated) {
      setEntry(updated)
      setDatesWithEntries(new Set(getDatesWithEntries()))
    }
  }

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)]">
      {/* Left: Perpetual Calendar */}
      <div className="lg:w-80 shrink-0">
        <div className="bg-card rounded-xl border border-border p-4">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="font-semibold text-foreground">
                {MONTHS[currentMonth]} {currentYear}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />
              }
              const dateStr = formatDate(currentYear, currentMonth, day)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === todayStr
              const hasEntry = datesWithEntries.has(dateStr)

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all relative",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-secondary text-foreground"
                  )}
                >
                  {day}
                  {hasEntry && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent-green" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick jump to today */}
          <button
            onClick={() => {
              setCurrentYear(today.getFullYear())
              setCurrentMonth(today.getMonth())
              setSelectedDate(todayStr)
            }}
            className="mt-4 w-full py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Jump to Today
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{datesWithEntries.size} entries total</span>
          </div>
        </div>
      </div>

      {/* Right: Notebook */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex-1 flex flex-col bg-card rounded-xl border-2 transition-all min-h-0",
            isDragging ? "border-primary border-dashed bg-primary/5" : "border-border"
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {entry?.updatedAt && (
                <span>
                  Saved {new Date(entry.updatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Text Area */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes here... You can also drag and drop images or videos."
              className="flex-1 min-h-[150px] p-4 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm leading-relaxed"
            />

            {/* Drag & Drop Hint */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <ImageIcon className="w-12 h-12" />
                  <span className="font-medium">Drop images or videos here</span>
                </div>
              </div>
            )}

            {/* Media Gallery */}
            {entry && entry.media.length > 0 && (
              <div className="shrink-0 border-t border-border p-4 max-h-[40%] overflow-y-auto">
                <h3 className="text-xs font-medium text-muted-foreground mb-3">
                  Media ({entry.media.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {entry.media.map((media) => (
                    <div
                      key={media.id}
                      className="bg-secondary/50 rounded-lg overflow-hidden"
                    >
                      {/* Preview */}
                      <div className="aspect-video bg-black/10 flex items-center justify-center overflow-hidden">
                        {media.type === "image" ? (
                          <img
                            src={media.path}
                            alt={media.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={media.path}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <div className="flex items-start gap-2">
                          {media.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          ) : (
                            <Video className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {media.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(media.size)}
                            </p>
                          </div>
                        </div>

                        {/* Path */}
                        <div className="mt-2 flex items-center gap-1">
                          <input
                            type="text"
                            readOnly
                            value={media.path.slice(0, 50) + "..."}
                            className="flex-1 text-[10px] bg-background/50 px-2 py-1 rounded border border-border text-muted-foreground font-mono truncate"
                          />
                          <button
                            onClick={() => handleCopyPath(media.path)}
                            className="p-1 hover:bg-secondary rounded transition-colors"
                            title="Copy full path"
                          >
                            {copiedPath === media.path ? (
                              <Check className="w-3.5 h-3.5 text-accent-green" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveMedia(media.id)}
                            className="p-1 hover:bg-destructive/10 rounded transition-colors"
                            title="Remove media"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
