import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { adminApi } from '../api/admin.js'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'

const Users = () => {
  const [users, setUsers] = useState([])
  const [cursor, setCursor] = useState(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [applied, setApplied] = useState({ q: '', role: '' })
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState({})

  const load = useCallback(
    async (nextCursor) => {
      setLoading(true)
      try {
        const page = await adminApi.pageUsers({
          cursor: nextCursor,
          limit: 20,
          params: {
            ...(applied.q && { q: applied.q }),
            ...(applied.role && { role: applied.role }),
          },
        })
        setUsers((current) => (nextCursor ? [...current, ...page.items] : page.items))
        setCursor(page.nextCursor)
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load users'))
      } finally {
        setLoading(false)
      }
    },
    [applied],
  )

  useEffect(() => {
    catalogApi.listArtists().then(setArtists).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const draftOf = (user) =>
    drafts[user.id] ?? { role: user.role, artistId: user.artist?.id ?? '' }

  const saveRole = async (user) => {
    const draft = draftOf(user)
    try {
      const { data } = await adminApi.setRole(user.id, {
        role: draft.role,
        ...(draft.role === 'artist' && draft.artistId ? { artistId: draft.artistId } : {}),
      })
      setUsers((current) => current.map((item) => (item.id === user.id ? data.data : item)))
      toast.success('Role updated')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not change the role'))
    }
  }

  const toggleDisabled = async (user) => {
    const next = !user.isDisabled
    if (!window.confirm(next ? `Disable ${user.email}?` : `Enable ${user.email}?`)) return
    try {
      const { data } = await adminApi.setStatus(user.id, next)
      setUsers((current) => current.map((item) => (item.id === user.id ? data.data : item)))
      toast.success(next ? 'Account disabled' : 'Account enabled')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update the account'))
    }
  }

  return (
    <div>
      <p>Users</p>
      <form
        className="flex flex-wrap gap-3 mt-4 mb-4"
        onSubmit={(event) => {
          event.preventDefault()
          setApplied({ q, role })
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name"
          className="border border-gray-400 p-2 text-sm w-64"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-400 p-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="user">user</option>
          <option value="artist">artist</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="bg-black text-white px-4 py-2 text-sm">
          Search
        </button>
      </form>

      <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_1.4fr_1fr_0.8fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100">
        <b>Email</b>
        <b>Name</b>
        <b>Role</b>
        <b>Artist profile</b>
        <b></b>
        <b>Status</b>
      </div>

      {users.map((user) => {
        const draft = draftOf(user)
        return (
          <div
            key={user.id}
            className="grid sm:grid-cols-[1.5fr_1fr_1fr_1.4fr_1fr_0.8fr] items-center gap-2.5 p-3 text-sm border border-gray-300 mr-5"
          >
            <p>{user.email}</p>
            <p>{user.displayName}</p>
            <select
              value={draft.role}
              onChange={(e) =>
                setDrafts((current) => ({
                  ...current,
                  [user.id]: { ...draft, role: e.target.value },
                }))
              }
              className="border border-gray-400 p-1"
            >
              <option value="user">user</option>
              <option value="artist">artist</option>
              <option value="admin">admin</option>
            </select>
            {draft.role === 'artist' ? (
              <select
                value={draft.artistId}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [user.id]: { ...draft, artistId: e.target.value },
                  }))
                }
                className="border border-gray-400 p-1"
              >
                <option value="">New or existing profile</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            ) : (
              <p>{user.artist?.name ?? '—'}</p>
            )}
            <button type="button" onClick={() => saveRole(user)} className="underline text-left">
              Save role
            </button>
            <button type="button" onClick={() => toggleDisabled(user)} className="underline text-left">
              {user.isDisabled ? 'Enable' : 'Disable'}
            </button>
          </div>
        )
      })}

      {cursor ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => load(cursor)}
          className="mt-4 mr-5 border border-gray-400 px-4 py-2 text-sm"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

export default Users
