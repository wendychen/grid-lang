"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getSettings,
  saveSettings,
  resetAllProgress,
  exportAllData,
  importAllData,
  type AppSettings,
  type GridLangBackup,
} from "@/lib/srs"
import { speakGerman } from "@/lib/tts"
import { Volume2, RotateCw, AlertTriangle, Download, Upload, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>({
    gridCols: 3,
    gridRows: 4,
    ttsSpeed: 1.0,
    autoPlay: false,
  })
  const [showReset, setShowReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importMessage, setImportMessage] = useState("")

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const handleChange = useCallback(
    (key: keyof AppSettings, value: number | boolean) => {
      const updated = { ...settings, [key]: value }
      setSettings(updated)
      saveSettings(updated)
    },
    [settings]
  )

  const handleTestTTS = useCallback(() => {
    speakGerman("Hallo, wie geht es Ihnen?", settings.ttsSpeed)
  }, [settings.ttsSpeed])

  const handleReset = useCallback(() => {
    resetAllProgress()
    setShowReset(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }, [])

  const handleExport = useCallback(() => {
    const backup = exportAllData()
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gridlang-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as GridLangBackup
          importAllData(data)
          setImportStatus("success")
          setImportMessage("Data imported successfully. Reload to see changes.")
          setSettings(getSettings())
          setTimeout(() => {
            setImportStatus("idle")
            setImportMessage("")
          }, 4000)
        } catch {
          setImportStatus("error")
          setImportMessage("Invalid backup file. Please use a valid GridLang export.")
          setTimeout(() => {
            setImportStatus("idle")
            setImportMessage("")
          }, 4000)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground px-1">Settings</h2>

      {/* TTS Settings */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground px-1">Pronunciation</h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {/* TTS Speed */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Speech Speed</span>
              <span className="text-sm font-mono text-muted-foreground">{settings.ttsSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.ttsSpeed}
              onChange={(e) => handleChange("ttsSpeed", Number.parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Auto-play */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-card-foreground">Auto-play Audio</span>
              <span className="text-xs text-muted-foreground">Play audio when expanding a cell</span>
            </div>
            <button
              onClick={() => handleChange("autoPlay", !settings.autoPlay)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                settings.autoPlay ? "bg-primary" : "bg-secondary"
              )}
              role="switch"
              aria-checked={settings.autoPlay}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform shadow-sm",
                  settings.autoPlay && "translate-x-5"
                )}
              />
            </button>
          </div>

          {/* Test TTS */}
          <div className="p-4">
            <button
              onClick={handleTestTTS}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors w-full justify-center"
            >
              <Volume2 className="w-4 h-4" />
              Test Pronunciation
            </button>
          </div>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground px-1">Grid Layout</h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {/* Columns */}
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-card-foreground">Columns</span>
            <div className="flex items-center gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => handleChange("gridCols", n)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    settings.gridCols === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-card-foreground">Rows</span>
            <div className="flex items-center gap-2">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => handleChange("gridRows", n)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    settings.gridRows === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              Grid: {settings.gridCols} x {settings.gridRows} = {settings.gridCols * settings.gridRows} cells per session
            </p>
          </div>
        </div>
      </div>

      {/* Import / Export */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground px-1">Backup & Restore</h3>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          <div className="p-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Export your progress, settings, and activity history as a JSON file.
              Import a backup to restore your data on any device.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>
            </div>
            {importStatus !== "idle" && (
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg",
                  importStatus === "success"
                    ? "bg-accent-green/10 text-accent-green"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {importStatus === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                {importMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground px-1">Data</h3>
        <div className="rounded-xl bg-card border border-destructive/20 divide-y divide-border">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Reset All Progress</p>
                <p className="text-xs text-muted-foreground">
                  This will permanently delete all your practice history, streaks, and statistics.
                </p>
              </div>
            </div>

            {!showReset ? (
              <button
                onClick={() => setShowReset(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setShowReset(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {resetDone && (
              <p className="text-xs text-accent-green text-center font-medium">
                Progress has been reset successfully.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">GridLang v1.0</p>
        <p className="text-xs text-muted-foreground">240 German sentences across 10 themes</p>
        <p className="text-xs text-muted-foreground">Spaced repetition powered by Ebbinghaus</p>
      </div>
    </div>
  )
}
