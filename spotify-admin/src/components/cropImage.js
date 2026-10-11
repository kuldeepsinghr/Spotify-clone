function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    image.src = url
  })
}

function renderCanvas(image, { sx, sy, sw, sh, width, height }) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Center-crops to a square or a wide banner, then scales the result to the
 * size the portal requires. Smaller photos are enlarged instead of rejected.
 */
export async function cropImage(file, { square = true, minEdge = 640 } = {}) {
  const image = await loadImage(file)
  if (!image.width || !image.height) throw new Error('Could not read that image')

  let canvas
  if (square) {
    const side = Math.min(image.width, image.height)
    const cap = Math.max(minEdge, 2000)
    const output = Math.min(Math.max(side, minEdge), cap)
    canvas = renderCanvas(image, {
      sx: (image.width - side) / 2,
      sy: (image.height - side) / 2,
      sw: side,
      sh: side,
      width: output,
      height: output,
    })
  } else {
    const ratio = 2.3
    const sourceWide = image.width / image.height >= ratio
    const sw = sourceWide ? image.height * ratio : image.width
    const sh = sourceWide ? image.height : image.width / ratio
    const minHeight = 1000
    const scale = Math.max(1, minHeight / sh, minEdge / sw)
    let width = sw * scale
    let height = sh * scale
    const maxWidth = 2660
    if (width > maxWidth) {
      height *= maxWidth / width
      width = maxWidth
    }
    canvas = renderCanvas(image, {
      sx: (image.width - sw) / 2,
      sy: (image.height - sh) / 2,
      sw,
      sh,
      width,
      height,
    })
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new Error('Could not prepare that image')
  return new File([blob], 'image.jpg', { type: 'image/jpeg' })
}
