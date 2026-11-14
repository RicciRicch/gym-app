import { describe, expect, it } from 'vitest'
import { AVATAR_PX, avatarEdge, avatarPhotoPath, squareCrop } from './avatar'

describe('squareCrop', () => {
  it('centres a square in a landscape photo', () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 })
  })

  it('centres a square in a portrait photo', () => {
    expect(squareCrop(1080, 1920)).toEqual({ sx: 0, sy: 420, size: 1080 })
  })

  it('keeps a square photo whole', () => {
    expect(squareCrop(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 })
  })
})

describe('avatarEdge', () => {
  it('scales big photos down and never scales small ones up', () => {
    expect(avatarEdge(3000)).toBe(AVATAR_PX)
    expect(avatarEdge(120)).toBe(120)
  })
})

describe('avatarPhotoPath', () => {
  it('puts the file in the user folder with an extension for its type', () => {
    expect(avatarPhotoPath('u1', 'image/webp', 'abc')).toBe('u1/abc.webp')
    expect(avatarPhotoPath('u1', 'image/jpeg', 'abc')).toBe('u1/abc.jpg')
  })
})
