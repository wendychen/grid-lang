let currentUtterance: SpeechSynthesisUtterance | null = null

export function speakGerman(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Speech synthesis not available"))
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "de-DE"
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to find a German voice
    const voices = window.speechSynthesis.getVoices()
    const germanVoice = voices.find(
      (v) => v.lang.startsWith("de") && v.localService
    ) || voices.find((v) => v.lang.startsWith("de"))

    if (germanVoice) {
      utterance.voice = germanVoice
    }

    utterance.onend = () => {
      currentUtterance = null
      resolve()
    }
    utterance.onerror = (e) => {
      currentUtterance = null
      // Don't reject on interrupted - that's expected when canceling
      if (e.error === "interrupted" || e.error === "canceled") {
        resolve()
      } else {
        reject(e)
      }
    }

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false
  return window.speechSynthesis?.speaking || false
}
