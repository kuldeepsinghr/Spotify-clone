import { useEffect, useState } from 'react'

export const coverImages = (tracks) => {
  const seen = new Set()
  const images = []
  for (const track of tracks) {
    const url = track?.imageUrl
    if (!url || seen.has(url)) continue
    seen.add(url)
    images.push(url)
    if (images.length === 4) break
  }
  return images
}

const PALETTE = [
  '#e13300',
  '#1e3264',
  '#148a08',
  '#e8115b',
  '#8d67ab',
  '#0d73ec',
  '#bc5900',
  '#503750',
  '#ba5d07',
  '#2d46b9',
  '#d84000',
  '#056952',
]

/** Stable color so a playlist keeps the same tint across reloads. */
export const paletteColor = (seed) => {
  const text = seed || 'playlist'
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33 + text.charCodeAt(index)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

const sampleColor = (url) =>
  new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 24
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d', { willReadFrequently: true })
        context.drawImage(image, 0, 0, size, size)
        const { data } = context.getImageData(0, 0, size, size)
        let red = 0
        let green = 0
        let blue = 0
        let count = 0
        for (let index = 0; index < data.length; index += 4) {
          const max = Math.max(data[index], data[index + 1], data[index + 2])
          const min = Math.min(data[index], data[index + 1], data[index + 2])
          if (max < 28 || max - min < 16) continue
          red += data[index]
          green += data[index + 1]
          blue += data[index + 2]
          count += 1
        }
        if (!count) {
          resolve(null)
          return
        }
        const averageRed = red / count
        const averageGreen = green / count
        const averageBlue = blue / count
        const max = Math.max(averageRed, averageGreen, averageBlue)
        const min = Math.min(averageRed, averageGreen, averageBlue)
        if (max - min < 28) {
          resolve(null)
          return
        }
        const scale = 210 / Math.max(max, 1)
        const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)))
        resolve(`rgb(${clamp(averageRed * scale)}, ${clamp(averageGreen * scale)}, ${clamp(averageBlue * scale)})`)
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = url
  })

/** Artwork color when the image allows it, otherwise a palette color for this playlist. */
export const usePlaylistColor = (seed, imageUrl) => {
  const fallback = paletteColor(seed)
  const [color, setColor] = useState(fallback)

  useEffect(() => {
    setColor(fallback)
    if (!imageUrl) return undefined
    let cancelled = false
    sampleColor(imageUrl).then((next) => {
      if (!cancelled && next) setColor(next)
    })
    return () => {
      cancelled = true
    }
  }, [fallback, imageUrl])

  return color
}
