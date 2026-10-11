export const REJECTION_REASONS = [
  { id: 'incomplete', label: 'Incomplete information' },
  { id: 'inappropriate', label: 'Name or images are not appropriate' },
  { id: 'impersonation', label: 'Possible impersonation' },
  { id: 'rights', label: 'Rights are not clear' },
  { id: 'audio', label: 'Audio does not play correctly' },
  { id: 'metadata', label: 'Metadata does not match the audio' },
  { id: 'other', label: 'Other' },
] as const

export type RejectionReasonId = (typeof REJECTION_REASONS)[number]['id']

export function rejectionLabel(id: string) {
  return REJECTION_REASONS.find((item) => item.id === id)?.label ?? id
}

const LINK_HOSTS: Record<string, string[]> = {
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
  x: ['x.com', 'twitter.com'],
  facebook: ['facebook.com'],
  tiktok: ['tiktok.com'],
  soundcloud: ['soundcloud.com'],
}

export function assertLinkUrl(platform: string, raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Enter a full URL starting with https://')
  }
  if (url.protocol !== 'https:') throw new Error('Links must use https://')
  if (platform === 'website') return url.toString()
  const hosts = LINK_HOSTS[platform]
  const host = url.hostname.replace(/^www\./, '')
  if (!hosts?.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new Error(`That URL is not a ${platform} address`)
  }
  return url.toString()
}

export const SENSITIVE_PROFILE_FIELDS = ['name', 'bio', 'longBio', 'imageUrl', 'bannerImageUrl'] as const
