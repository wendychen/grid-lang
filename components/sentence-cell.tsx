"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Volume2 } from "lucide-react"
import { type SentenceProgress, getProgress, getColorClass } from "@/lib/srs"
import { speakGerman } from "@/lib/tts"
import type { Sentence } from "@/lib/sentences"
import type { ThemeCardImage } from "@/lib/theme-card-images"
import { cn } from "@/lib/utils"

type ImageBottomTone = "dark" | "light"

function detectImageBottomTone(image: HTMLImageElement): ImageBottomTone | undefined {
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  if (!imageWidth || !imageHeight) return undefined

  const frameAspectRatio = 9 / 16
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = imageWidth
  let sourceHeight = imageHeight

  if (imageWidth / imageHeight > frameAspectRatio) {
    sourceWidth = imageHeight * frameAspectRatio
    sourceX = (imageWidth - sourceWidth) / 2
  } else {
    sourceHeight = imageWidth / frameAspectRatio
    sourceY = (imageHeight - sourceHeight) / 2
  }

  const sampleHeight = sourceHeight * 0.2
  const canvas = document.createElement("canvas")
  canvas.width = 24
  canvas.height = 8
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return undefined

  try {
    context.drawImage(
      image,
      sourceX,
      sourceY + sourceHeight - sampleHeight,
      sourceWidth,
      sampleHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    const linearize = (value: number) => {
      const normalized = value / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    }
    let totalLuminance = 0

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255
      const luminance =
        0.2126 * linearize(data[index]) +
        0.7152 * linearize(data[index + 1]) +
        0.0722 * linearize(data[index + 2])
      totalLuminance += luminance * alpha + 0.5 * (1 - alpha)
    }

    const averageLuminance = totalLuminance / (data.length / 4)
    return averageLuminance < 0.45 ? "dark" : "light"
  } catch {
    return undefined
  }
}

interface SentenceCellProps {
  sentence: Sentence
  progress: SentenceProgress
  ttsSpeed: number
  onPractice: (id: string) => void
  onListen: (id: string) => void
  secretImage?: string
  onSecretFound?: () => void
  image?: ThemeCardImage
}

export function SentenceCell({ sentence, progress, ttsSpeed, onPractice, onListen, secretImage, onSecretFound, image }: SentenceCellProps) {
  const [expanded, setExpanded] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [imageBottomToneState, setImageBottomToneState] = useState<{
    url: string
    tone: ImageBottomTone
  } | null>(null)

  const imageUrl = image?.url
  const imageBottomTone =
    imageBottomToneState && imageBottomToneState.url === imageUrl
      ? imageBottomToneState.tone
      : "dark"
  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (!imageUrl) return
      const tone = detectImageBottomTone(event.currentTarget)
      if (tone) setImageBottomToneState({ url: imageUrl, tone })
    },
    [imageUrl],
  )
  const longestGermanWordLength = sentence.german
    .trim()
    .split(/\s+/)
    .reduce((longest, word) => Math.max(longest, word.length), 1)
  const titleFontSizeContainerRatio = Math.min(15.6, 156 / longestGermanWordLength)
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
        "relative w-full rounded-lg border transition-all duration-200 cursor-pointer select-none",
        "hover:shadow-md active:scale-[0.98] min-h-[7.5rem]",
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

      {/* Card content */}
      <div className="relative z-10 flex h-full flex-col p-3.5">
        {image ? (
          <div
            className="relative aspect-[9/16] w-full overflow-hidden rounded-md"
            style={{ containerType: "inline-size" }}
          >
            <img
              crossOrigin="anonymous"
              src={image.url}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t to-transparent",
                imageBottomTone === "dark"
                  ? "from-black/75 via-black/20"
                  : "from-white/80 via-white/10",
              )}
            />
            <p
              className={cn(
                "pointer-events-none absolute inset-x-3 bottom-[9%] z-10 text-center font-extrabold leading-[0.95] tracking-tight text-balance",
                imageBottomTone === "dark" ? "text-white" : "text-slate-950",
              )}
              style={{
                fontSize: `clamp(2rem, ${titleFontSizeContainerRatio}cqw, 3.25rem)`,
                textShadow:
                  imageBottomTone === "dark"
                    ? "0 2px 10px rgba(0, 0, 0, 0.8)"
                    : "0 2px 10px rgba(255, 255, 255, 0.85)",
              }}
            >
              {sentence.german}
            </p>
            <button
              onClick={handleSpeak}
              className={cn(
                "absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60",
                speaking && "animate-pulse bg-primary text-primary-foreground",
              )}
              aria-label={`Play pronunciation of ${sentence.german}`}
            >
              <Volume2 className="size-4" />
            </button>
          </div>
        ) : (
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
        )}

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
