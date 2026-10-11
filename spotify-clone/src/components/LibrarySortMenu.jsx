import { useEffect, useRef, useState } from 'react'

export const LIBRARY_SORTS = [
  { id: 'recents', label: 'Recents' },
  { id: 'recentlyAdded', label: 'Recently Added' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'creator', label: 'Creator' },
]

export const LIBRARY_VIEWS = [
  {
    id: 'compact',
    label: 'Compact list',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1 3.25h14v1.5H1v-1.5zm0 4h14v1.5H1v-1.5zm0 4h14v1.5H1v-1.5z" />
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
  {
    id: 'grid',
    label: 'Grid',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1.5 1.5h3.5v3.5H1.5V1.5zm4.75 0h3.5v3.5h-3.5V1.5zm4.75 0H14.5v3.5h-3.5V1.5zM1.5 6.25h3.5v3.5H1.5v-3.5zm4.75 0h3.5v3.5h-3.5v-3.5zm4.75 0H14.5v3.5h-3.5v-3.5zM1.5 11h3.5v3.5H1.5V11zm4.75 0h3.5v3.5h-3.5V11zm4.75 0H14.5v3.5h-3.5V11z" />
      </svg>
    ),
  },
  {
    id: 'gridLarge',
    label: 'Large grid',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1.5 1.5h5.75v5.75H1.5V1.5zm7.25 0H14.5v5.75H8.75V1.5zM1.5 8.75h5.75V14.5H1.5V8.75zm7.25 0H14.5V14.5H8.75V8.75z" />
      </svg>
    ),
  },
]

/* eslint-disable react/prop-types */
const LibrarySortMenu = ({ sort = 'recents', view = 'list', onSortChange, onViewChange }) => {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const sortLabel = LIBRARY_SORTS.find((item) => item.id === sort)?.label || 'Recents'
  const viewMeta = LIBRARY_VIEWS.find((item) => item.id === view) || LIBRARY_VIEWS[1]

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
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex items-center gap-1.5 text-sm text-[#b3b3b3] hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Sort and view options"
      >
        <span>{sortLabel}</span>
        <span className={open ? 'text-white' : ''}>{viewMeta.icon}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-8 z-40 w-56 rounded-md bg-[#282828] py-2 shadow-[0_16px_24px_rgba(0,0,0,0.5)]"
        >
          <p className="px-4 pb-2 pt-1 text-xs text-[#b3b3b3]">Sort by</p>
          {LIBRARY_SORTS.map((item) => {
            const selected = item.id === sort
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => onSortChange?.(item.id)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[#ffffff1a] ${
                  selected ? 'text-[#1ed760]' : 'text-white'
                }`}
              >
                <span>{item.label}</span>
                {selected ? <span aria-hidden>✓</span> : null}
              </button>
            )
          })}

          <div className="my-2 border-t border-[#ffffff1a]" />

          <p className="px-4 pb-2 pt-1 text-xs text-[#b3b3b3]">View as</p>
          <div className="flex items-center justify-between gap-1 px-3 pb-1">
            {LIBRARY_VIEWS.map((item) => {
              const selected = item.id === view
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => {
                    onViewChange?.(item.id)
                    setOpen(false)
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded ${
                    selected ? 'bg-[#ffffff1a] text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
                  }`}
                >
                  {item.icon}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default LibrarySortMenu
