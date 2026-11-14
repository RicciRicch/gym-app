// Thin wrapper over the browser's Web Speech API (Chrome/Android, Safari/iOS).
// Not in TypeScript's DOM types, so the small part we use is declared here.

interface RecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: { readonly transcript: string }
}

interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult }
}

interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const voiceSupported = () => recognitionConstructor() !== null

export const VOICE_LANGS = [
  { code: 'sr-RS', label: 'SR' },
  { code: 'hr-HR', label: 'HR' },
  { code: 'en-US', label: 'EN' },
] as const
export type VoiceLang = (typeof VOICE_LANGS)[number]['code']

const LANG_KEY = 'gym-app:voice-lang'

export function loadVoiceLang(): VoiceLang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (VOICE_LANGS.some((l) => l.code === saved)) return saved as VoiceLang
  } catch {
    /* storage blocked */
  }
  return 'sr-RS'
}

export function saveVoiceLang(lang: VoiceLang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    /* storage blocked */
  }
}

/** Error codes from the Web Speech API, plus our own 'no-result'. */
export class VoiceError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

/**
 * Listens for one phrase. Resolves with the recognizer's alternatives (best
 * first), rejects with a VoiceError. `stop()` finishes early and still delivers
 * what was heard; `abort()` throws it away.
 */
export function listenOnce(
  lang: VoiceLang,
  onInterim: (text: string) => void,
): { result: Promise<string[]>; stop: () => void; abort: () => void } {
  const failed = (code: string) => ({ result: Promise.reject(new VoiceError(code)), stop: () => {}, abort: () => {} })
  const Ctor = recognitionConstructor()
  if (!Ctor) return failed('not-supported')
  const recognition = new Ctor()
  recognition.lang = lang
  recognition.interimResults = true
  recognition.maxAlternatives = 3
  recognition.continuous = false

  const result = new Promise<string[]>((resolve, reject) => {
    let settled = false
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]
      if (!latest) return
      if (!latest.isFinal) return onInterim(latest[0]?.transcript ?? '')
      settled = true
      resolve(Array.from({ length: latest.length }, (_, i) => latest[i].transcript))
    }
    recognition.onerror = (event) => {
      if (settled) return
      settled = true
      reject(new VoiceError(event.error))
    }
    recognition.onend = () => {
      if (settled) return
      settled = true
      reject(new VoiceError('no-result'))
    }
  })

  try {
    recognition.start()
  } catch {
    return failed('start-failed')
  }
  return { result, stop: () => recognition.stop(), abort: () => recognition.abort() }
}
