'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface LikeState {
  count: number
  liked: boolean
}

/** Stable per-browser voter id (anonymous likes; no login required). */
function voterId(): string {
  if (typeof window === 'undefined') return ''
  const KEY = 'fa-voter-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

async function fetchLikes(fixtureId: number): Promise<LikeState> {
  const res = await fetch(
    `/api/matches/${fixtureId}/likes?voterId=${encodeURIComponent(voterId())}`
  )
  const json = (await res.json().catch(() => ({}))) as { data?: LikeState }
  return json.data ?? { count: 0, liked: false }
}

/** Like count + this browser's like state for a match's report. */
export function useLikes(fixtureId: number, enabled = true) {
  return useQuery<LikeState>({
    queryKey: ['likes', fixtureId],
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 60 * 1000,
    queryFn: () => fetchLikes(fixtureId),
  })
}

/** Toggle the like; optimistic, reconciles with the server count. */
export function useToggleLike(fixtureId: number) {
  const qc = useQueryClient()
  const key = ['likes', fixtureId] as const
  return useMutation<LikeState, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/matches/${fixtureId}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId() }),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: LikeState }
      if (!res.ok || !json.data) throw new Error('like_failed')
      return json.data
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<LikeState>(key)
      if (prev) {
        qc.setQueryData<LikeState>(key, {
          liked: !prev.liked,
          count: prev.count + (prev.liked ? -1 : 1),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      const prev = (ctx as { prev?: LikeState } | undefined)?.prev
      if (prev) qc.setQueryData(key, prev)
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  })
}
