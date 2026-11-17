import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Mascot } from '../../components/Mascot'
import { Button } from '../../components/ui'
import { proofLine } from '../../lib/feed'
import { prefersReducedMotion } from '../../lib/motion'
import { toISODate } from '../../lib/schedule'
import type { WorkoutSummary } from '../../lib/summary'
import { usePublishPost } from './api'
import { PostPhotoError, photoFromFile, photoFromVideo } from './photo'
import { Polaroid, StatsCard, type PostStats } from './Polaroid'

type Phase = 'live' | 'countdown' | 'review' | 'posted'
type Camera = 'pending' | 'on' | 'off'

const STEP_MS = 700
const canUseCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/**
 * After the summary: "proof or it didn't happen". A live selfie camera with a
 * 3-2-1 countdown, an iris shutter and a flash; the shot drops in as a polaroid
 * that develops, and only "Post to friends" publishes it. Skipping is one tap.
 * Without camera access it falls back to the phone's own camera / gallery.
 */
export function ProofCamera({ workoutId, summary, onDone }: { workoutId: string; summary: WorkoutSummary; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<Camera>(() => (canUseCamera() ? 'pending' : 'off'))
  const [phase, setPhase] = useState<Phase>('live')
  const [count, setCount] = useState(3)
  const [shutter, setShutter] = useState(0)
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const publish = usePublishPost()
  const reduced = prefersReducedMotion()

  const stats: PostStats = {
    dayName: summary.dayName,
    durationSeconds: summary.durationSeconds,
    sets: summary.sets,
    exercises: summary.exercises,
    prCount: summary.prs.length,
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  /** Opens the selfie camera; `isCancelled` stops a stream that arrives after the screen closed. */
  const startCamera = useCallback((isCancelled: () => boolean = () => false) => {
    if (!canUseCamera()) return
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1440 }, height: { ideal: 1440 } }, audio: false })
      .then(
        (stream) => {
          if (isCancelled()) return stream.getTracks().forEach((t) => t.stop())
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            void videoRef.current.play().catch(() => {})
          }
          setCamera('on')
        },
        () => {
          if (!isCancelled()) setCamera('off')
        },
      )
  }, [])

  useEffect(() => {
    let cancelled = false
    startCamera(() => cancelled)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelled = true
      stopCamera()
      document.body.style.overflow = overflow
    }
  }, [startCamera, stopCamera])

  // The <video> is re-created after a retake: hand it the running stream.
  useEffect(() => {
    const video = videoRef.current
    if (phase === 'live' && camera === 'on' && video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current
      void video.play().catch(() => {})
    }
  }, [phase, camera])

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  const shoot = useCallback(async () => {
    setShutter((n) => n + 1)
    try {
      navigator.vibrate?.(40)
    } catch {
      /* a bonus */
    }
    // Grab the frame while the iris is closed, then show the print.
    await new Promise((r) => setTimeout(r, reduced ? 0 : 180))
    try {
      const blob = await photoFromVideo(videoRef.current!)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
      setTimeout(() => {
        stopCamera()
        setPhase('review')
      }, reduced ? 0 : 260)
    } catch (e) {
      setError(e instanceof PostPhotoError ? e.message : 'Could not take the photo.')
      setPhase('live')
    }
  }, [reduced, stopCamera])

  // 3, 2, 1, click.
  useEffect(() => {
    if (phase !== 'countdown') return
    const timer = setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else void shoot()
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [phase, count, shoot])

  function startCountdown() {
    setError(null)
    setCount(3)
    setPhase('countdown')
  }

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const blob = await photoFromFile(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
      setPhase('review')
    } catch (err) {
      setError(err instanceof PostPhotoError ? err.message : 'Could not read that photo.')
    }
  }

  function retake() {
    setCamera(canUseCamera() ? 'pending' : 'off')
    setPhoto(null)
    setError(null)
    publish.reset()
    setPhase('live')
    startCamera()
  }

  function withoutPhoto() {
    stopCamera()
    setPhoto(null)
    setPhase('review')
  }

  function post() {
    publish.mutate(
      { workoutId, summary, photo: photo?.blob ?? null },
      {
        onSuccess: () => {
          setPhase('posted')
          setTimeout(onDone, reduced ? 400 : 850)
        },
      },
    )
  }

  const line = proofLine(toISODate(new Date()), stats.prCount > 0)
  const reviewing = phase === 'review' || phase === 'posted'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Post a photo" className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <Mascot pose={stats.prCount > 0 ? 'proud' : 'coach'} className="h-14 shrink-0" />
          <p className="pop-in min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5 text-sm font-bold">
            {phase === 'posted' ? 'Posted. Your friends will see it.' : reviewing ? 'Looking good. Post it?' : line}
          </p>
          {!reviewing && (
            <button type="button" onClick={onDone} className="min-h-11 shrink-0 px-2 font-semibold text-muted">
              Skip
            </button>
          )}
        </div>

        {!reviewing ? (
          <>
            <div className="relative mt-5">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-surface">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`size-full -scale-x-100 object-cover transition-opacity duration-500 ${camera === 'on' ? 'opacity-100' : 'opacity-0'}`}
                />
                {camera === 'off' && <CameraFallback onFile={pickFile} />}
                {camera === 'pending' && (
                  <p className="absolute inset-0 grid place-items-center px-8 text-center text-muted">Opening the camera…</p>
                )}
                {shutter > 0 && (
                  <span key={`iris-${shutter}`} aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="shutter-iris aspect-square rounded-full shadow-[0_0_0_100vmax_#000]" />
                  </span>
                )}
                {phase === 'countdown' && (
                  <span
                    key={count}
                    aria-live="assertive"
                    className="count-pop absolute inset-0 grid place-items-center text-[9rem] leading-none font-black text-white [text-shadow:0_4px_30px_rgb(0_0_0/0.5)]"
                  >
                    {count}
                  </span>
                )}
              </div>
              <Brackets />
              {shutter > 0 && <span key={`flash-${shutter}`} aria-hidden="true" className="shutter-flash pointer-events-none fixed inset-0 z-[60] bg-white" />}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-auto flex flex-col items-center pt-6">
              {camera === 'on' && (
                <ShutterButton counting={phase === 'countdown'} count={count} onClick={startCountdown} />
              )}
              <button type="button" onClick={withoutPhoto} className="mt-3 min-h-11 px-4 text-sm font-semibold text-muted">
                Post without a photo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-1 items-start justify-center">
              {photo ? (
                <Polaroid
                  photoUrl={photo.url}
                  stats={stats}
                  develop={phase === 'review'}
                  className={`w-[86%] ${phase === 'posted' ? 'polaroid-fly' : 'polaroid-drop'}`}
                />
              ) : (
                <StatsCard stats={stats} className={`w-full ${phase === 'posted' ? 'polaroid-fly' : 'polaroid-drop'}`} />
              )}
            </div>
            {publish.isError && (
              <p role="alert" className="mt-3 text-center text-sm text-danger">
                Could not post. Check your connection and try again.
              </p>
            )}
            <div className={`mt-6 flex flex-col gap-2 transition-opacity ${phase === 'posted' ? 'opacity-0' : ''}`}>
              <Button className="min-h-14 text-lg" loading={publish.isPending} disabled={phase === 'posted'} onClick={post}>
                Post to friends
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" disabled={publish.isPending || phase === 'posted'} onClick={retake}>
                  {photo ? 'Retake' : 'Add a photo'}
                </Button>
                <Button variant="ghost" disabled={publish.isPending || phase === 'posted'} onClick={onDone}>
                  Keep it private
                </Button>
              </div>
              <p className="mt-1 text-center text-xs text-muted">Friends see it for 30 days. No weights are shown.</p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Viewfinder corners that snap in from the screen edges. */
function Brackets() {
  const corners: { className: string; style: CSSProperties }[] = [
    { className: 'top-3 left-3 border-t-4 border-l-4 rounded-tl-2xl', style: { '--dx': '-40px', '--dy': '-40px' } as CSSProperties },
    { className: 'top-3 right-3 border-t-4 border-r-4 rounded-tr-2xl', style: { '--dx': '40px', '--dy': '-40px' } as CSSProperties },
    { className: 'bottom-3 left-3 border-b-4 border-l-4 rounded-bl-2xl', style: { '--dx': '-40px', '--dy': '40px' } as CSSProperties },
    { className: 'right-3 bottom-3 border-r-4 border-b-4 rounded-br-2xl', style: { '--dx': '40px', '--dy': '40px' } as CSSProperties },
  ]
  return (
    <>
      {corners.map((c, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`bracket-in pointer-events-none absolute size-12 border-accent ${c.className}`}
          style={{ ...c.style, animationDelay: `${0.1 + i * 0.06}s` }}
        />
      ))}
    </>
  )
}

/** Big round shutter; during the countdown a ring drains around it each second. */
function ShutterButton({ counting, count, onClick }: { counting: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={counting}
      aria-label={counting ? `Taking the photo in ${count}` : 'Take the photo (3 second timer)'}
      className="relative grid size-24 place-items-center rounded-full transition active:scale-90"
    >
      <svg viewBox="0 0 104 104" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="52" cy="52" r="48" fill="none" stroke="var(--color-line)" strokeWidth="5" />
        {counting && (
          <circle
            key={count}
            className="count-ring"
            cx="52"
            cy="52"
            r="48"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="302"
          />
        )}
      </svg>
      <span className={`size-[4.5rem] rounded-full bg-accent transition ${counting ? 'scale-75 opacity-60' : ''}`} />
    </button>
  )
}

/** No camera access (blocked, or an old browser): the phone's own camera or the gallery. */
function CameraFallback({ onFile }: { onFile: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <svg viewBox="0 0 24 24" className="size-12 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.4-2h7l1.4 2h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      <p className="text-muted">The app can&apos;t open the camera here. Use your phone&apos;s camera instead.</p>
      <label className="inline-flex min-h-12 cursor-pointer items-center rounded-2xl bg-accent px-5 font-bold text-accent-ink active:scale-[0.97]">
        Open camera
        <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFile} />
      </label>
      <label className="inline-flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-muted">
        Choose from gallery
        <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
      </label>
    </div>
  )
}
