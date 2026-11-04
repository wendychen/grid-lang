import { describe, expect, it } from "vitest"
import { orderThemeQueue } from "../../lib/theme-queue"

describe("orderThemeQueue", () => {
  it("moves a card to the end when it reaches three practices", () => {
    const sentences = [{ id: "first" }, { id: "second" }, { id: "third" }]
    const progress = {
      first: { reps: 1, position: 100 },
      second: { reps: 3, position: 300 },
      third: { reps: 2, position: 200 },
    }

    expect(orderThemeQueue(sentences, progress).map(({ id }) => id)).toEqual([
      "first",
      "third",
      "second",
    ])
  })

  it("keeps cards moved to the end in their stored queue order", () => {
    const sentences = [{ id: "first" }, { id: "second" }, { id: "third" }]
    const progress = {
      first: { reps: 3, position: 900 },
      second: { reps: 2, position: 200 },
      third: { reps: 5, position: 600 },
    }

    expect(orderThemeQueue(sentences, progress).map(({ id }) => id)).toEqual([
      "second",
      "third",
      "first",
    ])
  })

  it("does not mutate the original sentence list", () => {
    const sentences = [{ id: "first" }, { id: "second" }]

    orderThemeQueue(sentences, { second: { reps: 3, position: 300 } })

    expect(sentences.map(({ id }) => id)).toEqual(["first", "second"])
  })
})
