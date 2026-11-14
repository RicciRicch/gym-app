import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Avatar, Spinner } from '../../components/ui'
import { AVATAR_KEYS } from '../auth/useProfile'
import type { AvatarChoice } from './api'
import { AvatarPhotoError, avatarFromFile } from './photo'

const tile =
  'relative grid aspect-square place-items-center rounded-3xl border-2 bg-surface p-1.5 transition active:scale-95'
const selectedTile = 'animate-pop border-accent shadow-[0_0_24px_-8px] shadow-accent'

function CameraIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

/**
 * Pick one of the preset avatars or your own photo. The photo is cropped and
 * shrunk on the phone; nothing is uploaded until the parent saves the choice.
 */
export function AvatarPicker({ value, onChange }: { value: AvatarChoice; onChange: (choice: AvatarChoice) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { photo } = value

  // Local previews are object URLs: free each one once it is replaced or the picker closes.
  const previewUrl = photo && 'blob' in photo ? photo.url : null
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl])

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again should still fire
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const blob = await avatarFromFile(file)
      onChange({ ...value, photo: { blob, url: URL.createObjectURL(blob) }, usePhoto: true })
    } catch (err) {
      setError(err instanceof AvatarPhotoError ? err.message : 'Could not process that photo.')
    } finally {
      setProcessing(false)
    }
  }

  const photoSelected = value.usePhoto && !!photo

  return (
    <div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Avatar">
        <button
          type="button"
          role="radio"
          aria-checked={photoSelected}
          aria-label={photo ? (photoSelected ? 'Your photo, tap to change it' : 'Your photo') : 'Upload your photo'}
          onClick={() => (photo && !photoSelected ? onChange({ ...value, usePhoto: true }) : input.current?.click())}
          disabled={processing}
          className={`${tile} ${photoSelected ? selectedTile : photo ? 'border-line opacity-70' : 'border-dashed border-muted/60 text-muted'}`}
        >
          {processing ? (
            <Spinner className="size-6 text-accent" />
          ) : photo ? (
            <img src={photo.url} alt="" className="size-full rounded-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-0.5">
              <CameraIcon className="size-6" />
              <span className="text-[0.65rem] leading-none font-bold">Photo</span>
            </span>
          )}
          {photo && !processing && (
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-bg bg-accent text-accent-ink">
              <CameraIcon className="size-3.5" />
            </span>
          )}
        </button>

        {AVATAR_KEYS.map((key, i) => {
          const selected = !photoSelected && key === value.preset
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Avatar ${i + 1}`}
              onClick={() => onChange({ ...value, preset: key, usePhoto: false })}
              className={`${tile} ${selected ? selectedTile : 'border-line opacity-70'}`}
            >
              <Avatar avatarKey={key} className="size-full" />
            </button>
          )
        })}
      </div>

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickFile} />

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {photo ? 'Tap your photo again to change it.' : 'Use your own photo or pick a character.'}
        </p>
      )}
    </div>
  )
}
