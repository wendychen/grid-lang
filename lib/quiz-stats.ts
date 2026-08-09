import { db, type QuizStatsEntity } from "@/lib/db"

export interface QuizStats {
  totalXp: number
  quizzesCompleted: number
  bestCombo: number
  totalCorrect: number
  totalAnswered: number
}

const DEFAULT_STATS: QuizStats = {
  totalXp: 0,
  quizzesCompleted: 0,
  bestCombo: 0,
  totalCorrect: 0,
  totalAnswered: 0,
}

// Module-level cache, hydrated by the DataProvider on startup (mirrors srs.ts).
let quizStatsCache: QuizStats = { ...DEFAULT_STATS }

export function setQuizStatsCache(stats: Partial<QuizStats> | null | undefined): void {
  quizStatsCache = { ...DEFAULT_STATS, ...(stats || {}) }
}

export function getQuizStats(): QuizStats {
  return { ...quizStatsCache }
}

export interface QuizResult {
  xp: number
  correct: number
  total: number
  bestCombo: number
}

/**
 * Accumulate a completed quiz's results into lifetime stats and persist to
 * Dexie. Updates the in-memory cache synchronously so the UI reflects it
 * immediately, then writes through asynchronously.
 */
export async function recordQuizResultAsync(result: QuizResult): Promise<QuizStats> {
  const next: QuizStats = {
    totalXp: quizStatsCache.totalXp + result.xp,
    quizzesCompleted: quizStatsCache.quizzesCompleted + 1,
    bestCombo: Math.max(quizStatsCache.bestCombo, result.bestCombo),
    totalCorrect: quizStatsCache.totalCorrect + result.correct,
    totalAnswered: quizStatsCache.totalAnswered + result.total,
  }
  quizStatsCache = next

  try {
    const entity: QuizStatsEntity = { id: "quiz", ...next }
    await db.quizStats.put(entity)
  } catch (error) {
    console.error("[v0] Failed to persist quiz stats:", error)
  }

  return { ...next }
}
