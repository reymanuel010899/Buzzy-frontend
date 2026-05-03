"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"

export interface TextOverlayData {
  id: string
  text: string
  x: number        // 0–100 percent of container
  y: number        // 0–100 percent of container
  color: string
  fontId: string
  fontFamily: string
  fontWeight: string
  letterSpacing?: string
  fontSize: number
  align: 'left' | 'center' | 'right'
  background: 'none' | 'semi' | 'solid'
  startTime?: number  // seconds, default 0
  endTime?: number    // seconds, default videoDuration
}

interface TextEditorOverlayProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (overlay: TextOverlayData) => void
  initialData?: TextOverlayData
}

const COLORS = [
  '#FFFFFF',
  '#FFE600',
  '#FF3B30',
  '#FF9500',
  '#FF2D78',
  '#BF5AF2',
  '#0A84FF',
  '#32D4DE',
  '#30D158',
  '#1C1C1E',
]

const FONTS = [
  { id: 'classic',  label: 'Aa', fontFamily: 'sans-serif',               fontWeight: '600',  letterSpacing: undefined },
  { id: 'serif',    label: 'Aa', fontFamily: 'Georgia, serif',            fontWeight: '600',  letterSpacing: undefined },
  { id: 'mono',     label: 'Aa', fontFamily: '"Courier New", monospace',  fontWeight: '500',  letterSpacing: undefined },
  { id: 'heavy',    label: 'Aa', fontFamily: 'sans-serif',               fontWeight: '900',  letterSpacing: '-0.02em' },
  { id: 'light',    label: 'Aa', fontFamily: 'sans-serif',               fontWeight: '200',  letterSpacing: '0.12em'  },
  { id: 'cursive',  label: 'Aa', fontFamily: 'cursive',                  fontWeight: '600',  letterSpacing: undefined },
  { id: 'narrow',   label: 'Aa', fontFamily: 'sans-serif',               fontWeight: '800',  letterSpacing: '-0.05em' },
]

const BG_MODES = ['none', 'semi', 'solid'] as const
const ALIGN_OPTIONS = ['left', 'center', 'right'] as const

const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({ isOpen, onClose, onConfirm, initialData }) => {
  const [text, setText] = useState('')
  const [color, setColor] = useState('#FFFFFF')
  const [selectedFont, setSelectedFont] = useState(FONTS[0])
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center')
  const [bgMode, setBgMode] = useState<'none' | 'semi' | 'solid'>('none')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setText(initialData.text)
        setColor(initialData.color)
        setSelectedFont(FONTS.find(f => f.id === initialData.fontId) ?? FONTS[0])
        setAlign(initialData.align)
        setBgMode(initialData.background)
      } else {
        setText('')
        setColor('#FFFFFF')
        setSelectedFont(FONTS[0])
        setAlign('center')
        setBgMode('none')
      }
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen])

  const cycleAlign = () => {
    const idx = ALIGN_OPTIONS.indexOf(align)
    setAlign(ALIGN_OPTIONS[(idx + 1) % ALIGN_OPTIONS.length])
  }

  const cycleBg = () => {
    const idx = BG_MODES.indexOf(bgMode)
    setBgMode(BG_MODES[(idx + 1) % BG_MODES.length])
  }

  const handleConfirm = () => {
    if (!text.trim()) { onClose(); return }
    onConfirm({
      id: initialData?.id ?? Date.now().toString(),
      text: text.trim(),
      x: initialData?.x ?? 50,
      y: initialData?.y ?? 45,
      color,
      fontId: selectedFont.id,
      fontFamily: selectedFont.fontFamily,
      fontWeight: selectedFont.fontWeight,
      letterSpacing: selectedFont.letterSpacing,
      fontSize: initialData?.fontSize ?? 24,
      align,
      background: bgMode,
    })
    onClose()
  }

  /* Derive text display styles */
  const isSolidDark = bgMode === 'solid' && color === '#1C1C1E'
  const textColor = bgMode === 'solid' ? (isSolidDark ? '#FFFFFF' : '#000000') : color

  const textStyle: React.CSSProperties = {
    color: textColor,
    fontFamily: selectedFont.fontFamily,
    fontWeight: selectedFont.fontWeight,
    letterSpacing: selectedFont.letterSpacing,
    textAlign: align,
    backgroundColor:
      bgMode === 'solid' ? color :
      bgMode === 'semi'  ? `${color}40` :
      'transparent',
    padding: bgMode !== 'none' ? '6px 14px' : '0',
    borderRadius: bgMode !== 'none' ? '8px' : '0',
    lineHeight: 1.3,
    textShadow: bgMode === 'none' ? '0 2px 6px rgba(0,0,0,0.9)' : 'none',
    fontSize: 26,
    minWidth: 40,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  }

  const AlignIcon =
    align === 'left' ? AlignLeft :
    align === 'center' ? AlignCenter :
    AlignRight

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={() => textareaRef.current?.focus()}
    >
      {/* ─── Top bar ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-11 pb-3">
        {/* OK */}
        <button
          onClick={handleConfirm}
          className="px-4 py-1.5 rounded-lg bg-white text-black text-sm font-extrabold tracking-wide"
        >
          OK
        </button>

        {/* Alignment */}
        <button
          onClick={cycleAlign}
          className="p-2 rounded-lg bg-white/10 border border-white/15 text-white"
        >
          <AlignIcon size={18} />
        </button>

        {/* Background mode */}
        <button
          onClick={cycleBg}
          className="w-9 h-9 rounded-lg border flex items-center justify-center text-sm font-black transition-all"
          style={{
            backgroundColor:
              bgMode === 'none'  ? 'rgba(255,255,255,0.08)' :
              bgMode === 'semi'  ? 'rgba(255,255,255,0.22)' :
              '#FFFFFF',
            borderColor:
              bgMode === 'none'  ? 'rgba(255,255,255,0.15)' :
              bgMode === 'semi'  ? 'rgba(255,255,255,0.35)' :
              '#FFFFFF',
            color:
              bgMode === 'solid' ? '#000000' : '#FFFFFF',
          }}
        >
          A
        </button>
      </div>

      {/* ─── Text area + color picker ─────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">

        {/* Color pills – right side */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-10">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); setColor(c) }}
              className="transition-transform active:scale-90"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: c,
                border: color === c ? '2.5px solid #FFFFFF' : '2px solid rgba(255,255,255,0.25)',
                transform: color === c ? 'scale(1.25)' : 'scale(1)',
                boxShadow: color === c ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Text preview + hidden input */}
        <div className="relative max-w-[75%] w-full flex justify-center items-center">
          {/* Styled preview */}
          <div style={textStyle} className="max-w-full">
            {text || (
              <span style={{ opacity: 0.3 }}>Escribe algo...</span>
            )}
          </div>

          {/* Hidden textarea captures all input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="absolute inset-0 w-full h-full opacity-0 resize-none outline-none cursor-text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* ─── Font selector ────────────────────────────── */}
      <div className="pb-10 pt-2">
        <div className="flex gap-3 px-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FONTS.map((font) => {
            const active = selectedFont.id === font.id
            return (
              <button
                key={font.id}
                onClick={(e) => { e.stopPropagation(); setSelectedFont(font) }}
                className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                  border: active ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: font.fontFamily,
                    fontWeight: font.fontWeight,
                    letterSpacing: font.letterSpacing,
                    color: '#FFFFFF',
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                >
                  Aa
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default TextEditorOverlay
