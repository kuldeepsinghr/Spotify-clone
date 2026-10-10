const TOAST_EVENT = 'app-toast'

export function pushToast(message, track) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { message, imageUrl: track?.imageUrl || '' },
    }),
  )
}

export { TOAST_EVENT }
