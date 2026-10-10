/** Mirrors the `Role` enum in schema.prisma; services use this instead of importing Prisma. */
export const ROLES = ['user', 'artist', 'admin'] as const
export type Role = (typeof ROLES)[number]

/** The signed-in user a request acts for. Loaded from the database on every request. */
export interface Actor {
  id: string
  role: Role
}

/** Who is looking: an actor, or null for a guest. */
export type Viewer = Actor | null
