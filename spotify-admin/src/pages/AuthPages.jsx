import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { authApi } from '../api/auth.js'
import { apiMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'

const field = 'border border-gray-300 rounded px-3 py-2 outline-green-700'

const strength = (password) => {
  let score = 0
  if (password.length >= 10) score += 1
  if (password.length >= 14) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

const Card = ({ title, children }) => (
  <div className="min-h-screen bg-[#F3FFF7] flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8 shadow-sm">{title}
      {children}
    </div>
  </div>
)

export const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await login({ email, password })
      if (user.role !== 'admin' && user.role !== 'artist') {
        toast.error('This portal is for artists and admins')
        return
      }
      navigate('/dashboard')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not sign in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={<h1 className="text-2xl font-semibold text-[#003a10] mb-2">Artist portal</h1>}>
      <p className="text-sm text-gray-600 mb-4">Sign in with your artist or admin account.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm">Email
          <input className={`${field} w-full mt-1`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm">Password
          <input className={`${field} w-full mt-1`} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button disabled={busy} className="bg-black text-white py-2.5 rounded disabled:opacity-60">{busy ? 'Signing in…' : 'Log in'}</button>
      </form>
      <div className="flex justify-between text-sm mt-4">
        <Link className="underline" to="/signup">Create an artist account</Link>
        <Link className="underline" to="/forgot-password">Forgot password</Link>
      </div>
    </Card>
  )
}

export const Signup = () => {
  const { registerArtist } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', artistName: '', acceptTerms: false, confirmSimilarName: false,
  })
  const [busy, setBusy] = useState(false)
  const [similar, setSimilar] = useState([])
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const score = strength(form.password)

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await registerArtist({ ...form, acceptTerms: true })
      if (result.devVerificationUrl) sessionStorage.setItem('devVerificationUrl', result.devVerificationUrl)
      navigate('/verify-email')
    } catch (error) {
      const details = error?.response?.data?.error?.details
      if (Array.isArray(details?.similar)) setSimilar(details.similar)
      toast.error(apiMessage(error, 'Could not create the account'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={<h1 className="text-2xl font-semibold text-[#003a10] mb-2">Join as an artist</h1>}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm">Artist name
          <input className={`${field} w-full mt-1`} required minLength={2} maxLength={80} value={form.artistName} onChange={set('artistName')} />
        </label>
        <label className="text-sm">Email
          <input className={`${field} w-full mt-1`} type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="text-sm">Password
          <input className={`${field} w-full mt-1`} type="password" required minLength={10} value={form.password} onChange={set('password')} />
        </label>
        <div className="h-1.5 bg-gray-200 rounded overflow-hidden" aria-hidden>
          <div className="h-full bg-[#1db954]" style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <p className="text-xs text-gray-500">At least 10 characters. Avoid common passwords and your own name.</p>
        <label className="text-sm">Confirm password
          <input className={`${field} w-full mt-1`} type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} />
        </label>
        {similar.length > 0 && (
          <label className="text-sm flex gap-2 items-start">
            <input type="checkbox" checked={form.confirmSimilarName} onChange={set('confirmSimilarName')} />
            <span>I am not the same act as {similar.join(', ')}. Continue anyway.</span>
          </label>
        )}
        <label className="text-sm flex gap-2 items-start">
          <input type="checkbox" required checked={form.acceptTerms} onChange={set('acceptTerms')} />
          <span>I accept the <Link className="underline" to="/terms">Terms</Link> and the <Link className="underline" to="/content-policy">Content Policy</Link>.</span>
        </label>
        <button disabled={busy || !form.acceptTerms} className="bg-black text-white py-2.5 rounded disabled:opacity-60">{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <Link className="text-sm underline mt-4 inline-block" to="/login">Already have an account</Link>
    </Card>
  )
}

export const VerifyEmail = () => {
  const { emailVerified, refreshUser } = useAuth()
  const [params] = useSearchParams()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const token = params.get('token')
  const devUrl = sessionStorage.getItem('devVerificationUrl')

  const verify = async () => {
    setBusy(true)
    try {
      await authApi.verifyEmail(token)
      try {
        await refreshUser()
      } catch {
        setMessage('Email verified. Sign in to continue.')
        return
      }
      setMessage('Email verified. You can finish your profile.')
    } catch (error) {
      setMessage(apiMessage(error, 'That link is not valid'))
    } finally {
      setBusy(false)
    }
  }

  if (emailVerified) return <Navigate to="/onboarding" replace />

  return (
    <Card title={<h1 className="text-2xl font-semibold mb-2">Verify your email</h1>}>
      <p className="text-sm text-gray-600">The portal stays read-only until you confirm your email. Check your inbox, or the API log if email is not configured.</p>
      {devUrl ? <a className="text-sm underline break-all block mt-3" href={devUrl}>Open the development verification link</a> : null}
      {token ? <button type="button" disabled={busy} onClick={verify} className="mt-4 bg-black text-white px-4 py-2 rounded">Confirm this link</button> : null}
      <button
        type="button"
        className="mt-3 text-sm underline"
        onClick={() => authApi.resendVerification().then(() => toast.success('Verification email sent')).catch((error) => toast.error(apiMessage(error)))}
      >
        Resend email
      </button>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </Card>
  )
}

export const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <Card title={<h1 className="text-2xl font-semibold mb-2">Reset password</h1>}>
      {sent ? <p className="text-sm">If that email has an account, a reset link is on its way. It expires in 30 minutes.</p> : (
        <form className="flex flex-col gap-3" onSubmit={async (event) => {
          event.preventDefault()
          await authApi.forgotPassword(email)
          setSent(true)
        }}>
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <button className="bg-black text-white py-2 rounded">Send reset link</button>
        </form>
      )}
    </Card>
  )
}

export const ResetPassword = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  return (
    <Card title={<h1 className="text-2xl font-semibold mb-2">Choose a new password</h1>}>
      <form className="flex flex-col gap-3" onSubmit={async (event) => {
        event.preventDefault()
        try {
          await authApi.resetPassword({ token: params.get('token'), password })
          toast.success('Password updated. Sign in again.')
          navigate('/login')
        } catch (error) {
          toast.error(apiMessage(error, 'This reset link is not valid'))
        }
      }}>
        <input className={field} type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-black text-white py-2 rounded">Update password</button>
      </form>
    </Card>
  )
}

export const Terms = () => (
  <Card title={<h1 className="text-2xl font-semibold mb-3">Terms of Service</h1>}>
    <p className="text-sm text-gray-700">This is a learning project. You may only upload music you own or that you have a licence to share. Accounts can be suspended, and releases can be taken down, when content breaks the Content Policy.</p>
    <Link className="underline text-sm mt-4 inline-block" to="/signup">Back</Link>
  </Card>
)

export const ContentPolicy = () => (
  <Card title={<h1 className="text-2xl font-semibold mb-3">Content Policy</h1>}>
    <p className="text-sm text-gray-700">Do not upload commercial songs you do not own, impersonate another artist, or submit content that is illegal. Every release needs a rights declaration. Admins can reject or take down content and will tell you why.</p>
    <Link className="underline text-sm mt-4 inline-block" to="/signup">Back</Link>
  </Card>
)

Card.propTypes = { title: () => null, children: () => null }
