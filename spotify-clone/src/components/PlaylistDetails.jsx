import { useEffect, useState } from 'react'
import { apiMessage } from '../api/errors.js'
import { libraryApi } from '../api/library.js'
import PlaylistArt from './PlaylistArt'

/* eslint-disable react/prop-types */
const PlaylistDetails = ({ playlist, images = [], onClose, onSaved }) => {
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description ?? '')
  const [isPublic, setIsPublic] = useState(Boolean(playlist.isPublic))
  const [cover, setCover] = useState(null)
  const [preview, setPreview] = useState(playlist.coverUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!cover) return undefined
    const url = URL.createObjectURL(cover)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [cover])

  const save = async (event) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setError('Give the playlist a name')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await libraryApi.updatePlaylist(
        playlist.id,
        { name: nextName, description: description.trim(), isPublic },
        cover,
      )
      onSaved(updated)
    } catch (err) {
      setError(apiMessage(err, 'Could not save the playlist'))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={save}
        className="w-full max-w-xl bg-[#282828] rounded-lg p-6 text-white"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit details</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[#b3b3b3] hover:text-white" aria-label="Close">
            ×
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="w-40 h-40 shrink-0 rounded bg-[#181818] flex items-center justify-center overflow-hidden cursor-pointer relative group">
            <PlaylistArt coverUrl={preview} images={images} className="w-full h-full" emptyClassName="text-4xl" />
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm font-bold">
              Choose photo
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setCover(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex-1 flex flex-col gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
              aria-label="Name"
              className="bg-[#3e3e3e] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-white"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Add an optional description"
              aria-label="Description"
              className="bg-[#3e3e3e] rounded px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-white"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Public playlist
            </label>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className="bg-white text-black font-bold rounded-full px-6 py-2 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PlaylistDetails
