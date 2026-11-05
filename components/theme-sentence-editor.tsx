"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ThemeCardOverrideEntity } from "@/lib/db"
import {
  isThemeCardImageContentType,
  MAX_THEME_IMAGE_BYTES,
  normalizeThemeCardImage,
  type ThemeCardImage,
} from "@/lib/theme-card-images"
import type { Sentence } from "@/lib/sentences"
import { cn } from "@/lib/utils"

type ThemeSentencePatch = Partial<
  Pick<ThemeCardOverrideEntity, "german" | "english" | "phonetic" | "image">
>

interface ThemeSentenceEditorProps {
  sentence: Sentence
  image?: ThemeCardImage
  wide: boolean
  onChange: (patch: ThemeSentencePatch) => void
  onUploadStatusChange: (uploading: boolean) => void
}

export function ThemeSentenceEditor({
  sentence,
  image,
  wide,
  onChange,
  onUploadStatusChange,
}: ThemeSentenceEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    if (!isThemeCardImageContentType(file.type)) {
      setUploadError("Use a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size <= 0 || file.size > MAX_THEME_IMAGE_BYTES) {
      setUploadError("Images must be 4 MB or smaller.")
      return
    }

    setIsUploading(true)
    setUploadError(null)
    onUploadStatusChange(true)

    try {
      const formData = new FormData()
      formData.set("file", file)
      formData.set("themeId", sentence.theme)
      formData.set("sentenceId", sentence.id)

      const response = await fetch("/api/theme-images", {
        method: "POST",
        body: formData,
      })
      const result = (await response.json().catch(() => null)) as
        | { error?: unknown; image?: unknown }
        | null

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string" ? result.error : "Image upload failed. Please try again.",
        )
      }

      const uploadedImage = normalizeThemeCardImage(result?.image)
      if (!uploadedImage) {
        throw new Error("The server returned invalid image details.")
      }

      onChange({ image: uploadedImage })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed. Please try again.")
    } finally {
      setIsUploading(false)
      onUploadStatusChange(false)
    }
  }

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-3.5",
        wide && "sm:col-span-2",
      )}
    >
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="sr-only">Edit sentence card {sentence.id}</legend>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">German sentence</span>
          <Textarea
            value={sentence.german}
            onChange={(event) => onChange({ german: event.currentTarget.value })}
            maxLength={2000}
            rows={3}
            aria-label={`German sentence for card ${sentence.id}`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">English translation</span>
          <Textarea
            value={sentence.english}
            onChange={(event) => onChange({ english: event.currentTarget.value })}
            maxLength={2000}
            rows={2}
            aria-label={`English translation for card ${sentence.id}`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Pronunciation guide</span>
          <Input
            value={sentence.phonetic}
            onChange={(event) => onChange({ phonetic: event.currentTarget.value })}
            maxLength={2000}
            aria-label={`Pronunciation guide for card ${sentence.id}`}
          />
        </label>
      </fieldset>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <div className="aspect-[9/16] w-full overflow-hidden rounded-md bg-muted/30">
          {image ? (
            <img
              src={image.url}
              alt={`Image preview for ${sentence.german}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <p className="text-xs text-muted-foreground">
                No image attached. Upload one to show it on this card.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <ImagePlus data-icon="inline-start" />
            )}
            {isUploading ? "Uploading…" : image ? "Replace image" : "Upload image"}
          </Button>
          {image && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUploadError(null)
                onChange({ image: undefined })
              }}
              disabled={isUploading}
            >
              <Trash2 data-icon="inline-start" />
              Remove image
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={`Choose an image for ${sentence.german}`}
            tabIndex={-1}
            onChange={handleImageSelection}
          />
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 4 MB · stored on Vercel Blob</p>
        {uploadError && (
          <p role="alert" className="text-xs text-destructive">
            {uploadError}
          </p>
        )}
      </div>
    </article>
  )
}
