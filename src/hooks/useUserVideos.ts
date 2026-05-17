import { useCallback } from "react"
import { apiClient } from "../redux/client/api-client"
import { Video } from "../components/index/main.interface"

// Cache global: username -> videos ya cargados
const cache = new Map<string, Video[]>()
const expanding = new Set<string>()

// Evento global para notificar a los carruseles cuando el cache se actualiza
const CACHE_EVENT = "buzzy:usercache"
function notifyCache(username: string) {
  window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { username } }))
}

export function useUserVideos() {

  // Prefetch en batch — 1 solo request para todos los usuarios del feed
  const prefetchBatch = useCallback(async (
    entries: { username: string; excludeId: number }[]
  ): Promise<void> => {
    const toFetch = entries.filter(e => !cache.has(e.username))
    if (!toFetch.length) return

    try {
      const { data } = await apiClient.post("api/videos/user/prefetch/", {
        users: toFetch.map(e => ({ username: e.username, exclude_id: e.excludeId })),
        limit: 2,
      })
      for (const [username, videos] of Object.entries(data)) {
        cache.set(username, videos as Video[])
        notifyCache(username)  // avisar a los carruseles que hay datos nuevos
      }
    } catch {
      // silent
    }
  }, [])

  // Obtener videos del cache inmediatamente
  const getFromCache = useCallback((username: string): Video[] => {
    return cache.get(username) ?? []
  }, [])

  const hasCache = useCallback((username: string): boolean => {
    return cache.has(username)
  }, [])

  // Expandir a 5 videos en background (se llama en el primer swipe)
  const expandInBackground = useCallback((username: string, excludeIds: number[]): void => {
    if (expanding.has(username)) return
    const cached = cache.get(username) ?? []
    if (cached.length >= 5) return  // ya tiene suficientes
    expanding.add(username)

    const exclude = excludeIds.join(",")
    apiClient
      .get(`api/videos/user/${username}/?exclude=${exclude}&limit=5`)
      .then(({ data }) => {
        const results: Video[] = data.results ?? data
        const existingIds = new Set(cached.map(v => v.id))
        const merged = [...cached, ...results.filter(v => !existingIds.has(v.id))]
        cache.set(username, merged)
        notifyCache(username)  // avisar que hay más videos disponibles
      })
      .catch(() => {})
      .finally(() => expanding.delete(username))
  }, [])

  return { prefetchBatch, getFromCache, hasCache, expandInBackground }
}
