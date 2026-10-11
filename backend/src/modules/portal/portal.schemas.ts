import { z } from 'zod'
import { pageQuerySchema } from '../../shared/pagination.js'
import { slugSchemaPattern } from '../../shared/slug.js'

const artistType = z.enum(['solo', 'band', 'duo', 'group', 'dj', 'orchestra', 'other'])
const linkPlatform = z.enum(['instagram', 'youtube', 'x', 'facebook', 'tiktok', 'soundcloud', 'website'])
const releaseType = z.enum(['single', 'ep', 'album', 'compilation'])
const creditRole = z.enum(['songwriter', 'composer', 'producer', 'other'])
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const profilePatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().min(2).max(60).regex(slugSchemaPattern).optional(),
  shortBio: z.string().trim().max(500).optional(),
  longBio: z.string().trim().max(3000).optional(),
  artistType: artistType.optional(),
  country: z.string().trim().length(2).optional(),
  city: z.string().trim().max(80).optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  yearFormed: z.number().int().min(1000).max(new Date().getFullYear()).nullable().optional(),
  genreIds: z.array(z.string().uuid()).max(3).optional(),
  links: z.array(z.object({ platform: linkPlatform, url: z.string().trim().max(300) })).max(7).optional(),
  members: z.array(z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().max(80) })).max(20).optional(),
  legalName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
  proofUrl: z.string().trim().url().max(500).nullable().optional(),
  management: z.string().trim().max(120).optional(),
  confirmSimilarName: z.boolean().optional(),
})

export const releaseWriteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: releaseType.optional(),
  description: z.string().trim().max(1000).optional(),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  releaseDate: date.optional(),
  label: z.string().trim().max(120).optional(),
  copyrightC: z.string().trim().max(160).optional(),
  copyrightP: z.string().trim().max(160).optional(),
  upc: z.string().trim().regex(/^\d{12,13}$/).nullable().optional(),
  primaryGenreId: z.string().uuid().nullable().optional(),
  secondaryGenreId: z.string().uuid().nullable().optional(),
  isCatalog: z.boolean().optional(),
  confirmDuplicate: z.boolean().optional(),
})

export const releaseUpdateSchema = releaseWriteSchema.partial().extend({
  title: z.string().trim().min(1).max(120).optional(),
})

export const releaseListSchema = pageQuerySchema.extend({
  status: z.enum(['draft', 'in_review', 'rejected', 'scheduled', 'published', 'taken_down']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
})

export const trackWriteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  explicit: z.enum(['true', 'false']).transform((value) => value === 'true'),
  language: z.string().trim().max(40).optional(),
  lyrics: z.string().max(20_000).optional(),
  isrc: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/)
    .nullable()
    .optional(),
  credits: z.string().optional(),
  featuredArtistIds: z.string().optional(),
})

export const trackPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  explicit: z.boolean().optional(),
  language: z.string().trim().max(40).optional(),
  lyrics: z.string().max(20_000).optional(),
  isrc: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/)
    .nullable()
    .optional(),
  credits: z.array(z.object({ personName: z.string().trim().min(1).max(80), role: creditRole })).optional(),
  featuredArtistIds: z.array(z.string().uuid()).optional(),
})

export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
export const submitReleaseSchema = z.object({ rights: z.literal(true) })
export const statsQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => value === 7 || value === 28 || value === 90).default(28),
})

export function parseJsonList<T>(raw: string | undefined, schema: z.ZodType<T>, path: string): T | undefined {
  if (!raw) return undefined
  try {
    return schema.parse(JSON.parse(raw))
  } catch {
    throw new Error(path)
  }
}
