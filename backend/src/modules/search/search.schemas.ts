import { z } from 'zod'

export const SEARCH_TYPES = ['track', 'album', 'artist'] as const
export type SearchType = (typeof SEARCH_TYPES)[number]

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    type: z.enum(['all', ...SEARCH_TYPES]).default('all'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    cursor: z.string().min(1).max(200).optional(),
  })
  .refine((query) => !(query.cursor && query.type === 'all'), {
    message: 'cursor needs a single type; repeat the search with type=track, album or artist',
    path: ['cursor'],
  })

export type SearchQuery = z.infer<typeof searchQuerySchema>
