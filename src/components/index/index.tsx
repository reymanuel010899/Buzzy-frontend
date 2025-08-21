"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Canvas } from "@react-three/fiber"
import { XR, createXRStore, type XRStore } from "@react-three/xr"
import * as THREE from "three"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import "@tensorflow/tfjs"
import type { Video as VideoPro } from "./main.interface"
import { Eye, MessageCircle, Heart, Volume2, VolumeX, Zap, Compass, Star } from "lucide-react"
import BottomNavbar from "../Layout/ButtonNavar"
import Categories from "./categoria"
import { motion, AnimatePresence } from "framer-motion"

// Create XR store outside the component to avoid re-creation
const xrStore: XRStore = createXRStore()

interface StreamingUIProps {
  media: VideoPro[] | null
}

interface DetectedObject {
  class: string
  position: THREE.Vector3
}

const ARVideo: React.FC<{
  videoUrl: string
  onLoaded?: () => void
  onClose?: () => void
}> = ({ videoUrl, onClose }) => {
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isXRSupported, setIsXRSupported] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Preload del modelo COCO-SSD
  useEffect(() => {
    const preloadModel = async () => {
      try {
        await cocoSsd.load()
        console.log("Modelo COCO-SSD pre-cargado con éxito")
      } catch (err) {
        console.error("Error al pre-cargar modelo:", err)
      }
    }
    preloadModel()
  }, [])

  // Verificar soporte de WebXR
  useEffect(() => {
    if ("xr" in navigator) {
      navigator.xr
        ?.isSessionSupported("immersive-ar")
        .then((supported) => {
          setIsXRSupported(supported)
          if (!supported) {
            setErrorMessage("WebXR no está soportado en este dispositivo.")
          }
          setIsLoading(false)
        })
        .catch((error) => {
          console.error("Error al verificar WebXR:", error)
          setIsXRSupported(false)
          setErrorMessage(`Error al verificar WebXR: ${error.message}`)
          setIsLoading(false)
        })
    } else {
      setIsXRSupported(false)
      setErrorMessage("WebXR no está disponible en este navegador.")
      setIsLoading(false)
    }
  }, [])

  // Detectar objeto
  useEffect(() => {
    const detectObject = async () => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      video.crossOrigin = "anonymous"
      video.src = videoUrl
      video.muted = true
      video.loop = true
      video.playsInline = true

      const handleLoadedData = async () => {
        if (video.readyState >= 2) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          try {
            const model = await cocoSsd.load()
            const predictions = await model.detect(canvas)

            if (predictions.length > 0) {
              const mainObject = predictions[0]
              const randomPosition = new THREE.Vector3((Math.random() - 0.5) * 4, 0.1, -1 - Math.random() * 3)
              setDetectedObject({ class: mainObject.class, position: randomPosition })
            } else {
              setErrorMessage("No se detectaron objetos en el video.")
            }
          } catch {
            setErrorMessage("Error al detectar objeto")
          }
        }
      }

      video.onloadeddata = handleLoadedData
      video.onerror = (e) => console.error("Error al cargar el video:", e)
      video.play().catch((error) => {
        console.error("Error al reproducir video:", error)
        setErrorMessage(`Error al reproducir video: ${error.message}`)
      })

      return () => {
        if (video) {
          video.pause()
          video.src = ""
        }
      }
    }

    detectObject()
  }, [videoUrl])

  const ARObject: React.FC<{ position: THREE.Vector3; onFound: () => void }> = ({ position }) => {
    const meshRef = useRef<THREE.Mesh>(null)

    return (
      <mesh ref={meshRef} position={position} scale={[0.3, 0.3, 0.3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#050718] z-50">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-50 blur-md animate-pulse"></div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
              <div className="h-10 w-10 rounded-full border-4 border-t-transparent border-[#00f0ff] animate-spin"></div>
            </div>
          </div>
        </div>
      ) : errorMessage ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 flex items-center justify-center p-6"
        >
          <div className="relative max-w-md w-full p-6 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7000ff]/20 to-[#00f0ff]/20 backdrop-blur-md"></div>
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-2">Error</h3>
              <p className="text-[#a2b0ff]">{errorMessage}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-lg text-white font-medium"
              >
                Volver
              </motion.button>
            </div>
          </div>
        </motion.div>
      ) : isXRSupported ? (
        <Canvas>
          <XR store={xrStore}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            {detectedObject && (
              <ARObject position={detectedObject.position} onFound={() => console.log("¡Objeto encontrado!")} />
            )}
          </XR>
        </Canvas>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="relative max-w-md w-full p-6 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7000ff]/20 to-[#00f0ff]/20 backdrop-blur-md"></div>
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-2">No compatible</h3>
              <p className="text-[#a2b0ff]">WebXR no está soportado en este dispositivo o navegador.</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-lg text-white font-medium"
              >
                Volver
              </motion.button>
            </div>
          </div>
        </div>
      )}
      <video ref={videoRef} autoPlay muted loop playsInline style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <motion.button
        whileTap={{ scale: 0.9 }}
        className="absolute top-6 right-6 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.5)]"
        onClick={onClose}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.button>

      {detectedObject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-10 left-0 right-0 flex justify-center"
        >
          <div className="bg-[#0c1033]/70 backdrop-blur-md px-6 py-3 rounded-full border border-[#2a2f5e]">
            <p className="text-[#00f0ff] font-medium flex items-center">
              <Compass className="mr-2 h-5 w-5" />
              Busca el <span className="text-white mx-1">{detectedObject.class}</span> en el mundo AR
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

const StreamingUI = ({ media }: StreamingUIProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 500)
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({})
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [isARActive, setIsARActive] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const mainRef = useRef<HTMLDivElement>(null)
  const [showCategories, setShowCategories] = useState(false)

  useEffect(() => {
    console.log(isMobile)
    const handleResize = () => setIsMobile(window.innerWidth <= 500)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle scroll for parallax and other effects
  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setScrollPosition(mainRef.current.scrollTop)
      }
    }

    const mainElement = mainRef.current
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll)
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          const index = videoRefs.current.findIndex((ref) => ref === video)

          if (entry.isIntersecting) {
            video.play()
            setActiveVideo(index)
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.6 },
    )

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video)
    })

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video)
      })
    }
  }, [media])

  const handleVideoClick = (index: number) => {
    const video = media?.[index]
    if (!video) {
      alert("No se encontró el video.")
      return
    }
    setIsARActive(index)
  }

  const handleLikeClick = (videoId: string) => {
    setIsLiked((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }))
    console.log(`Se hizo click en "Like" del video con ID: ${videoId}`)
  }

  const toggleMute = () => setIsMuted(!isMuted)
  const closeAR = () => setIsARActive(null)

  // Generate audio visualization data
  const generateAudioLevels = () => {
    return Array.from({ length: 20 }, () => Math.random() * 100)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050718] text-white font-sans">
      {/* Dynamic background with animated gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f3c] via-[#1a1a4a] to-[#0f0f3c] opacity-80"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

        {/* Animated orbs in background */}
        <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div>
        <div className="absolute top-2/3 left-1/2 h-32 w-32 rounded-full bg-[#a200ff]/20 blur-3xl animate-float-slow"></div>
      </div>

      {/* App header */}
      <header
        className={`fixed top-0 left-0 right-0 z-20 transition-all duration-500 ease-in-out ${scrollPosition > 50 ? "bg-black/30 backdrop-blur-lg" : "bg-transparent"}`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative mr-3"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] blur-sm"></div>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff]">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#00f0ff]"
            >
              NebulaStream
            </motion.h1>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCategories(!showCategories)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
          >
            <Star className="h-4 w-4 text-[#00f0ff]" />
            <span className="text-sm">Categorías</span>
          </motion.button>
        </div>
      </header>

      {/* Categories panel */}
      <AnimatePresence>
        {showCategories && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-30 bg-[#0c1033]/90 backdrop-blur-md border-b border-[#2a2f5e] p-4"
          >
            <Categories />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCategories(false)}
              className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main ref={mainRef} className="h-screen w-full overflow-y-auto pt-16 pb-20">
        {/* Hero section */}
        <section className="relative w-full px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative w-full h-[300px] rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#7000ff]/30 to-[#00f0ff]/30"></div>
            <div className="absolute inset-0 backdrop-blur-sm flex flex-col justify-center items-center px-4">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00f0ff] to-white mb-6 text-center"
              >
                Iniciar transmisión en vivo
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/lives" className="relative inline-flex items-center justify-center">
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm"></div>
                  <div className="relative flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#0c1033] border border-[#2a2f5e] text-white font-medium">
                    <Zap className="h-5 w-5 text-[#00f0ff]" />
                    <span>Comenzar</span>
                  </div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Videos grid */}
        <section className="px-4 py-6">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold mb-6 flex items-center"
          >
            <Star className="mr-2 h-5 w-5 text-[#00f0ff]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a2b0ff]">
              Trending Series
            </span>
          </motion.h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {media?.map((data, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-xl overflow-hidden"
                style={{ height: "700px" }}
              >
                {/* Video container with glass effect border */}
                <div className="absolute inset-0 rounded-xl overflow-hidden group">
                  {/* Glow border effect */}
                  <AnimatePresence>
                    {activeVideo === index && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-0.5 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-xl opacity-50 blur-sm"
                      ></motion.div>
                    )}
                  </AnimatePresence>

                  {/* Video */}
                  <div className="relative h-[700px] w-full rounded-xl overflow-hidden">
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                      onClick={() => handleVideoClick(index)}
                    >
                      <source src={data.video} type="video/mp4" />
                      Tu navegador no soporta el formato de video.
                    </video>

                    {/* Overlay gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050718] via-[#050718]/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Mute/unmute button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleMute()
                      }}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </motion.button>

                    {/* AR button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-xs font-medium"
                      onClick={() => handleVideoClick(index)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 18.5C15.5899 18.5 18.5 15.5899 18.5 12C18.5 8.41015 15.5899 5.5 12 5.5C8.41015 5.5 5.5 8.41015 5.5 12C5.5 15.5899 8.41015 18.5 12 18.5Z"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <path
                          d="M4.5 7.5L7.5 4.5M19.5 4.5L16.5 7.5M4.5 16.5L7.5 19.5M19.5 19.5L16.5 16.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>AR</span>
                    </motion.button>

                    {/* User info and interactions */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                      {/* User info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#2a2f5e] group-hover:border-[#00f0ff] transition-colors duration-300">
                          <img
                            className="h-full w-full object-cover"
                            src={`${data.user_id?.profile_picture ? data.user_id.profile_picture : "http://localhost:8000/media/profile_pics/avatar.webp"}`}
                            alt=""
                          />
                        </div>
                        <Link
                          className="text-white font-medium hover:text-[#00f0ff] transition-colors"
                          to={`/profile/${data.user_id?.username}`}
                        >
                          {data.user_id?.username}
                        </Link>
                      </div>

                      {/* Audio visualization */}
                      {activeVideo === index && !isMuted && (
                        <div className="mb-4 flex h-8 items-center space-x-0.5">
                          {generateAudioLevels().map((level, i) => (
                            <motion.div
                              key={i}
                              className="h-full w-1 bg-gradient-to-t from-[#7000ff] to-[#00f0ff] rounded-full"
                              initial={{ height: "10%" }}
                              animate={{
                                height: `${level}%`,
                                opacity: 1,
                              }}
                              transition={{
                                duration: 0.2,
                                delay: i * 0.01,
                                repeat: Number.POSITIVE_INFINITY,
                                repeatType: "reverse",
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Interaction buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLikeClick((data.id?.toString() || "1"))
                            }}
                            className="flex flex-col items-center"
                          >
                            <motion.div
                              animate={{ scale: isLiked[data.id || "1"] ? [1, 1.3, 1] : 1 }}
                              transition={{ duration: 0.3 }}
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                isLiked[data.id || "1"] ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"
                              }`}
                            >
                              <Heart className={`h-5 w-5 ${isLiked[data.id || "1"] ? "fill-red-500" : ""}`} />
                            </motion.div>
                            <span className="text-xs mt-1">{data.like_count || 0}</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <MessageCircle className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1">{data.comments_count || 0}</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <Eye className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1">{data.view_acount || 0}</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* AR Modal */}
      <AnimatePresence>
        {isARActive !== null && media && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ARVideo videoUrl={media[isARActive].video} onLoaded={() => console.log("AR cargado")} onClose={closeAR} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orbital navigation */}
      
        <BottomNavbar />
      
    </div>
  )
}

export default StreamingUI
