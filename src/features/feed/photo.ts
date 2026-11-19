import { coverCrop, photoSize } from '../../lib/feed'
import { decodeImage } from '../avatar/photo'

export class PostPhotoError extends Error {}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82))

/** Draws the centre 4:5 of a source onto a canvas (mirrored for the selfie camera) and encodes it. */
async function encode(source: CanvasImageSource, width: number, height: number, mirror: boolean): Promise<Blob> {
  const { sx, sy, sw, sh } = coverCrop(width, height)
  const size = photoSize(sw)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PostPhotoError('Could not process that photo.')
  ctx.imageSmoothingQuality = 'high'
  if (mirror) {
    // Save it the way the preview looked.
    ctx.translate(size.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, size.width, size.height)
  let blob = await toBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
  if (!blob) throw new PostPhotoError('Could not process that photo.')
  return blob
}

/** The current frame of the live camera; `mirror` saves it the way the preview showed it. */
export function photoFromVideo(video: HTMLVideoElement, mirror: boolean): Promise<Blob> {
  if (!video.videoWidth) throw new PostPhotoError('The camera is not ready yet.')
  return encode(video, video.videoWidth, video.videoHeight, mirror)
}

/** A photo picked or taken with the phone's own camera app. */
export async function photoFromFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new PostPhotoError('That file is not a photo.')
  let image: Awaited<ReturnType<typeof decodeImage>>
  try {
    image = await decodeImage(file)
  } catch {
    throw new PostPhotoError('Could not read that photo. Try a JPG or PNG.')
  }
  try {
    return await encode(image, image.width, image.height, false)
  } finally {
    if ('close' in image && typeof image.close === 'function') image.close()
  }
}
