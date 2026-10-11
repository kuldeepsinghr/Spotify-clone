import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiMessage } from '../api/errors.js'
import { adminPortalApi } from '../api/portal.js'
import { Badge } from './ArtistStudio.jsx'

const REASONS = [
  ['incomplete', 'Incomplete information'],
  ['inappropriate', 'Name or images are not appropriate'],
  ['impersonation', 'Possible impersonation'],
  ['rights', 'Rights are not clear'],
  ['audio', 'Audio does not play correctly'],
  ['metadata', 'Metadata does not match the audio'],
  ['other', 'Other'],
]

const Decision = ({ onSubmit }) => {
  const [decision, setDecision] = useState('approved')
  const [reason, setReason] = useState('incomplete')
  const [hint, setHint] = useState('')
  return (
    <form className="bg-white border rounded p-4 grid gap-2 mt-4" onSubmit={async (event) => {
      event.preventDefault()
      try {
        await onSubmit({ decision, reason: decision === 'rejected' ? reason : undefined, hint: decision === 'rejected' ? hint : undefined })
        toast.success('Decision saved')
      } catch (error) {
        toast.error(apiMessage(error))
      }
    }}>
      <label className="text-sm"><input type="radio" checked={decision === 'approved'} onChange={() => setDecision('approved')} /> Approve</label>
      <label className="text-sm"><input type="radio" checked={decision === 'rejected'} onChange={() => setDecision('rejected')} /> Reject</label>
      {decision === 'rejected' && (
        <>
          <select className="border rounded px-2 py-2" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <textarea className="border rounded px-2 py-2" required placeholder="How should they fix it?" value={hint} onChange={(e) => setHint(e.target.value)} />
        </>
      )}
      <button className="bg-black text-white py-2 rounded">Save decision</button>
    </form>
  )
}
Decision.propTypes = { onSubmit: () => null }

export const AdminOverview = () => {
  const [data, setData] = useState(null)
  useEffect(() => { adminPortalApi.overview().then(setData).catch((error) => toast.error(apiMessage(error))) }, [])
  if (!data) return <p>Loading overview…</p>
  const cards = [
    ['Profiles waiting', data.pendingProfiles],
    ['Releases waiting', data.pendingReleases],
    ['New artists this week', data.newArtists],
    ['Open reports', data.openReports],
  ]
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Moderation</h1>
      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white border rounded p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-semibold">{value}</p></div>
        ))}
      </div>
    </div>
  )
}

export const ProfileQueue = () => {
  const [items, setItems] = useState([])
  useEffect(() => { adminPortalApi.profileQueue({ limit: 50 }).then((page) => setItems(page.items)).catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Artist profiles</h1>
      {items.length === 0 ? <p className="text-sm">The queue is empty.</p> : items.map((item) => (
        <Link key={item.id} to={`/admin/profiles/${item.id}`} className="bg-white border rounded p-3 mb-2 flex justify-between">
          <span>{item.name}</span><Badge status={item.status} />
        </Link>
      ))}
    </div>
  )
}

export const ProfileReview = () => {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  useEffect(() => { adminPortalApi.profile(id).then(setProfile).catch((error) => toast.error(apiMessage(error))) }, [id])
  if (!profile) return <p>Loading profile…</p>
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">{profile.name}</h1>
      <img alt="" src={profile.imageUrl || ''} className="w-32 h-32 rounded-full object-cover my-3 bg-gray-200" />
      <ul className="text-sm grid gap-1">
        <li>Bio: {profile.shortBio}</li>
        <li>Country: {profile.country}</li>
        <li>Legal name: {profile.private?.legalName}</li>
        <li>Contact: {profile.private?.contactEmail}</li>
        <li>Genres: {profile.genres.map((genre) => genre.name).join(', ')}</li>
      </ul>
      <Decision onSubmit={async (body) => { await adminPortalApi.decideProfile(id, body); setProfile(await adminPortalApi.profile(id)) }} />
    </div>
  )
}

export const ReleaseQueue = () => {
  const [items, setItems] = useState([])
  useEffect(() => { adminPortalApi.releaseQueue({ limit: 50 }).then((page) => setItems(page.items)).catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Releases in review</h1>
      {items.length === 0 ? <p className="text-sm">The queue is empty.</p> : items.map((item) => (
        <Link key={item.id} to={`/admin/releases/${item.id}`} className="bg-white border rounded p-3 mb-2 flex justify-between">
          <span>{item.title} · {item.artist?.name}</span><Badge status={item.status} />
        </Link>
      ))}
    </div>
  )
}

export const ReleaseReview = () => {
  const { id } = useParams()
  const [release, setRelease] = useState(null)
  useEffect(() => { adminPortalApi.release(id).then(setRelease).catch((error) => toast.error(apiMessage(error))) }, [id])
  if (!release) return <p>Loading release…</p>
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">{release.title}</h1>
      <p className="text-sm mb-2">{release.artist?.name} · rights {release.rightsConfirmed ? 'confirmed' : 'missing'}</p>
      {release.coverUrl ? <img alt="" src={release.coverUrl} className="w-48 h-48 object-cover" /> : null}
      <ul className="mt-3 text-sm">
        {release.tracks.map((track) => (
          <li key={track.id} className="py-2 border-b">
            {track.trackNumber}. {track.title}
            {track.audioUrl ? <audio className="block mt-1" controls src={track.audioUrl} /> : <span> (no audio yet)</span>}
          </li>
        ))}
      </ul>
      <Decision onSubmit={async (body) => { await adminPortalApi.decideRelease(id, body); setRelease(await adminPortalApi.release(id)) }} />
    </div>
  )
}

export const AdminArtists = () => {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [reason, setReason] = useState('Policy violation')
  const load = useCallback(() => adminPortalApi.artists({ params: q ? { q } : {}, limit: 40 }).then((page) => setItems(page.items)), [q])
  useEffect(() => { load().catch((error) => toast.error(apiMessage(error))) }, [load])
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-3">Artists</h1>
      <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); load() }}>
        <input className="border rounded px-3 py-2 flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
        <button className="border px-3 rounded">Search</button>
      </form>
      {items.map((artist) => (
        <div key={artist.id} className="bg-white border rounded p-3 mb-2 flex flex-wrap gap-2 items-center justify-between">
          <span>{artist.name} <Badge status={artist.status} /> {artist.verified ? 'Verified' : ''}</span>
          <span className="flex gap-2 text-sm">
            <button type="button" onClick={() => adminPortalApi.setVerified(artist.id, !artist.verified).then(load)}>Toggle verified</button>
            <button type="button" onClick={() => adminPortalApi.suspend(artist.id, reason).then(load)}>Suspend</button>
            <button type="button" onClick={() => adminPortalApi.restoreArtist(artist.id, reason).then(load)}>Restore</button>
          </span>
        </div>
      ))}
      <input className="border rounded px-3 py-2 mt-2 w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
    </div>
  )
}

export const AdminContent = () => {
  const [items, setItems] = useState([])
  const [reason, setReason] = useState('Removed after review')
  const load = () => adminPortalApi.content({ limit: 40 }).then((page) => setItems(page.items))
  useEffect(() => { load().catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-3">Content</h1>
      {items.map((item) => (
        <div key={item.id} className="bg-white border rounded p-3 mb-2 flex justify-between gap-2">
          <span>{item.title} · {item.artist?.name} <Badge status={item.status} /></span>
          <span className="text-sm flex gap-2">
            <button type="button" onClick={() => adminPortalApi.takedown(item.id, reason).then(load)}>Take down</button>
            <button type="button" onClick={() => adminPortalApi.restoreRelease(item.id, reason).then(load)}>Restore</button>
          </span>
        </div>
      ))}
      <input className="border rounded px-3 py-2 w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
    </div>
  )
}

export const AdminGenres = () => {
  const [genres, setGenres] = useState([])
  const [name, setName] = useState('')
  const load = () => adminPortalApi.genres().then(setGenres)
  useEffect(() => { load().catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-3">Genres</h1>
      <form className="flex gap-2 mb-3" onSubmit={async (e) => { e.preventDefault(); await adminPortalApi.createGenre(name); setName(''); load() }}>
        <input className="border rounded px-3 py-2 flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="New genre" />
        <button className="bg-black text-white px-3 rounded">Add</button>
      </form>
      {genres.map((genre) => (
        <div key={genre.id} className="flex justify-between bg-white border rounded p-2 mb-2 text-sm">
          <span>{genre.name}</span>
          <button type="button" onClick={() => adminPortalApi.updateGenre(genre.id, { isActive: !genre.isActive }).then(load)}>{genre.isActive ? 'Deactivate' : 'Activate'}</button>
        </div>
      ))}
    </div>
  )
}

export const AdminReports = () => {
  const [items, setItems] = useState([])
  const load = () => adminPortalApi.reports({ limit: 50 }).then((page) => setItems(page.items))
  useEffect(() => { load().catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-3">Reports</h1>
      {items.length === 0 ? <p className="text-sm">No reports.</p> : items.map((item) => (
        <article key={item.id} className="bg-white border rounded p-3 mb-2 text-sm">
          <p>{item.subjectType} · {item.reason}</p>
          <p className="text-gray-500">From {item.reporter?.displayName} · {item.status}</p>
          <button type="button" className="underline mr-3" onClick={() => adminPortalApi.setReport(item.id, 'resolved').then(load)}>Resolve</button>
          <button type="button" className="underline" onClick={() => adminPortalApi.setReport(item.id, 'dismissed').then(load)}>Dismiss</button>
        </article>
      ))}
    </div>
  )
}

export const AdminAudit = () => {
  const [items, setItems] = useState([])
  useEffect(() => { adminPortalApi.audit({ limit: 80 }).then((page) => setItems(page.items)).catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-3">Audit log</h1>
      <table className="w-full text-sm bg-white border">
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{new Date(item.createdAt).toLocaleString()}</td>
              <td>{item.actor?.displayName || 'system'}</td>
              <td>{item.action}</td>
              <td>{item.subjectType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
