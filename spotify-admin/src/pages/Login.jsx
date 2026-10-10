import { useState } from 'react'
import { toast } from 'react-toastify'
import { apiMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'

const Login = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await login({ email, password })
      if (user.role !== 'admin' && user.role !== 'artist') {
        toast.error('This panel is for artists and admins')
      }
    } catch (error) {
      toast.error(apiMessage(error, 'Could not sign in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3FFF7] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-gray-200 rounded p-8 flex flex-col gap-4 shadow">
        <h1 className="text-2xl font-semibold text-[#003a10]">Admin panel</h1>
        <p className="text-sm text-gray-600">Sign in with an artist or admin account.</p>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-400 p-2.5 outline-green-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-400 p-2.5 outline-green-600"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-black text-white py-2.5 px-6 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

export default Login
