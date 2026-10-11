import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { authApi } from '../api/auth.js'
import { apiMessage } from '../api/errors.js'
import { portalApi } from '../api/portal.js'
import { useAuth } from '../context/AuthContext.jsx'

export const Statistics = () => {
  const [days, setDays] = useState(28)
  const [data, setData] = useState(null)
  useEffect(() => {
    portalApi.stats(days).then(setData).catch((error) => toast.error(apiMessage(error)))
  }, [days])
  if (!data) return <p>Loading statistics…</p>
  const max = Math.max(1, ...data.series.map((row) => row.plays))
  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <select className="border rounded px-2 py-1" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={28}>28 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>
      <div className="flex items-end gap-1 h-32 bg-white border rounded p-3">
        {data.series.length === 0 ? <p className="text-sm text-gray-500">No plays in this range yet.</p> : data.series.map((row) => (
          <div key={row.day} className="bg-[#1db954] flex-1" style={{ height: `${(row.plays / max) * 100}%` }} title={`${row.plays} plays`} />
        ))}
      </div>
      <h2 className="font-semibold mt-6 mb-2">Top tracks</h2>
      <table className="w-full text-sm bg-white border">
        <thead><tr className="text-left"><th className="p-2">Track</th><th>Plays</th><th>Likes</th><th>Playlist adds</th></tr></thead>
        <tbody>
          {data.tracks.slice(0, 10).map((track) => (
            <tr key={track.id} className="border-t"><td className="p-2">{track.title}</td><td>{track.plays}</td><td>{track.likes}</td><td>{track.playlistAdds}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Notifications = () => {
  const [items, setItems] = useState([])
  const load = () => portalApi.notifications({ limit: 50 }).then((page) => setItems(page.items))
  useEffect(() => { load().catch((error) => toast.error(apiMessage(error))) }, [])
  return (
    <div className="max-w-2xl">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <button type="button" className="text-sm underline" onClick={() => portalApi.markRead().then(load)}>Mark all read</button>
      </div>
      {items.length === 0 ? <p className="text-sm text-gray-600">No notifications yet.</p> : items.map((item) => (
        <article key={item.id} className={`bg-white border rounded p-3 mb-2 ${item.isRead ? 'opacity-70' : ''}`}>
          <p className="text-sm">{item.message}</p>
          {item.reason ? <p className="text-sm mt-1">Reason: {item.reason}</p> : null}
          {item.hint ? <p className="text-sm">How to fix it: {item.hint}</p> : null}
        </article>
      ))}
    </div>
  )
}

export const Account = () => {
  const { user, logout, logoutAll, refreshUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [email, setEmail] = useState(user?.email || '')

  return (
    <div className="max-w-lg flex flex-col gap-6">
      <section className="bg-white border rounded p-4">
        <h1 className="text-xl font-semibold mb-2">Account</h1>
        <p className="text-sm">Signed in as {user?.email}</p>
        <p className="text-sm">Email {user?.emailVerifiedAt ? 'verified' : 'not verified yet'}</p>
        <div className="flex gap-3 mt-3 text-sm">
          <button type="button" className="underline" onClick={() => logout()}>Log out</button>
          <button type="button" className="underline" onClick={() => logoutAll()}>Log out of all devices</button>
        </div>
      </section>
      <form className="bg-white border rounded p-4 grid gap-2" onSubmit={async (event) => {
        event.preventDefault()
        try {
          await authApi.changePassword({ currentPassword, newPassword })
          toast.success('Password updated')
        } catch (error) {
          toast.error(apiMessage(error))
        }
      }}>
        <h2 className="font-semibold">Change password</h2>
        <input className="border rounded px-3 py-2" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <input className="border rounded px-3 py-2" type="password" placeholder="New password" minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        <button className="bg-black text-white py-2 rounded">Update password</button>
      </form>
      <form className="bg-white border rounded p-4 grid gap-2" onSubmit={async (event) => {
        event.preventDefault()
        try {
          await authApi.changeEmail({ email, currentPassword })
          await refreshUser()
          toast.success('Email updated. Verify the new address.')
        } catch (error) {
          toast.error(apiMessage(error))
        }
      }}>
        <h2 className="font-semibold">Change email</h2>
        <input className="border rounded px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <button className="bg-black text-white py-2 rounded">Update email</button>
      </form>
      <p className="text-sm text-gray-600">Payments and account deletion are not part of this version.</p>
    </div>
  )
}
