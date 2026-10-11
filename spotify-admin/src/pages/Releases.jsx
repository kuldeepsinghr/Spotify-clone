import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiDetails, apiMessage } from '../api/errors.js'
import { formatDuration } from '../api/errors.js'
import { portalApi } from '../api/portal.js'
import { cropImage } from '../components/cropImage.js'
import { Badge } from './ArtistStudio.jsx'

const field = 'border border-gray-300 rounded px-3 py-2 w-full text-sm'

export const Releases = () => {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    portalApi.releases({ params: { ...(status && { status }), ...(q && { q }) }, limit: 50 })
      .then((page) => setItems(page.items))
      .catch((err) => setError(apiMessage(err)))
  }, [status, q])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Releases</h1>
        <Link to="/releases/new" className="bg-black text-white px-4 py-2 rounded text-sm">New release</Link>
      </div>
      <div className="flex gap-2 mb-4">
        <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'in_review', 'rejected', 'scheduled', 'published', 'taken_down'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </select>
        <input className={field} placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load() }} />
      </div>
      {error ? <p className="text-red-700">{error}</p> : null}
      {items.length === 0 ? <p className="text-sm text-gray-600">You have no releases yet.</p> : (
        <div className="grid gap-3">
          {items.map((release) => (
            <Link key={release.id} to={`/releases/${release.id}`} className="bg-white border rounded p-3 flex gap-3 items-center">
              <img alt="" src={release.coverUrl || ''} className="w-14 h-14 bg-gray-200 object-cover" />
              <div className="flex-1">
                <p className="font-medium">{release.title}</p>
                <p className="text-xs text-gray-500">{release.type} · {release.tracks.length} tracks</p>
              </div>
              <Badge status={release.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export const ReleaseEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [tab, setTab] = useState('details')
  const [release, setRelease] = useState(null)
  const [genres, setGenres] = useState([])
  const [progress, setProgress] = useState(0)
  const [rights, setRights] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'single', description: '', releaseDate: '', label: '', copyrightC: '', copyrightP: '',
    primaryGenreId: '', bgColor: '#121212', isCatalog: false,
  })

  useEffect(() => {
    portalApi.reference().then((ref) => setGenres(ref.genres)).catch(() => {})
    if (!isNew) {
      portalApi.release(id).then((next) => {
        setRelease(next)
        setForm({
          title: next.title,
          type: next.type,
          description: next.description,
          releaseDate: next.releasedAt ? String(next.releasedAt).slice(0, 10) : '',
          label: next.label,
          copyrightC: next.copyrightC,
          copyrightP: next.copyrightP,
          primaryGenreId: next.primaryGenre?.id || '',
          bgColor: next.bgColor,
          isCatalog: next.isCatalog,
        })
        setRights(Boolean(next.rightsConfirmedAt))
      }).catch((error) => toast.error(apiMessage(error)))
    }
  }, [id, isNew])

  const save = async () => {
    const body = { ...form, primaryGenreId: form.primaryGenreId || null }
    const next = isNew ? await portalApi.createRelease(body) : await portalApi.updateRelease(id, body)
    if (isNew) navigate(`/releases/${next.id}`, { replace: true })
    else setRelease(next)
    toast.success('Saved')
    return next
  }

  const uploadAudio = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !release) return
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120)
    try {
      const next = await portalApi.addTrack(release.id, file, { title, explicit: 'false' }, setProgress)
      setRelease(next)
      setProgress(0)
    } catch (error) {
      toast.error(apiMessage(error, 'That audio file was rejected'))
      setProgress(0)
    }
  }

  if (!isNew && !release) return <p>Loading release…</p>

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-3">{form.title || 'New release'}</h1>
      {release ? <Badge status={release.status} /> : null}
      {release?.rejectionReason ? <p className="text-sm bg-red-50 border border-red-200 rounded p-3 my-3">{release.rejectionReason}. {release.rejectionHint}</p> : null}
      <div className="flex gap-2 my-4 text-sm">
        {['details', 'tracks', 'cover', 'rights'].map((name) => (
          <button key={name} type="button" className={`px-3 py-1 rounded capitalize ${tab === name ? 'bg-[#003a10] text-white' : 'bg-white border'}`} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>
      {tab === 'details' && (
        <div className="grid gap-3 bg-white border rounded p-4">
          <label className="text-sm">Title<input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="text-sm">Type
            <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['single', 'ep', 'album', 'compilation'].map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          {release ? <p className="text-xs text-gray-500">Suggested from track count: {release.suggestedType}</p> : null}
          <label className="text-sm">Release date<input className={field} type="date" value={form.releaseDate} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} /></label>
          <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.isCatalog} onChange={(e) => setForm({ ...form, isCatalog: e.target.checked })} /> This is an older catalog release</label>
          <label className="text-sm">Primary genre
            <select className={field} value={form.primaryGenreId} onChange={(e) => setForm({ ...form, primaryGenreId: e.target.value })}>
              <option value="">Choose</option>
              {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Label<input className={field} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
          <label className="text-sm">Composition copyright<input className={field} value={form.copyrightC} onChange={(e) => setForm({ ...form, copyrightC: e.target.value })} placeholder="2026 Your Name" /></label>
          <label className="text-sm">Recording copyright<input className={field} value={form.copyrightP} onChange={(e) => setForm({ ...form, copyrightP: e.target.value })} placeholder="2026 Your Name" /></label>
          <label className="text-sm">Description<textarea className={field} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="text-sm">Background colour<input className={field} value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} /></label>
          <button type="button" className="bg-black text-white px-4 py-2 rounded w-fit" onClick={() => save().catch((error) => toast.error(apiMessage(error)))}>Save details</button>
        </div>
      )}
      {tab === 'tracks' && release && (
        <div className="bg-white border rounded p-4">
          <label className="text-sm">Add audio (WAV, FLAC, or MP3, 30 seconds to 20 minutes, max 200 MB)
            <input className="block mt-1" type="file" accept="audio/*,.wav,.flac,.mp3" onChange={uploadAudio} />
          </label>
          {progress > 0 && progress < 1 ? <progress className="w-full mt-2" value={progress} /> : null}
          <ul className="mt-4 flex flex-col gap-2">
            {release.tracks.map((track, index) => (
              <li key={track.id} className="flex items-center gap-2 text-sm border rounded p-2">
                <span className="w-6">{index + 1}</span>
                <span className="flex-1">{track.title}</span>
                <span>{formatDuration(track.durationMs)}</span>
                <Badge status={track.processingStatus} />
                <button type="button" disabled={index === 0} onClick={async () => {
                  const ids = release.tracks.map((item) => item.id)
                  ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
                  setRelease(await portalApi.reorder(release.id, ids))
                }}>Up</button>
                <button type="button" onClick={async () => setRelease(await portalApi.removeTrack(release.id, track.id))}>Remove</button>
              </li>
            ))}
          </ul>
          {release.tracks.length === 0 ? <p className="text-sm text-gray-600 mt-3">No tracks yet. Drop an audio file to start.</p> : null}
        </div>
      )}
      {tab === 'cover' && release && (
        <div className="bg-white border rounded p-4 text-sm">
          <p className="mb-2">Square JPG or PNG, at least 1400 × 1400, up to 10 MB.</p>
          <input type="file" accept="image/jpeg,image/png" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            try {
              const cropped = await cropImage(file, { square: true, minEdge: 1400 })
              setRelease(await portalApi.uploadCover(release.id, cropped, setProgress))
              setProgress(0)
            } catch (error) {
              toast.error(error instanceof Error && !error.response ? error.message : apiMessage(error))
            }
          }} />
          {release.coverUrl ? <img alt="" src={release.coverUrl} className="w-48 h-48 object-cover mt-3" /> : null}
        </div>
      )}
      {tab === 'rights' && release && (
        <div className="bg-white border rounded p-4 text-sm">
          <label className="flex gap-2 items-start">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span>I own or control all rights to this content.</span>
          </label>
          <div className="flex gap-3 mt-4">
            <button type="button" className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" disabled={!rights} onClick={async () => {
              try {
                const body = { ...form, primaryGenreId: form.primaryGenreId || null }
                await portalApi.updateRelease(release.id, body)
                setRelease(await portalApi.submitRelease(release.id))
                toast.success('Submitted for review')
              } catch (error) {
                const missing = apiDetails(error).map((item) => item.message).filter(Boolean)
                toast.error(missing.length ? missing.join('. ') : apiMessage(error, 'This release is not ready'))
              }
            }}>Submit for review</button>
            {(release.status === 'published' || release.status === 'scheduled') && (
              <button type="button" className="border px-4 py-2 rounded" onClick={async () => {
                if (!window.confirm('Take this release down? Listeners will no longer be able to play it.')) return
                setRelease(await portalApi.unpublish(release.id))
              }}>Take down</button>
            )}
            {(release.status === 'draft' || release.status === 'rejected') && (
              <button type="button" className="border px-4 py-2 rounded" onClick={async () => {
                if (!window.confirm('Delete this draft and its files? This cannot be undone.')) return
                await portalApi.deleteRelease(release.id)
                navigate('/releases')
              }}>Delete draft</button>
            )}
          </div>
        </div>
      )}
      {tab !== 'details' && isNew ? <p className="text-sm">Save the details first, then add tracks and cover art.</p> : null}
    </div>
  )
}
