"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Volume2 } from "lucide-react"
import { type SentenceProgress, getProgress, getColorClass } from "@/lib/srs"
import { speakGerman } from "@/lib/tts"
import type { Sentence } from "@/lib/sentences"
import { cn } from "@/lib/utils"

// Sentences > 30 chars are considered "long" and should span 2 grid columns
export function isSentenceLong(german: string): boolean {
  return german.length > 30
}

interface SentenceCellProps {
  sentence: Sentence
  progress: SentenceProgress
  ttsSpeed: number
  onPractice: (id: string) => void
  onListen: (id: string) => void
  wide?: boolean
  secretImage?: string
  onSecretFound?: () => void
}

export function SentenceCell({ sentence, progress, ttsSpeed, onPractice, onListen, wide, secretImage, onSecretFound }: SentenceCellProps) {
  const [expanded, setExpanded] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const colorClass = getColorClass(progress.reps)

  // Darken background based on listen count: each listen adds opacity
  // 0 listens = 0, 1 = 0.04, 3 = 0.1, 5 = 0.15, 10+ = 0.25 (capped)
  const listenIntensity = Math.min(progress.listens * 0.04, 0.25)

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
      if (secretImage) {
        setShowSecret(true)
        setExpanded(false)
        setTimeout(() => {
          setShowSecret(false)
          onSecretFound?.()
        }, 3000)
      } else {
        setExpanded(false)
      }
    },
    [sentence.id, onPractice, secretImage, onSecretFound]
  )

  return (
    <div
      className={cn(
        "relative rounded-lg border transition-all duration-200 cursor-pointer select-none",
        "hover:shadow-md active:scale-[0.98] min-h-[7.5rem]",
        colorClass,
        expanded && "ring-2 ring-primary/30 shadow-lg",
        wide && "col-span-2"
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
      {/* Listen intensity overlay - gets darker with more listens */}
      {listenIntensity > 0 && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none z-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${listenIntensity})` }}
        />
      )}

      {/* Secret image reveal */}
      {showSecret && secretImage && (
        <div className="absolute inset-0 z-30 rounded-lg overflow-hidden flex items-center justify-center bg-background animate-in zoom-in-50 fade-in duration-300">
          <img
            src={secretImage}
            alt="Secret reward"
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
              You found me!
            </span>
          </div>
        </div>
      )}

      {/* Fixed-height content area */}
      <div className="relative z-10 p-3.5 flex flex-col justify-between h-full">
        {/* Top row: German sentence + speaker button */}
        <div className="flex items-start justify-between gap-3">
          <p className="flex-1 min-w-0 font-semibold text-sm leading-snug text-cell-foreground text-pretty">
            {sentence.german}
          </p>
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

        {/* Bottom area: toggles between translation and practice info */}
        <div className="mt-auto pt-2">
          {!expanded ? (
            <div>
              <p className="text-xs text-cell-muted leading-relaxed">{sentence.english}</p>
              {progress.reps > 0 && (
                <div className="flex gap-0.5 mt-1.5">
                  {Array.from({ length: Math.min(progress.reps, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-current opacity-30"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              <div className="border-t border-foreground/10 pt-2">
                <p className="text-xs text-cell-muted font-mono leading-relaxed">{sentence.phonetic}</p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
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
        </div>
      </div>
    </div>
  )
}
