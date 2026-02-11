"use client"

import { useState, useEffect } from "react"
import { getStreakData, getAllProgress, type StreakData } from "@/lib/srs"
import { getAllSentences } from "@/lib/sentences"
import { Flame, Target, Volume2, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProgressView() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    practiceDays: [],
  })
  const [stats, setStats] = useState({
    totalSentences: 0,
    learned: 0,
    totalReps: 0,
    totalListens: 0,
    mastered: 0,
  })

  useEffect(() => {
    setStreak(getStreakData())

    const allSentences = getAllSentences()
    const allProgress = getAllProgress()

    let learned = 0
    let totalReps = 0
    let totalListens = 0
    let mastered = 0

    for (const s of allSentences) {
      const prog = allProgress[s.id]
      if (prog && prog.reps > 0) {
        learned++
        totalReps += prog.reps
        totalListens += prog.listens
        if (prog.reps >= 20) mastered++
      }
    }

    setStats({
      totalSentences: allSentences.length,
      learned,
      totalReps,
      totalListens,
      mastered,
    })
  }, [])

  // Build 7-day heatmap
  const today = new Date()
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split("T")[0]
  })

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

      {/* 7-Day Heatmap */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground px-1">Last 7 Days</h3>
        <div className="flex items-end gap-1.5 justify-between px-1">
          {last7Days.map((dateStr) => {
            const practiced = streak.practiceDays.includes(dateStr)
            const isToday = dateStr === today.toISOString().split("T")[0]
            const dayOfWeek = new Date(dateStr).getDay()

            return (
              <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "w-full aspect-square rounded-md transition-colors max-w-10",
                    practiced ? "bg-primary" : "bg-secondary",
                    isToday && !practiced && "ring-1 ring-primary/30"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px]",
                    isToday ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {dayNames[dayOfWeek]}
                </span>
              </div>
            )
          })}
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
