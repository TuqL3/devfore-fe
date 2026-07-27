import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import type { Level } from '@/lib/types'

/**
 * Levels come from the API — labels, hints and ordering are data, not constants
 * duplicated in the frontend. Cached indefinitely; they change about never.
 */
export function useLevels() {
  const { data } = useQuery({
    queryKey: ['levels'],
    queryFn: coursesApi.levels,
    staleTime: Infinity,
  })
  const levels = data ?? []
  return {
    levels,
    /** Falls back to the raw slug until the request lands. */
    label: (slug: string) => levels.find((l) => l.slug === slug)?.label ?? slug,
    rank: (slug: string) => levels.find((l) => l.slug === slug)?.rank ?? 1,
    steps: levels.length || 3,
  }
}

export type { Level }
