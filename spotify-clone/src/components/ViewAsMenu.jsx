import { useEffect, useRef, useState } from 'react'

const VIEWS = [
  {
    id: 'compact',
    label: 'Compact',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1 3h14v1.5H1V3zm0 4.25h14v1.5H1v-1.5zM1 11.5h14V13H1v-1.5z" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M2.5 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm3 .75h9v1.5h-9V3.75zM2.5 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm3 .75h9v1.5h-9V7.75zM2.5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm3 .75h9v1.5h-9v-1.5z" />
      </svg>
    ),
  },
]

/* eslint-disable react/prop-types */
const ViewAsMenu = ({ value = 'list', onChange }) => {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const current = VIEWS.find((view) => view.id === value) || VIEWS[1]

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative ml-auto" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex items-center gap-2 text-sm font-normal text-[#b3b3b3] hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{current.label}</span>
        {current.icon}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-8 z-30 w-44 rounded bg-[#282828] p-1 shadow-[0_16px_24px_rgba(0,0,0,0.5)]"
        >
          <p className="px-3 py-2 text-xs font-normal text-[#b3b3b3]">View as</p>
          {VIEWS.map((view) => {
            const selected = view.id === value
            return (
              <button
                key={view.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange?.(view.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm hover:bg-[#ffffff1a] ${
                  selected ? 'text-[#1ed760]' : 'text-white'
                }`}
              >
                <span className={selected ? 'text-[#1ed760]' : 'text-[#b3b3b3]'}>{view.icon}</span>
                <span className="flex-1 text-left">{view.label}</span>
                {selected ? <span className="text-[#1ed760]">✓</span> : <span className="w-3" />}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default ViewAsMenu
