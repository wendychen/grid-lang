"use client"

import { useEffect, useState } from "react"
import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { speakGerman } from "@/lib/tts"
import { getSettings } from "@/lib/srs"
import type { QuestionProps } from "@/components/quiz/types"

export function McQuestion({ question, answered, onDraft }: QuestionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Reset selection whenever we move to a new question.
  useEffect(() => {
    setSelectedId(null)
    onDraft(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const options = question.options ?? []
  const isDeToEn = question.type === "mc-de-en"

  function handleSelect(optId: string, text: string) {
    if (answered) return
    setSelectedId(optId)
    onDraft({ correct: text === question.answer })
  }

  function playAudio() {
    const speed = getSettings().ttsSpeed ?? 1
    void speakGerman(question.sentence.german, speed)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isDeToEn ? "Select the meaning" : "Select the German translation"}
        </p>
        <div className="flex items-start gap-3">
          {isDeToEn && (
            <button
              type="button"
              onClick={playAudio}
              aria-label="Play audio"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground quiz-3d border-primary/40 shadow-sm"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          )}
          <p className="text-2xl font-bold leading-snug text-foreground text-balance">
            {question.prompt}
          </p>
        </div>
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
