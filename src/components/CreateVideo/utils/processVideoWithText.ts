import type { TextOverlayData } from "../components/text-editor-overlay"
import type { StickerOverlayData } from "../components/StickerPanel"
import type { AdjustmentValues } from "../components/AdjustmentsPanel"

interface ContainerRect {
  width: number
  height: number
}

export interface VideoEffectsOptions {
  textOverlays: TextOverlayData[]
  stickerOverlays: StickerOverlayData[]
  filterCss: string          // e.g. "contrast(1.2) saturate(1.35)"
  adjustmentsCss: string          // e.g. "brightness(1.1) contrast(0.9)"
  adjustments: AdjustmentValues
  containerRect: ContainerRect
  onProgress?: (pct: number) => void
}

/**
 * Builds a combined CSS-filter string from the filter preset + manual adjustments.
 * Both are expressed as CSS filter functions so we just concatenate them.
 */
function buildCombinedFilter(filterCss: string, adjustmentsCss: string): string {
  const parts: string[] = []
  if (filterCss && filterCss !== "none") parts.push(filterCss)
  if (adjustmentsCss && adjustmentsCss !== "none") parts.push(adjustmentsCss)
  return parts.join(" ") || "none"
}

/**
 * Applies a CSS-filter string to a canvas context via an off-screen canvas.
 * We draw the source image into an invisible <canvas>, set its CSS filter,
 * then drawImage it back. Because CSS filters don't affect canvas 2D drawImage,
 * we instead parse the filter manually and apply equivalent CanvasRenderingContext2D
 * operations so the output is identical in the recorded video.
 */
function applyCssFilterToCtx(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  combinedFilter: string
) {
  if (!combinedFilter || combinedFilter === "none") return

  // We re-draw the current canvas content through an SVG feColorMatrix / feComponentTransfer
  // or — more practically — we apply an SVG filter via an offscreen canvas trick.
  // The most reliable cross-browser approach: draw to a tmp canvas with css filter set,
  // then blit back. This works because the *browser compositor* handles the CSS filter
  // when we do drawImage of an element that has a CSS filter set.
  // However for MediaRecorder / canvas.captureStream the filter must be baked in.

  // Parse individual filter functions and apply them via globalCompositeOperation or
  // a series of canvas transforms.
  const filters = parseFilterString(combinedFilter)

  // We apply filters by manipulating pixel data for accuracy.
  // For performance we use an ImageData approach only for the combined filters.
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  applyFiltersToImageData(imageData, filters)
  ctx.putImageData(imageData, 0, 0)
}

interface ParsedFilter {
  fn: string
  value: number
}

function parseFilterString(css: string): ParsedFilter[] {
  const result: ParsedFilter[] = []
  const re = /([\w-]+)\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const fn = m[1].toLowerCase()
    const raw = m[2].trim()
    const value = parseFloat(raw)
    if (!isNaN(value)) result.push({ fn, value })
  }
  return result
}

function applyFiltersToImageData(imageData: ImageData, filters: ParsedFilter[]) {
  const d = imageData.data
  const len = d.length

  // Aggregate values
  let brightness = 1
  let contrast = 1
  let saturate = 1
  let sepia = 0
  let grayscale = 0
  let hueRotate = 0  // degrees

  for (const { fn, value } of filters) {
    switch (fn) {
      case "brightness": brightness *= value; break
      case "contrast": contrast *= value; break
      case "saturate": saturate *= value; break
      case "sepia": sepia += value; break
      case "grayscale": grayscale += value; break
      case "hue-rotate": hueRotate += value; break
    }
  }

  sepia = Math.min(1, sepia)
  grayscale = Math.min(1, grayscale)

  for (let i = 0; i < len; i += 4) {
    let r = d[i]
    let g = d[i + 1]
    let b = d[i + 2]

    // 1) Brightness
    if (brightness !== 1) {
      r = clamp(r * brightness)
      g = clamp(g * brightness)
      b = clamp(b * brightness)
    }

    // 2) Contrast
    if (contrast !== 1) {
      r = clamp((r - 128) * contrast + 128)
      g = clamp((g - 128) * contrast + 128)
      b = clamp((b - 128) * contrast + 128)
    }

    // 3) Grayscale
    if (grayscale > 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = lerp(r, gray, grayscale)
      g = lerp(g, gray, grayscale)
      b = lerp(b, gray, grayscale)
    }

    // 4) Sepia
    if (sepia > 0) {
      const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189)
      const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168)
      const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131)
      r = lerp(r, sr, sepia)
      g = lerp(g, sg, sepia)
      b = lerp(b, sb, sepia)
    }

    // 5) Saturate
    if (saturate !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = clamp(lerp(gray, r, saturate))
      g = clamp(lerp(gray, g, saturate))
      b = clamp(lerp(gray, b, saturate))
    }

    // 6) Hue-rotate
    if (hueRotate !== 0) {
      const [hr, hg, hb] = rotateHue(r, g, b, hueRotate)
      r = hr; g = hg; b = hb
    }

    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function rotateHue(r: number, g: number, b: number, deg: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const nr = clamp(
    r * (0.213 + cos * 0.787 - sin * 0.213) +
    g * (0.715 - cos * 0.715 - sin * 0.715) +
    b * (0.072 - cos * 0.072 + sin * 0.928)
  )
  const ng = clamp(
    r * (0.213 - cos * 0.213 + sin * 0.143) +
    g * (0.715 + cos * 0.285 + sin * 0.140) +
    b * (0.072 - cos * 0.072 - sin * 0.283)
  )
  const nb = clamp(
    r * (0.213 - cos * 0.213 - sin * 0.787) +
    g * (0.715 - cos * 0.715 + sin * 0.715) +
    b * (0.072 + cos * 0.928 + sin * 0.072)
  )
  return [nr, ng, nb]
}

// ── Text drawing ──────────────────────────────────────────────────────────────

function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: TextOverlayData[],
  containerRect: ContainerRect,
  vW: number,
  vH: number,
  displayW: number,
  displayH: number,
  offsetX: number,
  offsetY: number
) {
  for (const overlay of overlays) {
    const containerPxX = (overlay.x / 100) * containerRect.width
    const containerPxY = (overlay.y / 100) * containerRect.height
    const normX = Math.max(0, Math.min(1, (containerPxX - offsetX) / displayW))
    const normY = Math.max(0, Math.min(1, (containerPxY - offsetY) / displayH))
    const canvasX = normX * vW
    const canvasY = normY * vH
    const scaleFactor = Math.min(vW / displayW, vH / displayH)
    const fontSize = Math.round(overlay.fontSize * scaleFactor)

    ctx.save()
    ctx.font = `${overlay.fontWeight} ${fontSize}px ${overlay.fontFamily}`
    ctx.textAlign = overlay.align
    ctx.textBaseline = "middle"
    if ("letterSpacing" in ctx) {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = overlay.letterSpacing ?? "0px"
    }

    const lines = overlay.text.split("\n")
    const lineH = fontSize * 1.35
    const totalH = lineH * lines.length
    const startY = canvasY - totalH / 2 + lineH / 2

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const ly = startY + i * lineH
      const metrics = ctx.measureText(line)
      const textW = metrics.width
      const padX = overlay.background !== "none" ? fontSize * 0.5 : 0
      const padY = overlay.background !== "none" ? fontSize * 0.25 : 0

      if (overlay.background !== "none") {
        ctx.globalAlpha = overlay.background === "semi" ? 0.4 : 1
        ctx.fillStyle = overlay.color
        const bgX = overlay.align === "center" ? canvasX - textW / 2 - padX
          : overlay.align === "left" ? canvasX - padX
            : canvasX - textW - padX
        const radius = fontSize * 0.3
        const bx = bgX, by = ly - lineH / 2 - padY
        const bw = textW + padX * 2, bh = lineH + padY * 2
        ctx.beginPath()
        ctx.moveTo(bx + radius, by)
        ctx.lineTo(bx + bw - radius, by)
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius)
        ctx.lineTo(bx + bw, by + bh - radius)
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh)
        ctx.lineTo(bx + radius, by + bh)
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius)
        ctx.lineTo(bx, by + radius)
        ctx.quadraticCurveTo(bx, by, bx + radius, by)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
      }

      const isSolidDark = overlay.background === "solid" && overlay.color === "#1C1C1E"
      ctx.fillStyle = overlay.background === "solid"
        ? isSolidDark ? "#FFFFFF" : "#000000"
        : overlay.color

      if (overlay.background === "none") {
        ctx.shadowColor = "rgba(0,0,0,0.85)"
        ctx.shadowBlur = fontSize * 0.18
      }
      ctx.fillText(line, canvasX, ly)
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
    }
    ctx.restore()
  }
}

// ── Sticker drawing ───────────────────────────────────────────────────────────

function drawStickerOverlays(
  ctx: CanvasRenderingContext2D,
  stickers: StickerOverlayData[],
  currentTime: number,
  containerRect: ContainerRect,
  vW: number,
  vH: number,
  displayW: number,
  displayH: number,
  offsetX: number,
  offsetY: number
) {
  for (const sticker of stickers) {
    // Only draw if within the sticker's time range
    if (currentTime < sticker.startTime || currentTime > sticker.endTime) continue

    const containerPxX = (sticker.x / 100) * containerRect.width
    const containerPxY = (sticker.y / 100) * containerRect.height
    const normX = Math.max(0, Math.min(1, (containerPxX - offsetX) / displayW))
    const normY = Math.max(0, Math.min(1, (containerPxY - offsetY) / displayH))
    const canvasX = normX * vW
    const canvasY = normY * vH

    // Scale emoji size relative to video dimensions
    const baseFontSize = vH * 0.08 * sticker.scale  // ~8% of video height

    ctx.save()
    ctx.translate(canvasX, canvasY)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.font = `${Math.round(baseFontSize)}px serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(sticker.emoji, 0, 0)
    ctx.restore()
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Burns ALL visual effects (filter, adjustments, stickers, text overlays)
 * into the video via Canvas + MediaRecorder. Returns a processed Blob.
 */
export async function processVideoWithText(
  file: File,
  overlays: TextOverlayData[],
  containerRect: ContainerRect,
  onProgress?: (pct: number) => void,
  stickerOverlays: StickerOverlayData[] = [],
  filterCss = "none",
  adjustmentsCss = "none",
  playbackSpeed = 1,
  filterStartTime = 0,
  filterEndTime = 100000,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.crossOrigin = "anonymous"
    video.preload = "auto"
    video.playbackRate = playbackSpeed

    const resolveActualDuration = (): Promise<number> => {
      return new Promise((res) => {
        if (isFinite(video.duration) && video.duration > 0) {
          res(video.duration)
          return
        }
        // Infinity duration (processed/webm): seek to a large time to force browser to reveal real duration
        const onDur = () => {
          video.removeEventListener("durationchange", onDur)
          if (isFinite(video.duration)) { res(video.duration); return }
          // Fallback: seek to end trick
          video.currentTime = 1e10
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked)
            res(video.currentTime || 30)
          }
          video.addEventListener("seeked", onSeeked)
        }
        video.addEventListener("durationchange", onDur)
        video.currentTime = 1e10
      })
    }

    video.onloadedmetadata = async () => {
      const vW = video.videoWidth || 720
      const vH = video.videoHeight || 1280
      const sourceDuration = await resolveActualDuration()
      const outputDuration = sourceDuration / playbackSpeed  // final video duration at new speed

      /* ── Canvas ───────────────────────────────────── */
      const canvas = document.createElement("canvas")
      canvas.width = vW
      canvas.height = vH
      const ctx = canvas.getContext("2d")!

      /* ── Letterbox / pillarbox offsets ───────────── */
      const containerAspect = containerRect.width / containerRect.height
      const videoAspect = vW / vH
      let displayW: number, displayH: number, offsetX: number, offsetY: number

      if (videoAspect >= containerAspect) {
        displayW = containerRect.width
        displayH = containerRect.width / videoAspect
        offsetX = 0
        offsetY = (containerRect.height - displayH) / 2
      } else {
        displayH = containerRect.height
        displayW = containerRect.height * videoAspect
        offsetX = (containerRect.width - displayW) / 2
        offsetY = 0
      }

      /* ── MediaRecorder (no audio for speed-changed videos — avoids pitch issues) ── */
      const OUTPUT_FPS = 30
      const canvasStream = canvas.captureStream(OUTPUT_FPS)

      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" :
          MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" :
            MediaRecorder.isTypeSupported("video/webm") ? "video/webm" :
              ""

      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {})
      } catch {
        URL.revokeObjectURL(objectUrl)
        reject(new Error("Tu navegador no soporta grabación de video."))
        return
      }

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        URL.revokeObjectURL(objectUrl)
        const type = mimeType ? mimeType.split(";")[0] : "video/webm"
        resolve(new Blob(chunks, { type }))
      }
      recorder.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error("Error al procesar el video"))
      }

      /* ── Frame-by-frame render ─────────────────────────────────────────────
       * We step through the source video frame-by-frame at OUTPUT_FPS.
       * Each step seeks to the correct source time, waits for seeked, draws,
       * then moves to the next frame. This guarantees correct speed without
       * relying on playbackRate or real-time wall clock.
       * sourceTimePerOutputFrame = (1/OUTPUT_FPS) * playbackSpeed
       * ──────────────────────────────────────────────────────────────────── */
      const OUTPUT_FPS_STEP = 1 / OUTPUT_FPS  // seconds per output frame
      let stopped = false
      let frameIndex = 0
      const totalOutputFrames = Math.ceil(outputDuration * OUTPUT_FPS)

      const stop = () => {
        if (stopped) return
        stopped = true
        video.onseeked = null
        if (recorder.state !== "inactive") recorder.stop()
      }

      const drawFrame = (sourceTime: number) => {
        const currentFilterCss = (sourceTime >= filterStartTime && sourceTime <= filterEndTime) ? filterCss : "none"
        const currentCombined = buildCombinedFilter(currentFilterCss, adjustmentsCss)
        ctx.clearRect(0, 0, vW, vH)
        if (currentCombined !== "none") {
          ctx.filter = currentCombined
          ctx.drawImage(video, 0, 0, vW, vH)
          ctx.filter = "none"
        } else {
          ctx.drawImage(video, 0, 0, vW, vH)
        }
        if (stickerOverlays.length > 0) {
          drawStickerOverlays(ctx, stickerOverlays, sourceTime, containerRect, vW, vH, displayW, displayH, offsetX, offsetY)
        }
        if (overlays.length > 0) {
          drawTextOverlays(ctx, overlays, containerRect, vW, vH, displayW, displayH, offsetX, offsetY)
        }
      }

      const nextFrame = () => {
        if (stopped) return
        frameIndex++
        if (frameIndex >= totalOutputFrames) {
          stop()
          return
        }
        const sourceTime = Math.min(frameIndex * OUTPUT_FPS_STEP * playbackSpeed, sourceDuration)
        if (onProgress) onProgress(Math.min(99, (frameIndex / totalOutputFrames) * 100))

        video.onseeked = () => {
          drawFrame(sourceTime)
          // Use setTimeout to yield to MediaRecorder before next seek
          setTimeout(nextFrame, 0)
        }
        video.currentTime = sourceTime
      }

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error("Error al cargar el video"))
      }

      // Draw first frame, start recorder, then process remaining frames
      video.currentTime = 0
      video.onseeked = () => {
        drawFrame(0)
        recorder.start(100)
        setTimeout(nextFrame, 0)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("No se pudo cargar el video"))
    }
    video.load()
  })
}
