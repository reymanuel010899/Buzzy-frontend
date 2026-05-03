"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X, TrendingUp, Clock, Sparkles, User, Play, ChevronRight } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { RootState, AppDispatch } from "../../store"
import { globalSearch, getTrending, getRecentSearch, deleteRecentSearch } from "../../redux/actions/Search"
import "../../footer.css"
import { getBaseUrl, getMediaUrl } from "../../redux/client/api-client"
import { createFollower } from "../../redux/actions/createFollower"

interface FluidSearchProps {
  onClose: () => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

type Tab = "populares" | "usuarios" | "videos"

export default function FluidSearch({ onClose, searchTerm, setSearchTerm }: FluidSearchProps) {
  console.log(searchTerm, "========================")
  const [isTyping, setIsTyping] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("populares")
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useDispatch<AppDispatch>()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { results, trending, recent, loading } = useSelector((state: RootState) => state.searchReducer)

  // Focus input on mount and fetch initial data
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
    dispatch(getTrending())
    dispatch(getRecentSearch())
  }, [dispatch])

  // Real search with debounce
  useEffect(() => {
      console.log("Efecto disparado por:", searchTerm); // <--- DEBUG 1

      // Limpiamos el timeout anterior siempre que el usuario escriba
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (searchTerm.trim().length > 1) {
        typingTimeoutRef.current = setTimeout(() => {
          console.log("Enviando búsqueda al servidor:", searchTerm); // <--- DEBUG 2
          globalSearch(searchTerm)(dispatch); // Forma estándar de Redux
          
          console.log("------------------------")
        }, 500);
      }

      return () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }, [searchTerm, dispatch])

  const handleRecentDelete = (term: string) => {
    dispatch(deleteRecentSearch(term))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md pt-16 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl bg-black p-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-400/20 blur-md"></div>
          <div className="relative flex items-center overflow-hidden rounded-xl bg-white/10 backdrop-blur-md border border-white/5">
            <Search className="ml-3 h-5 w-5 text-white/70" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsTyping(true)
                setTimeout(() => setIsTyping(false), 1000)
              }}
              placeholder="Buscar creadores, videos o temas"
              className="w-full bg-transparent py-3 pl-2 pr-10 text-white outline-none placeholder:text-white/50"
            />
            {searchTerm && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchTerm("")
                }}
                className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Fluid animation for typing indicator */}
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10 mb-4">
          <motion.div
            initial={{ width: "0%" }}
            animate={{
              width: (isTyping || loading) ? ["0%", "100%", "0%"] : "0%",
              left: (isTyping || loading) ? ["0%", "0%", "100%"] : "0%",
            }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: (isTyping || loading) ? Infinity : 0 }}
            className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-400"
          />
        </div>

        {/* Search content */}
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
          {!searchTerm ? (
            <>
              {/* Trending searches */}
              {trending.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4 text-purple-400" />
                    <h3 className="font-medium text-white/90">Trending</h3>
                  </div>
                  <div className="space-y-1">
                    {trending.map((item: any, index: number) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-white/80 transition-colors hover:bg-white/10 group"
                        onClick={() => setSearchTerm(item.term)}
                      >
                        <Sparkles className="mr-3 h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="flex-1 truncate">{item.term}</span>
                        <ChevronRight className="h-4 w-4 text-white/20 opacity-0 group-hover:opacity-100 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent searches */}
              {recent.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-blue-400" />
                      <h3 className="font-medium text-white/90">Recientes</h3>
                    </div>
                    <button
                      className="text-xs text-white/40 hover:text-white/60 transition-colors"
                      onClick={() => dispatch(deleteRecentSearch())}
                    >
                      Limpiar todo
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recent.map((item: any, index: number) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-white/80 transition-colors hover:bg-white/10 group cursor-pointer"
                        onClick={() => setSearchTerm(item.term)}
                      >
                        <Clock className="mr-3 h-4 w-4 text-white/30" />
                        <span className="flex-1 truncate">{item.term}</span>
                        <X
                          className="h-4 w-4 text-white/20 hover:text-white/60 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRecentDelete(item.term)
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Search results with Tabs */
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl mb-4 border border-white/5">
                {(["populares", "usuarios", "videos"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                      ? "bg-white/10 text-white shadow-lg border border-white/10"
                      : "text-white/40 hover:text-white/60"
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {activeTab === "populares" && (
                  <div className="space-y-4">
                    {results.users.length === 0 && results.videos.length === 0 && !loading && (
                      <div className="py-12 text-center">
                        <Search className="h-12 w-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/40">No se encontraron resultados para "{searchTerm}"</p>
                      </div>
                    )}

                    {/* Mixed Top Results */}
                    {results.users.slice(0, 3).map((user: any) => (
                      <UserResult key={user.id} user={user} onClose={onClose} />
                    ))}
                    {results.videos.slice(0, 3).map((video: any) => (
                      <VideoResult key={video.id} video={video} onClose={onClose} />
                    ))}
                  </div>
                )}

                {activeTab === "usuarios" && (
                  <div className="space-y-2">
                    {results.users.map((user: any) => (
                      <UserResult key={user.id} user={user} onClose={onClose} />
                    ))}
                    {results.users.length === 0 && !loading && (
                      <p className="text-center py-8 text-white/40">No se encontraron usuarios</p>
                    )}
                  </div>
                )}

                {activeTab === "videos" && (
                  <div className="space-y-2">
                    {results.videos.map((video: any) => (
                      <VideoResult key={video.id} video={video} onClose={onClose} />
                    ))}
                    {results.videos.length === 0 && !loading && (
                      <p className="text-center py-8 text-white/40">No se encontraron videos</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function UserResult({ user, onClose }: { user: any, onClose: () => void }) {
  const dispatch = useDispatch<AppDispatch>()
  const [isFollowing, setIsFollowing] = useState<boolean>(!!user.is_following)
  const [loading, setLoading] = useState(false)

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    // Optimistic update inmediato
    setIsFollowing(prev => !prev)
    setLoading(true)
    try {
      await dispatch(createFollower({ follower_user_id: user.id }))
    } catch {
      // Revertir si falla
      setIsFollowing(prev => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={() => {
        window.location.href = `/profile/${user.username}`
        onClose()
      }}
    >
      <div className="relative">
        <img
          src={getMediaUrl(user.profile_picture) || "/profile_pics/avatar.webp"}
          alt={user.username}
          className="w-12 h-12 rounded-full object-cover border-2 border-white/5 group-hover:border-purple-500/50 transition-colors"
        />
        <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-black">
          <User className="h-2 w-2 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium truncate">{user.first_name || user.username}</h4>
        <p className="text-white/40 text-xs truncate">@{user.username}</p>
      </div>
      <motion.button
        onClick={handleFollow}
        whileTap={{ scale: 0.93 }}
        animate={{ opacity: loading ? 0.6 : 1 }}
        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
          isFollowing
            ? "bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600/30"
            : "bg-white/10 text-white border-white/5 hover:bg-white/20"
        }`}
      >
        {isFollowing ? "Siguiendo" : "Seguir"}
      </motion.button>
    </motion.div>
  )
}

function VideoResult({ video, onClose }: { video: any, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={() => {
        // Redirigir al video - esto depende de tu router, usando href por simplicidad si no hay Link
        window.location.href = `/video/${video.uuid}`
        onClose()
      }}
    >
      <div className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/5">
        <img
          src={video.thumbnail_url || `${getBaseUrl()}${video.video_url}#t=0.1`}
          alt={video.description}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="h-4 w-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-white text-sm font-medium line-clamp-1 group-hover:text-purple-400 transition-colors">{video.description || "Video sin descripción"}</h4>
        <p className="text-white/40 text-[10px] mt-1 flex items-center gap-1">
          <span>{video.user_id.username}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-white/20"></span>
          <span>{video.view_acount} vistas</span>
        </p>
      </div>
    </motion.div>
  )
}
