"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { speakGerman } from "@/lib/tts"
import { getSettings } from "@/lib/srs"
import type { QuestionProps } from "@/components/quiz/types"

export function ListenQuestion({ question, answered, onDraft }: QuestionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const autoPlayed = useRef<string | null>(null)

  function play(slow = false) {
    const speed = getSettings().ttsSpeed ?? 1
    void speakGerman(question.sentence.german, slow ? Math.max(0.5, speed * 0.6) : speed)
  }

  // Reset + auto-play once per question.
  useEffect(() => {
    setSelectedId(null)
    onDraft(null)
    if (autoPlayed.current !== question.id) {
      autoPlayed.current = question.id
      // Small delay so the view has mounted before audio starts.
      const t = setTimeout(() => play(), 350)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const options = question.options ?? []

  function handleSelect(optId: string, text: string) {
    if (answered) return
    setSelectedId(optId)
    onDraft({ correct: text === question.answer })
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tap what you hear
      </p>

      <div className="flex items-center justify-center gap-4 py-2">
        <button
          type="button"
          onClick={() => play(false)}
          aria-label="Play audio"
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground quiz-3d border-primary/40 shadow-md"
        >
          <Volume2 className="h-9 w-9" />
        </button>
        <button
          type="button"
          onClick={() => play(true)}
          aria-label="Play audio slowly"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground quiz-3d border-border"
        >
          <span className="text-xs font-bold">0.5x</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id
          const isCorrectOption = opt.text === question.answer
          let state: "idle" | "selected" | "correct" | "wrong" = "idle"
          if (answered) {
            if (isCorrectOption) state = "correct"
            else if (isSelected) state = "wrong"
          } else if (isSelected) {
            state = "selected"
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={answered}
              onClick={() => handleSelect(opt.id, opt.text)}
              className={cn(
                "quiz-3d w-full rounded-2xl border-2 px-4 py-4 text-left text-base font-semibold",
                state === "idle" && "border-border bg-card text-card-foreground hover:border-primary/50",
                state === "selected" && "border-primary bg-primary/10 text-foreground",
                state === "correct" && "border-[hsl(var(--quiz-correct))] bg-[hsl(var(--quiz-correct)/0.14)] text-foreground",
                state === "wrong" && "animate-quiz-shake border-[hsl(var(--quiz-wrong))] bg-[hsl(var(--quiz-wrong)/0.14)] text-foreground",
              )}
              aria-pressed={isSelected}
            >
              {opt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
