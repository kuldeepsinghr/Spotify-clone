/** Document shapes stored by the old Mongoose models (collections `albums` and `songs`). */
export interface LegacyAlbum {
  _id: string
  name: string
  desc: string
  bgColor: string
  image: string
}

export interface LegacySong {
  _id: string
  name: string
  desc: string
  /** Album name, not an ID. */
  album: string
  image: string
  file: string
  /** "m:s", seconds not zero-padded, for example "3:5". */
  duration: string
}

export interface LegacyExport {
  exportedAt: string
  source: string
  albums: LegacyAlbum[]
  songs: LegacySong[]
}
