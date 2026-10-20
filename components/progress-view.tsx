"use client"

// @ts-ignore React declarations are unavailable in this environment.
import { useState, useEffect, useMemo, useRef } from "react"
import {
  getStreakData,
  getAllProgress,
  getActivityForRange,
  type StreakData,
  type DailyActivity,
} from "@/lib/srs"
import { getAllSentences } from "@/lib/sentences"
import { cn } from "@/lib/utils"
import { calculateProgressSummary, type FamiliarityBucket, type ProgressStats } from "@/lib/progress-stats"

function Flame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.4 0 2.5-1.1 2.5-2.5 0-1.2-.8-2-1.5-2.8-.7-.7-1.5-1.5-1.5-2.7 0-1 .5-2 1.5-3 0 2.5 2 3.5 3 5 .7 1 1 2 1 3.5a6 6 0 1 1-12 0c0-2.5 1.1-4.7 3.5-6.5-.3 2.5.2 3.7 1 4.5Z" />
    </svg>
  )
}

function Target({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function Volume2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a10 10 0 0 1 0 14" />
    </svg>
  )
}

// Provide JSX's global intrinsic element types for TypeScript.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any
    }
  }
}

function parseTaipeiDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// ===== 365-Day Heatmap =====

function Heatmap365({ activity }: { activity: DailyActivity[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Group days into weeks (columns), starting from Monday
  const weeks = useMemo(() => {
    const result: DailyActivity[][] = []
    let currentWeek: DailyActivity[] = []

    for (let i = 0; i < activity.length; i++) {
      const dayOfWeek = parseTaipeiDate(activity[i].date).getUTCDay()
      // Convert to Monday-start: Mon=0, Tue=1, ... Sun=6
      const adjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      if (i === 0) {
        // Pad the first week with empty slots
        for (let p = 0; p < adjusted; p++) {
          currentWeek.push({ date: "", practiceCount: 0, listenCount: 0, sentenceIds: [] })
        }
      }

      currentWeek.push(activity[i])

      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    }

    if (currentWeek.length > 0) {
      result.push(currentWeek)
    }

    return result
  }, [activity])

  // Find max activity for scaling
  const maxCount = useMemo(() => {
    let max = 1
    for (const day of activity) {
      const total = day.practiceCount + day.listenCount
      if (total > max) max = total
    }
    return max
  }, [activity])

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = []
    let lastMonth = -1

    for (let w = 0; w < weeks.length; w++) {
      for (const day of weeks[w]) {
        if (!day.date) continue
        const month = parseTaipeiDate(day.date).getUTCMonth()
        if (month !== lastMonth) {
          lastMonth = month
          labels.push({
            label: parseTaipeiDate(day.date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
            weekIndex: w,
          })
          break
        }
      }
    }

    return labels
  }, [weeks])

  useEffect(() => {
    // Scroll to the end (most recent) on mount
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [])

  const getCellColor = (day: DailyActivity) => {
    if (!day.date) return "bg-transparent"
    const total = day.practiceCount + day.listenCount
    if (total === 0) return "bg-secondary"
    const ratio = total / maxCount
    if (ratio < 0.25) return "bg-primary/30"
    if (ratio < 0.5) return "bg-primary/50"
    if (ratio < 0.75) return "bg-primary/75"
    return "bg-primary"
  }

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""]

  return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] shrink-0 pr-1">
            <div className="h-3" /> {/* spacer for month row */}
            {dayLabels.map((label, i) => (
              <div key={i} className="h-[11px] flex items-center">
                <span className="text-[9px] text-muted-foreground leading-none w-6 text-right">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto scrollbar-thin">
            <div className="inline-flex flex-col gap-0">
              {/* Month labels row */}
              <div className="flex gap-[3px] h-3 mb-[3px]">
                {weeks.map((_: any, w: any) => {
                  const monthLabel = monthLabels.find((m: { weekIndex: any }) => m.weekIndex === w)
                  return (
                    <div key={w} className="w-[11px] shrink-0 flex items-center">
                      {monthLabel && (
                        <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">
                          {monthLabel.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Day rows */}
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div key={dayIndex} className="flex gap-[3px]">
                  {weeks.map((week: any[], w: any) => {
                    const day = week[dayIndex]
                    if (!day) {
                      return <div key={w} className="w-[11px] h-[11px] shrink-0" />
                    }

                    const total = day.practiceCount + day.listenCount
                    const tooltipText = day.date
                      ? `${parseTaipeiDate(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}: ${total} activities (${day.practiceCount}p, ${day.listenCount}l)`
                      : ""

                    return (
                      <div
                        key={w}
                        className={cn(
                          "w-[11px] h-[11px] rounded-[2px] shrink-0 transition-colors",
                          getCellColor(day)
                        )}
                        title={tooltipText}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 justify-end pt-1">
          <span className="text-[9px] text-muted-foreground">Less</span>
          <div className="w-[11px] h-[11px] rounded-[2px] bg-secondary" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/30" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/50" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/75" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary" />
          <span className="text-[9px] text-muted-foreground">More</span>
        </div>
      </div>
  )
}

// ===== Sentence Familiarity Chart =====

function FamiliarityChart({ buckets }: { buckets: { label: string; count: number; color: string }[] }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1.5 h-32">
        {buckets.map((bucket) => {
          const heightPct = (bucket.count / maxCount) * 100

          return (
            <div
              key={bucket.label}
              className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
            >
              <span className="text-[10px] font-medium text-foreground">
                {bucket.count}
              </span>
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(heightPct, 2)}%`,
                  backgroundColor: bucket.color,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground leading-tight block">
              {bucket.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Main Progress View =====

export function ProgressView() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    practiceDays: [],
  })
  const [stats, setStats] = useState<ProgressStats>({
    totalSentences: 0,
    learned: 0,
    totalReps: 0,
    totalListens: 0,
    mastered: 0,
  })
  const [activity, setActivity] = useState<DailyActivity[]>([])
  const [familiarityBuckets, setFamiliarityBuckets] = useState<FamiliarityBucket[]>([])

  useEffect(() => {
    setStreak(getStreakData())

    const allSentences = getAllSentences()
    const allProgress = getAllProgress()

    const summary = calculateProgressSummary(allSentences, allProgress)
    setStats(summary.stats)
    setFamiliarityBuckets(summary.familiarityBuckets)

    // Load 365-day activity
    setActivity(getActivityForRange(365))
  }, [])

  // Calculate total activity stats
  const activityStats = useMemo(() => {
    let activeDays = 0
    let totalPractices = 0
    let totalListens = 0

    for (const day of activity) {
      if (day.practiceCount > 0 || day.listenCount > 0) {
        activeDays++
        totalPractices += day.practiceCount
        totalListens += day.listenCount
      }
    }

    return { activeDays, totalPractices, totalListens }
  }, [activity])

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground px-1">Your Progress</h2>

      {/* Streak Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <Flame className="w-6 h-6 text-accent-orange" />
          <span className="text-2xl font-bold text-foreground">{streak.currentStreak}</span>
          <span className="text-xs text-muted-foreground">Current Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <Flame className="w-6 h-6 text-primary" />
          <span className="text-2xl font-bold text-foreground">{streak.longestStreak}</span>
          <span className="text-xs text-muted-foreground">Best Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <Target className="w-6 h-6 text-accent-green" />
          <span className="text-2xl font-bold text-foreground">{stats.learned}</span>
          <span className="text-xs text-muted-foreground">Sentences Learned</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <Volume2 className="w-6 h-6 text-accent-blue" />
          <span className="text-2xl font-bold text-foreground">{stats.totalListens}</span>
          <span className="text-xs text-muted-foreground">Total Listens</span>
        </div>
      </div>

      {/* 365-Day Heatmap */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-foreground">Last 365 Days</h3>
          <span className="text-xs text-muted-foreground">
            {activityStats.activeDays} active days
          </span>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 overflow-hidden">
          <Heatmap365 activity={activity} />
        </div>
      </div>

      {/* Sentence Familiarity Chart */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-foreground">Sentence Familiarity</h3>
          <span className="text-xs text-muted-foreground">
            {stats.totalSentences} total
          </span>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <FamiliarityChart buckets={familiarityBuckets} />
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground px-1">Overview</h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Total Sentences</span>
            <span className="text-sm font-medium text-foreground">{stats.totalSentences}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Sentences Started</span>
            <span className="text-sm font-medium text-foreground">{stats.learned}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Mastered (20+ reps)</span>
            <span className="text-sm font-medium text-foreground">{stats.mastered}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Total Repetitions</span>
            <span className="text-sm font-medium text-foreground">{stats.totalReps}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Total Listens</span>
            <span className="text-sm font-medium text-foreground">{stats.totalListens}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-muted-foreground">Completion</span>
            <span className="text-sm font-medium text-foreground">
              {stats.totalSentences > 0
                ? Math.round((stats.learned / stats.totalSentences) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Overall Progress</span>
          <span className="text-xs font-medium text-foreground">
            {stats.learned}/{stats.totalSentences}
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{
              width: `${stats.totalSentences > 0 ? (stats.learned / stats.totalSentences) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
