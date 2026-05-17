import React, { useEffect, useRef, useState } from "react"

type StoryFilterCanvasProps = {
  source: string
  filterCss?: string | null
  active: boolean
  kind: "video" | "image"
  videoRef?: React.RefObject<HTMLVideoElement>
}

function fitContain(
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  if (!canvasWidth || !canvasHeight || !sourceWidth || !sourceHeight) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
  }

  const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height,
  }
}

export default function StoryFilterCanvas({
  source,
  filterCss,
  active,
  kind,
  videoRef,
}: StoryFilterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)
  const isReadyRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active || !filterCss || filterCss === "none") {
      isReadyRef.current = false
      setIsReady(false)
      return
    }

    const parent = canvas.parentElement
    if (!parent) return

    let rafId = 0
    let stopped = false
    let loadedImage: HTMLImageElement | null = null
    isReadyRef.current = false
    setIsReady(false)

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      return { ctx, rect }
    }

    const drawImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      const rect = parent.getBoundingClientRect()
      const { x, y, width, height } = fitContain(rect.width, rect.height, img.naturalWidth, img.naturalHeight)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.filter = filterCss || "none"
      ctx.drawImage(img, x, y, width, height)
      ctx.filter = "none"
    }

    const drawVideo = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement) => {
      const rect = parent.getBoundingClientRect()
      const sourceWidth = video.videoWidth || rect.width
      const sourceHeight = video.videoHeight || rect.height
      const { x, y, width, height } = fitContain(rect.width, rect.height, sourceWidth, sourceHeight)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.filter = filterCss || "none"
      ctx.drawImage(video, x, y, width, height)
      ctx.filter = "none"
    }

    const redrawImage = () => {
      const prepared = resizeCanvas()
      if (!prepared || !loadedImage) return
      const { ctx } = prepared
      drawImage(ctx, loadedImage)
      if (!isReadyRef.current) {
        isReadyRef.current = true
        setIsReady(true)
      }
    }

    const renderImage = () => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        if (stopped) return
        loadedImage = img
        redrawImage()
      }
      img.src = source
    }

    const renderVideo = () => {
      const prepared = resizeCanvas()
      if (!prepared) return
      const { ctx } = prepared

      const frame = () => {
        if (stopped) return
        const video = videoRef?.current
        if (video && video.readyState >= 2) {
          drawVideo(ctx, video)
          if (!isReadyRef.current) {
            isReadyRef.current = true
            setIsReady(true)
          }
        }
        rafId = window.requestAnimationFrame(frame)
      }

      frame()
    }

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        if (kind === "image") {
          redrawImage()
        } else {
          resizeCanvas()
        }
      })
      : null
    ro?.observe(parent)

    if (kind === "video") {
      renderVideo()
    } else {
      renderImage()
    }

    return () => {
      stopped = true
      ro?.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active, filterCss, kind, source, videoRef])

  if (!active || !filterCss || filterCss === "none") return null

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-75 ${isReady ? "opacity-100" : "opacity-0"}`}
    />
  )
}
