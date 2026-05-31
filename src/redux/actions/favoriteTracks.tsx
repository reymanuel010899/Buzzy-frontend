import { apiClient } from "../client/api-client"
import type { MusicTrack } from "../../hooks/useVideoAudio"

export interface FavoriteTrackEntry {
  id: number
  track: MusicTrack & { id: string }
  created_at: string
}

export async function fetchFavoriteTracks(): Promise<string[]> {
  const res = await apiClient.get('/api/favorite-tracks/')
  return (res.data as FavoriteTrackEntry[]).map(f => String(f.track.id))
}

export async function toggleFavoriteTrack(trackId: string): Promise<boolean> {
  const res = await apiClient.post('/api/favorite-tracks/', { track_id: trackId })
  return res.data.favorited as boolean
}
