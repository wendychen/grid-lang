// Graph data layer: edges between sentences and custom user-created sentences
// Persisted in Dexie (IndexedDB)

import { db, type GraphEdgeEntity, type CustomSentenceEntity } from "./db"

export type GraphEdge = GraphEdgeEntity
export type CustomSentence = CustomSentenceEntity

// ===== Caches for sync access =====

let edgesCache: GraphEdge[] = []
let customSentencesCache: CustomSentence[] = []

export function setEdgesCache(data: GraphEdge[]): void {
  edgesCache = data
}

export function setCustomSentencesCache(data: CustomSentence[]): void {
  customSentencesCache = data
}

// ===== Edges (Dexie) =====

export async function getAllEdgesAsync(): Promise<GraphEdge[]> {
  return await db.edges.toArray()
}

export function getAllEdges(): GraphEdge[] {
  return edgesCache
}

export async function addEdgeAsync(source: string, target: string, label: string): Promise<GraphEdge> {
  // Prevent duplicate edges between same pair
  const existing = await db.edges
    .filter((e) => (e.source === source && e.target === target) || (e.source === target && e.target === source))
    .first()

  if (existing) {
    existing.label = label
    await db.edges.put(existing)
    const idx = edgesCache.findIndex((e) => e.id === existing.id)
    if (idx >= 0) edgesCache[idx] = existing
    return existing
  }

  const edge: GraphEdge = {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    target,
    label,
  }
  await db.edges.add(edge)
  edgesCache.push(edge)
  return edge
}

export function addEdge(source: string, target: string, label: string): GraphEdge {
  // Sync version - uses cache and fires async update
  const existing = edgesCache.find(
    (e) => (e.source === source && e.target === target) || (e.source === target && e.target === source)
  )
  if (existing) {
    existing.label = label
    db.edges.put(existing)
    return existing
  }

  const edge: GraphEdge = {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    target,
    label,
  }
  edgesCache.push(edge)
  db.edges.add(edge)
  return edge
}

export async function removeEdgeAsync(edgeId: string): Promise<void> {
  await db.edges.delete(edgeId)
  edgesCache = edgesCache.filter((e) => e.id !== edgeId)
}

export function removeEdge(edgeId: string): void {
  edgesCache = edgesCache.filter((e) => e.id !== edgeId)
  db.edges.delete(edgeId)
}

export async function updateEdgeLabelAsync(edgeId: string, label: string): Promise<void> {
  const edge = await db.edges.get(edgeId)
  if (edge) {
    edge.label = label
    await db.edges.put(edge)
    const idx = edgesCache.findIndex((e) => e.id === edgeId)
    if (idx >= 0) edgesCache[idx].label = label
  }
}

export function updateEdgeLabel(edgeId: string, label: string): void {
  const idx = edgesCache.findIndex((e) => e.id === edgeId)
  if (idx >= 0) {
    edgesCache[idx].label = label
    db.edges.put(edgesCache[idx])
  }
}

// ===== Custom Sentences (Dexie) =====

export async function getAllCustomSentencesAsync(): Promise<CustomSentence[]> {
  return await db.customSentences.toArray()
}

export function getAllCustomSentences(): CustomSentence[] {
  return customSentencesCache
}

export async function addCustomSentenceAsync(
  german: string,
  english: string,
  phonetic: string,
  theme?: string
): Promise<CustomSentence> {
  const sentence: CustomSentence = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    german,
    english,
    phonetic: phonetic || "",
    theme: theme || "Custom",
    createdAt: new Date().toISOString(),
  }
  await db.customSentences.add(sentence)
  customSentencesCache.push(sentence)
  return sentence
}

export function addCustomSentence(
  german: string,
  english: string,
  phonetic: string,
  theme?: string
): CustomSentence {
  const sentence: CustomSentence = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    german,
    english,
    phonetic: phonetic || "",
    theme: theme || "Custom",
    createdAt: new Date().toISOString(),
  }
  customSentencesCache.push(sentence)
  db.customSentences.add(sentence)
  return sentence
}

export async function removeCustomSentenceAsync(id: string): Promise<void> {
  await db.customSentences.delete(id)
  customSentencesCache = customSentencesCache.filter((s) => s.id !== id)
  // Also remove any edges connected to this sentence
  const connectedEdges = await db.edges.filter((e) => e.source === id || e.target === id).toArray()
  for (const e of connectedEdges) {
    await db.edges.delete(e.id)
  }
  edgesCache = edgesCache.filter((e) => e.source !== id && e.target !== id)
}

export function removeCustomSentence(id: string): void {
  customSentencesCache = customSentencesCache.filter((s) => s.id !== id)
  edgesCache = edgesCache.filter((e) => e.source !== id && e.target !== id)
  db.customSentences.delete(id)
  db.edges.filter((e) => e.source === id || e.target === id).delete()
}

export async function clearAllGraphDataAsync(): Promise<void> {
  await db.edges.clear()
  await db.customSentences.clear()
  edgesCache = []
  customSentencesCache = []
}

export function clearAllGraphData(): void {
  edgesCache = []
  customSentencesCache = []
  db.edges.clear()
  db.customSentences.clear()
}
