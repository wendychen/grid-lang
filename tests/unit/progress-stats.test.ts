import { describe, expect, it } from "vitest"
import { calculateProgressSummary } from "../../lib/progress-stats"

describe("calculateProgressSummary", () => {
  it("returns zeroed metrics and all sentences as new when there is no progress", () => {
    const { stats, familiarityBuckets } = calculateProgressSummary(
      [{ id: "one" }, { id: "two" }],
      {}
    )

    expect(stats).toEqual({
      totalSentences: 2,
      learned: 0,
      totalReps: 0,
      totalListens: 0,
      mastered: 0,
    })
    expect(familiarityBuckets.map(({ count }) => count)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it("counts listens for sentences that have not been practiced", () => {
    const { stats, familiarityBuckets } = calculateProgressSummary(
      [{ id: "listened" }, { id: "practiced" }],
      {
        listened: { reps: 0, listens: 3 },
        practiced: { reps: 2, listens: 4 },
      }
    )

    expect(stats).toEqual({
      totalSentences: 2,
      learned: 1,
      totalReps: 2,
      totalListens: 7,
      mastered: 0,
    })
    expect(familiarityBuckets[0].count).toBe(1)
    expect(familiarityBuckets[2].count).toBe(1)
  })

  it("places repetition counts in the correct familiarity levels", () => {
    const repsBySentence = [1, 3, 5, 8, 12, 16, 20, 30, 31]
    const sentences = repsBySentence.map((_, index) => ({ id: `sentence-${index}` }))
    const progress = Object.fromEntries(
      repsBySentence.map((reps, index) => [`sentence-${index}`, { reps, listens: 0 }])
    )
    const { familiarityBuckets } = calculateProgressSummary(sentences, progress)

    expect(familiarityBuckets.map(({ count }) => count)).toEqual([0, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  })

  it("counts mastered sentences at 20 or more repetitions", () => {
    const { stats } = calculateProgressSummary(
      [{ id: "started" }, { id: "mastered" }, { id: "well-practiced" }],
      {
        started: { reps: 1, listens: 0 },
        mastered: { reps: 20, listens: 0 },
        "well-practiced": { reps: 50, listens: 0 },
      }
    )

    expect(stats.learned).toBe(3)
    expect(stats.mastered).toBe(2)
    expect(stats.totalReps).toBe(71)
  })
})
