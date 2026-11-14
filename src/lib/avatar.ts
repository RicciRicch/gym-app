/** Uploaded profile photos are square, at most this many pixels per side. */
export const AVATAR_PX = 320

/** The largest centred square inside a `width` x `height` image (source rectangle for drawImage). */
export function squareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height)
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size }
}

/** Output edge length: never upscale a small photo. */
export function avatarEdge(cropSize: number): number {
  return Math.max(1, Math.min(AVATAR_PX, Math.round(cropSize)))
}

/** Storage path for a new photo: the user's own folder (required by the storage policies). */
export function avatarPhotoPath(userId: string, mimeType: string, id: string): string {
  return `${userId}/${id}.${mimeType === 'image/webp' ? 'webp' : 'jpg'}`
}
