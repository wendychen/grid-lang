export interface SentenceProgressStats {
  reps: number
  listens: number
}

export interface ProgressStats {
  totalSentences: number
  learned: number
  totalReps: number
  totalListens: number
  mastered: number
}

export interface FamiliarityBucket {
  label: string
  count: number
  color: string
}

const FAMILIARITY_LEVELS = [
  { label: "New", min: 0, max: 0, color: "hsl(215, 10%, 80%)" },
  { label: "Lv 1", min: 1, max: 1, color: "hsl(200, 80%, 78%)" },
  { label: "Lv 2", min: 2, max: 3, color: "hsl(200, 80%, 68%)" },
  { label: "Lv 3", min: 4, max: 5, color: "hsl(200, 65%, 58%)" },
  { label: "Lv 4", min: 6, max: 8, color: "hsl(190, 60%, 50%)" },
  { label: "Lv 5", min: 9, max: 12, color: "hsl(170, 55%, 46%)" },
  { label: "Lv 6", min: 13, max: 16, color: "hsl(152, 55%, 46%)" },
  { label: "Lv 7", min: 17, max: 20, color: "hsl(142, 55%, 45%)" },
  { label: "Lv 8", min: 21, max: 30, color: "hsl(80, 60%, 48%)" },
  { label: "Lv 9", min: 31, max: Infinity, color: "hsl(45, 90%, 50%)" },
] as const

export function calculateProgressSummary(
  sentences: readonly { id: string }[],
  progressBySentence: Readonly<Record<string, SentenceProgressStats | undefined>>
): { stats: ProgressStats; familiarityBuckets: FamiliarityBucket[] } {
  const stats: ProgressStats = {
    totalSentences: sentences.length,
    learned: 0,
    totalReps: 0,
    totalListens: 0,
    mastered: 0,
  }
  const bucketCounts = FAMILIARITY_LEVELS.map(() => 0)

  for (const sentence of sentences) {
    const progress = progressBySentence[sentence.id]
    const reps = progress?.reps ?? 0
    stats.totalListens += progress?.listens ?? 0

    if (reps > 0) {
      stats.learned++
      stats.totalReps += reps
      if (reps >= 20) stats.mastered++
    }

    const levelIndex = FAMILIARITY_LEVELS.findIndex(
      (level) => reps >= level.min && reps <= level.max
    )
    if (levelIndex !== -1) bucketCounts[levelIndex]++
  }

  const familiarityBuckets = FAMILIARITY_LEVELS.map((level, index) => ({
    label: level.label,
    count: bucketCounts[index],
    color: level.color,
  }))

  return { stats, familiarityBuckets }
}
