import { useEffect, useRef, useState } from 'react'
import { TOAST_EVENT } from './toast.js'

/* eslint-disable react/prop-types */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    const onToast = (event) => {
      setToast({ id: Date.now(), ...event.detail })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setToast(null), 3200)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      clearTimeout(timer.current)
    }
  }, [])

  return (
    <>
      {children}
      {toast ? (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed bottom-28 left-6 z-50 flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-bold text-black shadow-2xl"
        >
          {toast.imageUrl ? <img src={toast.imageUrl} alt="" className="h-10 w-10 object-cover" /> : null}
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  )
}
