/** Lowercase URL segment: letters, numbers, and single hyphens. */
export function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'artist'
}

export const slugSchemaPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
