import { randomUUID } from "node:crypto"
import { list, put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import {
  isThemeCardImageContentType,
  MAX_THEME_IMAGE_BYTES,
  normalizeThemeCardImage,
  type ThemeCardImage,
  type ThemeCardImageContentType,
} from "@/lib/theme-card-images"

export const runtime = "nodejs"

const FILE_EXTENSIONS: Record<ThemeCardImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const THEME_CARD_PATH = /^theme-cards\/(page\d+)\/(page\d+-s\d+)\/[^/]+\.(jpg|jpeg|png|webp)$/i
const CONTENT_TYPE_BY_EXTENSION: Record<string, ThemeCardImageContentType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const images: Record<string, ThemeCardImage> = {}
    let cursor: string | undefined

    do {
      const page = await list({ prefix: "theme-cards/", limit: 1000, cursor })

      for (const blob of page.blobs) {
        const match = blob.pathname.match(THEME_CARD_PATH)
        if (!match) continue

        const [, themeId, sentenceId, extension] = match
        if (sentenceId.split("-s")[0] !== themeId) continue

        const contentType = CONTENT_TYPE_BY_EXTENSION[extension.toLowerCase()]
        const image = normalizeThemeCardImage({
          url: blob.url,
          pathname: blob.pathname,
          contentType,
          size: blob.size,
          uploadedAt: blob.uploadedAt.toISOString(),
        })
        if (!image) continue

        const uploadedAt = image?.uploadedAt
        if (!image || !uploadedAt) continue

        const currentUploadedAt = images[sentenceId]?.uploadedAt
        if (!currentUploadedAt || Date.parse(uploadedAt) > Date.parse(currentUploadedAt)) {
          images[sentenceId] = image
        }
      }

      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)

    return NextResponse.json(
      { images },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[v0] Theme image listing failed:", error)
    return NextResponse.json(
      { error: "Unable to load shared card images." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host")
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    request.nextUrl.protocol.replace(/:$/, "")

  if (!origin || !host || !protocol) return false

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin
  } catch {
    return false
  }
}

async function hasValidImageSignature(
  file: File,
  contentType: ThemeCardImageContentType,
): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  return bytes.length >= 12 && riff === "RIFF" && webp === "WEBP"
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Upload requests must come from this app." }, { status: 403 })
  }

  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_THEME_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Choose a valid image file." }, { status: 400 })
  }

  const file = formData.get("file")
  const themeId = formData.get("themeId")
  const sentenceId = formData.get("sentenceId")

  if (
    !(file instanceof File) ||
    typeof themeId !== "string" ||
    !/^page\d+$/.test(themeId) ||
    typeof sentenceId !== "string" ||
    !new RegExp(`^${themeId}-s\\d+$`).test(sentenceId)
  ) {
    return NextResponse.json({ error: "Choose an image for a valid theme card." }, { status: 400 })
  }

  if (file.size <= 0 || file.size > MAX_THEME_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 413 })
  }

  if (!isThemeCardImageContentType(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 })
  }

  if (!(await hasValidImageSignature(file, file.type))) {
    return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 415 })
  }

  try {
    const pathname = `theme-cards/${themeId}/${sentenceId}/${randomUUID()}.${FILE_EXTENSIONS[file.type]}`
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json(
      {
        image: {
          url: blob.url,
          pathname: blob.pathname,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[v0] Theme image upload failed:", error)
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 })
  }
}
