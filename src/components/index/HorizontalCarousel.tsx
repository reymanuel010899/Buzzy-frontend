"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, MessageCircle, Eye } from "lucide-react"
import { Link } from "react-router-dom"
import { Video } from "./main.interface"
import { useUserVideos } from "../../hooks/useUserVideos"
import { getMediaUrl } from "../../redux/client/api-client"
import { prefetchAudioUrl } from "../../hooks/useVideoAudio"

const HINT_KEY = "buzzy_swipe_hint_seen"
const SWIPE_COMMIT = 60
const ANGLE_MAX = 40

interface SlideActionsProps {
  video: Video
  onLike: (uuid: string, id: number) => void
  onComment: (uuid: string, id: number) => void
  onGift: (id: number) => void
}

// Panel de acciones — copia exacta del video principal
function SlideActions({ video, onLike, onComment, onGift }: SlideActionsProps) {
  const [liked, setLiked] = useState(video.liked ?? false)
  const [likeCount, setLikeCount] = useState(video.like_count ?? 0)

  const handleLike = () => {
    setLiked(p => !p)
    setLikeCount(p => liked ? p - 1 : p + 1)
    onLike(video.uuid ?? String(video.id), video.id)
  }

  return (
    <div className="absolute right-1 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] flex flex-col items-center gap-3 z-[70] pointer-events-auto pb-[env(safe-area-inset-bottom)+50px]">

      {/* Like */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={handleLike} className="relative flex flex-col items-center gap-1">
        <motion.div
          animate={{ scale: liked ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className={`flex h-10 w-10 items-center justify-center rounded-full ${liked ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"}`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-red-900 text-red-500" : "text-white"}`} />
        </motion.div>
        <span className="text-xs text-white">{likeCount}</span>
      </motion.button>

      {/* Comment */}
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => onComment(video.uuid ?? String(video.id), video.id)} className="flex flex-col items-center relative">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full">
          <MessageCircle className="h-6 w-8" />
          {(video.comments_count || 0) > 0 && (
            <div className="absolute -top-1 -right-1 min-h-[8px] min-w-[8px] flex items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold px-1 shadow-cyan-500/40">
              {(video.comments_count ?? 0) > 9 ? "9+" : video.comments_count}
            </div>
          )}
        </div>
        <span className="text-xs mt-0.5 text-white">{video.comments_count || 0}</span>
      </motion.button>

      {/* Views */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center">
          <Eye className="h-7 w-8" />
        </div>
        <span className="text-xs">{video.view_acount || 0}</span>
      </div>

      {/* Gift — mismo SVG que el video principal */}
      <motion.button
        onClick={() => onGift(video.id)}
        className="flex flex-col items-center relative"
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.04, 1], rotate: [0, -4, 4, -4, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 12 }}
      >
        <div className="flex h-7 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/35 to-purple-500/25 backdrop-blur-md border border-pink-400/40 shadow-md">
          <svg width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox"><g id="Base"><g id="bottom"><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64"></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black"></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white"></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black"></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black"></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9"></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)"></path></g></g><g id="top"><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64"></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black"></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white"></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)"></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9"></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white"></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black"></path></g></g><defs><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse"><stop></stop><stop offset="1" stopOpacity="0"></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse"><stop stopColor="#FF879D"></stop><stop offset="0.326625" stopColor="#FF4F64"></stop><stop offset="1" stopColor="#E54659"></stop></linearGradient></defs></svg>
        </div>
        <span className="text-[10px] mt-0.5 text-pink-300/90 font-medium drop-shadow-md">Regalos</span>
      </motion.button>
    </div>
  )
}

interface Props {
  video: Video
  feedIndex: number
  isActive: boolean
  isMuted: boolean
  isExpanded: boolean
  feedScrollRef: React.RefObject<HTMLDivElement>
  onLike: (uuid: string, id: number) => void
  onComment: (uuid: string, id: number) => void
  onGift: (id: number) => void
  onSlideChange?: (index: number, total: number) => void
  children: React.ReactNode
}

const SlideVideo = React.memo(function SlideVideo({ video, isMuted, isVisible, isNear }: { video: Video; isMuted: boolean; isVisible: boolean; isNear: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const src = video.video?.startsWith("http") ? video.video : getMediaUrl(video.video)
  const thumb = video.thumbnail_url?.startsWith("http") ? video.thumbnail_url : getMediaUrl(video.thumbnail_url)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (isVisible) {
      el.volume = Math.min(Math.max(video.volume_original ?? 1.0, 0), 1)
      el.currentTime = 0
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [isVisible])

  // Audio track con cache, volumen y trim
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (!isVisible || !video.audio_track_url || isMuted) return

    const trackUrl = video.audio_track_url
    const volumeMusic = Math.min(Math.max(video.volume_music ?? 0.8, 0), 1)
    const trimStart = Math.max(0, video.audio_trim_start ?? 0)
    const trimEnd = typeof video.audio_trim_end === 'number' && isFinite(video.audio_trim_end)
      ? Math.max(trimStart, video.audio_trim_end) : null

    prefetchAudioUrl(trackUrl).then(blobUrl => {
      if (audioRef.current) return
      const audio = new Audio(blobUrl)
      audio.loop = false
      audio.volume = volumeMusic
      audio.currentTime = trimStart
      if (trimEnd) {
        audio.ontimeupdate = () => {
          if (audio.currentTime >= trimEnd) {
            audio.currentTime = trimStart
            audio.play().catch(() => {})
          }
        }
      } else {
        audio.loop = true
      }
      audio.play().catch(() => {})
      audioRef.current = audio
    }).catch(() => {})

    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [isVisible, video.audio_track_url, isMuted])

  if (video.media_type === "image")
    return <img src={isNear ? src : undefined} className="h-full w-full object-cover" alt="" />

  return (
    <video
      ref={ref}
      src={isNear ? src : undefined}
      poster={thumb}
      preload={isVisible ? "auto" : "none"}
      muted={isMuted}
      loop
      playsInline
      className="h-full w-full object-cover"
    />
  )
})

function SlideWithUI({ video: s, isMuted, isVisible, isNear, onLike, onComment, onGift }: {
  video: Video; isMuted: boolean; isVisible: boolean; isNear: boolean;
  onLike: (uuid: string, id: number) => void;
  onComment: (uuid: string, id: number) => void;
  onGift: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative h-full w-full bg-black">
      <SlideVideo video={s} isMuted={isMuted} isVisible={isVisible} isNear={isNear} />

      {/* Gradiente inferior */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Pill — arriba centro, abre descripción */}
      {s.description && (
        <div
          className={`absolute top-0 left-0 right-0 z-[60] flex justify-center pointer-events-auto cursor-pointer ${expanded ? 'invisible' : ''}`}
          style={{ paddingTop: 6, paddingBottom: 10 }}
          onClick={e => { e.stopPropagation(); setExpanded(true) }}
        >
          <div className="w-10 h-1.5 rounded-full bg-white/50" />
        </div>
      )}

      {/* Descripción expandida */}
      {s.description && expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-0 right-0 z-40 pointer-events-auto backdrop-blur-md bg-black/70 border-b border-white/10 px-3 pt-10 pb-3"
        >
          <div
            className="flex justify-center mb-3 py-2 cursor-pointer"
            onClick={e => { e.stopPropagation(); setExpanded(false) }}
          >
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
          <p className="text-[13px] text-white/95 leading-relaxed whitespace-pre-wrap">{s.description}</p>
        </motion.div>
      )}

      {/* Avatar + follow — arriba izquierda / derecha */}
      <div className="absolute top-2 left-3 right-3 z-50 flex items-center justify-between pointer-events-auto">
        <Link
          to={`/profile/${s.user_id.username}`}
          onClick={e => e.stopPropagation()}
          className="relative h-9 w-9 flex-shrink-0 block"
        >
          <img
            className="h-full w-full object-cover rounded-full border border-white/20"
            src={getMediaUrl(s.user_id.profile_picture)}
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${s.id}` }}
            alt={s.user_id.username}
            loading="lazy"
          />
        </Link>
      </div>

      {/* Footer — mute izquierda + música centrada + disco derecha */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] left-3 right-3 z-30 flex items-center justify-center pointer-events-auto">
        {s.audio_track_title && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 truncate">
              ♪ {s.audio_track_title}
            </span>
            {s.audio_track_artist && (
              <>
                <span className="text-white/30 text-[10px] shrink-0">·</span>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60 truncate">
                  {s.audio_track_artist}
                </span>
              </>
            )}
          </div>
        )}
        {s.audio_track_title && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute right-0 h-9 w-9 rounded-full overflow-hidden border-2 border-white/20 shadow-lg pointer-events-none"
          >
            {s.audio_track_cover ? (
              <img src={s.audio_track_cover} className="h-full w-full object-cover" alt="" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-[10px]">♪</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Panel de acciones */}
      <SlideActions video={s} onLike={onLike} onComment={onComment} onGift={onGift} />
    </div>
  )
}

function SwipeHint({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative flex flex-col items-center gap-4">
            <motion.div animate={{ x: [0, 55, 0] }}
              transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
              className="text-5xl">👆</motion.div>
            <p className="text-white font-semibold text-base text-center px-8 drop-shadow">
              Desliza para ver más videos de este usuario
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function HorizontalCarousel({ video, isActive, isMuted, isExpanded: _isExpanded, onLike, onComment, onGift, onSlideChange, children }: Props) {
  const { getFromCache, expandInBackground } = useUserVideos()

  // Cargar desde cache inmediatamente — sin esperar fetch
  const [userVideos, setUserVideos] = useState<Video[]>(() => getFromCache(video.user_id.username))
  const userVideosRef = useRef(userVideos)
  userVideosRef.current = userVideos

  const [slideIndex, setSlideIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [dragPct, setDragPct] = useState(0)
  const [dragging, setDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const directionRef = useRef<"h" | "v" | null>(null)
  const slideRef = useRef(slideIndex)
  slideRef.current = slideIndex

  // Slides actuales — slide 0 = video del feed, resto = del mismo usuario (sin duplicar el video principal)
  const slides = [video, ...userVideos.filter((v) => v.id !== video.id)]
  const slidesLenRef = useRef(slides.length)
  slidesLenRef.current = slides.length

  useEffect(() => {
    onSlideChange?.(slideIndex, slides.length)
  }, [slideIndex, slides.length])

  // Escuchar el evento global de cache — se dispara cuando prefetchBatch termina
  useEffect(() => {
    const handler = (e: Event) => {
      const { username } = (e as CustomEvent).detail
      if (username !== video.user_id.username) return
      setUserVideos([...getFromCache(username)])
    }
    window.addEventListener("buzzy:usercache", handler)
    return () => window.removeEventListener("buzzy:usercache", handler)
  }, [video.user_id.username, getFromCache])

  // Reset al cambiar video principal
  useEffect(() => {
    setSlideIndex(0)
    setDragPct(0)
    setDragging(false)
    setUserVideos(getFromCache(video.user_id.username))
  }, [video.id, video.user_id.username, getFromCache])

  // Hint primera vez
  useEffect(() => {
    if (!isActive || localStorage.getItem(HINT_KEY)) return
    const t = setTimeout(() => {
      setShowHint(true)
      setTimeout(() => { setShowHint(false); localStorage.setItem(HINT_KEY, "1") }, 3000)
    }, 900)
    return () => clearTimeout(t)
  }, [isActive])

  const commitSlide = useCallback((newIdx: number) => {
    const maxIdx = slidesLenRef.current - 1
    const clamped = Math.max(0, Math.min(newIdx, maxIdx))
    setSlideIndex(clamped)
    setDragPct(0)
    setDragging(false)
  }, [])

  // Touch handlers nativos — más fluidos que React synthetic events
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      directionRef.current = null
      setDragging(true)
      setDragPct(0)
    }

    const onMove = (e: TouchEvent) => {
      if (!touchStart.current) return
      const dx = e.touches[0].clientX - touchStart.current.x
      const dy = e.touches[0].clientY - touchStart.current.y

      if (directionRef.current === null) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 5) return
        const angle = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI))
        directionRef.current = angle > ANGLE_MAX ? "v" : "h"
      }

      if (directionRef.current === "v") return

      e.preventDefault()  // bloquear scroll vertical

      const w = el.offsetWidth
      let pct = (dx / w) * 100

      // Resistencia en extremos
      const atStart = slideRef.current === 0 && dx > 0
      const atEnd = slideRef.current === slidesLenRef.current - 1 && dx < 0
      if (atStart || atEnd) pct *= 0.12

      setDragPct(pct)
    }

    const onEnd = (e: TouchEvent) => {
      if (!touchStart.current) return
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      touchStart.current = null

      if (directionRef.current !== "h") {
        setDragging(false); setDragPct(0); directionRef.current = null; return
      }
      directionRef.current = null

      if (Math.abs(dx) >= SWIPE_COMMIT) {
        if (dx < 0) {
          // Swipe izquierda → siguiente
          const nextIdx = slideRef.current + 1
          commitSlide(nextIdx)
          // Al llegar al slide 1, expandir a 5 en background (el evento notifica cuando llega)
          if (nextIdx === 1) {
            const excludeIds = [video.id, ...userVideosRef.current.map(v => v.id)]
            expandInBackground(video.user_id.username, excludeIds)
          }
        } else {
          commitSlide(slideRef.current - 1)
        }
      } else {
        setDragPct(0); setDragging(false)
      }
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
    }
  }, [commitSlide, expandInBackground, video.id, video.user_id.username])

  // Extra slides (index >= 1) — slide 0 is always the main video fixed in place
  const extraSlides = slides.slice(1)
  const extraCount = extraSlides.length

  // Translate is in units of container width (100% = one full slide)
  // When on slide 0: translate = 0 (main video stays fixed)
  // When on slide N: translate = -N * 100%
  const baseTranslate = -(slideIndex * 100)
  const dragTranslate = dragPct
  const totalTranslate = baseTranslate + dragTranslate

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-t-xl rounded-b-none"
      style={{ contain: "layout style" }}
    >
      {/* Slide 0 — main video, always fixed at full size, never resizes */}
      <div className="absolute inset-0">
        {children}
      </div>

      {/* Extra slides overlay strip — only rendered if there are more slides */}
      {extraCount > 0 && (
        <div
          className="absolute inset-0 flex"
          style={{
            width: `${(extraCount + 1) * 100}%`,
            height: "100%",
            transform: `translateX(${totalTranslate / (extraCount + 1)}%)`,
            transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.33, 1, 0.68, 1)",
            willChange: "transform",
          }}
        >
          {/* Transparent spacer for slide 0 */}
          <div style={{ width: `${100 / (extraCount + 1)}%`, flexShrink: 0 }} />
          {extraSlides.map((s, i) => (
            <div
              key={s.id}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / (extraCount + 1)}%` }}
            >
              <SlideWithUI
                video={s}
                isMuted={isMuted}
                isVisible={isActive && slideIndex === i + 1}
                isNear={isActive && Math.abs(slideIndex - (i + 1)) <= 1}
                onLike={onLike}
                onComment={onComment}
                onGift={onGift}
              />
            </div>
          ))}
        </div>
      )}

      <SwipeHint show={showHint && isActive} />
    </div>
  )
}
