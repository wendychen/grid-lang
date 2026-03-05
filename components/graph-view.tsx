"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { getAllSentences, type Sentence } from "@/lib/sentences"
import { getAllProgress, getProgress, type SentenceProgress } from "@/lib/srs"
import {
  getAllEdges,
  addEdge,
  removeEdge,
  getAllCustomSentences,
  addCustomSentence,
  removeCustomSentence,
  type GraphEdge,
} from "@/lib/graph"
import { cn } from "@/lib/utils"
import {
  Plus,
  Link2,
  MousePointer2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react"

// Concrete colors for Cytoscape (can't use CSS vars in canvas)
function getNodeColor(reps: number): string {
  if (reps === 0) return "#c8cbd0"
  if (reps === 1) return "#93c5e8"
  if (reps <= 3) return "#6baed6"
  if (reps <= 5) return "#4a90c4"
  if (reps <= 8) return "#3a9bb5"
  if (reps <= 12) return "#2f9e8c"
  if (reps <= 16) return "#3a9e6e"
  if (reps <= 20) return "#3d9454"
  if (reps <= 30) return "#7aaa3c"
  return "#d4a017"
}

function getNodeTextColor(reps: number): string {
  if (reps === 0) return "#333"
  if (reps <= 2) return "#0c2a4a"
  return "#ffffff"
}

// Theme color palette for clustering
const THEME_COLORS: Record<string, string> = {
  page1: "#6366f1",
  page2: "#f59e0b",
  page3: "#10b981",
  page4: "#ef4444",
  page5: "#8b5cf6",
  page6: "#ec4899",
  page7: "#06b6d4",
  page8: "#f97316",
  page9: "#14b8a6",
  page10: "#6366f1",
  custom: "#a855f7",
}

type Mode = "explore" | "connect" | "add"

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  const [mode, setMode] = useState<Mode>("explore")
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, SentenceProgress>>({})
  const [edges, setEdges] = useState<GraphEdge[]>([])

  // Connect mode state
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const [connectSourceLabel, setConnectSourceLabel] = useState("")

  // Add mode state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGerman, setNewGerman] = useState("")
  const [newEnglish, setNewEnglish] = useState("")
  const [newPhonetic, setNewPhonetic] = useState("")

  // Edge label dialog
  const [pendingEdge, setPendingEdge] = useState<{ source: string; target: string } | null>(null)
  const [edgeLabel, setEdgeLabel] = useState("")

  // Selected edge for deletion
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null)

  // Info panel
  const [selectedNode, setSelectedNode] = useState<Sentence | null>(null)
  const [selectedNodeProgress, setSelectedNodeProgress] = useState<SentenceProgress | null>(null)

  const loadData = useCallback(() => {
    const allSentences = getAllSentences()
    const allProg = getAllProgress()
    const allEdges = getAllEdges()

    const pMap: Record<string, SentenceProgress> = {}
    for (const s of allSentences) {
      pMap[s.id] = allProg[s.id] || getProgress(s.id)
    }

    setSentences(allSentences)
    setProgressMap(pMap)
    setEdges(allEdges)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || sentences.length === 0) return

    let cy: cytoscape.Core

    const initCytoscape = async () => {
      const cytoscape = (await import("cytoscape")).default

      // Build nodes
      const nodes = sentences.map((s) => {
        const prog = progressMap[s.id]
        const reps = prog?.reps ?? 0
        return {
          data: {
            id: s.id,
            label: s.german.length > 25 ? s.german.slice(0, 22) + "..." : s.german,
            fullLabel: s.german,
            english: s.english,
            theme: s.theme,
            reps,
            bgColor: getNodeColor(reps),
            textColor: getNodeTextColor(reps),
            borderColor: THEME_COLORS[s.theme] || "#888",
            nodeSize: Math.max(30, 30 + reps * 2),
          },
        }
      })

      // Build edges
      const edgeElements = edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
        },
      }))

      cy = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edgeElements],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(bgColor)" as string,
              label: "data(label)",
              color: "data(textColor)" as string,
              "font-size": "9px",
              "text-wrap": "wrap" as const,
              "text-max-width": "80px",
              "text-valign": "center" as const,
              "text-halign": "center" as const,
              width: "data(nodeSize)" as unknown as number,
              height: "data(nodeSize)" as unknown as number,
              "border-width": 3,
              "border-color": "data(borderColor)" as string,
              "text-outline-width": 0,
              padding: "4px",
              shape: "round-rectangle" as const,
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 4,
              "border-color": "#3b82f6",
              "overlay-color": "#3b82f6",
              "overlay-opacity": 0.15,
            },
          },
          {
            selector: "edge",
            style: {
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              "target-arrow-shape": "triangle" as const,
              "curve-style": "bezier" as const,
              width: 2,
              label: "data(label)" as string,
              "font-size": "8px",
              color: "#64748b",
              "text-background-color": "#ffffff",
              "text-background-opacity": 0.85,
              "text-background-padding": "2px",
            },
          },
          {
            selector: "edge:selected",
            style: {
              "line-color": "#ef4444",
              "target-arrow-color": "#ef4444",
              width: 3,
            },
          },
          {
            selector: ".connect-source",
            style: {
              "border-width": 4,
              "border-color": "#22c55e",
              "overlay-color": "#22c55e",
              "overlay-opacity": 0.2,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          nodeRepulsion: () => 8000,
          idealEdgeLength: () => 120,
          gravity: 0.3,
          numIter: 500,
          padding: 40,
          nodeDimensionsIncludeLabels: true,
        },
        minZoom: 0.1,
        maxZoom: 4,
        wheelSensitivity: 0.3,
      })

      cyRef.current = cy

      // Node tap handler
      cy.on("tap", "node", (evt) => {
        const node = evt.target
        const nodeId = node.id()
        const sentenceData = sentences.find((s) => s.id === nodeId)
        const progress = progressMap[nodeId]

        if (mode === "connect") {
          if (!connectSource) {
            setConnectSource(nodeId)
            setConnectSourceLabel(sentenceData?.german || nodeId)
            node.addClass("connect-source")
          } else if (nodeId !== connectSource) {
            // Open label dialog
            setPendingEdge({ source: connectSource, target: nodeId })
            setEdgeLabel("")
          }
        } else {
          setSelectedNode(sentenceData || null)
          setSelectedNodeProgress(progress || null)
          setSelectedEdge(null)
        }
      })

      // Edge tap handler
      cy.on("tap", "edge", (evt) => {
        const edgeId = evt.target.id()
        const edgeData = edges.find((e) => e.id === edgeId)
        if (edgeData) {
          setSelectedEdge(edgeData)
          setSelectedNode(null)
        }
      })

      // Background tap
      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          setSelectedNode(null)
          setSelectedEdge(null)
          if (connectSource) {
            cy.$(`#${connectSource}`).removeClass("connect-source")
            setConnectSource(null)
            setConnectSourceLabel("")
          }
        }
      })
    }

    initCytoscape()

    return () => {
      cy?.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences, edges, progressMap])

  // Update mode-specific interactions
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    if (mode === "explore") {
      cy.nodes().ungrabify()
      cy.nodes().grabify()
      // Clear connect state
      if (connectSource) {
        cy.$(`#${connectSource}`).removeClass("connect-source")
        setConnectSource(null)
        setConnectSourceLabel("")
      }
    } else if (mode === "connect") {
      cy.nodes().grabify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleConfirmEdge = useCallback(() => {
    if (!pendingEdge) return
    const label = edgeLabel.trim() || "related"
    const newEdge = addEdge(pendingEdge.source, pendingEdge.target, label)

    // Add edge to cytoscape directly
    const cy = cyRef.current
    if (cy) {
      cy.add({
        data: {
          id: newEdge.id,
          source: newEdge.source,
          target: newEdge.target,
          label: newEdge.label,
        },
      })
      cy.$(`#${pendingEdge.source}`).removeClass("connect-source")
    }

    setEdges(getAllEdges())
    setPendingEdge(null)
    setEdgeLabel("")
    setConnectSource(null)
    setConnectSourceLabel("")
  }, [pendingEdge, edgeLabel])

  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdge) return
    removeEdge(selectedEdge.id)
    const cy = cyRef.current
    if (cy) {
      cy.remove(cy.$(`#${selectedEdge.id}`))
    }
    setEdges(getAllEdges())
    setSelectedEdge(null)
  }, [selectedEdge])

  const handleAddSentence = useCallback(() => {
    if (!newGerman.trim() || !newEnglish.trim()) return

    const custom = addCustomSentence(
      newGerman.trim(),
      newEnglish.trim(),
      newPhonetic.trim()
    )

    // Add to cytoscape directly
    const cy = cyRef.current
    if (cy) {
      cy.add({
        data: {
          id: custom.id,
          label: custom.german.length > 25 ? custom.german.slice(0, 22) + "..." : custom.german,
          fullLabel: custom.german,
          english: custom.english,
          theme: "custom",
          reps: 0,
          bgColor: getNodeColor(0),
          textColor: getNodeTextColor(0),
          borderColor: THEME_COLORS.custom,
          nodeSize: 30,
        },
        position: {
          x: (containerRef.current?.clientWidth || 400) / 2 + (Math.random() - 0.5) * 100,
          y: (containerRef.current?.clientHeight || 400) / 2 + (Math.random() - 0.5) * 100,
        },
      })
    }

    // Reload data to keep state in sync
    loadData()
    setNewGerman("")
    setNewEnglish("")
    setNewPhonetic("")
    setShowAddForm(false)
  }, [newGerman, newEnglish, newPhonetic, loadData])

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return
    if (!selectedNode.id.startsWith("custom-")) return // only delete custom

    removeCustomSentence(selectedNode.id)
    const cy = cyRef.current
    if (cy) {
      cy.remove(cy.$(`#${selectedNode.id}`))
    }
    setSelectedNode(null)
    loadData()
  }, [selectedNode, loadData])

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.3)
  const handleFit = () => cyRef.current?.fit(undefined, 40)

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-8rem)] -mx-4 lg:-mx-8">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 lg:px-8 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setMode("explore")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              mode === "explore"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            Explore
          </button>
          <button
            onClick={() => setMode("connect")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              mode === "connect"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="w-3.5 h-3.5" />
            Connect
          </button>
          <button
            onClick={() => {
              setMode("add")
              setShowAddForm(true)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              mode === "add"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Node
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">
            {sentences.length} nodes &middot; {edges.length} edges
          </span>
          <button onClick={handleZoomIn} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Zoom in">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleZoomOut} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Zoom out">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleFit} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Fit to view">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Connect mode hint */}
      {mode === "connect" && (
        <div className="px-4 lg:px-8 py-1.5 bg-accent-green/10 border-b border-accent-green/20 text-xs text-accent-green">
          {connectSource
            ? <>Tap a second node to connect it with <strong>{connectSourceLabel}</strong>. Tap background to cancel.</>
            : "Tap the first node to start a connection."
          }
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1">
        <div ref={containerRef} className="w-full h-full" />

        {/* Edge label dialog */}
        {pendingEdge && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl p-4 w-72 shadow-lg">
              <h4 className="text-sm font-medium text-foreground mb-3">Name this connection</h4>
              <input
                type="text"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                placeholder="e.g. similar, opposite, formal..."
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmEdge()
                  if (e.key === "Escape") {
                    setPendingEdge(null)
                    if (connectSource && cyRef.current) {
                      cyRef.current.$(`#${connectSource}`).removeClass("connect-source")
                    }
                    setConnectSource(null)
                    setConnectSourceLabel("")
                  }
                }}
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleConfirmEdge}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Add Connection
                </button>
                <button
                  onClick={() => {
                    setPendingEdge(null)
                    if (connectSource && cyRef.current) {
                      cyRef.current.$(`#${connectSource}`).removeClass("connect-source")
                    }
                    setConnectSource(null)
                    setConnectSourceLabel("")
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add sentence form */}
        {showAddForm && mode === "add" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl p-4 w-80 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">Add New Sentence</h4>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setMode("explore")
                  }}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={newGerman}
                  onChange={(e) => setNewGerman(e.target.value)}
                  placeholder="German sentence"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
                <input
                  type="text"
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  placeholder="English translation"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="text"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  placeholder="Phonetic (optional)"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handleAddSentence}
                  disabled={!newGerman.trim() || !newEnglish.trim()}
                  className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add to Graph
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected node info panel */}
        {selectedNode && !pendingEdge && (
          <div className="absolute bottom-3 left-3 right-3 z-10 bg-card border border-border rounded-xl p-3 shadow-lg max-w-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{selectedNode.german}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedNode.english}</p>
                {selectedNodeProgress && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{selectedNodeProgress.reps} reps</span>
                    <span>{selectedNodeProgress.listens} listens</span>
                    <span className="text-foreground/30">|</span>
                    <span>{selectedNode.themeLabel}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {selectedNode.id.startsWith("custom-") && (
                  <button
                    onClick={handleDeleteNode}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                    aria-label="Delete custom node"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected edge info panel */}
        {selectedEdge && !pendingEdge && (
          <div className="absolute bottom-3 left-3 right-3 z-10 bg-card border border-border rounded-xl p-3 shadow-lg max-w-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Connection</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  &ldquo;{selectedEdge.label}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDeleteEdge}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedEdge(null)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
