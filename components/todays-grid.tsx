"use client"

import { useState, useCallback, useEffect } from "react"
import { SentenceCell, isSentenceLong } from "@/components/sentence-cell"
import { getAllSentences, type Sentence } from "@/lib/sentences"
import {
  getTodaysQueue,
  getProgress,
  practiceSentence,
  recordListen,
  getSettings,
  getStreakData,
  getPushedQueue,
  clearPushedQueue,
  type SentenceProgress,
} from "@/lib/srs"
import { Flame, Zap, BookOpen, ArrowDownToLine } from "lucide-react"

export function TodaysGrid() {
  const [queue, setQueue] = useState<string[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, SentenceProgress>>({})
  const [settings, setSettings] = useState(() => ({
    gridCols: 3,
    gridRows: 4,
    ttsSpeed: 1.0,
    autoPlay: false,
  }))
  const [streak, setStreak] = useState(() => ({
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null as string | null,
    practiceDays: [] as string[],
  }))
  const [practiced, setPracticed] = useState(0)
  const [pushedCount, setPushedCount] = useState(0)
  const [secretId, setSecretId] = useState<string | null>(null)

  const pickRandomSecret = useCallback((ids: string[], excludeId?: string | null) => {
    const candidates = excludeId ? ids.filter((id) => id !== excludeId) : ids
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }, [])

  const refreshData = useCallback(() => {
    const allSentences = getAllSentences()
    const allIds = allSentences.map((s) => s.id)
    const currentSettings = getSettings()
    const maxItems = currentSettings.gridCols * currentSettings.gridRows
    const todaysQueue = getTodaysQueue(allIds, maxItems)

    const pushed = getPushedQueue()
    setPushedCount(pushed.length)

    setSentences(allSentences)
    setQueue(todaysQueue)
    setSettings(currentSettings)
    setStreak(getStreakData())

    // Place the cat in a random cell
    setSecretId((prev) => prev || pickRandomSecret(todaysQueue))

    const newProgressMap: Record<string, SentenceProgress> = {}
    for (const id of todaysQueue) {
      newProgressMap[id] = getProgress(id)
    }
    setProgressMap(newProgressMap)
  }, [pickRandomSecret])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const handlePractice = useCallback(
    (id: string) => {
      const updated = practiceSentence(id)
      setProgressMap((prev) => ({ ...prev, [id]: updated }))
      setPracticed((prev) => prev + 1)
      setStreak(getStreakData())

      // Refresh queue after practice to show new items
      setTimeout(() => {
        const allIds = getAllSentences().map((s) => s.id)
        const maxItems = settings.gridCols * settings.gridRows
        const newQueue = getTodaysQueue(allIds, maxItems)
        setQueue(newQueue)
        const newProgressMap: Record<string, SentenceProgress> = {}
        for (const qId of newQueue) {
          newProgressMap[qId] = getProgress(qId)
        }
        setProgressMap(newProgressMap)
      }, 300)
    },
    [settings]
  )

  const handleListen = useCallback((id: string) => {
    recordListen(id)
    setProgressMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], listens: (prev[id]?.listens || 0) + 1 },
    }))
  }, [])

  const handleSecretFound = useCallback(() => {
    setSecretId((prev) => pickRandomSecret(queue, prev))
  }, [queue, pickRandomSecret])

  const sentenceMap = new Map(sentences.map((s) => [s.id, s]))

  const dueCount = queue.filter((id) => {
    const prog = progressMap[id]
    return prog && prog.reps > 0
  }).length

  const newCount = queue.filter((id) => {
    const prog = progressMap[id]
    return !prog || prog.reps === 0
  }).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-accent-orange" />
          <span className="text-sm font-semibold text-foreground">
            {streak.currentStreak}
          </span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-accent-blue" />
          <span className="text-sm font-medium text-foreground">{dueCount}</span>
          <span className="text-xs text-muted-foreground">reviews</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-accent-green" />
          <span className="text-sm font-medium text-foreground">{newCount}</span>
          <span className="text-xs text-muted-foreground">new</span>
        </div>
        {pushedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <ArrowDownToLine className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{pushedCount}</span>
            <span className="text-xs text-muted-foreground">from themes</span>
          </div>
        )}
        {practiced > 0 && (
          <div className="ml-auto text-xs text-muted-foreground">
            {practiced} practiced today
          </div>
        )}
      </div>

      {/* Grid */}
      {queue.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {queue.map((id) => {
            const sentence = sentenceMap.get(id)
            if (!sentence) return null
            const progress = progressMap[id] || getProgress(id)
            const wide = isSentenceLong(sentence.german)
            return (
              <SentenceCell
                key={id}
                sentence={sentence}
                progress={progress}
                ttsSpeed={settings.ttsSpeed}
                onPractice={handlePractice}
                onListen={handleListen}
                wide={wide}
                secretImage={id === secretId ? "/images/secret-cat.png" : undefined}
                onSecretFound={id === secretId ? handleSecretFound : undefined}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-accent-green" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {"No sentences due for review. Explore themed pages to discover new sentences."}
          </p>
        </div>
      )}

      {/* const levels = [
      { label: "New",  min: 0,  max: 0,  color: "hsl(215, 10%, 80%)" },
      { label: "Lv 1", min: 1,  max: 1,  color: "hsl(200, 80%, 78%)" },
      { label: "Lv 2", min: 2,  max: 3,  color: "hsl(200, 80%, 68%)" },
      { label: "Lv 3", min: 4,  max: 5,  color: "hsl(200, 65%, 58%)" },
      { label: "Lv 4", min: 6,  max: 8,  color: "hsl(190, 60%, 50%)" },
      { label: "Lv 5", min: 9,  max: 12, color: "hsl(170, 55%, 46%)" },
      { label: "Lv 6", min: 13, max: 16, color: "hsl(152, 55%, 46%)" },
      { label: "Lv 7", min: 17, max: 20, color: "hsl(142, 55%, 45%)" },
      { label: "Lv 8", min: 21, max: 30, color: "hsl(80, 60%, 48%)" },
      { label: "Lv 9", min: 31, max: Infinity, color: "hsl(45, 90%, 50%)" },
    ] */}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Progress:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-new border border-border" />
          <span className="text-xs text-muted-foreground">New</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-started" />
          <span className="text-xs text-muted-foreground">Lv 1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-building" />
          <span className="text-xs text-muted-foreground">Lv 2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-strong" />
          <span className="text-xs text-muted-foreground">Lv 3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered" />
          <span className="text-xs text-muted-foreground">Lv 4</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered" />
          <span className="text-xs text-muted-foreground">Lv 5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered" />
          <span className="text-xs text-muted-foreground">Lv 6</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered" />
          <span className="text-xs text-muted-foreground">Lv 7</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered bg-[hsl(80, 60%, 48%)]" />
          <span className="text-xs text-muted-foreground">Lv 8</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-mastered" />
          <span className="text-xs text-muted-foreground">Lv 9</span>
        </div>
      </div>
    </div>
  )
}
