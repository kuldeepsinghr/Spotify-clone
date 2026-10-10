/* eslint-disable react/prop-types */
const cellsFor = (images) => {
  if (images.length >= 4) return images.slice(0, 4)
  return [...images, ...images, ...images, ...images].slice(0, 4)
}

const PlaylistArt = ({ coverUrl, images = [], className = 'w-48 h-48', emptyClassName = 'text-5xl' }) => {
  const shared = `${className} overflow-hidden bg-[#282828]`
  if (coverUrl) {
    return <img src={coverUrl} alt="" className={`${shared} object-cover`} />
  }
  const art = images.filter(Boolean).slice(0, 4)
  if (art.length === 0) {
    return <div className={`${shared} flex items-center justify-center text-[#b3b3b3] ${emptyClassName}`}>♪</div>
  }
  if (art.length === 1) {
    return <img src={art[0]} alt="" className={`${shared} object-cover`} />
  }
  return (
    <div className={`${shared} grid grid-cols-2 grid-rows-2`}>
      {cellsFor(art).map((src, index) => (
        <img key={`${src}-${index}`} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  )
}

export default PlaylistArt
