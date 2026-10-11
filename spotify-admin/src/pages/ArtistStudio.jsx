import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiMessage } from '../api/errors.js'
import { portalApi } from '../api/portal.js'
import { cropImage } from '../components/cropImage.js'

const field = 'border border-gray-300 rounded px-3 py-2 w-full'

const statusTone = {
  draft: 'bg-gray-200',
  pending_review: 'bg-amber-200',
  approved: 'bg-green-200',
  rejected: 'bg-red-200',
  suspended: 'bg-red-300',
  in_review: 'bg-amber-200',
  scheduled: 'bg-blue-200',
  published: 'bg-green-200',
  taken_down: 'bg-gray-300',
}

export const Badge = ({ status }) => (
  <span className={`text-xs px-2 py-1 rounded ${statusTone[status] || 'bg-gray-200'}`}>{String(status || '').replaceAll('_', ' ')}</span>
)
Badge.propTypes = { status: () => null }

export const Dashboard = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    portalApi.dashboard().then(setData).catch((err) => setError(apiMessage(err, 'Could not load the dashboard')))
  }, [])

  if (error) return <p className="text-red-700">{error}</p>
  if (!data) return <p>Loading your studio…</p>
  const profile = data.profile

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <section className="bg-white border rounded p-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{profile.name || 'Your artist profile'}</h1>
          <Badge status={profile.status} />
        </div>
        <p className="text-sm text-gray-600 mt-2">Profile {profile.completeness.percent}% complete</p>
        <div className="h-2 bg-gray-200 rounded mt-2"><div className="h-full bg-[#1db954] rounded" style={{ width: `${profile.completeness.percent}%` }} /></div>
        {profile.rejectionReason ? (
          <p className="mt-3 text-sm bg-red-50 border border-red-200 rounded p-3">
            Rejected: {profile.rejectionReason}. {profile.rejectionHint}
          </p>
        ) : null}
      </section>
      <section className="bg-white border rounded p-5">
        <h2 className="font-semibold mb-2">To do</h2>
        {data.todos.length === 0 ? <p className="text-sm text-gray-600">You are caught up.</p> : (
          <ul className="text-sm list-disc pl-5">
            {data.todos.map((item) => <li key={item.id}>{item.label}</li>)}
          </ul>
        )}
        <Link className="underline text-sm mt-3 inline-block" to="/onboarding">Continue profile</Link>
      </section>
      <section className="bg-white border rounded p-5">
        <div className="flex justify-between"><h2 className="font-semibold">Latest releases</h2><Link className="text-sm underline" to="/releases">View all</Link></div>
        {data.releases.length === 0 ? <p className="text-sm text-gray-600 mt-2">You have no releases yet.</p> : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.releases.map((release) => (
              <li key={release.id} className="flex justify-between text-sm">
                <Link className="underline" to={`/releases/${release.id}`}>{release.title}</Link>
                <Badge status={release.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="bg-white border rounded p-5">
        <h2 className="font-semibold mb-2">Notifications</h2>
        {data.notifications.length === 0 ? <p className="text-sm text-gray-600">No notifications yet.</p> : data.notifications.map((item) => (
          <p key={item.id} className="text-sm py-1">{item.message}</p>
        ))}
      </section>
    </div>
  )
}

export const Onboarding = () => {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState(null)
  const [reference, setReference] = useState({ genres: [], countries: [] })
  const [form, setForm] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    Promise.all([portalApi.profile(), portalApi.reference()]).then(([next, ref]) => {
      setProfile(next)
      setReference(ref)
      setForm({
        name: next.name,
        slug: next.slug,
        shortBio: next.shortBio,
        longBio: next.longBio,
        artistType: next.artistType,
        country: next.country,
        city: next.city,
        yearFormed: next.yearFormed || '',
        genreIds: next.genres.map((genre) => genre.id),
        legalName: next.private?.legalName || '',
        contactEmail: next.private?.contactEmail || '',
        phone: next.private?.phone || '',
        management: next.private?.management || '',
        links: next.links,
      })
    }).catch((error) => toast.error(apiMessage(error)))
  }, [])

  if (!form) return <p>Loading your draft…</p>

  const save = async () => {
    const saved = await portalApi.updateProfile({
      ...form,
      yearFormed: form.yearFormed ? Number(form.yearFormed) : null,
      links: form.links,
    })
    setProfile(saved)
    toast.success('Draft saved')
    return saved
  }

  const upload = async (event, kind) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const cropped = await cropImage(file, { square: kind !== 'banner', minEdge: kind === 'picture' ? 640 : 1000 })
      const saved = await portalApi.uploadMedia(cropped, kind, setProgress)
      setProfile(saved)
      setProgress(0)
    } catch (error) {
      toast.error(error instanceof Error && !error.response ? error.message : apiMessage(error, 'Upload failed'))
    }
  }

  const steps = ['Basics', 'Images', 'Bio', 'Links', 'Review']

  return (
    <div className="max-w-5xl grid md:grid-cols-[1fr_280px] gap-6">
      <div className="bg-white border rounded p-5">
        <div className="flex gap-2 mb-4 text-sm">
          {steps.map((label, index) => (
            <button key={label} type="button" className={`px-2 py-1 rounded ${index === step ? 'bg-[#003a10] text-white' : 'bg-gray-100'}`} onClick={() => setStep(index)}>{index + 1}. {label}</button>
          ))}
        </div>
        {step === 0 && (
          <div className="grid gap-3">
            <label className="text-sm">Artist name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="text-sm">Profile URL<input className={field} value={form.slug} disabled={profile.slugLocked} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></label>
            <label className="text-sm">Type
              <select className={field} value={form.artistType} onChange={(e) => setForm({ ...form, artistType: e.target.value })}>
                {['solo', 'band', 'duo', 'group', 'dj', 'orchestra', 'other'].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-sm">Country
              <select className={field} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                <option value="">Choose</option>
                {reference.countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
            <label className="text-sm">City<input className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label className="text-sm">Year started<input className={field} value={form.yearFormed} onChange={(e) => setForm({ ...form, yearFormed: e.target.value })} /></label>
            <fieldset>
              <legend className="text-sm mb-1">Genres (1 to 3)</legend>
              <div className="flex flex-wrap gap-2">
                {reference.genres.map((genre) => {
                  const on = form.genreIds.includes(genre.id)
                  return (
                    <button type="button" key={genre.id} className={`text-sm border rounded px-2 py-1 ${on ? 'bg-[#003a10] text-white' : ''}`} onClick={() => {
                      const genreIds = on ? form.genreIds.filter((id) => id !== genre.id) : [...form.genreIds, genre.id].slice(0, 3)
                      setForm({ ...form, genreIds })
                    }}>{genre.name}</button>
                  )
                })}
              </div>
            </fieldset>
            <label className="text-sm">Legal name<input className={field} value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></label>
            <label className="text-sm">Contact email<input className={field} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></label>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 text-sm">
            <label>Profile picture (square, at least 640)
              <input className="block mt-1" type="file" accept="image/jpeg,image/png" onChange={(e) => upload(e, 'picture')} />
            </label>
            {profile.imageUrl ? <img alt="" src={profile.imageUrl} className="w-32 h-32 rounded-full object-cover" /> : null}
            <label>Banner (wide)
              <input className="block mt-1" type="file" accept="image/jpeg,image/png" onChange={(e) => upload(e, 'banner')} />
            </label>
            {progress > 0 && progress < 1 ? <progress className="w-full" value={progress} max={1} /> : null}
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3">
            <label className="text-sm">Short bio (20 to 500)
              <textarea className={field} rows={4} maxLength={500} value={form.shortBio} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} />
            </label>
            <label className="text-sm">About
              <textarea className={field} rows={6} maxLength={3000} value={form.longBio} onChange={(e) => setForm({ ...form, longBio: e.target.value })} />
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-3 text-sm">
            {['instagram', 'youtube', 'x', 'facebook', 'tiktok', 'soundcloud', 'website'].map((platform) => (
              <label key={platform} className="capitalize">{platform}
                <input className={field} value={form.links.find((link) => link.platform === platform)?.url || ''} onChange={(e) => {
                  const links = form.links.filter((link) => link.platform !== platform)
                  if (e.target.value) links.push({ platform, url: e.target.value })
                  setForm({ ...form, links })
                }} placeholder="https://" />
              </label>
            ))}
            <label>Management or label<input className={field} value={form.management} onChange={(e) => setForm({ ...form, management: e.target.value })} /></label>
          </div>
        )}
        {step === 4 && (
          <div className="text-sm">
            <p className="mb-2">Completeness: {profile.completeness.percent}%</p>
            {profile.completeness.missing.length ? (
              <ul className="list-disc pl-5 mb-3">{profile.completeness.missing.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
            ) : <p className="mb-3">Required fields are ready.</p>}
            <button type="button" className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" disabled={profile.completeness.missing.length > 0} onClick={async () => {
              try {
                await save()
                const submitted = await portalApi.submitProfile()
                setProfile(submitted)
                toast.success('Submitted for review')
              } catch (error) {
                toast.error(apiMessage(error, 'Could not submit'))
              }
            }}>Submit for review</button>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button type="button" className="border px-4 py-2 rounded" onClick={() => save().catch((error) => toast.error(apiMessage(error)))}>Save draft</button>
          {step < 4 ? <button type="button" className="bg-[#003a10] text-white px-4 py-2 rounded" onClick={async () => { try { await save(); setStep(step + 1) } catch (error) { toast.error(apiMessage(error)) } }}>Next</button> : null}
        </div>
      </div>
      <aside className="bg-[#121212] text-white rounded p-4 h-fit">
        <p className="text-xs text-white/60 mb-2">Listener preview</p>
        <div className="h-16 bg-cover bg-center rounded" style={{ backgroundImage: profile.bannerImageUrl ? `url(${profile.bannerImageUrl})` : undefined, backgroundColor: '#333' }} />
        <img alt="" src={profile.imageUrl || ''} className="w-20 h-20 rounded-full object-cover -mt-8 border-2 border-black bg-gray-700" />
        <h2 className="text-xl font-bold mt-2">{form.name}</h2>
        <p className="text-sm text-white/70 mt-1">{form.shortBio}</p>
      </aside>
    </div>
  )
}

export const ProfileEditor = () => <Onboarding />
