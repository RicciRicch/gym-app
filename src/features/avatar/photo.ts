import { avatarEdge, squareCrop } from '../../lib/avatar'

export class AvatarPhotoError extends Error {}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older engines: fall back to an <img>, which also applies EXIF orientation.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))

/**
 * Turns any photo the browser can read into a small square avatar (centre crop,
 * at most AVATAR_PX). WebP where the browser can encode it, JPEG otherwise (Safari).
 */
export async function avatarFromFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new AvatarPhotoError('That file is not a photo.')
  let image: Awaited<ReturnType<typeof decode>>
  try {
    image = await decode(file)
  } catch {
    throw new AvatarPhotoError('Could not read that photo. Try a JPG or PNG.')
  }
  const { sx, sy, size } = squareCrop(image.width, image.height)
  const edge = avatarEdge(size)
  const canvas = document.createElement('canvas')
  canvas.width = edge
  canvas.height = edge
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AvatarPhotoError('Could not process that photo.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, size, size, 0, 0, edge, edge)
  if ('close' in image && typeof image.close === 'function') image.close()

  let blob = await toBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
  if (!blob) throw new AvatarPhotoError('Could not process that photo.')
  return blob
}
