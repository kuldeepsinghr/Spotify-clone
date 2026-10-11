import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Loading from './components/Loading'
import { useAuth } from './context/AuthContext.jsx'
import { ContentPolicy, ForgotPassword, Login, ResetPassword, Signup, Terms, VerifyEmail } from './pages/AuthPages'
import { Dashboard, Onboarding, ProfileEditor } from './pages/ArtistStudio'
import { ReleaseEditor, Releases } from './pages/Releases'
import { Account, Notifications, Statistics } from './pages/AccountPages'
import { AdminArtists, AdminAudit, AdminContent, AdminGenres, AdminOverview, AdminReports, ProfileQueue, ProfileReview, ReleaseQueue, ReleaseReview } from './pages/AdminPages'
import AddSong from './pages/AddSong'
import AddAlbum from './pages/AddAlbum'
import ListSong from './pages/ListSong'
import ListAlbum from './pages/ListAlbum'
import Users from './pages/Users'
import AccessDenied from './pages/AccessDenied'

const Shell = () => {
  const { isAdmin, isArtist, emailVerified } = useAuth()
  return (
    <div className="flex items-start min-h-screen">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-scroll bg-[#F3FFF7]">
        <Navbar />
        <div className="pt-24 px-6 pb-16">
          {isArtist && !emailVerified ? (
            <p className="mb-4 text-sm bg-amber-50 border border-amber-200 rounded p-3">
              Verify your email before editing. <Link className="underline" to="/verify-email">Open verification</Link>
            </p>
          ) : null}
          <Routes>
            <Route path="/" element={<Navigate to={isAdmin && !isArtist ? '/admin' : '/dashboard'} replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<ProfileEditor />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/releases/:id" element={<ReleaseEditor />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/account" element={<Account />} />
            {isAdmin ? (
              <>
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/profiles" element={<ProfileQueue />} />
                <Route path="/admin/profiles/:id" element={<ProfileReview />} />
                <Route path="/admin/releases" element={<ReleaseQueue />} />
                <Route path="/admin/releases/:id" element={<ReleaseReview />} />
                <Route path="/admin/artists" element={<AdminArtists />} />
                <Route path="/admin/content" element={<AdminContent />} />
                <Route path="/admin/genres" element={<AdminGenres />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/audit" element={<AdminAudit />} />
                <Route path="/users" element={<Users />} />
                <Route path="/add-song" element={<AddSong />} />
                <Route path="/list-song" element={<ListSong />} />
                <Route path="/add-album" element={<AddAlbum />} />
                <Route path="/list-album" element={<ListAlbum />} />
              </>
            ) : null}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

const App = () => {
  const { ready, signedIn, canPublish } = useAuth()

  return (
    <>
      {!ready ? <Loading /> : (
        <Routes>
          <Route path="/login" element={signedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={signedIn ? <Navigate to="/verify-email" replace /> : <Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/content-policy" element={<ContentPolicy />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/*" element={!signedIn ? <Navigate to="/login" replace /> : !canPublish ? <AccessDenied /> : <Shell />} />
        </Routes>
      )}
      <ToastContainer />
    </>
  )
}

export default App
