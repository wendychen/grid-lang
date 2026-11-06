"use client"

import { useRef, useState, type ChangeEvent, type DragEvent } from "react"
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

type ThemeSentencePatch = Partial<
  Pick<ThemeCardOverrideEntity, "german" | "english" | "phonetic" | "image">
>

interface ThemeSentenceEditorProps {
  sentence: Sentence
  image?: ThemeCardImage
  onChange: (patch: ThemeSentencePatch) => void
  onUploadStatusChange: (uploading: boolean) => void
}

export function ThemeSentenceEditor({
  sentence,
  image,
  onChange,
  onUploadStatusChange,
}: ThemeSentenceEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleImageFile = async (file: File) => {
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

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (file) void handleImageFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    if (isUploading) return

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 1) {
      setUploadError("Drop one image at a time.")
      return
    }

    const file = files[0]
    if (file) void handleImageFile(file)
  }

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-3.5">
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

      <div
        role="group"
        aria-label={`Image upload for ${sentence.german}`}
        data-drag-active={isDragActive}
        className="flex items-center gap-3 rounded-md border border-dashed border-border p-2 transition-colors data-[drag-active=true]:border-primary data-[drag-active=true]:bg-primary/5"
        onDragEnter={(event) => {
          event.preventDefault()
          if (!isUploading) setIsDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!isUploading) event.dataTransfer.dropEffect = "copy"
        }}
        onDragLeave={(event) => {
          const relatedTarget = event.relatedTarget
          if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
          setIsDragActive(false)
        }}
        onDrop={handleDrop}
      >
        <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/30">
          {image ? (
            <img
              src={image.url}
              alt={`Image preview for ${sentence.german}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImagePlus aria-hidden="true" className="size-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p aria-live="polite" className="text-sm font-medium">
              {isUploading
                ? "Uploading…"
                : isDragActive
                  ? "Drop image to upload"
                  : image
                    ? "Image attached"
                    : "Drag and drop an image"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP · up to 4 MB · stored on Vercel Blob
            </p>
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
              {isUploading ? "Uploading…" : image ? "Replace image" : "Choose image"}
            </Button>
            {image && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUploadError(null)
                  onChange({ image: null })
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
          {uploadError && (
            <p role="alert" className="text-xs text-destructive">
              {uploadError}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
