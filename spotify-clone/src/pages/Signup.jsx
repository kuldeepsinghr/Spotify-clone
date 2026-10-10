import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'

const Signup = () => {
  const { signedIn, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (signedIn) return <Navigate to={from} replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register({ email, password, displayName })
      navigate(from, { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Could not create the account'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[#121212] rounded-lg p-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Sign up</h1>
        <p className="text-sm text-[#a7a7a7]">
          Password must be at least 10 characters and not built from your name or email.
        </p>
        {error ? <p className="text-red-400 text-sm">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            type="text"
            required
            minLength={1}
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-[#242424] rounded p-3 outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#242424] rounded p-3 outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#242424] rounded p-3 outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-60 text-black font-bold rounded-full py-3 mt-2"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-sm text-[#a7a7a7]">
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="text-white underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Signup
