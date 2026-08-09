import type { Sentence } from "@/lib/sentences"
import { getAllSentences } from "@/lib/sentences"
import { getTodaysQueue } from "@/lib/srs"

// ===== Types =====

export type QuizQuestionType =
  | "mc-de-en" // show German, pick English
  | "mc-en-de" // show English, pick German
  | "listen" // play German audio, pick German sentence
  | "word-bank" // build German sentence from scrambled tiles
  | "type" // type the German sentence you hear

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  sentence: Sentence
  /** Prompt text shown to the user (German or English depending on type). */
  prompt: string
  /** The correct answer text (English or German depending on type). */
  answer: string
  /** For multiple-choice / listening questions. */
  options?: QuizOption[]
  /** For the word-bank builder: scrambled word tiles. */
  tiles?: string[]
}

export interface QuizSessionConfig {
  count: number
  ttsAvailable: boolean
}

// ===== Scoring / gamification =====

export const XP_BASE = 10
export const START_HEARTS = 5

/** Combo multiplier tiers. Combo = number of consecutive correct answers so far. */
export function comboMultiplier(combo: number): number {
  if (combo >= 5) return 2
  if (combo >= 3) return 1.5
  return 1
}

/** XP awarded for a correct answer given the combo count BEFORE this answer. */
export function xpForAnswer(comboBefore: number): number {
  const combo = comboBefore + 1
  return Math.round(XP_BASE * comboMultiplier(combo))
}

// ===== Text normalization / fuzzy matching =====

/** Expand German umlauts / ß to ASCII equivalents so "schoen" == "schön". */
function expandUmlauts(input: string): string {
  return input
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
}

export function normalizeAnswer(input: string): string {
  return expandUmlauts(input.trim().toLowerCase())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip remaining diacritics
    .replace(/[.,!?;:"'’„“”\-–—()]/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost)
      prevDiag = temp
    }
  }
  return prev[b.length]
}

/** Similarity ratio in [0, 1] based on normalized Levenshtein distance. */
export function similarity(a: string, b: string): number {
  const na = normalizeAnswer(a)
  const nb = normalizeAnswer(b)
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

/** Accept a typed answer if it's an exact normalized match or close enough. */
export function isCloseEnough(input: string, target: string, threshold = 0.9): boolean {
  return similarity(input, target) >= threshold
}

/** Compare a word-bank build against the target (order matters, normalized). */
export function isWordBankCorrect(built: string[], target: string): boolean {
  return normalizeAnswer(built.join(" ")) === normalizeAnswer(target)
}

// ===== Session building =====

function seededShuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Pick up to `n` distractor sentences, preferring the same theme first. */
function pickDistractors(target: Sentence, pool: Sentence[], n: number): Sentence[] {
  const others = pool.filter((s) => s.id !== target.id)
  const sameTheme = seededShuffle(others.filter((s) => s.theme === target.theme))
  const rest = seededShuffle(others.filter((s) => s.theme !== target.theme))
  return [...sameTheme, ...rest].slice(0, n)
}

function makeOptions(correct: string, distractors: string[]): QuizOption[] {
  const raw = [correct, ...distractors]
  // De-dupe by text while keeping the correct answer.
  const seen = new Set<string>()
  const unique = raw.filter((t) => {
    const key = t.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return seededShuffle(unique).map((text, i) => ({ id: `opt-${i}`, text }))
}

function tokenize(german: string): string[] {
  return german.trim().split(/\s+/)
}

/**
 * Assign a question type to each position using a weighted rotation. Listening
 * and type-what-you-hear types are only used when TTS is available.
 */
function assignTypes(count: number, ttsAvailable: boolean): QuizQuestionType[] {
  const base: QuizQuestionType[] = ttsAvailable
    ? ["mc-de-en", "word-bank", "listen", "mc-en-de", "type"]
    : ["mc-de-en", "word-bank", "mc-en-de", "mc-de-en", "word-bank"]

  const rotation = seededShuffle(base)
  const types: QuizQuestionType[] = []
  for (let i = 0; i < count; i++) {
    types.push(rotation[i % rotation.length])
  }
  return types
}

/**
 * Build an ordered list of quiz questions using the app's smart queue as the
 * spine, topped up with random sentences so a session always has enough.
 */
export function buildQuizSession(config: QuizSessionConfig): QuizQuestion[] {
  const { count, ttsAvailable } = config
  const all = getAllSentences().filter((s) => tokenize(s.german).length > 0)
  if (all.length === 0) return []

  const byId = new Map(all.map((s) => [s.id, s]))
  const allIds = all.map((s) => s.id)

  // Smart mix spine: due reviews + new, ordered by the existing SRS logic.
  const queueIds = getTodaysQueue(allIds, count)
  const picked: Sentence[] = []
  const usedIds = new Set<string>()

  for (const id of queueIds) {
    const s = byId.get(id)
    if (s && !usedIds.has(id)) {
      picked.push(s)
      usedIds.add(id)
    }
  }

  // Top up with random sentences if the queue was short.
  if (picked.length < count) {
    const remaining = seededShuffle(all.filter((s) => !usedIds.has(s.id)))
    for (const s of remaining) {
      if (picked.length >= count) break
      picked.push(s)
      usedIds.add(s.id)
    }
  }

  const chosen = picked.slice(0, count)
  const types = assignTypes(chosen.length, ttsAvailable)

  return chosen.map((sentence, i) => buildQuestion(sentence, types[i], all, i))
}

function buildQuestion(
  sentence: Sentence,
  type: QuizQuestionType,
  pool: Sentence[],
  index: number,
): QuizQuestion {
  const baseId = `q-${index}-${sentence.id}`

  switch (type) {
    case "mc-de-en": {
      const distractors = pickDistractors(sentence, pool, 3).map((s) => s.english)
      return {
        id: baseId,
        type,
        sentence,
        prompt: sentence.german,
        answer: sentence.english,
        options: makeOptions(sentence.english, distractors),
      }
    }
    case "mc-en-de": {
      const distractors = pickDistractors(sentence, pool, 3).map((s) => s.german)
      return {
        id: baseId,
        type,
        sentence,
        prompt: sentence.english,
        answer: sentence.german,
        options: makeOptions(sentence.german, distractors),
      }
    }
    case "listen": {
      const distractors = pickDistractors(sentence, pool, 3).map((s) => s.german)
      return {
        id: baseId,
        type,
        sentence,
        prompt: sentence.german,
        answer: sentence.german,
        options: makeOptions(sentence.german, distractors),
      }
    }
    case "word-bank": {
      const correctTokens = tokenize(sentence.german)
      // Add a few extra decoy word tiles from a distractor sentence.
      const decoySource = pickDistractors(sentence, pool, 1)[0]
      const decoys = decoySource ? tokenize(decoySource.german).slice(0, 2) : []
      const tiles = seededShuffle([...correctTokens, ...decoys])
      return {
        id: baseId,
        type,
        sentence,
        prompt: sentence.english,
        answer: sentence.german,
        tiles,
      }
    }
    case "type": {
      return {
        id: baseId,
        type,
        sentence,
        prompt: sentence.english,
        answer: sentence.german,
      }
    }
  }
}
