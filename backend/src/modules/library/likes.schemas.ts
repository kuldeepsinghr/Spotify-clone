import { z } from 'zod'

export const MAX_CONTAINS_IDS = 50

/** `?ids=a,b,c`: up to 50 track IDs, duplicates removed. */
export const containsQuerySchema = z.object({
  ids: z
    .string()
    .transform((value) => [
      ...new Set(
        value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ])
    .pipe(z.array(z.string().uuid()).min(1).max(MAX_CONTAINS_IDS)),
})
