/** Parses the legacy "m:s" duration text ("3:5", "3:05", "12:30") into milliseconds. */
export function parseLegacyDuration(text: string): number | null {
  const match = /^(\d+):(\d{1,2})$/.exec(text.trim())
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (seconds >= 60) return null
  return (minutes * 60 + seconds) * 1000
}

/** Formats milliseconds as "m:ss", the shape the legacy front ends display. */
export function formatLegacyDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
