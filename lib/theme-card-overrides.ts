import { db, type ThemeCardOverrideEntity } from "@/lib/db"
import { normalizeThemeCardImage } from "@/lib/theme-card-images"

const MAX_THEME_TEXT_LENGTH = 2000

export function createThemeCardOverrideId(themeId: string, sentenceId: string): string {
  return `${themeId}:${sentenceId}`
}

export function normalizeThemeCardOverride(value: unknown): ThemeCardOverrideEntity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const input = value as Record<string, unknown>
  const themeId = input.themeId
  const sentenceId = input.sentenceId

  if (
    typeof themeId !== "string" ||
    !/^page\d+$/.test(themeId) ||
    typeof sentenceId !== "string" ||
    !new RegExp(`^${themeId}-s\\d+$`).test(sentenceId)
  ) {
    return null
  }

  const updatedAt =
    typeof input.updatedAt === "string" && Number.isFinite(Date.parse(input.updatedAt))
      ? new Date(input.updatedAt).toISOString()
      : new Date().toISOString()

  const override: ThemeCardOverrideEntity = {
    id: createThemeCardOverrideId(themeId, sentenceId),
    themeId,
    sentenceId,
    updatedAt,
  }

  if (typeof input.german === "string") {
    override.german = input.german.slice(0, MAX_THEME_TEXT_LENGTH)
  }
  if (typeof input.english === "string") {
    override.english = input.english.slice(0, MAX_THEME_TEXT_LENGTH)
  }
  if (typeof input.phonetic === "string") {
    override.phonetic = input.phonetic.slice(0, MAX_THEME_TEXT_LENGTH)
  }

  if (input.image === null) {
    override.image = null
  } else {
    const image = normalizeThemeCardImage(input.image)
    if (image) override.image = image
  }

  return override
}

export async function saveThemeCardOverrides(overrides: ThemeCardOverrideEntity[]): Promise<void> {
  if (overrides.length > 0) {
    await db.themeCardOverrides.bulkPut(overrides)
  }
}
