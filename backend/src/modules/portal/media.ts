import { readFile } from 'node:fs/promises'
import { imageSize } from 'image-size'
import { parseFile } from 'music-metadata'
import { AppError, ErrorCode } from '../../shared/errors.js'

const MIN_AUDIO_MS = 30_000
const MAX_AUDIO_MS = 20 * 60_000
const MIN_MP3_BPS = 192_000

function reject(message: string): never {
  throw new AppError(400, ErrorCode.VALIDATION_ERROR, message, [{ path: 'file', message }])
}

async function header(path: string, bytes: number) {
  const file = await readFile(path)
  return file.subarray(0, bytes)
}

function isMp3(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  if (buf.length < 2 || buf[0] !== 0xff) return false
  return (buf[1]! & 0xe0) === 0xe0
}

function isWav(buf: Buffer) {
  return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE'
}

function isFlac(buf: Buffer) {
  return buf.length >= 4 && buf.toString('ascii', 0, 4) === 'fLaC'
}

export async function inspectAudio(path: string) {
  const buf = await header(path, 16)
  const kind = isWav(buf) ? 'wav' : isFlac(buf) ? 'flac' : isMp3(buf) ? 'mp3' : null
  if (!kind) reject('Audio must be a WAV, FLAC, or MP3 file. The file contents do not match those formats.')

  let durationMs = 0
  let bitrate = 0
  try {
    const parsed = await parseFile(path, { duration: true })
    durationMs = Math.round((parsed.format.duration ?? 0) * 1000)
    bitrate = parsed.format.bitrate ?? 0
  } catch {
    reject('This audio file is corrupted or incomplete and could not be read.')
  }

  if (durationMs < MIN_AUDIO_MS) reject('Each track must be at least 30 seconds long.')
  if (durationMs > MAX_AUDIO_MS) reject('Each track must be 20 minutes or shorter.')
  if (kind === 'mp3' && bitrate > 0 && bitrate < MIN_MP3_BPS) {
    reject('MP3 files must be at least 192 kbps.')
  }
  return { durationMs, kind }
}

export async function inspectImage(
  path: string,
  rules: { minEdge: number; square: boolean; label: string; maxBytes: number; size: number },
) {
  if (rules.size > rules.maxBytes) {
    reject(`${rules.label} must be at most ${Math.round(rules.maxBytes / (1024 * 1024))} MB.`)
  }
  const buf = await header(path, 16)
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const png = buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG'
  if (!jpeg && !png) reject(`${rules.label} must be a JPG or PNG file.`)

  let width = 0
  let height = 0
  try {
    const file = await readFile(path)
    const size = imageSize(file)
    width = size.width ?? 0
    height = size.height ?? 0
  } catch {
    reject(`${rules.label} could not be read. Use a JPG or PNG.`)
  }
  if (rules.square && width !== height) {
    reject(`${rules.label} must be square. Crop it before uploading.`)
  }
  if (width < rules.minEdge || height < rules.minEdge) {
    reject(`${rules.label} must be at least ${rules.minEdge} × ${rules.minEdge} pixels.`)
  }
  return { width, height }
}
