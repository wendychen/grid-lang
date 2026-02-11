"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Volume2 } from "lucide-react"
import { type SentenceProgress, getProgress, getColorClass } from "@/lib/srs"
import { speakGerman } from "@/lib/tts"
import type { Sentence } from "@/lib/sentences"
import { cn } from "@/lib/utils"

interface SentenceCellProps {
  sentence: Sentence
  progress: SentenceProgress
  ttsSpeed: number
  onPractice: (id: string) => void
  onListen: (id: string) => void
}

export function SentenceCell({ sentence, progress, ttsSpeed, onPractice, onListen }: SentenceCellProps) {
  const [expanded, setExpanded] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const colorClass = getColorClass(progress.reps)

  const handleSpeak = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setSpeaking(true)
      onListen(sentence.id)
      try {
        await speakGerman(sentence.german, ttsSpeed)
      } catch {
        // silently fail
      }
      setSpeaking(false)
    },
    [sentence.german, sentence.id, ttsSpeed, onListen]
  )

  const handleToggle = useCallback(() => {
    if (expanded) {
      setExpanded(false)
    } else {
      setExpanded(true)
    }
  }, [expanded])

  const handlePractice = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onPractice(sentence.id)
      setExpanded(false)
    },
    [sentence.id, onPractice]
  )

  return (
    <div
      className={cn(
        "relative rounded-lg border transition-all duration-200 cursor-pointer select-none",
        "hover:shadow-md active:scale-[0.98]",
        colorClass,
        expanded && "ring-2 ring-primary/30 shadow-lg"
      )}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-label={`${sentence.german} - ${sentence.english}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleToggle()
        }
      }}
    >
      {/* Compact View */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate text-cell-foreground">
            {sentence.german}
          </p>
          {!expanded && (
            <p className="text-xs text-cell-muted mt-0.5 truncate">
              {sentence.english}
            </p>
          )}
        </div>
        <button
          onClick={handleSpeak}
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all",
            "bg-foreground/5 hover:bg-foreground/10 active:bg-foreground/15",
            speaking && "animate-pulse bg-primary/20"
          )}
          aria-label={`Play pronunciation of ${sentence.german}`}
        >
          <Volume2
            className={cn(
              "w-4 h-4",
              speaking ? "text-primary" : "text-cell-muted"
            )}
          />
        </button>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="border-t border-foreground/10 pt-2">
            <p className="text-xs text-cell-muted font-mono">{sentence.phonetic}</p>
            <p className="text-sm text-cell-foreground/80 mt-1">{sentence.english}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-cell-muted">
              <span>{progress.reps} reps</span>
              <span className="text-foreground/20">|</span>
              <span>{progress.listens} listens</span>
            </div>
            <button
              onClick={handlePractice}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Practice
            </button>
          </div>
        </div>
      )}

      {/* Reps indicator dots */}
      {progress.reps > 0 && !expanded && (
        <div className="absolute bottom-1 left-3 flex gap-0.5">
          {Array.from({ length: Math.min(progress.reps, 5) }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-current opacity-40"
            />
          ))}
        </div>
      )}
    </div>
  )
}
