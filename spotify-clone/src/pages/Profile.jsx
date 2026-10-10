import { useAuth } from '../context/AuthContext.jsx'

const Profile = () => {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mt-10 max-w-lg">
      <p className="text-sm text-[#a7a7a7]">Account</p>
      <h1 className="text-4xl font-bold mt-2">{user.displayName}</h1>
      <dl className="mt-8 grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
        <dt className="text-[#a7a7a7]">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-[#a7a7a7]">Role</dt>
        <dd className="capitalize">{user.role}</dd>
        {user.artist ? (
          <>
            <dt className="text-[#a7a7a7]">Artist</dt>
            <dd>{user.artist.name}</dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}

export default Profile
