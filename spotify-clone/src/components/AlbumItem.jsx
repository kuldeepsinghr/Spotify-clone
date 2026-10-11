import { useNavigate } from 'react-router-dom'

/* eslint-disable react/prop-types */
const AlbumItem = ({ image, name, desc, id }) => {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/album/${id}`)}
      className="w-[160px] shrink-0 p-3 rounded cursor-pointer hover:bg-[#ffffff26]"
    >
      <img src={image} alt="" className="aspect-square w-full rounded object-cover bg-[#282828]" />
      <p className="font-bold mt-2 mb-1 truncate">{name}</p>
      <p className="text-[#b3b3b3] text-sm truncate">{desc}</p>
    </div>
  )
}

export default AlbumItem
