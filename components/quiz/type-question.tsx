"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { speakGerman } from "@/lib/tts"
import { getSettings } from "@/lib/srs"
import { isCloseEnough } from "@/lib/quiz"
import type { QuestionProps } from "@/components/quiz/types"

export function TypeQuestion({ question, answered, onDraft }: QuestionProps) {
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const autoPlayed = useRef<string | null>(null)

  function play(slow = false) {
    const speed = getSettings().ttsSpeed ?? 1
    void speakGerman(question.sentence.german, slow ? Math.max(0.5, speed * 0.6) : speed)
  }

  useEffect(() => {
    setText("")
    onDraft(null)
    if (autoPlayed.current !== question.id) {
      autoPlayed.current = question.id
      const t = setTimeout(() => play(), 350)
      inputRef.current?.focus()
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  function handleChange(value: string) {
    if (answered) return
    setText(value)
    if (value.trim().length === 0) {
      onDraft(null)
    } else {
      onDraft({ correct: isCloseEnough(value, question.answer) })
    }
  }

  const isCorrect = answered && isCloseEnough(text, question.answer)

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Type what you hear
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => play(false)}
          aria-label="Play audio"
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground quiz-3d border-primary/40 shadow-md"
        >
          <Volume2 className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={() => play(true)}
          aria-label="Play audio slowly"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground quiz-3d border-border"
        >
          <span className="text-[11px] font-bold">0.5x</span>
        </button>
      </div>

      <textarea
        ref={inputRef}
        value={text}
        disabled={answered}
        onChange={(e) => handleChange(e.target.value)}
        rows={2}
        placeholder="Type the German sentence..."
        lang="de"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "w-full resize-none rounded-2xl border-2 bg-card px-4 py-3 text-lg font-medium text-card-foreground outline-none transition-colors placeholder:text-muted-foreground",
          !answered && "border-border focus:border-primary",
          answered && isCorrect && "border-[hsl(var(--quiz-correct))] bg-[hsl(var(--quiz-correct)/0.1)]",
          answered && !isCorrect && "border-[hsl(var(--quiz-wrong))] bg-[hsl(var(--quiz-wrong)/0.1)]",
        )}
      />

      {answered && !isCorrect && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Correct answer
          </span>
          <p className="text-base font-semibold text-quiz-correct">{question.answer}</p>
        </div>
      )}
    </div>
  )
}
