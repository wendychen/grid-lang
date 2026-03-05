// Graph data layer: edges between sentences and custom user-created sentences
// All persisted in localStorage

const EDGES_KEY = "gridlang_graph_edges"
const CUSTOM_SENTENCES_KEY = "gridlang_custom_sentences"

export interface GraphEdge {
  id: string
  source: string // sentence id
  target: string // sentence id
  label: string  // user-defined relationship label
}

export interface CustomSentence {
  id: string
  german: string
  english: string
  phonetic: string
  theme: string // user-assigned theme or "Custom"
  createdAt: string
}

// ===== Edges =====

export function getAllEdges(): GraphEdge[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(EDGES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveAllEdges(edges: GraphEdge[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(EDGES_KEY, JSON.stringify(edges))
}

export function addEdge(source: string, target: string, label: string): GraphEdge {
  const edges = getAllEdges()
  // Prevent duplicate edges between same pair
  const existing = edges.find(
    (e) => (e.source === source && e.target === target) || (e.source === target && e.target === source)
  )
  if (existing) {
    existing.label = label
    saveAllEdges(edges)
    return existing
  }

  const edge: GraphEdge = {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    target,
    label,
  }
  edges.push(edge)
  saveAllEdges(edges)
  return edge
}

export function removeEdge(edgeId: string): void {
  const edges = getAllEdges().filter((e) => e.id !== edgeId)
  saveAllEdges(edges)
}

export function updateEdgeLabel(edgeId: string, label: string): void {
  const edges = getAllEdges()
  const edge = edges.find((e) => e.id === edgeId)
  if (edge) {
    edge.label = label
    saveAllEdges(edges)
  }
}

// ===== Custom Sentences =====

export function getAllCustomSentences(): CustomSentence[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(CUSTOM_SENTENCES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveAllCustomSentences(sentences: CustomSentence[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CUSTOM_SENTENCES_KEY, JSON.stringify(sentences))
}

export function addCustomSentence(
  german: string,
  english: string,
  phonetic: string,
  theme?: string
): CustomSentence {
  const sentences = getAllCustomSentences()
  const sentence: CustomSentence = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    german,
    english,
    phonetic: phonetic || "",
    theme: theme || "Custom",
    createdAt: new Date().toISOString(),
  }
  sentences.push(sentence)
  saveAllCustomSentences(sentences)
  return sentence
}

export function removeCustomSentence(id: string): void {
  const sentences = getAllCustomSentences().filter((s) => s.id !== id)
  saveAllCustomSentences(sentences)
  // Also remove any edges connected to this sentence
  const edges = getAllEdges().filter((e) => e.source !== id && e.target !== id)
  saveAllEdges(edges)
}

export function clearAllGraphData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(EDGES_KEY)
  localStorage.removeItem(CUSTOM_SENTENCES_KEY)
}
