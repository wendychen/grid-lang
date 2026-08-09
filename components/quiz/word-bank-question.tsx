"use client"

import { useEffect, useMemo, useState } from "react"
import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { speakGerman } from "@/lib/tts"
import { getSettings } from "@/lib/srs"
import { isWordBankCorrect } from "@/lib/quiz"
import type { QuestionProps } from "@/components/quiz/types"

interface Tile {
  key: string
  word: string
}

export function WordBankQuestion({ question, answered, onDraft }: QuestionProps) {
  // Give each tile a stable unique key (words can repeat in a sentence).
  const tiles = useMemo<Tile[]>(
    () => (question.tiles ?? []).map((word, i) => ({ key: `t-${i}-${word}`, word })),
    [question.tiles],
  )

  const [selected, setSelected] = useState<Tile[]>([])

  useEffect(() => {
    setSelected([])
    onDraft(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const selectedKeys = new Set(selected.map((t) => t.key))
  const built = selected.map((t) => t.word)

  function report(next: Tile[]) {
    if (next.length === 0) {
      onDraft(null)
    } else {
      onDraft({ correct: isWordBankCorrect(next.map((t) => t.word), question.answer) })
    }
  }

  function addTile(tile: Tile) {
    if (answered || selectedKeys.has(tile.key)) return
    const next = [...selected, tile]
    setSelected(next)
    report(next)
  }

  function removeTile(tile: Tile) {
    if (answered) return
    const next = selected.filter((t) => t.key !== tile.key)
    setSelected(next)
    report(next)
  }

  function playAudio() {
    const speed = getSettings().ttsSpeed ?? 1
    void speakGerman(question.sentence.german, speed)
  }

  const isCorrect = answered && isWordBankCorrect(built, question.answer)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Build the German sentence
        </p>
        <p className="text-lg font-semibold text-foreground text-balance">{question.prompt}</p>
      </div>

      {/* Answer construction area */}
      <div
        className={cn(
          "flex min-h-[64px] flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed p-3",
          answered && isCorrect && "border-[hsl(var(--quiz-correct))] bg-[hsl(var(--quiz-correct)/0.1)]",
          answered && !isCorrect && "border-[hsl(var(--quiz-wrong))] bg-[hsl(var(--quiz-wrong)/0.1)]",
          !answered && "border-border",
        )}
      >
        {selected.length === 0 && (
          <span className="self-center text-sm text-muted-foreground">Tap words to build your answer</span>
        )}
        {selected.map((tile) => (
          <button
            key={tile.key}
            type="button"
            disabled={answered}
            onClick={() => removeTile(tile)}
            className="quiz-3d rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-card-foreground"
          >
            {tile.word}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {tiles.map((tile) => {
          const used = selectedKeys.has(tile.key)
          return (
            <button
              key={tile.key}
              type="button"
              disabled={answered || used}
              onClick={() => addTile(tile)}
              className={cn(
                "quiz-3d rounded-xl border-2 px-3 py-2 text-sm font-semibold",
                used
                  ? "border-transparent bg-muted text-transparent"
                  : "border-border bg-card text-card-foreground hover:border-primary/50",
              )}
              aria-hidden={used}
            >
              {tile.word}
            </button>
          )
        })}
      </div>

      {answered && !isCorrect && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playAudio}
            aria-label="Play correct answer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-quiz-correct">{question.answer}</p>
        </div>
      )}
    </div>
  )
}
