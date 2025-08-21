"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Share,
  Settings,
  LinkIcon,
  Volume2,
  VolumeX,
  Play,
  X,
  Share2,
  Bookmark,
  MessageCircle,
  Heart,
  User,
  Sparkles,
} from "lucide-react"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import BottomNavbar from "../Layout/ButtonNavar"
import { connect } from "react-redux"
import type { RootState } from "../../store"
import { getUser } from "../../redux/actions/GetUser"
import { getUserMedia } from "../../redux/actions/GetUserMedia"

interface UserInterface {
  bio: string
  birthdate: string | null
  email: string
  first_name: string
  id: number
  is_superuser: boolean
  last_login: string | null
  last_name: string
  profile_picture: string
  username: string
  follower_all_acount: number | null
  like_all_count: number
}

interface VideoItem {
  id: string
  video: string
  user_id?: { username: string; profile_picture: string }
  likes_count: number
  comments_count: number
  media_user?: object
  view_acount?: number
}

interface ProfileSeccionProps {
  getUser: (username: string) => void
  user: UserInterface | null
  getUserMedia: (username: string) => void
  media_user: VideoItem[]
}

function ProfileSeccion({ getUser, user, getUserMedia, media_user }: ProfileSeccionProps) {
  const [isMuted, setIsMuted] = useState(true)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const data = {
    username: user?.first_name || "",
    displayName: user?.email || "",
    following: 35,
    likes: user?.like_all_count || 0,
    followers: user?.follower_all_acount || 0,
    description: "SOMOS UNA EMPRESA QUE GESTIONA SOFTWARE EMPRESARIALES GRATIS, SOLO PRUEBALO",
    websiteUrl: "youtube.com/channel/UCgeF...",
  }
  const userref = useRef(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({})
  const [isComment, setIsComment] = useState(false)
  // const [isView, setIsView] = useState(false)
  const mediaref = useRef(false)
  const userParams = useParams<{ username?: string }>()
  const { username } = userParams
  const [activeTab, setActiveTab] = useState("latest")
  const [scrollPosition, setScrollPosition] = useState(0)
  console.log("Username from params:",isComment,scrollPosition )
  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!userref.current && username) {
      getUser(username)
      userref.current = true
    }
  }, [getUser, username])

  useEffect(() => {
    if (!mediaref.current && username) {
      getUserMedia(username)
      mediaref.current = true
    }
  }, [getUserMedia, username])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            video.play()
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 },
    )

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video)
    })

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video)
      })
    }
  }, [media_user])

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVideoClick = (video: VideoItem) => {
    console.log(video)
    setSelectedVideo(video)
  }

  const closeFullScreen = () => {
    setSelectedVideo(null)
    if (videoRefs.current[0]) {
      videoRefs.current[0].pause()
    }
  }

  const handleLikeClick = (videoId: string) => {
    setIsLiked((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }))
    console.log(`Se hizo click en "Like" del video con ID: ${videoId}`)
  }

  const handleCommentClick = (videoId: string) => {
    setIsComment(true)
    console.log(`Se hizo click en "Comentario" del video con ID: ${videoId}`)
  }

  // Generate audio visualization data
  const generateAudioLevels = () => {
    return Array.from({ length: 20 }, () => Math.random() * 100)
  }

  return (
    <>
      <div className="min-h-screen text-white flex flex-col items-center bg-[#050718]">
        {/* Dynamic background with animated gradient */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f3c] via-[#1a1a4a] to-[#0f0f3c] opacity-80"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

          {/* Animated orbs in background */}
          <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div>
          <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div>
          <div className="absolute top-2/3 left-1/2 h-32 w-32 rounded-full bg-[#a200ff]/20 blur-3xl animate-float-slow"></div>
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center space-y-8 px-4 pt-20 pb-24">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-6 w-full"
          >
            {/* Profile picture */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-md"></div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-[#2a2f5e]"
              >
                {user?.profile_picture ? (
                  <img
                    className="w-full h-full object-cover"
                    src={`http://127.0.0.1:8000${user.profile_picture}`}
                    alt={user.username}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 hover:opacity-0 transition-opacity duration-300"></div>
              </motion.div>
            </div>

            {/* User info */}
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#00f0ff]"
              >
                {data.username}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[#a2b0ff]"
              >
                {data.displayName}
              </motion.p>
            </div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3"
            >
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#0c1033]/80 border-[#2a2f5e] hover:bg-[#0c1033] hover:border-[#00f0ff]"
                >
                  <Share className="h-4 w-4 text-[#00f0ff]" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#0c1033]/80 border-[#2a2f5e] hover:bg-[#0c1033] hover:border-[#00f0ff]"
                >
                  <Settings className="h-4 w-4 text-[#00f0ff]" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#0c1033]/80 border-[#2a2f5e] hover:bg-[#0c1033] hover:border-[#00f0ff]"
                >
                  <LinkIcon className="h-4 w-4 text-[#00f0ff]" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-8 text-sm"
            >
              <div className="text-center group cursor-pointer">
                <div className="font-bold text-xl text-white group-hover:text-[#00f0ff] transition-colors">
                  {data.following}
                </div>
                <div className="text-[#a2b0ff] group-hover:text-white transition-colors">Following</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="font-bold text-xl text-white group-hover:text-[#00f0ff] transition-colors">
                  {data.followers || 0}
                </div>
                <div className="text-[#a2b0ff] group-hover:text-white transition-colors">Followers</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="font-bold text-xl text-white group-hover:text-[#00f0ff] transition-colors">
                  {data.likes || 0}
                </div>
                <div className="text-[#a2b0ff] group-hover:text-white transition-colors">Likes</div>
              </div>
            </motion.div>

            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center max-w-sm"
            >
              <p className="text-[#a2b0ff]">{data.description}</p>
              <a
                href={`https://${data.websiteUrl}`}
                className="text-[#00f0ff] hover:text-white transition-colors text-sm mt-2 block"
              >
                {data.websiteUrl}
              </a>
            </motion.div>
          </motion.div>

          {/* Content tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <Tabs defaultValue="latest" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative">
                <div className="absolute -inset-px rounded-full bg-gradient-to-r from-[#7000ff]/50 to-[#00f0ff]/50 opacity-50 blur-sm"></div>
                <TabsList className="relative grid w-full grid-cols-3 bg-[#0c1033]/80 backdrop-blur-md border border-[#2a2f5e] rounded-full overflow-hidden">
                  <TabsTrigger
                    value="latest"
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7000ff] data-[state=active]:to-[#00f0ff] data-[state=active]:text-white data-[state=active]:border-none rounded-full transition-all duration-300 ${
                      activeTab === "latest" ? "" : "text-[#a2b0ff] hover:text-white"
                    }`}
                  >
                    Latest
                  </TabsTrigger>
                  <TabsTrigger
                    value="popular"
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7000ff] data-[state=active]:to-[#00f0ff] data-[state=active]:text-white data-[state=active]:border-none rounded-full transition-all duration-300 ${
                      activeTab === "popular" ? "" : "text-[#a2b0ff] hover:text-white"
                    }`}
                  >
                    Popular
                  </TabsTrigger>
                  <TabsTrigger
                    value="oldest"
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7000ff] data-[state=active]:to-[#00f0ff] data-[state=active]:text-white data-[state=active]:border-none rounded-full transition-all duration-300 ${
                      activeTab === "oldest" ? "" : "text-[#a2b0ff] hover:text-white"
                    }`}
                  >
                    Oldest
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="latest" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {media_user && media_user.length > 0 ? (
                    media_user.map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative group rounded-xl overflow-hidden"
                        style={{ height: "300px" }}
                        onClick={() => handleVideoClick(video)}
                      >
                        {/* Glow border effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-xl opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>

                        {/* Video container */}
                        <div className="relative h-full w-full rounded-xl overflow-hidden">
                          {/* Mute/unmute button */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMute()
                            }}
                          >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </motion.button>

                          {/* Video */}
                          <video
                            ref={(el) => (videoRefs.current[index] = el)}
                            autoPlay
                            muted={isMuted}
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                          >
                            <source src={`http://127.0.0.1:8000/${video.video}`} type="video/mp4" />
                            Tu navegador no soporta el formato de video.
                          </video>

                          {/* Overlay gradients */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#050718] via-[#050718]/40 to-transparent"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* Play count */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-sm">
                            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md rounded-full px-2.5 py-1">
                              <Play className="h-3.5 w-3.5 text-[#00f0ff]" />
                              <span className="text-xs">{video.view_acount || 0}</span>
                            </div>
                          </div>

                          {/* Hover play button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00f0ff]/30 backdrop-blur-md"
                            >
                              <Play className="h-5 w-5 text-white" fill="white" />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
                      <div className="relative mb-4">
                        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
                          <Sparkles className="h-8 w-8 text-[#00f0ff]" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">No hay videos disponibles</h3>
                      <p className="text-[#a2b0ff] max-w-xs">
                        Los videos que subas aparecerán aquí para que todos puedan verlos
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="popular">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="relative mb-4">
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md"></div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
                      <Sparkles className="h-8 w-8 text-[#00f0ff]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Popular content</h3>
                  <p className="text-[#a2b0ff] max-w-xs">
                    Tus videos más populares aparecerán aquí cuando tengan suficientes vistas
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="oldest">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="relative mb-4">
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md"></div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
                      <Sparkles className="h-8 w-8 text-[#00f0ff]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Oldest content</h3>
                  <p className="text-[#a2b0ff] max-w-xs">
                    Aquí encontrarás tus primeros videos ordenados cronológicamente
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Bottom navbar */}
        <BottomNavbar />
      </div>

      {/* Fullscreen video modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={closeFullScreen}
          >
            <div
              className="relative w-full h-full max-w-4xl"
              style={{ height: "100vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/50 transition-colors"
                onClick={closeFullScreen}
              >
                <X className="w-6 h-6" />
              </motion.button>

              <video
                ref={(el) => (videoRefs.current[0] = el)}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                className="w-full h-full object-cover"
                style={{ maxHeight: "100vh", maxWidth: "100vw" }}
                onError={(e) => console.error("Error al cargar el video en pantalla completa:", e)}
              >
                <source src={`http://127.0.0.1:8000/${selectedVideo.video}`} type="video/mp4" />
                Tu navegador no soporta el formato de video.
              </video>

              {/* Audio visualization */}
              {!isMuted && (
                <div className="absolute bottom-20 left-6 flex h-20 items-end space-x-0.5">
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

              {/* Video controls */}
              <div className="absolute right-6 bottom-20 flex flex-col items-center gap-6">
                {/* Profile */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm"></div>
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-[#2a2f5e]">
                      <img
                        src={`http://127.0.0.1:8000${selectedVideo.user_id?.profile_picture || "/profile_pics/avatar.webp"}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <span className="text-white text-xs">+</span>
                </motion.div>

                {/* Like button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLikeClick(selectedVideo.id)
                    }}
                    className="relative group"
                  >
                    <div
                      className={`absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 ${
                        isLiked[selectedVideo.id] ? "opacity-70" : "group-hover:opacity-50"
                      } blur-sm transition-opacity duration-300`}
                    ></div>
                    <div
                      className={`relative flex h-12 w-12 items-center justify-center rounded-full ${
                        isLiked[selectedVideo.id]
                          ? "bg-[#0c1033]/80"
                          : "bg-black/30 backdrop-blur-md border border-white/10"
                      }`}
                    >
                      <Heart
                        className={`w-6 h-6 ${isLiked[selectedVideo.id] ? "fill-[#ff0066] text-[#ff0066]" : "text-white"}`}
                      />
                    </div>
                  </button>
                  <span className="text-white text-xs">{selectedVideo.likes_count || 0}</span>
                </motion.div>

                {/* Comment button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCommentClick(selectedVideo.id)
                    }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  </button>
                  <span className="text-white text-xs">{selectedVideo.comments_count || 0}</span>
                </motion.div>

                {/* Bookmark button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button className="relative group" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                      <Bookmark className="w-6 h-6 text-white" />
                    </div>
                  </button>
                  <span className="text-white text-xs">54K</span>
                </motion.div>

                {/* Share button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button className="relative group" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                  </button>
                  <span className="text-white text-xs">81.5K</span>
                </motion.div>

                {/* Mute/unmute button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute()
                    }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                      {isMuted ? (
                        <VolumeX className="w-6 h-6 text-white" />
                      ) : (
                        <Volume2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </button>
                  <span className="text-white text-xs">{isMuted ? "Unmute" : "Mute"}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const mapStateToProps = (state: RootState) => ({
  media_user: state.getMediaByUser.media_user,
  user: null,
})

export default connect(mapStateToProps, { getUser, getUserMedia })(ProfileSeccion)
