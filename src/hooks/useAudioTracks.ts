import { useState, useEffect } from 'react'
import type { MusicTrack } from './useVideoAudio'
import { apiClient, getMediaUrl } from '../redux/client/api-client'

interface ApiTrack {
  id: number
  title: string
  artist: string
  cover_url: string | null
  audio_url: string
  duration: string
  duration_secs: number
  category: MusicTrack['category']
}

function toMusicTrack(t: ApiTrack): MusicTrack {
  return {
    id: String(t.id),
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    durationSecs: t.duration_secs,
    cover: getMediaUrl(t.cover_url),
    audio_url: t.audio_url.startsWith('http') ? t.audio_url : getMediaUrl(t.audio_url),
    category: t.category,
  }
}

export function useAudioTracks() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient
      .get<ApiTrack[]>('/api/audio-tracks/')
      .then(res => {
        if (!cancelled) setTracks(res.data.map(toMusicTrack))
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { tracks, loading, error }
}
