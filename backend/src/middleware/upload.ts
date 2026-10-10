import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import multer from 'multer'
import { AppError, ErrorCode } from '../shared/errors.js'
import { MAX_AUDIO_BYTES } from '../shared/temp-files.js'

const kindOf = (field: string) => (field === 'audio' ? 'audio' : 'image')

/**
 * Files land in the OS temp folder under random names; services delete them after upload.
 * The per-file limit is the audio limit; services check the smaller image limit.
 */
export const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, callback) =>
      callback(null, `${randomUUID()}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 2, fields: 20 },
  fileFilter: (_req, file, callback) => {
    const kind = kindOf(file.fieldname)
    if (!file.mimetype.startsWith(`${kind}/`)) {
      callback(
        new AppError(
          415,
          ErrorCode.UNSUPPORTED_MEDIA_TYPE,
          `${file.fieldname} must be an ${kind} file`,
        ),
      )
      return
    }
    callback(null, true)
  },
})
