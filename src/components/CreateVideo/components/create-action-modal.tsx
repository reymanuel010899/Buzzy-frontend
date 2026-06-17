"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Upload, Sparkles, Music, Wand2,
  Scissors, Type, Layers, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Play, Clock, Sliders,
  Image, Palette, Mic, Hash, ArrowLeft, Globe, Lock, Users, AtSign,
  Loader2, Check, Gem
} from "lucide-react"
import ImaginaAIModal from "./imagina-ai-modal"
import TextEditorOverlay, { type TextOverlayData } from "./text-editor-overlay"
import MusicSelectorModal, { type MusicSelectorResult } from "./MusicSelectorModal"
import VideoFilterPanel, { type VideoFilter } from "./VideoFilterPanel"
import AdjustmentsPanel, { type AdjustmentValues, DEFAULT_ADJUSTMENTS, adjustmentsToCss } from "./AdjustmentsPanel"
import StickerPanel, { type StickerItem, type StickerOverlayData } from "./StickerPanel"
import LayersPanel from "./LayersPanel"
import SpeedDurationPanel from "./SpeedDurationPanel"
import DirectorAIPanel, { type DirectorAIResult } from "./DirectorAIPanel"
import MixerPanel from "./MixerPanel"
import VolumePanel from "./VolumePanel"
import VoiceRecorderPanel from "./VoiceRecorderPanel"
import { apiClient } from "../../../redux/client/api-client"
import { pickMedia } from "../../../hooks/useMediaPicker"
import { processVideoWithText } from "../utils/processVideoWithText"
import { useVideoAudio, preloadTracks } from "../../../hooks/useVideoAudio"
import { useAudioTracks } from "../../../hooks/useAudioTracks"
import { generateAIAndWait } from "@/services/aiService"

interface CreateActionModalProps {
  isOpen: boolean
  onClose: () => void
}

const FRAME_COUNT = 10

const CreateActionModal: React.FC<CreateActionModalProps> = ({ isOpen, onClose }) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'effects' | 'audio'>('edit')
  const [progress, setProgress] = useState(0)
  const previewCurrentTimeRef = useRef(0)
  const overlayElsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  const updateOverlayVisibility = useCallback((currentTime: number) => {
    overlayElsRef.current.forEach((el) => {
      if (!el) return
      const s = parseFloat(el.dataset.start ?? '0')
      const e = parseFloat(el.dataset.end ?? '999999')
      const selected = el.dataset.selected === 'true'
      el.style.display = (selected || currentTime === 0 || (currentTime >= s && currentTime <= e)) ? '' : 'none'
    })
  }, [])
  const [currentStep, setCurrentStep] = useState<'edit' | 'publish' | 'share'>('edit')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'subscribers' | 'private'>('public')
  const [location] = useState('')
  // Mention suggestions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<{ id: number; username: string; profile_picture: string | null }[]>([])
  const [mentionLoading, setMentionLoading] = useState(false)
  // Hashtag suggestions
  const [hashtagQuery, setHashtagQuery] = useState<string | null>(null)
  const [hashtagResults, setHashtagResults] = useState<{ name: string; videos_count: number }[]>([])
  const [hashtagLoading, setHashtagLoading] = useState(false)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [socialNetworks, setSocialNetworks] = useState({
    instagram: false,
    tiktok: false,
    facebook: false
  })
  const [showImaginaAI, setShowImaginaAI] = useState(false)
  const [showMusicSelector, setShowMusicSelector] = useState(false)
  const [showMixerPanel, setShowMixerPanel] = useState(false)
  const [showVolumePanel, setShowVolumePanel] = useState(false)
  const [showVoicePanel, setShowVoicePanel] = useState(false)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null) // used in onApply of VoiceRecorderPanel
  void voiceBlob // reserved for audio mixing pipeline
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activeFilter, setActiveFilter] = useState<VideoFilter>({ id: "none", label: "Original", css: "none", thumbnail: "none" })
  const [filterStartTime, setFilterStartTime] = useState(0)
  const [filterEndTime, setFilterEndTime] = useState<number | null>(null)
  const [showAdjustments, setShowAdjustments] = useState(false)
  const [adjustments, setAdjustments] = useState<AdjustmentValues>(DEFAULT_ADJUSTMENTS)
  const [appliedMusic, setAppliedMusic] = useState<MusicSelectorResult | null>(null)

  // Text overlays
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [textOverlays, setTextOverlays] = useState<TextOverlayData[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)

  // Sticker overlays
  const [showStickerPanel, setShowStickerPanel] = useState(false)
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlayData[]>([])
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const [pendingStickerFiles, setPendingStickerFiles] = useState<{ id: string; file: File }[]>([])
  const [volumeSticker, setVolumeSticker] = useState(1.0)
  // Sync data-selected attr so updateOverlayVisibility sees current selection without re-render
  useEffect(() => {
    overlayElsRef.current.forEach((el, id) => {
      el.dataset.selected = (id === selectedTextId || id === selectedStickerId) ? 'true' : 'false'
    })
    // Re-run visibility with current time
    updateOverlayVisibility(previewCurrentTimeRef.current)
  }, [selectedTextId, selectedStickerId, updateOverlayVisibility])

  const stickerDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const stickerRotationRef = useRef<{ id: string; startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null)


  // Speed / Duration
  const [showSpeedPanel, setShowSpeedPanel] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Director IA
  const [showDirectorAI, setShowDirectorAI] = useState(false)
  const [isDirectorProcessing, setIsDirectorProcessing] = useState(false)
  const [directorProcessingProgress, setDirectorProcessingProgress] = useState(0)
  const [directorProcessingError, setDirectorProcessingError] = useState<string | null>(null)
  const [directorProcessingMessage, setDirectorProcessingMessage] = useState<string | null>(null)

  const beginDirectorProcessing = (message: string) => {
    setIsDirectorProcessing(true)
    setDirectorProcessingMessage(message)
    setDirectorProcessingProgress(0)
    setDirectorProcessingError(null)
  }

  const endDirectorProcessing = () => {
    setIsDirectorProcessing(false)
    setDirectorProcessingMessage(null)
    setDirectorProcessingProgress(0)
  }

  // Layers panel
  const [showLayersPanel, setShowLayersPanel] = useState(false)
  const [hiddenTextIds, setHiddenTextIds] = useState<Set<string>>(new Set())
  const [hiddenStickerIds, setHiddenStickerIds] = useState<Set<string>>(new Set())

  // Publish
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishStep, setPublishStep] = useState<'processing' | 'uploading' | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Trimmer state
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(1)
  const [frames, setFrames] = useState<string[]>([])
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimApplied, setTrimApplied] = useState(false)
  const [extractingFrames, setExtractingFrames] = useState(false)

  // Refs (declared before hooks that consume them)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)
  const draggingHandle = useRef<'start' | 'end' | null>(null)
  const trimStartRef = useRef(0)
  const trimEndRef = useRef(1)

  const audioControls = useVideoAudio({ videoRef })
  const { tracks: apiTracks } = useAudioTracks()

  const handlePickVideo = async () => {
    const picked = await pickMedia("video", 200)
    if (picked) setUploadFile(picked.file)
  }

  // const handleRecordVideo = async () => {
  //   const picked = await pickMedia("video", 200, "camera")
  //   if (picked) setUploadFile(picked.file)
  // }

  // Keep refs in sync
  useEffect(() => { trimStartRef.current = trimStart }, [trimStart])
  useEffect(() => { trimEndRef.current = trimEnd }, [trimEnd])

  useEffect(() => {
    if (uploadFile) {
      const objectUrl = URL.createObjectURL(uploadFile)
      setUploadPreview(objectUrl)
      return () => {
        URL.revokeObjectURL(objectUrl)
        setUploadPreview(null)
      }
    } else {
      setUploadPreview(null)
    }
  }, [uploadFile])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateProgress = () => {
      if (!video.duration) return
      // Enforce trim bounds when trim is applied
      if (trimApplied) {
        const startTime = trimStartRef.current * video.duration
        const endTime = trimEndRef.current * video.duration
        if (video.currentTime >= endTime) {
          video.currentTime = startTime
        }
      }
      setProgress((video.currentTime / video.duration) * 100)
      previewCurrentTimeRef.current = video.currentTime
      // Update sticker/text visibility directly without re-rendering
      updateOverlayVisibility(video.currentTime)
    }

    const onMeta = () => {
      // video.duration can be Infinity for some processed video formats — fallback to seeking
      if (isFinite(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration)
      } else {
        // Seek to end to force browser to determine duration
        video.currentTime = 1e9
      }
    }
    const onDurationChange = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration)
        video.currentTime = 0
      }
    }

    video.addEventListener('timeupdate', updateProgress)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('durationchange', onDurationChange)
    return () => {
      video.removeEventListener('timeupdate', updateProgress)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('durationchange', onDurationChange)
    }
  }, [uploadPreview, trimApplied, updateOverlayVisibility])

  // Extract frames using a hidden video element
  const extractFrames = useCallback(async (src: string, duration: number) => {
    setExtractingFrames(true)
    const tmpVideo = document.createElement('video')
    tmpVideo.src = src
    tmpVideo.muted = true
    tmpVideo.crossOrigin = 'anonymous'

    await new Promise<void>(resolve => {
      tmpVideo.onloadedmetadata = () => resolve()
      tmpVideo.load()
    })

    const canvas = document.createElement('canvas')
    canvas.width = 56
    canvas.height = 80
    const ctx = canvas.getContext('2d')!
    const extracted: string[] = []

    for (let i = 0; i < FRAME_COUNT; i++) {
      const time = (i / (FRAME_COUNT - 1)) * duration
      await new Promise<void>(resolve => {
        tmpVideo.currentTime = time
        const onSeeked = () => {
          ctx.drawImage(tmpVideo, 0, 0, canvas.width, canvas.height)
          extracted.push(canvas.toDataURL('image/jpeg', 0.6))
          tmpVideo.removeEventListener('seeked', onSeeked)
          resolve()
        }
        tmpVideo.addEventListener('seeked', onSeeked)
      })
    }

    tmpVideo.src = ''
    setFrames(extracted)
    setExtractingFrames(false)
  }, [])

  const openTrimmer = useCallback(() => {
    const video = videoRef.current
    if (!video || !uploadPreview) return
    const dur = video.duration || videoDuration
    if (dur > 0 && frames.length === 0) {
      extractFrames(uploadPreview, dur)
    }
    setShowTrimmer(true)
  }, [uploadPreview, videoDuration, frames.length, extractFrames])

  const applyTrim = () => {
    const video = videoRef.current
    if (video) {
      video.currentTime = trimStartRef.current * video.duration
    }
    setTrimApplied(true)
    setShowTrimmer(false)
  }

  const cancelTrim = () => {
    setShowTrimmer(false)
  }

  const resetTrim = () => {
    setTrimStart(0)
    setTrimEnd(1)
    setTrimApplied(false)
  }

  // Pointer drag handlers for filmstrip handles
  const getPositionFromPointer = (clientX: number) => {
    if (!filmstripRef.current) return 0
    const rect = filmstripRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const onHandlePointerDown = (e: React.PointerEvent, handle: 'start' | 'end') => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingHandle.current = handle
  }

  const onFilmstripPointerMove = (e: React.PointerEvent) => {
    if (!draggingHandle.current) return
    const pos = getPositionFromPointer(e.clientX)
    const MIN_GAP = 0.04
    if (draggingHandle.current === 'start') {
      setTrimStart(Math.min(pos, trimEndRef.current - MIN_GAP))
    } else {
      setTrimEnd(Math.max(pos, trimStartRef.current + MIN_GAP))
    }
  }

  const onFilmstripPointerUp = () => {
    draggingHandle.current = null
  }

  // ── Text overlay handlers ──────────────────────────────────────
  const handleAddTextOverlay = (overlay: TextOverlayData) => {
    setTextOverlays(prev => {
      const exists = prev.some(o => o.id === overlay.id)
      if (exists) return prev.map(o => o.id === overlay.id ? overlay : o)
      return [...prev, overlay]
    })
    setSelectedTextId(overlay.id)
    setEditingOverlayId(null)
  }

  const openEditOverlay = (overlay: TextOverlayData) => {
    setEditingOverlayId(overlay.id)
    setShowTextEditor(true)
  }

  const handleUpdateTextTiming = (id: string, start: number, end: number) => {
    setTextOverlays(prev => prev.map(o => o.id === id ? { ...o, startTime: start, endTime: end } : o))
  }

  const handleUpdateStickerTiming = (id: string, start: number, end: number) => {
    setStickerOverlays(prev => prev.map(s => s.id === id ? { ...s, startTime: start, endTime: end } : s))
  }

  // ── Publish ────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!uploadFile) return
    setIsPublishing(true)
    setPublishError(null)
    setProcessingProgress(0)
    try {
      let fileToUpload: Blob = uploadFile

      // Determine if any visual effect needs to be baked into the video
      const filterActive = activeFilter.id !== "none"
      const adjustmentsActive = Object.values(adjustments).some(v => v !== 0)
      const speedActive = playbackSpeed !== 1
      const hasEffects = textOverlays.length > 0 || stickerOverlays.length > 0 || filterActive || adjustmentsActive || speedActive

     
      if (hasEffects && videoContainerRef.current) {
        setPublishStep('processing')
        const rect = videoContainerRef.current.getBoundingClientRect()
     
        const filterCss = filterActive ? activeFilter.css : "none"
        const adjCss = adjustmentsActive ? adjustmentsToCss(adjustments) : "none"
        fileToUpload = await processVideoWithText(
          uploadFile,
          textOverlays,
          { width: rect.width, height: rect.height },
          (pct) => setProcessingProgress(pct),
          stickerOverlays,
          filterCss,
          adjCss,
          playbackSpeed,
          filterStartTime,
          filterEndTime ?? (videoDuration > 0 ? videoDuration : 100000),
          volumeSticker,
        )
        
      }

      setPublishStep('uploading')
      const audioData = audioControls.getExportData()
      const formData = new FormData()
      formData.append('video', fileToUpload, uploadFile.name)
      formData.append('description', description)
      if (location.trim()) formData.append('location', location.trim())
      if (audioData.audio_id && audioControls.selectedTrack) {
        formData.append('audio_id', audioData.audio_id)
        formData.append('audio_url', audioControls.selectedTrack.audio_url)
        formData.append('volume_original', String(audioData.volume_original))
        formData.append('volume_music', String(audioData.volume_music))
        formData.append('audio_title', audioControls.selectedTrack.title)
        formData.append('audio_artist', audioControls.selectedTrack.artist)
        formData.append('audio_cover', audioControls.selectedTrack.cover)
        formData.append('audio_trim_start', String(audioData.trim_start ?? 0))
        formData.append('audio_trim_end', String(audioData.trim_end ?? 0))
      }
      formData.append('privacy', privacy)
      // Sticker overlays: strip blob src before sending, upload files separately
      const stickerLayersClean = stickerOverlays.map(s =>
        (s.kind === "image" || s.kind === "video") ? { ...s, src: "" } : s
      )
      formData.append('sticker_layers', JSON.stringify(stickerLayersClean))
      for (const { id, file: sf } of pendingStickerFiles) {
        const ext = sf.name.split(".").pop() || "bin"
        formData.append('sticker_files', sf, `${id}__sticker.${ext}`)
      }
      await apiClient.post('api/videos/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      handleClose()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      // 401 is handled by the interceptor (redirects to login) — don't show an error here
      if (status === 401) return
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPublishError(msg || 'Error al publicar. Intenta de nuevo.')
    } finally {
      setIsPublishing(false)
      setPublishStep(null)
      setProcessingProgress(0)
    }
  }

  const handleTextPointerMove = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (!videoContainerRef.current) return
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    const rect = videoContainerRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100))
    setTextOverlays(prev => prev.map(o => o.id === id ? { ...o, x, y } : o))
  }

  // ── Sticker handlers ──────────────────────────────────────────────────────

  const handleAddSticker = (sticker: StickerItem) => {
    const video = videoRef.current
    const newSticker: StickerOverlayData = {
      id: `sticker-${Date.now()}`,
      stickerId: sticker.id,
      emoji: sticker.emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      startTime: 0,
      endTime: (video?.duration && isFinite(video.duration)) ? video.duration : (videoDuration || 10),
    }
    setStickerOverlays(prev => [...prev, newSticker])
    setSelectedStickerId(newSticker.id)
  }

  const handleStickerPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedStickerId(id)
    const overlay = stickerOverlays.find(s => s.id === id)
    if (!overlay) return
    stickerDragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: overlay.x, origY: overlay.y }
  }

  const handleStickerPointerMove = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (!stickerDragRef.current || stickerDragRef.current.id !== id) return
    if (!videoContainerRef.current) return
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    const rect = videoContainerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - stickerDragRef.current.startX) / rect.width) * 100
    const dy = ((e.clientY - stickerDragRef.current.startY) / rect.height) * 100
    const x = Math.max(5, Math.min(95, stickerDragRef.current.origX + dx))
    const y = Math.max(5, Math.min(95, stickerDragRef.current.origY + dy))
    setStickerOverlays(prev => prev.map(s => s.id === id ? { ...s, x, y } : s))
  }

  const handleStickerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    stickerDragRef.current = null
  }

  const handleStickerRotationDown = (e: React.PointerEvent<HTMLButtonElement>, sticker: StickerOverlayData) => {
    e.stopPropagation()
    e.preventDefault()
    if (!videoContainerRef.current) return
    const rect = videoContainerRef.current.getBoundingClientRect()
    const centerX = rect.left + (sticker.x / 100) * rect.width
    const centerY = rect.top + (sticker.y / 100) * rect.height
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    stickerRotationRef.current = { id: sticker.id, startAngle, startRotation: sticker.rotation, centerX, centerY }
    stickerDragRef.current = null
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleStickerRotationMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!stickerRotationRef.current) return
    const { id, startAngle, startRotation, centerX, centerY } = stickerRotationRef.current
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    const rotation = startRotation + (currentAngle - startAngle)
    setStickerOverlays(prev => prev.map(s => s.id === id ? { ...s, rotation } : s))
  }

  const handleStickerRotationUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    stickerRotationRef.current = null
  }

  const handleDeleteSticker = (id: string) => {
    setStickerOverlays(prev => prev.filter(s => s.id !== id))
    setPendingStickerFiles(prev => prev.filter(f => f.id !== id))
    if (selectedStickerId === id) setSelectedStickerId(null)
  }

  const handleAddImageSticker = (file: File) => {
    const src = URL.createObjectURL(file)
    const id = `sticker-${Date.now()}`
    const video = videoRef.current
    setPendingStickerFiles(prev => [...prev, { id, file }])
    setStickerOverlays(prev => [...prev, {
      id, stickerId: id, emoji: "", kind: "image", src,
      x: 50, y: 50, scale: 1, rotation: 0,
      startTime: 0,
      endTime: (video?.duration && isFinite(video.duration)) ? video.duration : (videoDuration || 10),
    }])
    setSelectedStickerId(id)
  }

  const handleAddVideoSticker = (file: File) => {
    const src = URL.createObjectURL(file)
    const id = `sticker-${Date.now()}`
    const video = videoRef.current
    setPendingStickerFiles(prev => [...prev, { id, file }])
    setStickerOverlays(prev => [...prev, {
      id, stickerId: id, emoji: "", kind: "video", src,
      x: 50, y: 50, scale: 1, rotation: 0,
      startTime: 0,
      endTime: (video?.duration && isFinite(video.duration)) ? video.duration : (videoDuration || 10),
    }])
    setSelectedStickerId(id)
  }

  // ── End sticker handlers ───────────────────────────────────────────────────

  // ── Layers handlers ────────────────────────────────────────────────────────

  const handleTextVisibilityChange = (id: string, visible: boolean) => {
    setHiddenTextIds(prev => {
      const next = new Set(prev)
      if (visible) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleStickerVisibilityChange = (id: string, visible: boolean) => {
    setHiddenStickerIds(prev => {
      const next = new Set(prev)
      if (visible) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleReorderTexts = (ids: string[]) => {
    setTextOverlays(prev => {
      const map = new Map(prev.map(o => [o.id, o]))
      return ids.map(id => map.get(id)).filter(Boolean) as typeof prev
    })
  }

  const handleReorderStickers = (ids: string[]) => {
    setStickerOverlays(prev => {
      const map = new Map(prev.map(o => [o.id, o]))
      return ids.map(id => map.get(id)).filter(Boolean) as typeof prev
    })
  }

  // ── End layers handlers ────────────────────────────────────────────────────

  const handleClose = () => {
    setUploadFile(null)
    setUploadPreview(null)
    setCurrentStep('edit')
    setDescription('')

    setMentionQuery(null)
    setMentionResults([])
    setHashtagQuery(null)
    setHashtagResults([])
    setSocialNetworks({ instagram: false, tiktok: false, facebook: false })
    setShowTrimmer(false)
    setFrames([])
    setTrimStart(0)
    setTrimEnd(1)
    setTrimApplied(false)
    setTextOverlays([])
    setSelectedTextId(null)
    setEditingOverlayId(null)
    setShowTextEditor(false)
    setStickerOverlays([])
    setSelectedStickerId(null)
    setPendingStickerFiles([])
    setShowStickerPanel(false)
    setShowLayersPanel(false)
    setShowSpeedPanel(false)
    setShowDirectorAI(false)
    setPlaybackSpeed(1)
    if (videoRef.current) videoRef.current.playbackRate = 1
    setHiddenTextIds(new Set())
    setHiddenStickerIds(new Set())
    endDirectorProcessing()
    setDirectorProcessingError(null)
    setPublishError(null)
    setIsPublishing(false)
    setPublishStep(null)
    setProcessingProgress(0)
    setShowMusicSelector(false)
    setAppliedMusic(null)
    audioControls.stopAll()
    audioControls.clearTrack()
    onClose()
  }

  const handleBack = () => {
    if (currentStep === 'share') {
      setCurrentStep('publish')
    } else if (currentStep === 'publish') {
      setCurrentStep('edit')
    } else {
      // Reset video and ALL editing state so the new video starts clean
      setUploadFile(null)
      setUploadPreview(null)
      setActiveFilter({ id: "none", label: "Original", css: "none", thumbnail: "none" })
      setFilterStartTime(0)
      setFilterEndTime(null)
      setAdjustments(DEFAULT_ADJUSTMENTS)
      setTextOverlays([])
      setSelectedTextId(null)
      setEditingOverlayId(null)
      setShowTextEditor(false)
      setStickerOverlays([])
      setSelectedStickerId(null)
      setPendingStickerFiles([])
      setShowStickerPanel(false)
      setShowLayersPanel(false)
      setShowSpeedPanel(false)
      setShowFilterPanel(false)
      setShowAdjustments(false)
      setShowDirectorAI(false)
      setPlaybackSpeed(1)
      if (videoRef.current) videoRef.current.playbackRate = 1
      setHiddenTextIds(new Set())
      setHiddenStickerIds(new Set())
      setShowTrimmer(false)
      setFrames([])
      setTrimStart(0)
      setTrimEnd(1)
      setTrimApplied(false)
      setAppliedMusic(null)
      audioControls.stopAll()
      audioControls.clearTrack()
      endDirectorProcessing()
      setDirectorProcessingError(null)
    }
  }

  // ── Description helpers ───────────────────────────────────────────────────

  const insertAtCursor = (insert: string) => {
    const el = descTextareaRef.current
    if (!el) { setDescription(d => d + insert); return }
    const start = el.selectionStart ?? description.length
    const end   = el.selectionEnd   ?? description.length
    const next  = description.slice(0, start) + insert + description.slice(end)
    setDescription(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + insert.length, start + insert.length)
    })
  }

  const handleDescriptionChange = (val: string) => {
    setDescription(val)
    const el = descTextareaRef.current
    const cursor = el?.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)

    const mentionMatch = textBefore.match(/@(\w*)$/)
    const hashtagMatch = textBefore.match(/#(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setHashtagQuery(null)
      setHashtagResults([])
    } else if (hashtagMatch) {
      setHashtagQuery(hashtagMatch[1])
      setMentionQuery(null)
      setMentionResults([])
    } else {
      setMentionQuery(null)
      setMentionResults([])
      setHashtagQuery(null)
      setHashtagResults([])
    }
  }

  const pickHashtag = (name: string) => {
    const el = descTextareaRef.current
    const cursor = el?.selectionStart ?? description.length
    const textBefore = description.slice(0, cursor)
    const replaced = textBefore.replace(/#(\w*)$/, `#${name} `)
    setDescription(replaced + description.slice(cursor))
    setHashtagQuery(null)
    setHashtagResults([])
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(replaced.length, replaced.length) })
  }

  // Search users when mentionQuery changes
  useEffect(() => {
    if (mentionQuery === null) return
    if (mentionQuery.length === 0) { setMentionResults([]); return }
    setMentionLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/search/global/?q=${encodeURIComponent(mentionQuery)}`)
        setMentionResults((res.data.users ?? []).slice(0, 6))
      } catch { setMentionResults([]) }
      finally { setMentionLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [mentionQuery])

  // Search hashtags when hashtagQuery changes
  useEffect(() => {
    if (hashtagQuery === null) return
    setHashtagLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/hashtags/search/?q=${encodeURIComponent(hashtagQuery)}`)
        setHashtagResults(res.data ?? [])
      } catch { setHashtagResults([]) }
      finally { setHashtagLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [hashtagQuery])

  const pickMention = (username: string) => {
    const el = descTextareaRef.current
    const cursor = el?.selectionStart ?? description.length
    const textBefore = description.slice(0, cursor)
    const replaced = textBefore.replace(/@(\w*)$/, `@${username} `)
    setDescription(replaced + description.slice(cursor))
    setMentionQuery(null)
    setMentionResults([])
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(replaced.length, replaced.length) })
  }

  const handleNext = () => {
    if (currentStep === 'edit') {
      setCurrentStep('publish')
    } else if (currentStep === 'publish') {
      setCurrentStep('share')
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) videoRef.current.playbackRate = speed
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleSocialNetwork = (network: 'instagram' | 'tiktok' | 'facebook') => {
    setSocialNetworks(prev => ({
      ...prev,
      [network]: !prev[network]
    }))
  }

  // ── Director IA apply ─────────────────────────────────────────────────────
  const processDirectorVideo = async (
    textLayers: TextOverlayData[],
    stickerLayers: StickerOverlayData[],
    filterCss: string,
    adjustmentsCss: string,
    speed: number
  ) => {
    if (!uploadFile || !videoContainerRef.current) {
      setDirectorProcessingError("No se pudo actualizar el video automáticamente.")
      return
    }

    beginDirectorProcessing("Actualizando el video con las correcciones del Director IA")

    try {
      const rect = videoContainerRef.current.getBoundingClientRect()
      const blob = await processVideoWithText(
        uploadFile,
        textLayers,
        { width: rect.width, height: rect.height },
        (pct) => setDirectorProcessingProgress(pct),
        stickerLayers,
        filterCss,
        adjustmentsCss,
        speed,
      )
      const newFile = new File([blob], uploadFile.name, { type: blob.type })
      setUploadFile(newFile)
    } catch (err) {
      console.error("Director IA export failed:", err)
      setDirectorProcessingError("No se pudo generar el video mejorado automáticamente.")
    } finally {
      endDirectorProcessing()
    }
  }

  const captureVideoSnapshot = async (): Promise<File | null> => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return null
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        resolve(new File([blob], "reference.png", { type: blob.type || "image/png" }))
      }, "image/png")
    })
  }

  const handleDirectorPromptApply = async (prompt: string): Promise<string[]> => {
    if (!uploadFile) {
      throw new Error("Carga un video antes de usar el prompt.")
    }

    beginDirectorProcessing(`Aplicando prompt IA: "${prompt}"`)

    try {
      const durationSec = Math.max(6, Math.round(videoDuration) || 6)
      const referenceImage = await captureVideoSnapshot()
      const result = await generateAIAndWait(
        {
          prompt,
          type: "video",
          style: "cinematic",
          duration: durationSec,
          reference_image: referenceImage ?? undefined,
        },
        (status) => {
          if (status === "processing") {
            setDirectorProcessingProgress((prev) => Math.min(prev + 14, 92))
          } else if (status === "completed") {
            setDirectorProcessingProgress(100)
          }
        },
        5_000,
      )

      if (!result.media_url) {
        throw new Error("No se recibió la URL del video generado.")
      }

      const resp = await fetch(result.media_url)
      if (!resp.ok) {
        throw new Error("No se pudo descargar el video generado.")
      }

      const blob = await resp.blob()
      const newFile = new File([blob], uploadFile.name, { type: blob.type || "video/mp4" })
      setUploadFile(newFile)

      return [`Prompt IA aplicado: "${prompt}"`]
    } catch (err) {
      const message =
        (err as { message?: string })?.message ??
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo aplicar el prompt."
      setDirectorProcessingError(message)
      throw new Error(message)
    } finally {
      endDirectorProcessing()
    }
  }

  const handleDirectorAIApply = async (result: DirectorAIResult) => {
    setShowDirectorAI(false)

    const correctedTextOverlays = result.correctedTextOverlays ?? textOverlays
    const nextTextOverlays = [...correctedTextOverlays]
    if (result.caption) {
      nextTextOverlays.push(result.caption)
    }
    setTextOverlays(nextTextOverlays)
    setSelectedTextId(
      result.caption
        ? result.caption.id
        : nextTextOverlays.length
          ? nextTextOverlays[nextTextOverlays.length - 1].id
          : null
    )

    const correctedStickerOverlays = result.correctedStickerOverlays ?? stickerOverlays
    setStickerOverlays(correctedStickerOverlays)

    const newFilter = result.filter
    setActiveFilter(newFilter)
    setFilterStartTime(0)
    setFilterEndTime(null)

    setAdjustments(result.adjustments)

    setPlaybackSpeed(result.speed)
    if (videoRef.current) videoRef.current.playbackRate = result.speed

    await processDirectorVideo(
      nextTextOverlays,
      correctedStickerOverlays,
      newFilter.css,
      adjustmentsToCss(result.adjustments),
      result.speed,
    )
  }

  type ToolItem = { icon: React.ElementType; label: string; color: string; onClick?: () => void; disabled?: boolean }

  const editTools: ToolItem[] = [
    { icon: Scissors, label: 'Recortar', color: 'from-cyan-400 to-purple-600', onClick: openTrimmer },
    { icon: Type, label: 'Texto', color: 'from-orange-400 to-pink-400', onClick: () => setShowTextEditor(true) },
    { icon: Layers, label: 'Capas', color: 'from-pink-500 to-pink-400', onClick: () => { setShowLayersPanel(true); videoRef.current?.pause() } },
    { icon: Clock, label: 'Duración', color: 'from-blue-500 to-blue-400', onClick: () => setShowSpeedPanel(true) },
  ]

  const effectTools: ToolItem[] = [
    { icon: Sparkles, label: 'Filtros', color: 'from-violet-500 to-violet-400', onClick: () => setShowFilterPanel(true) },
    { icon: Palette, label: 'Ajustes', color: 'from-orange-500 to-pink-400', onClick: () => setShowAdjustments(true) },
    { icon: Wand2, label: 'IA', color: 'from-purple-500 to-pink-400', onClick: () => setShowDirectorAI(true), disabled: true },
    { icon: Image, label: 'Stickers', color: 'from-amber-500 to-orange-400', onClick: () => setShowStickerPanel(true) },
  ]

  const audioTools: ToolItem[] = [
    { icon: Music, label: 'Música', color: 'from-cyan-400 to-purple-600', onClick: () => { preloadTracks(apiTracks, 4); setShowMusicSelector(true) } },
    { icon: Mic, label: 'Voz', color: 'from-cyan-400 to-blue-500', onClick: () => setShowVoicePanel(true) },
    { icon: Sliders, label: 'Mezclar', color: 'from-cyan-400 to-purple-600', onClick: () => setShowMixerPanel(true) },
    { icon: Volume2, label: 'Volumen', color: 'from-blue-500 to-blue-400', onClick: () => setShowVolumePanel(true) },
  ]

  const getCurrentTools = () => {
    switch (activeTab) {
      case 'edit': return editTools
      case 'effects': return effectTools
      case 'audio': return audioTools
    }
  }

  const privacyOptions = [
    { value: 'public', icon: Globe, label: 'Público' },
    { value: 'followers', icon: Users, label: 'Seguidores' },
    { value: 'subscribers', icon: Gem, label: 'Suscriptores' },
    { value: 'private', icon: Lock, label: 'Privado' },
  ] as const

  const socialNetworksList = [
    {
      key: 'instagram' as const,
      name: 'Instagram',
      gradient: 'from-pink-500 via-purple-500 to-orange-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    },
    {
      key: 'tiktok' as const,
      name: 'TikTok',
      gradient: 'from-gray-900 to-gray-800',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      )
    },
    {
      key: 'facebook' as const,
      name: 'Facebook',
      gradient: 'from-blue-600 to-blue-500',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    }
  ]

  const getStepIndex = () => {
    switch (currentStep) {
      case 'edit': return 0
      case 'publish': return 1
      case 'share': return 2
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="create-action-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0a0a12]"
        >
          {!uploadFile || !uploadPreview ? (
            /* INITIAL VIEW - Upload */
            <div className="h-full flex flex-col">
              {/* Gradient Background */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-purple-600/20 via-blue-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-600/20 to-transparent rounded-full blur-3xl" />
              </div>

              {/* Top Bar */}
              <div className="relative z-10 flex items-center justify-between p-4 pt-12">
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  <X size={20} />
                </button>
                <h1 className="text-white font-bold text-lg">Crear</h1>
                <div className="w-9" />
              </div>

              {/* Main Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center w-full max-w-sm"
                >
                  <button type="button" onClick={handlePickVideo} className="block cursor-pointer group w-full text-center">
                    <div className="relative mx-auto w-32 h-32 mb-6">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 animate-spin-slow opacity-70 blur-sm"
                        style={{ animationDuration: '3s' }}
                      />
                      <div className="absolute inset-1 rounded-2xl bg-[#0a0a12]" />
                      <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-400/10 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 transition-all">
                        <Upload size={36} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
                      Subir <span className="bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Video</span>
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                      Comparte momentos únicos con Buzzy
                    </p>
                  </button>

                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePickVideo}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 text-white font-semibold cursor-pointer hover:shadow-lg hover:shadow-cyan-400/25 transition-all hover:scale-105 active:scale-95 text-sm"
                    >
                      <Upload size={18} />
                      Seleccionar Video
                    </button>
                    {/* <button
                      type="button"
                      onClick={handleRecordVideo}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-semibold cursor-pointer hover:bg-white/15 transition-all hover:scale-105 active:scale-95 text-sm"
                    >
                      <Camera size={18} />
                      Grabar Video
                    </button> */}
                  </div>
                </motion.div>
              </div>

              {/* AI Option */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 px-6 pb-8"
              >
                <button
                  onClick={() => setShowImaginaAI(true)}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Wand2 size={18} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">Generar con IA</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 text-[9px] font-bold text-white">
                          NUEVO
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">IMAGINA AI</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </button>
              </motion.div>
            </div>
          ) : (
            /* VIDEO EDITING/PUBLISH VIEW */
            <div className="h-full flex flex-col relative">
              {/* Video Container - Full Background */}
              <div
                ref={videoContainerRef}
                className="absolute inset-0 bg-black"
                onClick={() => setSelectedTextId(null)}
              >
                {uploadPreview && (
                  <video
                    ref={videoRef}
                    src={uploadPreview}
                    className="w-full h-full object-contain transition-[filter] duration-300"
                    style={{
                      filter: [
                        (activeFilter.css !== "none" && (!videoRef.current || (videoRef.current.currentTime >= filterStartTime && videoRef.current.currentTime <= (filterEndTime ?? Number.MAX_VALUE)))) ? activeFilter.css : "",
                        adjustmentsToCss(adjustments) !== "none" ? adjustmentsToCss(adjustments) : "",
                      ].filter(Boolean).join(" ") || undefined
                    }}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onClick={togglePlay}
                  />
                )}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0a0a12] to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0a0a12] to-transparent pointer-events-none" />

                {/* ── Text Overlays ── */}
                {textOverlays.map((overlay, index) => {
                  if (hiddenTextIds.has(overlay.id)) return null
                  const isSelected = selectedTextId === overlay.id
                  const tStart = overlay.startTime ?? 0
                  const tEnd = overlay.endTime ?? (videoDuration || 9999)
                  const isSolidDark = overlay.background === 'solid' && overlay.color === '#1C1C1E'
                  const textColor =
                    overlay.background === 'solid'
                      ? isSolidDark ? '#FFFFFF' : '#000000'
                      : overlay.color
                  return (
                    <div
                      key={overlay.id || `overlay-${index}`}
                      ref={(el) => {
                        if (el) overlayElsRef.current.set(overlay.id, el)
                        else overlayElsRef.current.delete(overlay.id)
                      }}
                      className="absolute cursor-move select-none touch-none z-20"
                      data-start={tStart}
                      data-end={tEnd}
                      data-selected={isSelected ? 'true' : 'false'}
                      style={{
                        left: `${overlay.x}%`,
                        top: `${overlay.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setSelectedTextId(overlay.id)
                      }}
                      onPointerMove={(e) => handleTextPointerMove(e, overlay.id)}
                      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
                      onDoubleClick={(e) => { e.stopPropagation(); openEditOverlay(overlay) }}
                    >
                      {isSelected && (
                        <button
                          className="absolute -top-6 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center z-30"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            setTextOverlays(prev => prev.filter(o => o.id !== overlay.id))
                            setSelectedTextId(null)
                          }}
                        >
                          <X size={10} className="text-white" />
                        </button>
                      )}
                      <p
                        style={{
                          color: textColor,
                          fontFamily: overlay.fontFamily,
                          fontWeight: overlay.fontWeight,
                          letterSpacing: overlay.letterSpacing,
                          fontSize: overlay.fontSize,
                          textAlign: overlay.align,
                          backgroundColor:
                            overlay.background === 'solid' ? overlay.color :
                              overlay.background === 'semi' ? `${overlay.color}40` :
                                'transparent',
                          padding: overlay.background !== 'none' ? '6px 14px' : '0',
                          borderRadius: overlay.background !== 'none' ? '8px' : '0',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '260px',
                          textShadow: overlay.background === 'none' ? '0 2px 6px rgba(0,0,0,0.9)' : 'none',
                          outline: isSelected ? '2px solid rgba(255,255,255,0.6)' : 'none',
                          outlineOffset: 4,
                        }}
                      >
                        {overlay.text}
                      </p>
                    </div>
                  )
                })}

                {/* ── Sticker Overlays ── */}
                {stickerOverlays.map((sticker) => {
                  if (hiddenStickerIds.has(sticker.id)) return null
                  const isSelected = selectedStickerId === sticker.id
                  return (
                    <div
                      key={sticker.id}
                      ref={(el) => {
                        if (el) overlayElsRef.current.set(sticker.id, el)
                        else overlayElsRef.current.delete(sticker.id)
                      }}
                      className="absolute cursor-move select-none touch-none z-20"
                      data-start={sticker.startTime}
                      data-end={sticker.endTime}
                      data-selected={isSelected ? 'true' : 'false'}
                      style={{
                        left: `${sticker.x}%`,
                        top: `${sticker.y}%`,
                        transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                      }}
                      onPointerDown={(e) => handleStickerPointerDown(e, sticker.id)}
                      onPointerMove={(e) => handleStickerPointerMove(e, sticker.id)}
                      onPointerUp={handleStickerPointerUp}
                      onClick={() => setSelectedStickerId(isSelected ? null : sticker.id)}
                    >
                      {/* Sticker content */}
                      {sticker.kind === "image" && sticker.src ? (
                        <img src={sticker.src} alt="Sticker" draggable={false}
                          className="select-none rounded-xl"
                          style={{ width: 88, height: "auto" }}
                        />
                      ) : sticker.kind === "video" && sticker.src ? (
                        <video src={sticker.src} autoPlay loop playsInline draggable={false}
                          className="select-none rounded-xl"
                          style={{ width: 88, height: "auto" }}
                        />
                      ) : (
                        <span className="text-4xl leading-none block select-none">{sticker.emoji}</span>
                      )}

                      {isSelected && (<>
                        {/* Selection ring */}
                        <div className="absolute inset-0 pointer-events-none rounded-xl"
                          style={{ margin: -3, border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />

                        {/* ✕ delete — top-left corner */}
                        <button
                          className="absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md"
                          style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); handleDeleteSticker(sticker.id) }}
                        >
                          <X size={11} className="text-white/80" />
                        </button>

                        {/* − scale — bottom-left corner */}
                        <button
                          className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md text-white/80 text-sm font-bold"
                          style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setStickerOverlays(prev => prev.map(s => s.id === sticker.id ? { ...s, scale: Math.max(0.2, +(s.scale * 0.85).toFixed(2)) } : s)) }}
                        >−</button>

                        {/* + scale — bottom-right corner */}
                        <button
                          className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md text-white/80 text-sm font-bold"
                          style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setStickerOverlays(prev => prev.map(s => s.id === sticker.id ? { ...s, scale: Math.min(5, +(s.scale * 1.15).toFixed(2)) } : s)) }}
                        >+</button>

                        {/* ↻ rotate — top-right corner, draggable */}
                        <button
                          className="absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md touch-none"
                          style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", border: "1px solid rgba(255,255,255,0.2)" }}
                          onPointerDown={(e) => handleStickerRotationDown(e, sticker)}
                          onPointerMove={handleStickerRotationMove}
                          onPointerUp={handleStickerRotationUp}
                        >
                          <span className="text-white text-[11px] font-bold leading-none">↻</span>
                        </button>
                      </>)}
                    </div>
                  )
                })}

                {/* ── Sticker Panel ── */}
                <StickerPanel
                  isOpen={showStickerPanel}
                  onClose={() => setShowStickerPanel(false)}
                  onSelectSticker={handleAddSticker}
                  onSelectImageFile={handleAddImageSticker}
                  onSelectVideoFile={handleAddVideoSticker}
                />

                {/* ── Layers Panel ── */}
                <LayersPanel
                  isOpen={showLayersPanel}
                  onClose={() => { setShowLayersPanel(false); videoRef.current?.play().catch(() => {}) }}
                  textOverlays={textOverlays}
                  stickerOverlays={stickerOverlays}
                  appliedMusic={appliedMusic}
                  activeFilter={activeFilter}
                  filterStartTime={filterStartTime}
                  filterEndTime={filterEndTime ?? (videoDuration > 0 ? videoDuration : 10)}
                  videoDuration={videoDuration}
                  onTextVisibilityChange={handleTextVisibilityChange}
                  onStickerVisibilityChange={handleStickerVisibilityChange}
                  onDeleteText={(id) => { setTextOverlays(prev => prev.filter(o => o.id !== id)); setSelectedTextId(null) }}
                  onDeleteSticker={(id) => { setStickerOverlays(prev => prev.filter(o => o.id !== id)); setSelectedStickerId(null) }}
                  onSelectText={(id) => { setSelectedTextId(id) }}
                  onSelectSticker={(id) => { setSelectedStickerId(id) }}
                  onReorderTexts={handleReorderTexts}
                  onReorderStickers={handleReorderStickers}
                  onUpdateTextTiming={handleUpdateTextTiming}
                  onUpdateStickerTiming={handleUpdateStickerTiming}
                  onUpdateFilterTiming={(start, end) => {
                    setFilterStartTime(start)
                    setFilterEndTime(end)
                  }}
                  onUpdateAudioTiming={(start, end) => {
                    setAppliedMusic(prev => prev ? { ...prev, trim_start: start, trim_end: end } : prev)
                    audioControls.setTrimWindow(start, end)
                  }}
                  onDeleteFilter={() => {
                    setActiveFilter({ id: 'none', label: 'Original', css: 'none', thumbnail: 'none' })
                    setFilterStartTime(0)
                    setFilterEndTime(null)
                  }}
                  onDeleteAudio={() => {
                    setAppliedMusic(null)
                    audioControls.clearTrack()
                  }}
                />

                {/* ── Speed / Duration Panel ── */}
                <SpeedDurationPanel
                  isOpen={showSpeedPanel}
                  onClose={() => setShowSpeedPanel(false)}
                  speed={playbackSpeed}
                  originalDuration={videoDuration}
                  onSpeedChange={handleSpeedChange}
                />

                {/* ── Director IA Panel ── */}
                <DirectorAIPanel
                  isOpen={showDirectorAI}
                  onClose={() => setShowDirectorAI(false)}
                  videoDuration={videoDuration}
                  videoSrc={uploadPreview}
                  textOverlays={textOverlays}
                  stickerOverlays={stickerOverlays}
                  onApplyPrompt={handleDirectorPromptApply}
                  onApply={handleDirectorAIApply}
                />
              </div>

              {/* Top Bar - Always visible */}
              <div className="relative z-10 flex items-center justify-between p-3 pt-10">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <button
                  onClick={() => { preloadTracks(apiTracks, 4); setShowMusicSelector(true) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md border transition-all ${appliedMusic
                      ? 'bg-gradient-to-r from-cyan-400/20 to-purple-600/20 border-cyan-400/50'
                      : 'bg-black/50 border-white/10'
                    }`}
                >
                  <Music size={14} className={appliedMusic ? 'text-cyan-400' : 'text-white/70'} />
                  <span className="text-white text-xs font-medium max-w-[100px] truncate">
                    {appliedMusic ? appliedMusic.track.title : 'Añadir Sonido'}
                  </span>
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>

              {/* Play/Pause Overlay */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    key="play-overlay"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                  >
                    <div className="w-14 h-14 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center">
                      <Play size={24} className="text-white ml-0.5" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showTextEditor && (
                <>
                  {/* Step Indicator */}
                  <div className="relative z-10 mt-auto mb-2 flex justify-center gap-2">
                    {[0, 1, 2].map((step) => (
                      <div
                        key={step}
                        className={`w-6 h-1 rounded-full transition-all ${getStepIndex() === step ? 'bg-cyan-400' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>

                  {/* Bottom Panel with Slide Animation */}
                  <div className="relative z-10 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {currentStep === 'edit' && (
                        <motion.div
                          key="edit"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -100, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="px-4 pb-6"
                        >
                          {/* Progress Bar / Trimmer toggle area */}
                          <AnimatePresence mode="wait">
                            {showTrimmer ? (
                              /* FILMSTRIP TRIMMER */
                              <motion.div
                                key="trimmer"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="mb-3"
                              >
                                {/* Time labels */}
                                <div className="flex justify-between mb-1">
                                  <span className="text-[10px] text-cyan-400 font-medium">
                                    {formatTime(trimStart * videoDuration)}
                                  </span>
                                  <span className="text-[10px] text-white/50 font-medium">
                                    Recortar video
                                  </span>
                                  <span className="text-[10px] text-cyan-400 font-medium">
                                    {formatTime(trimEnd * videoDuration)}
                                  </span>
                                </div>

                                {/* Filmstrip */}
                                <div
                                  ref={filmstripRef}
                                  className="relative h-12 rounded-lg overflow-hidden select-none touch-none"
                                  onPointerMove={onFilmstripPointerMove}
                                  onPointerUp={onFilmstripPointerUp}
                                  onPointerLeave={onFilmstripPointerUp}
                                >
                                  {/* Frames row */}
                                  <div className="absolute inset-0 flex">
                                    {extractingFrames
                                      ? Array.from({ length: FRAME_COUNT }).map((_, i) => (
                                        <div
                                          key={i}
                                          className="flex-1 bg-white/5 animate-pulse"
                                          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
                                        />
                                      ))
                                      : frames.map((src, i) => (
                                        <div
                                          key={i}
                                          className="flex-1 overflow-hidden"
                                          style={{ borderRight: '1px solid rgba(0,0,0,0.3)' }}
                                        >
                                          <img
                                            src={src}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                          />
                                        </div>
                                      ))
                                    }
                                  </div>

                                  {/* Left dark overlay */}
                                  <div
                                    className="absolute inset-y-0 left-0 bg-black/60 pointer-events-none"
                                    style={{ width: `${trimStart * 100}%` }}
                                  />

                                  {/* Right dark overlay */}
                                  <div
                                    className="absolute inset-y-0 right-0 bg-black/60 pointer-events-none"
                                    style={{ width: `${(1 - trimEnd) * 100}%` }}
                                  />

                                  {/* Selected range border */}
                                  <div
                                    className="absolute inset-y-0 border-2 border-cyan-400 rounded pointer-events-none"
                                    style={{
                                      left: `${trimStart * 100}%`,
                                      width: `${(trimEnd - trimStart) * 100}%`,
                                    }}
                                  />

                                  {/* Left handle */}
                                  <div
                                    className="absolute inset-y-0 flex items-center justify-center cursor-ew-resize z-10"
                                    style={{
                                      left: `calc(${trimStart * 100}% - 10px)`,
                                      width: 20,
                                    }}
                                    onPointerDown={(e) => onHandlePointerDown(e, 'start')}
                                  >
                                    <div className="w-4 h-full bg-cyan-400 rounded-l flex items-center justify-center">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                                        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right handle */}
                                  <div
                                    className="absolute inset-y-0 flex items-center justify-center cursor-ew-resize z-10"
                                    style={{
                                      left: `calc(${trimEnd * 100}% - 10px)`,
                                      width: 20,
                                    }}
                                    onPointerDown={(e) => onHandlePointerDown(e, 'end')}
                                  >
                                    <div className="w-4 h-full bg-cyan-400 rounded-r flex items-center justify-center">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                                        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Playhead */}
                                  <div
                                    className="absolute inset-y-0 w-0.5 bg-white/80 pointer-events-none z-20"
                                    style={{ left: `${progress}%` }}
                                  />
                                </div>

                                {/* Trim duration info */}
                                <div className="flex justify-center mt-1">
                                  <span className="text-[10px] text-gray-500">
                                    Duración seleccionada: {formatTime((trimEnd - trimStart) * videoDuration)}
                                  </span>
                                </div>

                                {/* Trimmer action buttons */}
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={cancelTrim}
                                    className="flex-1 py-2 rounded-xl bg-[#1a1a2e] border border-white/30 text-white text-xs font-semibold"
                                  >
                                    Cancelar
                                  </button>
                                  {trimApplied && (
                                    <button
                                      onClick={resetTrim}
                                      className="flex-1 py-2 rounded-xl bg-[#1a1a2e] border border-white/30 text-white/80 text-xs font-semibold"
                                    >
                                      Restablecer
                                    </button>
                                  )}
                                  <button
                                    onClick={applyTrim}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
                                  >
                                    <Check size={13} />
                                    Aplicar
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              /* NORMAL PROGRESS BAR */
                              <motion.div
                                key="progress"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mb-3"
                              >
                                <div className="relative h-0.5 bg-white/10 rounded-full overflow-hidden">
                                  {/* Trim range indicator when applied */}
                                  {trimApplied && (
                                    <div
                                      className="absolute inset-y-0 bg-cyan-400/20"
                                      style={{
                                        left: `${trimStart * 100}%`,
                                        width: `${(trimEnd - trimStart) * 100}%`,
                                      }}
                                    />
                                  )}
                                  <motion.div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-gray-500">
                                    {trimApplied ? formatTime(trimStart * videoDuration) : '0:00'}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {trimApplied ? formatTime(trimEnd * videoDuration) : (videoDuration > 0 ? formatTime(videoDuration) : '0:15')}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Tool Tabs */}
                          <div className="flex justify-center gap-1.5 mb-3">
                            {(['edit', 'effects', 'audio'] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab
                                    ? 'bg-gradient-to-r from-cyan-400 to-purple-600 text-white'
                                    : 'bg-[#1a1a2e] border border-white/20 text-white/75 hover:text-white'
                                  }`}
                              >
                                {tab === 'edit' && 'Editar'}
                                {tab === 'effects' && 'Efectos'}
                                {tab === 'audio' && 'Audio'}
                              </button>
                            ))}
                          </div>

                          {(isDirectorProcessing || directorProcessingError) && (
                            <div className="mb-2 px-3 py-2 rounded-2xl border border-white/15 bg-white/5 text-[10px] text-white/70 flex items-center gap-2">
                              {isDirectorProcessing ? (
                                <>
                                  <Loader2 size={14} className="text-cyan-300 animate-spin" />
                                  <span>
                                    {directorProcessingMessage ?? "Procesando video..."} ({Math.round(directorProcessingProgress)}%)
                                  </span>
                                </>
                              ) : (
                                <span className="text-rose-300">{directorProcessingError}</span>
                              )}
                            </div>
                          )}

                          {/* Tools Grid */}
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {getCurrentTools().map((tool, index) => (
                              <motion.button
                                key={tool.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={tool.disabled ? undefined : tool.onClick}
                                disabled={tool.disabled}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#1a1a2e] border border-white/20 transition-all group ${tool.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-cyan-500/50 hover:bg-[#22223a]'}`}
                              >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center group-hover:scale-105 transition-transform relative`}>
                                  <tool.icon size={14} className="text-white" />
                                  {tool.label === 'Recortar' && trimApplied && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border border-[#0a0a12]" />
                                  )}
                                  {tool.label === 'Filtros' && activeFilter.id !== 'none' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-400 rounded-full border border-[#0a0a12]" />
                                  )}
                                  {tool.label === 'Ajustes' && Object.values(adjustments).some(v => v !== 0) && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border border-[#0a0a12]" />
                                  )}
                                  {tool.label === 'Stickers' && stickerOverlays.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-[#0a0a12] flex items-center justify-center text-[7px] font-bold text-black">{stickerOverlays.length}</span>
                                  )}
                                  {tool.label === 'Capas' && (textOverlays.length > 0 || stickerOverlays.length > 0) && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full border border-[#0a0a12] flex items-center justify-center text-[7px] font-bold text-black">{textOverlays.length + stickerOverlays.length}</span>
                                  )}
                                  {tool.label === 'Duración' && playbackSpeed !== 1 && (
                                    <span className="absolute -top-1 -right-1 px-1 h-3 bg-blue-400 rounded-full border border-[#0a0a12] flex items-center justify-center text-[7px] font-bold text-black">{playbackSpeed}×</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] font-semibold transition-colors group-hover:text-white ${tool.label === 'Filtros' && activeFilter.id !== 'none' ? 'text-violet-300' : 'text-white/75'}`}
                                >
                                  {tool.label === 'Filtros' && activeFilter.id !== 'none' ? activeFilter.label : tool.label}
                                </span>
                              </motion.button>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleBack}
                              className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
                            >
                              <span className="text-white font-medium">Cambiar</span>
                            </button>

                            <button
                              onClick={handleNext}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
                            >
                              <span className="text-white font-semibold text-sm">Siguiente</span>
                              <ChevronRight size={16} className="text-white" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {currentStep === 'publish' && (
                        <motion.div
                          key="publish"
                          initial={{ x: 100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -100, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="px-4 pb-6"
                        >
                           {/* Mention suggestions — fuera del div del textarea para evitar overflow-hidden */}
                          {mentionQuery !== null && (
                            <div className="mb-2 rounded-2xl border border-white/10 bg-[#14141f] overflow-hidden shadow-2xl">
                              {/* Header */}
                              <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
                                <AtSign size={11} className="text-orange-400" />
                                <span className="text-[10px] text-white/50 font-medium">Mencionar usuario</span>
                              </div>

                              {mentionLoading && (
                                <div className="px-3 py-3 flex items-center gap-2">
                                  <Loader2 size={13} className="text-cyan-400 animate-spin" />
                                  <span className="text-[11px] text-white/40">Buscando…</span>
                                </div>
                              )}

                              {!mentionLoading && mentionResults.length === 0 && mentionQuery.length > 0 && (
                                <div className="px-3 py-3 text-[11px] text-white/40 text-center">
                                  Sin resultados para "@{mentionQuery}"
                                </div>
                              )}

                              {!mentionLoading && mentionQuery.length === 0 && (
                                <div className="px-3 py-3 text-[11px] text-white/40 text-center">
                                  Escribe un nombre para buscar
                                </div>
                              )}

                              {mentionResults.map(u => (
                                <button
                                  key={u.id}
                                  onPointerDown={(e) => { e.preventDefault(); pickMention(u.username) }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/[0.04] last:border-0"
                                >
                                  <img
                                    src={u.profile_picture ?? `https://picsum.photos/seed/${u.id}/32/32`}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                                    alt=""
                                  />
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-white text-xs font-semibold truncate">@{u.username}</p>
                                  </div>
                                  <div className="w-5 h-5 rounded-full bg-orange-400/20 flex items-center justify-center flex-shrink-0">
                                    <AtSign size={10} className="text-orange-400" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hashtag suggestions */}
                          {hashtagQuery !== null && (
                            <div className="mb-2 rounded-2xl border border-white/10 bg-[#14141f] overflow-hidden shadow-2xl">
                              <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
                                <Hash size={11} className="text-cyan-400" />
                                <span className="text-[10px] text-white/50 font-medium">Hashtags populares</span>
                              </div>

                              {hashtagLoading && (
                                <div className="px-3 py-3 flex items-center gap-2">
                                  <Loader2 size={13} className="text-cyan-400 animate-spin" />
                                  <span className="text-[11px] text-white/40">Buscando…</span>
                                </div>
                              )}

                              {!hashtagLoading && hashtagResults.length === 0 && (
                                <div className="px-3 py-3 text-[11px] text-white/40 text-center">
                                  Sin hashtags encontrados
                                </div>
                              )}

                              {hashtagResults.map(h => (
                                <button
                                  key={h.name}
                                  onPointerDown={(e) => { e.preventDefault(); pickHashtag(h.name) }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/[0.04] last:border-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-pink-500/15 flex items-center justify-center flex-shrink-0">
                                    <Hash size={14} className="text-cyan-400" />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-white text-xs font-semibold truncate">#{h.name}</p>
                                    <p className="text-white/40 text-[10px]">{h.videos_count.toLocaleString()} videos</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-1.5 mb-2">
                            <button
                              onClick={() => insertAtCursor('#')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all"
                            >
                              <Hash size={12} className="text-cyan-400" />
                              <span className="text-white text-[10px]">Hashtags</span>
                            </button>
                            <button
                              onClick={() => insertAtCursor('@')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all"
                            >
                              <AtSign size={12} className="text-orange-400" />
                              <span className="text-white text-[10px]">Mencionar</span>
                            </button>
                          </div>
                          {/* Description */}
                          <div className="mb-2">
                            <textarea
                              ref={descTextareaRef}
                              value={description}
                              onChange={(e) => handleDescriptionChange(e.target.value)}
                              placeholder="Escribe una descripción..."
                              className="w-full h-14 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 focus:border-cyan-400/50 text-white text-xs placeholder-gray-400 resize-none outline-none transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
                            />
                          </div>

                          {/* Privacy Options */}
                          <div className="flex gap-1.5 mb-3">
                            {privacyOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setPrivacy(option.value)}
                                className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all ${privacy === option.value
                                    ? 'bg-gradient-to-br from-cyan-400/20 to-purple-600/20 border-cyan-400/50'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                  }`}
                              >
                                <option.icon size={14} className={privacy === option.value ? 'text-cyan-400' : 'text-gray-400'} />
                                <span className={`text-[9px] font-medium ${privacy === option.value ? 'text-white' : 'text-gray-400'}`}>
                                  {option.label}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleBack}
                              className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10"
                            >
                              <ChevronLeft size={16} className="text-white" />
                            </button>

                            <button
                              onClick={handleNext}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
                            >
                              <span className="text-white font-semibold text-sm">Siguiente</span>
                              <ChevronRight size={16} className="text-white" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {currentStep === 'share' && (
                        <motion.div
                          key="share"
                          initial={{ x: 100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 100, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="px-4 pb-6"
                        >
                          {/* Social Networks Header */}
                          <div className="text-center mb-3">
                            <h3 className="text-white font-semibold text-sm">Compartir en redes</h3>
                            <p className="text-gray-500 text-[10px]">Publica tambien en tus redes conectadas</p>
                          </div>

                          {/* Social Networks - Horizontal */}
                          <div className="flex gap-2 mb-4">
                            {socialNetworksList.map((network) => (
                              <div
                                key={network.key}
                                className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10"
                              >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${network.gradient} flex items-center justify-center`}>
                                  {network.icon}
                                </div>
                                <span className="text-white text-xs font-medium">{network.name}</span>
                                {/* Toggle Switch */}
                                <button
                                  onClick={() => toggleSocialNetwork(network.key)}
                                  className={`relative w-10 h-5 rounded-full transition-all ${socialNetworks[network.key]
                                      ? 'bg-gradient-to-r from-cyan-400 to-purple-600'
                                      : 'bg-white/10'
                                    }`}
                                >
                                  <div
                                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all ${socialNetworks[network.key] ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                                      }`}
                                  />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Publish error */}
                          {publishError && (
                            <p className="text-red-400 text-[10px] text-center mb-2 px-1">{publishError}</p>
                          )}

                          {/* Processing progress bar */}
                          {publishStep === 'processing' && (
                            <div className="mb-2">
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] text-gray-400">Procesando video…</span>
                                <span className="text-[10px] text-cyan-400">{Math.round(processingProgress)}%</span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full"
                                  style={{ width: `${processingProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleBack}
                              disabled={isPublishing}
                              className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-40"
                            >
                              <ChevronLeft size={16} className="text-white" />
                            </button>

                            <button
                              onClick={handlePublish}
                              disabled={isPublishing}
                              className="flex-1 flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 hover:shadow-lg hover:shadow-cyan-400/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {isPublishing ? (
                                <div className="flex items-center gap-2">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full flex-shrink-0"
                                  />
                                  <span className="text-white font-semibold text-sm">
                                    {publishStep === 'processing' ? 'Procesando…' : 'Publicando…'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-semibold text-sm">Publicar</span>
                                  <Upload size={16} className="text-white" />
                                </div>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          )}
          {/* Filter Panel */}
          <VideoFilterPanel
            isOpen={showFilterPanel}
            onClose={() => setShowFilterPanel(false)}
            videoRef={videoRef}
            activeFilterId={activeFilter.id}
            onSelectFilter={(f) => {
              setActiveFilter(f)
              setFilterStartTime(0)
              setFilterEndTime(videoDuration > 0 ? videoDuration : null)
            }}
          />

          {/* Adjustments Panel */}
          <AdjustmentsPanel
            isOpen={showAdjustments}
            values={adjustments}
            onChange={setAdjustments}
            onDone={() => setShowAdjustments(false)}
          />

          {/* Mixer Panel */}
          <MixerPanel
            isOpen={showMixerPanel}
            onClose={() => setShowMixerPanel(false)}
            volumeOriginal={audioControls.volumeOriginal}
            volumeMusic={audioControls.volumeMusic}
            volumeSticker={volumeSticker}
            onSetVolumeOriginal={audioControls.setVolumeOriginal}
            onSetVolumeMusic={audioControls.setVolumeMusic}
            onSetVolumeSticker={setVolumeSticker}
            hasTrack={!!audioControls.selectedTrack}
            hasVideoSticker={stickerOverlays.some(s => s.kind === "video" && !!s.src)}
          />

          {/* Volume Panel */}
          <VolumePanel
            isOpen={showVolumePanel}
            onClose={() => setShowVolumePanel(false)}
            volumeOriginal={audioControls.volumeOriginal}
            onSetVolumeOriginal={audioControls.setVolumeOriginal}
          />

          {/* Voice Recorder Panel */}
          <VoiceRecorderPanel
            isOpen={showVoicePanel}
            onClose={() => setShowVoicePanel(false)}
            onApply={(blob) => {
              setVoiceBlob(blob)
              setShowVoicePanel(false)
            }}
          />
        </motion.div>
      )}

      {/* IMAGINA AI Modal */}
      <ImaginaAIModal
        isOpen={showImaginaAI}
        onClose={() => setShowImaginaAI(false)}
      />

    </AnimatePresence>

      {/* Text Editor */}
      <AnimatePresence>
        {showTextEditor && (
          <TextEditorOverlay
            key="text-editor-overlay"
            isOpen={showTextEditor}
            onClose={() => { setShowTextEditor(false); setEditingOverlayId(null) }}
            onConfirm={handleAddTextOverlay}
            initialData={editingOverlayId ? textOverlays.find(o => o.id === editingOverlayId) : undefined}
          />
        )}
      </AnimatePresence>

      {/* Music Selector */}
      <AnimatePresence>
        <MusicSelectorModal
          isOpen={showMusicSelector}
          videoDuration={videoDuration}
          onClose={() => {
            audioControls.stopAll()
            setShowMusicSelector(false)
          }}
          onApply={(result) => {
            setAppliedMusic(result)
            audioControls.stopAll()
            audioControls.applyTrack(result.track, result.trim_start, result.trim_end, result.volume_original, result.volume_music)
            setShowMusicSelector(false)
            if (videoRef.current) {
              videoRef.current.currentTime = 0
              videoRef.current.play().catch(() => {})
            }
            setIsPlaying(true)
          }}
          selectedTrack={audioControls.selectedTrack}
          appliedTrimStart={appliedMusic?.trim_start}
          appliedTrimEnd={appliedMusic?.trim_end}
          previewTrackId={audioControls.previewTrackId}
          volumeOriginal={audioControls.volumeOriginal}
          volumeMusic={audioControls.volumeMusic}
          favorites={audioControls.favorites}
          onSelectAndPlay={(track, trimStart, trimEnd) => audioControls.togglePlayTrack(track, trimStart, trimEnd)}
          onToggleFavorite={audioControls.toggleFavorite}
          onClearTrack={audioControls.clearTrack}
          onSetVolumeOriginal={audioControls.setVolumeOriginal}
          onSetVolumeMusic={audioControls.setVolumeMusic}
          onSeekPreview={audioControls.seekPreview}
          tracks={apiTracks}
        />
      </AnimatePresence>
    </>
  )
}

export default CreateActionModal
