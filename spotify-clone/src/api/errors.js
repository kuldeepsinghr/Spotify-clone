export function apiMessage(error, fallback = 'Something went wrong') {
  const message = error?.response?.data?.error?.message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0:00'
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
