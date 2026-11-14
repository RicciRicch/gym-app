import { useCallback, useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { parseSpokenSet, type SpokenSet } from '../../lib/voice-set'
import { VOICE_LANGS, VoiceError, listenOnce, loadVoiceLang, saveVoiceLang, type VoiceLang } from './voice'

type Phase =
  | { kind: 'listening'; heard: string }
  | { kind: 'logged'; label: string }
  | { kind: 'error'; message: string; heard?: string }

const EXAMPLES: Record<VoiceLang, string[]> = {
  'sr-RS': ['sto kila puta pet', 'osamdeset i po puta osam', 'bez tega dvanaest'],
  'hr-HR': ['sto kila puta pet', 'osamdeset i pol puta osam', 'bez utega dvanaest'],
  'en-US': ['100 kilos times 5', 'eighty and a half for 8', 'bodyweight 12 reps'],
}

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it for this site in your browser settings.'
    case 'language-not-supported':
      return 'This language is not available on your phone. Try another one below.'
    case 'audio-capture':
      return 'No microphone found.'
    case 'network':
      return 'Voice input needs an internet connection.'
    case 'no-speech':
    case 'no-result':
      return 'Didn’t hear anything. Tap the mic and try again.'
    default:
      return 'Voice input stopped. Tap the mic and try again.'
  }
}

function MicIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

/**
 * Say a set out loud ("sto kila puta pet"). A recognized set is logged straight
 * away by `onLog`, which returns how it reads ("100 kg × 5").
 */
export function VoiceSheet({
  exerciseName,
  setNumber,
  onLog,
  onClose,
}: {
  exerciseName: string
  setNumber: number
  onLog: (set: SpokenSet & { reps: number }) => string
  onClose: () => void
}) {
  const [lang, setLang] = useState<VoiceLang>(loadVoiceLang)
  const [phase, setPhase] = useState<Phase>({ kind: 'listening', heard: '' })
  // Frozen at open: once the set is logged the "next set" moves on, the title should not.
  const [shownSetNumber] = useState(setNumber)
  const session = useRef<ReturnType<typeof listenOnce> | null>(null)
  const onLogRef = useRef(onLog)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onLogRef.current = onLog
    onCloseRef.current = onClose
  })

  /** Starts a listening session; the phase must already read "listening". */
  const listen = useCallback((language: VoiceLang) => {
    session.current?.abort()
    const current = listenOnce(language, (heard) => setPhase({ kind: 'listening', heard }))
    session.current = current
    current.result.then(
      (alternatives) => {
        if (session.current !== current) return
        const parsed = alternatives.map(parseSpokenSet).find((s) => s.reps !== null)
        if (!parsed || parsed.reps === null) {
          setPhase({ kind: 'error', message: 'Couldn’t find the reps in that. Say the weight and the reps.', heard: alternatives[0] })
          return
        }
        const label = onLogRef.current({ weight: parsed.weight, reps: parsed.reps })
        setPhase({ kind: 'logged', label })
        try {
          navigator.vibrate?.(40)
        } catch {
          /* bonus */
        }
        window.setTimeout(() => session.current === current && onCloseRef.current(), 900)
      },
      (error: unknown) => {
        if (session.current !== current) return
        const code = error instanceof VoiceError ? error.code : 'unknown'
        if (code === 'aborted') return
        setPhase({ kind: 'error', message: errorMessage(code) })
      },
    )
  }, [])

  const start = (language: VoiceLang) => {
    setPhase({ kind: 'listening', heard: '' })
    listen(language)
  }

  useEffect(() => {
    listen(loadVoiceLang())
    return () => {
      session.current?.abort()
      session.current = null
    }
  }, [listen])

  function pickLang(code: VoiceLang) {
    setLang(code)
    saveVoiceLang(code)
    start(code)
  }

  const listening = phase.kind === 'listening'

  return (
    <Sheet title={`Say set ${shownSetNumber}`} onClose={onClose}>
      <p className="-mt-1 truncate text-muted">{exerciseName}</p>

      <div className="flex flex-col items-center py-5 text-center">
        <button
          type="button"
          onClick={() => (listening ? session.current?.stop() : start(lang))}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
          disabled={phase.kind === 'logged'}
          className={`relative grid size-24 place-items-center rounded-full transition active:scale-95 ${
            phase.kind === 'logged'
              ? 'animate-pop bg-accent text-accent-ink'
              : listening
                ? 'bg-accent text-accent-ink shadow-[0_0_40px_-6px] shadow-accent'
                : 'bg-surface-2 text-text'
          }`}
        >
          {listening && <span className="voice-ring absolute inset-0 rounded-full border-2 border-accent" aria-hidden="true" />}
          {phase.kind === 'logged' ? (
            <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
          ) : (
            <MicIcon className="size-10" />
          )}
        </button>

        <div className="mt-4 min-h-16" aria-live="polite">
          {phase.kind === 'listening' &&
            (phase.heard ? (
              <p className="text-xl font-bold text-balance">“{phase.heard}”</p>
            ) : (
              <p className="text-lg font-bold">Listening…</p>
            ))}
          {phase.kind === 'logged' && <p className="text-2xl font-black text-accent">{phase.label}</p>}
          {phase.kind === 'error' && (
            <>
              {phase.heard && <p className="text-lg font-bold text-balance">“{phase.heard}”</p>}
              <p className="mt-1 text-sm text-balance text-danger">{phase.message}</p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        <p className="font-semibold text-muted">Try saying</p>
        <ul className="mt-1 flex flex-col gap-0.5 font-semibold">
          {EXAMPLES[lang].map((example) => (
            <li key={example}>„{example}“</li>
          ))}
        </ul>
        <p className="mt-2 text-muted">Only reps? The weight already in the set is kept.</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 pb-2">
        <span className="text-sm text-muted">Language</span>
        <div className="flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Voice language">
          {VOICE_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={lang === l.code}
              onClick={() => pickLang(l.code)}
              className={`min-h-10 min-w-12 rounded-full px-3 text-sm font-bold transition ${lang === l.code ? 'bg-accent text-accent-ink' : 'text-muted'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
