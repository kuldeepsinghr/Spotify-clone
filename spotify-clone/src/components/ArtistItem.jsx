import { useNavigate } from 'react-router-dom'

// eslint-disable-next-line react/prop-types
const ArtistItem = ({ id, name, image, bio }) => {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/artist/${id}`)}
      className="min-w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]"
    >
      <img src={image} alt="" className="rounded-full w-[156px] h-[156px] object-cover bg-[#282828]" />
      <p className="font-bold mt-2 mb-1">{name}</p>
      <p className="text-slate-200 text-sm line-clamp-2">{bio || 'Artist'}</p>
    </div>
  )
}

export default ArtistItem
