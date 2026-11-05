export const MAX_THEME_IMAGE_BYTES = 4 * 1024 * 1024

export const THEME_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type ThemeCardImageContentType = (typeof THEME_IMAGE_CONTENT_TYPES)[number]

export interface ThemeCardImage {
  url: string
  pathname: string
  contentType: ThemeCardImageContentType
  size: number
  uploadedAt: string
}

export function isThemeCardImageContentType(value: string): value is ThemeCardImageContentType {
  return THEME_IMAGE_CONTENT_TYPES.some((contentType) => contentType === value)
}

export function normalizeThemeCardImage(value: unknown): ThemeCardImage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined

  const image = value as Record<string, unknown>
  if (
    typeof image.url !== "string" ||
    typeof image.pathname !== "string" ||
    typeof image.contentType !== "string" ||
    typeof image.size !== "number" ||
    typeof image.uploadedAt !== "string"
  ) {
    return undefined
  }

  let url: URL
  try {
    url = new URL(image.url)
  } catch {
    return undefined
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname.toLowerCase().endsWith(".blob.vercel-storage.com") ||
    !image.pathname.startsWith("theme-cards/") ||
    image.pathname.includes("..") ||
    !isThemeCardImageContentType(image.contentType) ||
    !Number.isInteger(image.size) ||
    image.size <= 0 ||
    image.size > MAX_THEME_IMAGE_BYTES ||
    !Number.isFinite(Date.parse(image.uploadedAt))
  ) {
    return undefined
  }

  return {
    url: url.toString(),
    pathname: image.pathname,
    contentType: image.contentType,
    size: image.size,
    uploadedAt: new Date(image.uploadedAt).toISOString(),
  }
}
