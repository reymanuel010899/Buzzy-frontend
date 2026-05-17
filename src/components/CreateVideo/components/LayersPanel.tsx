"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Video, Music, Type, Smile, Sparkles } from "lucide-react"
import type { TextOverlayData } from "./text-editor-overlay"
import type { StickerOverlayData } from "./StickerPanel"
import type { MusicSelectorResult } from "./MusicSelectorModal"
import type { VideoFilter } from "./VideoFilterPanel"

export type LayerKind = "video" | "audio" | "text" | "sticker" | "filter" | "filter"

// ── Helpers ────────────────────────────────────────────────────────────────────

function kindIcon(kind: LayerKind) {
  switch (kind) {
    case "video": return <Video size={15} className="text-cyan-300" />
    case "audio": return <Music size={15} className="text-purple-300" />
    case "text": return <Type size={15} className="text-yellow-300" />
    case "sticker": return <Smile size={15} className="text-amber-300" />
    case "filter": return <Sparkles size={15} className="text-violet-300" />
  }
}
function kindBorder(kind: LayerKind) {
  switch (kind) {
    case "video": return "border-cyan-500/50"
    case "audio": return "border-purple-500/50"
    case "text": return "border-yellow-500/50"
    case "sticker": return "border-amber-500/50"
    case "filter": return "border-violet-500/50"
  }
}
function kindBarColor(kind: LayerKind) {
  switch (kind) {
    case "video": return "bg-cyan-400"
    case "audio": return "bg-purple-400"
    case "text": return "bg-yellow-400"
    case "sticker": return "bg-amber-400"
    case "filter": return "bg-violet-400"
  }
}
function kindBarBorder(kind: LayerKind) {
  switch (kind) {
    case "video": return "border-cyan-300"
    case "audio": return "border-purple-300"
    case "text": return "border-yellow-300"
    case "sticker": return "border-amber-300"
    case "filter": return "border-violet-300"
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface LayersPanelProps {
  isOpen: boolean
  onClose: () => void
  textOverlays: TextOverlayData[]
  stickerOverlays: StickerOverlayData[]
  appliedMusic: MusicSelectorResult | null
  activeFilter?: VideoFilter | null
  filterStartTime?: number
  filterEndTime?: number
  videoDuration: number
  onTextVisibilityChange: (id: string, visible: boolean) => void
  onStickerVisibilityChange: (id: string, visible: boolean) => void
  onDeleteText: (id: string) => void
  onDeleteSticker: (id: string) => void
  onSelectText: (id: string) => void
  onSelectSticker: (id: string) => void
  onReorderTexts: (ids: string[]) => void
  onReorderStickers: (ids: string[]) => void
  onUpdateTextTiming: (id: string, start: number, end: number) => void
  onUpdateStickerTiming: (id: string, start: number, end: number) => void
  onUpdateFilterTiming?: (start: number, end: number) => void
  onUpdateAudioTiming?: (start: number, end: number) => void
  onDeleteFilter?: () => void
  onDeleteAudio?: () => void
}

// ── Draggable reorder hook ─────────────────────────────────────────────────────

function useDraggableList(ids: string[], onReorder: (ids: string[]) => void) {
  const [order, setOrder] = useState(ids)
  const [dragging, setDragging] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setOrder(prev => {
      const kept = prev.filter(id => ids.includes(id))
      const added = ids.filter(id => !prev.includes(id))
      return [...kept, ...added]
    })
  }, [ids.length]) // eslint-disable-line

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(index); setOverIndex(index)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null) return
    const y = e.clientY
    let found = dragging
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom) found = i
    })
    setOverIndex(found)
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    if (dragging !== null && overIndex !== null && dragging !== overIndex) {
      setOrder(prev => {
        const next = [...prev]
        const [moved] = next.splice(dragging, 1)
        next.splice(overIndex, 0, moved)
        onReorder(next)
        return next
      })
    }
    setDragging(null); setOverIndex(null)
  }, [dragging, overIndex, onReorder])

  return { order, dragging, overIndex, itemRefs, handlePointerDown, handlePointerMove, handlePointerUp }
}

// ── Interactive timeline bar ───────────────────────────────────────────────────

interface TimelineBarProps {
  kind: LayerKind
  startTime: number
  endTime: number
  duration: number
  locked: boolean
  onUpdate: (start: number, end: number) => void
}

const MIN_DURATION = 0.3

const TimelineBar: React.FC<TimelineBarProps> = ({ kind, startTime, endTime, duration, locked, onUpdate }) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  // These refs hold the committed values — never stale inside listeners
  const startRef = useRef(startTime)
  const endRef   = useRef(endTime)
  const durRef   = useRef(duration)

  // Sync refs when props change (only when not dragging)
  const draggingRef = useRef(false)
  useEffect(() => {
    if (!draggingRef.current) {
      startRef.current = startTime
      endRef.current   = endTime
      applyBlock(startTime, endTime, duration)
    }
  }, [startTime, endTime, duration])
  useEffect(() => { durRef.current = duration }, [duration])

  // Apply position directly to DOM — zero React re-renders during drag
  const applyBlock = (s: number, e: number, dur: number) => {
    const block = blockRef.current
    if (!block) return
    const leftPct  = Math.max(0, Math.min(100, (s / dur) * 100))
    const widthPct = Math.max(0, Math.min(100 - leftPct, ((e - s) / dur) * 100))
    block.style.left  = `${leftPct}%`
    block.style.width = `${widthPct}%`
  }

  const startDrag = (e: React.PointerEvent, mode: 'start' | 'end' | 'body') => {
    if (locked) return
    e.preventDefault()
    e.stopPropagation()

    draggingRef.current = true
    const originX = e.clientX
    const s0 = startRef.current
    const e0 = endRef.current

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault()
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const dt = ((ev.clientX - originX) / rect.width) * durRef.current
      let ns = s0, ne = e0

      if (mode === 'start') {
        ns = Math.max(0, Math.min(s0 + dt, e0 - MIN_DURATION))
        ne = e0
      } else if (mode === 'end') {
        ns = s0
        ne = Math.max(s0 + MIN_DURATION, Math.min(e0 + dt, durRef.current))
      } else {
        const len = e0 - s0
        ns = Math.max(0, Math.min(s0 + dt, durRef.current - len))
        ne = ns + len
      }

      // Update DOM directly — no setState, no re-render
      applyBlock(ns, ne, durRef.current)
      startRef.current = ns
      endRef.current   = ne
    }

    const onUp = () => {
      draggingRef.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup',   onUp)
      document.removeEventListener('pointercancel', onUp)
      onUpdate(startRef.current, endRef.current)
    }

    document.addEventListener('pointermove',   onMove, { passive: false })
    document.addEventListener('pointerup',     onUp)
    document.addEventListener('pointercancel', onUp)
  }

  const initLeft  = Math.max(0, Math.min(100, (startTime / duration) * 100))
  const initWidth = Math.max(0, ((endTime - startTime) / duration) * 100)

  return (
    <div
      ref={trackRef}
      className="relative h-10 w-full rounded-full bg-white/5 select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Tick marks */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-white/10"
            style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </div>

      {/* Active block */}
      <div
        ref={blockRef}
        className={`absolute top-1.5 bottom-1.5 rounded-full ${kindBarColor(kind)} cursor-grab active:cursor-grabbing`}
        style={{ left: `${initLeft}%`, width: `${initWidth}%`, touchAction: 'none' }}
        onPointerDown={e => startDrag(e, 'body')}
      >
        {/* Left handle */}
        <div
          className="absolute -left-2 top-0 bottom-0 w-7 cursor-w-resize flex items-center justify-start pl-1.5"
          style={{ touchAction: 'none' }}
          onPointerDown={e => { e.stopPropagation(); startDrag(e, 'start') }}
        >
          <div className={`w-1.5 h-5 rounded-full border-2 ${kindBarBorder(kind)} bg-white/90 shadow`} />
        </div>

        {/* Right handle */}
        <div
          className="absolute -right-2 top-0 bottom-0 w-7 cursor-e-resize flex items-center justify-end pr-1.5"
          style={{ touchAction: 'none' }}
          onPointerDown={e => { e.stopPropagation(); startDrag(e, 'end') }}
        >
          <div className={`w-1.5 h-5 rounded-full border-2 ${kindBarBorder(kind)} bg-white/90 shadow`} />
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const LayersPanel: React.FC<LayersPanelProps> = ({
  isOpen, onClose,
  textOverlays, stickerOverlays, appliedMusic, activeFilter,
  filterStartTime, filterEndTime,
  videoDuration,
  onTextVisibilityChange, onStickerVisibilityChange,
  onDeleteText, onDeleteSticker,
  onSelectText, onSelectSticker,
  onReorderTexts, onReorderStickers,
  onUpdateTextTiming, onUpdateStickerTiming, onUpdateFilterTiming, onUpdateAudioTiming,
  onDeleteFilter, onDeleteAudio,
}) => {
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const textDrag = useDraggableList(textOverlays.map(o => o.id), onReorderTexts)
  const stickerDrag = useDraggableList(stickerOverlays.map(o => o.id), onReorderStickers)

  const toggleLock = useCallback((id: string) => {
    setLockedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const toggleVisible = useCallback((id: string, kind: "text" | "sticker") => {
    setHiddenIds(prev => {
      const n = new Set(prev)
      const nowHide = !n.has(id)
      nowHide ? n.add(id) : n.delete(id)
      kind === "text" && onTextVisibilityChange(id, !nowHide)
      kind === "sticker" && onStickerVisibilityChange(id, !nowHide)
      return n
    })
  }, [onTextVisibilityChange, onStickerVisibilityChange])

  const textMap = new Map(textOverlays.map(o => [o.id, o]))
  const stickerMap = new Map(stickerOverlays.map(o => [o.id, o]))
  const sortedTexts = textDrag.order.map(id => textMap.get(id)).filter(Boolean) as TextOverlayData[]
  const sortedStickers = stickerDrag.order.map(id => stickerMap.get(id)).filter(Boolean) as StickerOverlayData[]
  const hasFilter = activeFilter && activeFilter.id !== "none"
  const totalLayers = 1 + (appliedMusic ? 1 : 0) + (hasFilter ? 1 : 0) + textOverlays.length + stickerOverlays.length

  // ── Layer row ────────────────────────────────────────────────────────────────
  const LayerRow = ({
    id, kind, label, emoji,
    startTime, endTime,
    duration: layerDuration,
    deletable, onSelect, onDelete,
    onTimingUpdate,
    dragCtx, dragIndex,
  }: {
    id: string; kind: LayerKind; label: string; emoji?: string
    startTime: number; endTime: number
    duration?: number
    deletable: boolean; onSelect?: () => void; onDelete?: () => void
    onTimingUpdate?: (start: number, end: number) => void
    dragCtx?: ReturnType<typeof useDraggableList>
    dragIndex?: number
  }) => {
    const isHidden = hiddenIds.has(id)
    const isLocked = lockedIds.has(id)
    const isExpanded = expandedId === id
    const isDragging = dragCtx?.dragging === dragIndex
    const isOver = dragCtx?.overIndex === dragIndex && dragCtx?.dragging !== null && dragCtx?.dragging !== dragIndex
    const dur = (layerDuration && isFinite(layerDuration) && layerDuration > 0)
      ? layerDuration
      : (videoDuration > 0 && isFinite(videoDuration) ? videoDuration : 10)

    return (
      <div
        ref={el => { if (dragCtx && dragIndex !== undefined) dragCtx.itemRefs.current[dragIndex] = el }}
        onPointerMove={dragCtx ? e => dragCtx.handlePointerMove(e) : undefined}
        onPointerUp={dragCtx ? dragCtx.handlePointerUp : undefined}
        onPointerCancel={dragCtx ? dragCtx.handlePointerUp : undefined}
        className={`rounded-xl border bg-[#1a1a2e] ${kindBorder(kind)} overflow-hidden transition-all duration-150
          ${isDragging ? 'opacity-40 scale-[0.97]' : 'opacity-100'}
          ${isOver ? 'ring-2 ring-cyan-400/60 -translate-y-0.5' : ''}
        `}
        style={{ touchAction: 'none' }}
      >
        {/* Header row */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
          onClick={() => { setExpandedId(isExpanded ? null : id); onSelect?.() }}
        >
          {deletable && dragCtx && dragIndex !== undefined && (
            <div
              className="p-1 -ml-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
              onPointerDown={e => { e.stopPropagation(); dragCtx.handlePointerDown(e, dragIndex) }}
            >
              <GripVertical size={14} className="text-white/40" />
            </div>
          )}

          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            kind === 'audio'   ? 'bg-purple-500/20' :
            kind === 'filter'  ? 'bg-violet-500/20' :
            kind === 'video'   ? 'bg-cyan-500/20'   :
            kind === 'text'    ? 'bg-yellow-500/20' :
                                 'bg-amber-500/20'
          }`}>
            {emoji ? <span className="text-lg leading-none">{emoji}</span> : kindIcon(kind)}
          </div>

          <span className={`flex-1 text-xs font-medium truncate select-none ${isHidden ? 'text-white/25 line-through' : 'text-white'}`}>
            {label}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {deletable && (
              <>
                <button onClick={e => {
                  e.stopPropagation()
                  if (kind === "text" || kind === "sticker") toggleVisible(id, kind)
                  else setHiddenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
                }}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 transition-colors">
                  {isHidden ? <EyeOff size={11} className="text-white/30" /> : <Eye size={11} className="text-white/60" />}
                </button>
                <button onClick={e => { e.stopPropagation(); toggleLock(id) }}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 transition-colors">
                  {isLocked ? <Lock size={11} className="text-amber-400" /> : <Unlock size={11} className="text-white/30" />}
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (isLocked) return
                    if (onDelete) { onDelete(); return }
                    if (kind === "text") onDeleteText(id)
                    if (kind === "sticker") onDeleteSticker(id)
                  }}
                  className={`p-1 rounded transition-colors ${isLocked ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-red-500/25'}`}>
                  <Trash2 size={11} className={isLocked ? "text-white/20" : "text-red-400"} />
                </button>
              </>
            )}
            {/* Chevron indicator */}
            {onTimingUpdate && (
              <span className={`text-white/25 text-xs transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
            )}
          </div>
        </div>

        {/* Expanded: interactive timeline */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] text-white/30 font-mono">{startTime.toFixed(1)}s</span>
              <span className="text-[9px] text-white/40">arrastra los bordes o mueve el bloque</span>
              <span className="text-[9px] text-white/30 font-mono">{endTime.toFixed(1)}s</span>
            </div>

            {onTimingUpdate ? (
              <TimelineBar
                kind={kind}
                startTime={startTime}
                endTime={endTime}
                duration={dur}
                locked={isLocked}
                onUpdate={onTimingUpdate}
              />
            ) : (
              /* Read-only bar for audio/video */
              <div className="relative h-6 w-full rounded-full bg-white/5 overflow-hidden">
                <div className={`absolute top-0.5 bottom-0.5 rounded-full ${kindBarColor(kind)}`}
                  style={{ left: `${(startTime / dur) * 100}%`, width: `${((endTime - startTime) / dur) * 100}%` }} />
              </div>
            )}

            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/20">0s</span>
              <span className="text-[9px] text-white/20">{dur.toFixed(1)}s</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="layers-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/50" onClick={onClose}
          />
          <motion.div key="layers-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-[#0d0d1a] border-t border-white/10 flex flex-col overflow-hidden"
            style={{ height: "65%" }}
          >
            {/* Drag handle — tap to close */}
            <div className="flex justify-center pt-2.5 pb-2 shrink-0 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 rounded-full bg-white/30 active:bg-white/60 transition-colors" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 shrink-0">
              <div>
                <h3 className="text-white font-semibold text-sm">Capas</h3>
                <p className="text-white/35 text-[10px] mt-0.5">
                  {totalLayers} capa{totalLayers !== 1 ? "s" : ""} · toca una capa para editar su tiempo
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0 flex flex-col gap-4" style={{ overscrollBehavior: 'contain' }}>

              {/* Stickers */}
              {sortedStickers.length > 0 && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-0.5">Stickers</p>
                  <div className="flex flex-col gap-1.5">
                    {sortedStickers.map((s, i) => (
                      <LayerRow
                        key={s.id} id={s.id} kind="sticker"
                        label={`Sticker ${s.emoji}`} emoji={s.emoji}
                        startTime={s.startTime} endTime={s.endTime}
                        deletable dragCtx={stickerDrag} dragIndex={i}
                        onSelect={() => onSelectSticker(s.id)}
                        onTimingUpdate={(start, end) => onUpdateStickerTiming(s.id, start, end)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Textos */}
              {sortedTexts.length > 0 && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-0.5">Texto</p>
                  <div className="flex flex-col gap-1.5">
                    {sortedTexts.map((t, i) => {
                      const dur = (videoDuration > 0 && isFinite(videoDuration)) ? videoDuration : 10
                      const tStart = t.startTime ?? 0
                      const tEnd = (t.endTime != null && isFinite(t.endTime)) ? t.endTime : dur
                      return (
                        <LayerRow
                          key={t.id} id={t.id} kind="text"
                          label={t.text.length > 26 ? t.text.slice(0, 26) + "…" : t.text || "Texto"}
                          startTime={tStart} endTime={tEnd}
                          deletable dragCtx={textDrag} dragIndex={i}
                          onSelect={() => onSelectText(t.id)}
                          onTimingUpdate={(start, end) => onUpdateTextTiming(t.id, start, end)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Audio */}
              {appliedMusic && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-0.5">Audio</p>
                  <LayerRow
                    id="audio" kind="audio"
                    label={`${appliedMusic.track.title} · ${appliedMusic.track.artist}`}
                    startTime={appliedMusic.trim_start ?? 0}
                    endTime={appliedMusic.trim_end ?? videoDuration}
                    duration={appliedMusic.track.durationSecs ?? videoDuration}
                    deletable
                    onDelete={onDeleteAudio}
                    onTimingUpdate={onUpdateAudioTiming}
                  />
                </div>
              )}

              {/* Filtro */}
              {hasFilter && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-0.5">Filtro</p>
                  <LayerRow
                    id="filter" kind="filter"
                    label={`Filtro ${activeFilter!.label}`}
                    startTime={filterStartTime ?? 0}
                    endTime={filterEndTime ?? (videoDuration > 0 ? videoDuration : 10)}
                    deletable
                    onDelete={onDeleteFilter}
                    onTimingUpdate={onUpdateFilterTiming ? (start, end) => onUpdateFilterTiming(start, end) : undefined}
                  />
                </div>
              )}

              {/* Base */}
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-0.5">Base</p>
                <LayerRow
                  id="video" kind="video" label="Video principal"
                  startTime={0} endTime={videoDuration > 0 ? videoDuration : 10}
                  deletable={false}
                />
              </div>

              {sortedTexts.length === 0 && sortedStickers.length === 0 && !appliedMusic && (
                <div className="flex flex-col items-center justify-center py-10 text-white/20 gap-2">
                  <Smile size={28} />
                  <p className="text-xs text-center">Añade textos o stickers<br />para editar su tiempo aquí</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default LayersPanel
