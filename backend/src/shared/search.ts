/** Escapes LIKE wildcards so user input matches literally inside `ILIKE '%' || q || '%'`. */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&')

export interface SearchWindow {
  query: string
  /** Rows to fetch; callers pass limit + 1 to detect another page. */
  take: number
  skip: number
}
