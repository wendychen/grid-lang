export const THEME_QUEUE_REORDER_REPS = 3

export interface ThemeQueueProgress {
  reps: number
  position: number
}

export function orderThemeQueue<T extends { id: string }>(
  sentences: readonly T[],
  progressById: Readonly<Record<string, ThemeQueueProgress>>
): T[] {
  return sentences
    .map((sentence, originalIndex) => ({
      sentence,
      originalIndex,
      progress: progressById[sentence.id],
    }))
    .sort((left, right) => {
      const leftMovedToEnd = (left.progress?.reps ?? 0) >= THEME_QUEUE_REORDER_REPS
      const rightMovedToEnd = (right.progress?.reps ?? 0) >= THEME_QUEUE_REORDER_REPS

      if (leftMovedToEnd !== rightMovedToEnd) {
        return leftMovedToEnd ? 1 : -1
      }

      if (!leftMovedToEnd) {
        return left.originalIndex - right.originalIndex
      }

      const positionDifference = (left.progress?.position ?? 0) - (right.progress?.position ?? 0)
      return positionDifference || left.originalIndex - right.originalIndex
    })
    .map(({ sentence }) => sentence)
}
