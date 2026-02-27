import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Share,
  Settings,
  Link as LinkIcon,
  Play,
  X,
  Share2,
  MessageCircle,
  Heart,
  User,
  Sparkles,
  Pause,
  Eye,
} from "lucide-react"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import BottomNavbar from "../Layout/ButtonNavar"
import { connect, useDispatch } from "react-redux"
import type { RootState } from "../../store"
import { getUser } from "../../redux/actions/GetUser"
import { getUserMedia } from "../../redux/actions/GetUserMedia"
import { useWebSocket } from "../../hooks/useWebSocket"
import { createLike } from "../../redux/actions/createLike"
import { createView } from "../../redux/actions/createView"
import { getComment } from "../../redux/actions/getComment"
import { createComment } from "../../redux/actions/createComment"

const WS_URL = "ws://localhost:8001/ws"

// --- Interfaces ---
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
  followed_all_acount: number
}

interface VideoItem {
  id: string
  uuid?: string
  video: string
  user_id?: { username: string; profile_picture: string; id: number }
  likes_count: number
  comments_count: number
  media_user?: object
  view_acount?: number
  liked?: boolean
  current_user_followered?: boolean
  create_at?: string
  content?: string
}

interface Comment {
    uuid: string;
    user_id: { username: string; profile_picture: string };
    content: string;
    create_at: string;
}

interface ProfileSeccionProps {
  getUser: (username: string) => void
  user: UserInterface | null
  getUserMedia: (username: string) => void
  media_user: VideoItem[]
}

function ProfileSeccion({ getUser, user, getUserMedia, media_user }: ProfileSeccionProps) {
  const dispatch = useDispatch();
  const userParams = useParams<{ username?: string }>()
  const { username } = userParams
  
  // --- Estados Generales ---
  const [isMuted, setIsMuted] = useState(true)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]) 
  const userref = useRef(false)
  const mediaref = useRef(false)
  const [activeTab, setActiveTab] = useState("latest")
  const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;

  // --- Estados Grid ---
  const [isGridVideoPlaying, setIsGridVideoPlaying] = useState<Record<string, boolean>>({})
  const [transientIconState, setTransientIconState] = useState<{ videoId: string; icon: 'play' | 'pause' } | null>(null)
  const iconTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Estados Modal FullScreen & Lógica Streaming ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialScrollIndex, setInitialScrollIndex] = useState<number>(0)
  const [activeModalIndex, setActiveModalIndex] = useState<number>(0)
  const modalContainerRef = useRef<HTMLDivElement>(null)
  const modalVideoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Lógica importada de StreamingUI
  const [localMedia, setLocalMedia] = useState<VideoItem[]>(media_user || []);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoDuration, setVideoDuration] = useState<Record<string, number>>({});
  const [showLikeAnimation, setShowLikeAnimation] = useState<Record<string, boolean>>({});
  
  // Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [commentText, setCommentText] = useState("")
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // --- 1. Sincronización y WebSocket ---
  useEffect(() => {
    if(media_user) {
        setLocalMedia(media_user);
    }
  }, [media_user]);

  const handleWSMessage = useCallback((data: any) => {
    if (data.event === "like_updated") {
      setLocalMedia(prev => prev.map((video) => {
          if (video.id === data.video_id) {
            return { ...video, likes_count: data.likes, liked: data.liked };
          }
          return video;
      }));
    }
    if (data.event === "new_comment") {
      if (data && data.user_id) {
        setLocalMedia(prev => prev.map((video) => {
            if (video.id === data.video_id) {
              return { ...video, comments_count: data.comments_count };
            }
            return video;
        }));
        if(currentVideoId === data.video_id) {
             setComments((prevComments) => [data, ...(prevComments || [])]);
        }
      }
    }
    if (data.event === "new_view") {
      setLocalMedia(prev => prev.map((video) => {
          if (video.id === data.video_id) {
            return { ...video, view_acount: data.view_acount };
          }
          return video;
      }));
    }
  }, [currentVideoId]);

  useWebSocket(WS_URL, handleWSMessage);

  // --- 2. Carga Inicial de Usuario ---
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

  // --- 3. Lógica Grid ---
  const handleVideoClickOrDoubleClick = (video: any, index: number) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      openModalAtIndex(index);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        const videoElement = videoRefs.current[index];
        handleGridVideoToggle(video.id, videoElement);
      }, 300);
    }
  };

  const handleGridVideoToggle = (videoId: string, videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    const currentlyPlaying = isGridVideoPlaying[videoId] || false;
    if (iconTimeoutRef.current) {
      clearTimeout(iconTimeoutRef.current); setTransientIconState(null);
    }
    const newPlayingState = !currentlyPlaying;
    if (newPlayingState) {
      videoRefs.current.forEach((ref, index) => {
        const currentVideoId = localMedia[index]?.id;
        if (ref && currentVideoId !== videoId && isGridVideoPlaying[currentVideoId]) {
          ref.pause();
          setIsGridVideoPlaying(prev => ({ ...prev, [currentVideoId]: false }));
        }
      });
      videoElement.play().catch(console.error);
    } else {
      videoElement.pause();
    }
    setIsGridVideoPlaying((prev) => ({ ...prev, [videoId]: newPlayingState }));
    setTransientIconState({ videoId: videoId, icon: newPlayingState ? 'play' : 'pause' });
    iconTimeoutRef.current = setTimeout(() => setTransientIconState(null), 1000);
  };

  // --- 4. Lógica de Interacciones ---
  const handleLikeClick = (videoId: string) => {
    createLike({ video_id: videoId })(dispatch).then(() => {
      console.log("Like enviado");
    }).catch((error) => console.error("Error like:", error));

    setShowLikeAnimation((prev) => ({ ...prev, [videoId]: true }));
    setTimeout(() => {
      setShowLikeAnimation((prev) => ({ ...prev, [videoId]: false }));
    }, 1000);
  };

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoElement = e.currentTarget;
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;

    setVideoProgress(prev => ({ ...prev, [videoId]: currentTime }));
    if (videoDuration[videoId] !== duration && isFinite(duration)) {
      setVideoDuration(prev => ({ ...prev, [videoId]: duration }));
    }

    if (videoElement.currentTime >= 10 && !viewedVideos.has(videoId)) {
      createView({
        video_id: videoId,
      })(dispatch).catch(console.error);
      setViewedVideos((prev) => {
        const newSet = new Set(prev);
        newSet.add(videoId);
        return newSet;
      });
    }
  };

  const handleSeek = (videoId: string, newTime: number) => {
    const index = localMedia?.findIndex(v => v.id?.toString() === videoId);
    if (index === undefined || index === -1) return;
    if(isModalOpen) {
        const videoElement = modalVideoRefs.current[index];
        if (videoElement) {
            videoElement.currentTime = newTime;
            setVideoProgress(prev => ({ ...prev, [videoId]: newTime }));
        }
    }
  };

  const handleCommentClick = (video: VideoItem) => {
    if (!video) return;
    const vidId = video.id.toString();
    setCurrentVideoId(vidId);
    setShowCommentsModal(true);
    getComment({ video_id: video.uuid || "" })(dispatch).then((res) => {
        setComments(Array.isArray(res) ? res : [])
    });
  }

  const handlePostComment = () => {
    if (!commentText.trim() || !currentVideoId) return;
    createComment({
      video_id: currentVideoId,
      content: commentText
    })(dispatch).then(() => {
      setCommentText("");
    }).catch(console.error);
  }

  // --- 5. Lógica Modal FullScreen ---
  const openModalAtIndex = (index: number) => {
    videoRefs.current.forEach(v => v?.pause());
    setIsGridVideoPlaying({});
    setInitialScrollIndex(index);
    setActiveModalIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveModalIndex(-1);
    setShowCommentsModal(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const generateAudioLevels = () => Array.from({ length: 15 }, () => Math.random() * 100);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = Number(entry.target.getAttribute('data-index'));
        setActiveModalIndex(index);
      }
    });
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.6 });
    const elements = document.querySelectorAll('.modal-video-item');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isModalOpen, localMedia, handleIntersection]);

  useEffect(() => {
    if (!isModalOpen) return;
    modalVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeModalIndex) {
        video.play().catch(e => console.log("Autoplay prevented", e));
      } else {
        video.pause();
      }
    });
  }, [activeModalIndex, isModalOpen]);

  useEffect(() => {
    if (isModalOpen && modalContainerRef.current) {
        setTimeout(() => {
            const element = document.getElementById(`modal-video-${initialScrollIndex}`);
            if (element) element.scrollIntoView({ behavior: 'auto' });
        }, 10);
    }
  }, [isModalOpen, initialScrollIndex]);

  // --- RENDER ---
  return (
    <>
      <div className="min-h-screen text-white flex flex-col items-center bg-[#050718] font-sans">
        {/* Fondo Dinámico */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-black opacity-80"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div>
          {/* <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div> */}
        </div>

        {/* --- CONTENIDO PRINCIPAL DEL PERFIL RESTAURADO --- */}
        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center pb-24">
          
          {/* Banner Curvo */}
          <div className="w-full h-40 md:h-52 relative overflow-hidden rounded-b-[2.5rem] shadow-2xl shadow-[#7000ff]/20">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff] via-[#4c1d95] to-[#00f0ff] opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          </div>

          <div className="px-4 w-full flex flex-col items-center -mt-16 md:-mt-20 space-y-4">
            
            {/* Foto de Perfil (Restaurada) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative p-1.5 rounded-full bg-gradient-to-tr from-[#7000ff] to-[#00f0ff]"
            >
              <div className="rounded-full p-1 bg-[#050718]">
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden">
                    {user?.profile_picture ? (
                    <img
                        className="w-full h-full object-cover"
                        src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${user.profile_picture}`}
                        alt={user.username}
                    />
                    ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-12 h-12 text-white/50" />
                    </div>
                    )}
                </div>
              </div>
              {/* Badge (Restaurado) */}
              <div className="absolute bottom-2 right-2 bg-[#00f0ff] text-[#050718] p-1.5 rounded-full border-4 border-[#050718]">
                <Sparkles size={14} fill="currentColor" />
              </div>
            </motion.div>

            {/* Texto de Información (Restaurado) */}
            <div className="text-center space-y-1">
              <motion.h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {user?.first_name || "Usuario"}
              </motion.h1>
              <motion.p className="text-[#a2b0ff] font-medium">
                @{user?.username || user?.email?.split('@')[0] || "anonimo"}
              </motion.p>
            </div>

            {/* Stats en Tarjeta Glassmorphism (Restaurada COMPLETAMENTE) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-8 md:gap-12 py-4 px-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 w-full max-w-sm mt-4 shadow-xl"
            >
              <div className="flex flex-col items-center cursor-pointer group">
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                    {user?.follower_all_acount || 0}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">Seguidores</span>
              </div>
              
              <div className="w-px h-8 bg-white/10"></div>
              
              <div className="flex flex-col items-center cursor-pointer group">
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                    {user?.followed_all_acount || 0}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">Seguidos</span>
              </div>
              
              <div className="w-px h-8 bg-white/10"></div>
              
              <div className="flex flex-col items-center cursor-pointer group">
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                    {user?.like_all_count || 0}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">Likes</span>
              </div>
            </motion.div>

            {/* Bio y Enlace (Restaurado) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center max-w-md px-4 pt-2"
            >
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                {user?.bio || 'Creativo digital compartiendo momentos únicos.'}
              </p>
              
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-[#00f0ff]">
                <a href="#" className="flex items-center gap-1.5 hover:underline decoration-[#00f0ff]/50">
                    <LinkIcon size={14} />
                    <span>website.com</span>
                </a>
              </div>
            </motion.div>

            {/* Botones de Acción (Restaurados - ESTO FALTABA EN TU SEGUNDA FOTO) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 pt-2 w-full max-w-xs justify-center"
            >
              <Button 
                className="flex-1 bg-white text-black hover:bg-gray-200 font-semibold rounded-xl h-10 transition-transform active:scale-95"
              >
                Seguir
              </Button>
              <Button 
                variant="outline"
                className="flex-1 bg-transparent border-gray-600 hover:bg-white/10 hover:border-white text-white rounded-xl h-10"
              >
                Mensaje
              </Button>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                    <Share size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                    <Settings size={18} />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Grid de Contenido */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full mt-8 px-2 md:px-0"
          >
            <Tabs defaultValue="latest" value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Tabs Flotantes (Restaurados) */}
                <div className="sticky top-2 z-30 px-4 mb-6">
                    <div className="relative mx-auto max-w-sm"> 
                        <div className="absolute -inset-px rounded-full bg-gradient-to-r from-[#7000ff]/30 to-[#00f0ff]/30 opacity-50 blur-sm"></div>
                        <TabsList className="relative grid w-full grid-cols-3 bg-[#0c1033]/90 backdrop-blur-xl border border-white/10 rounded-full p-1 h-auto">
                        {["latest", "popular", "oldest"].map((tab) => (
                            <TabsTrigger
                            key={tab}
                            value={tab}
                            className={`rounded-full text-xs md:text-sm font-medium py-2 transition-all duration-300 capitalize
                                data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7000ff] data-[state=active]:to-[#00f0ff] data-[state=active]:text-white data-[state=active]:shadow-lg
                                ${activeTab === tab ? "" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                            >
                            {tab}
                            </TabsTrigger>
                        ))}
                        </TabsList>
                    </div>
                </div>

              <TabsContent value="latest" className="px-1 md:px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {localMedia.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group rounded-xl overflow-hidden bg-zinc-900 aspect-[9/16]"
                      onClick={() => handleVideoClickOrDoubleClick(video, index)}
                    >
                      <div className="relative h-full w-full">
                        <video
                          ref={(el) => (videoRefs.current[index] = el)}
                          muted={isMuted}
                          loop
                          playsInline
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        >
                          <source src={video.video} type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium">
                            <Play className="h-3 w-3 text-white" fill="white" />
                            <span className="text-white">{video.view_acount || 0}</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <AnimatePresence>
                                {transientIconState?.videoId === video.id && (
                                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className="bg-black/40 backdrop-blur-sm p-3 rounded-full">
                                        {transientIconState.icon === 'play' ? <Play className="h-6 w-6 text-white" fill="white" /> : <Pause className="h-6 w-6 text-white" fill="white" />}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
        <BottomNavbar />
      </div>

      {/* --- MODAL FULL SCREEN (Lógica Nueva + Estilo TikTok) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="absolute top-4 right-4 z-[60]">
                 <motion.button onClick={closeModal} className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/10">
                    <X size={24} />
                 </motion.button>
            </div>

            <div 
                ref={modalContainerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none' }} 
            >
                {localMedia.map((video, index) => (
                    <div 
                        key={video.id} 
                        id={`modal-video-${index}`}
                        data-index={index}
                        className="modal-video-item w-full h-full snap-center relative flex items-center justify-center bg-black"
                    >
                        <video
                            ref={(el) => (modalVideoRefs.current[index] = el)}
                            src={video.video}
                            className="w-full h-full object-cover md:object-contain max-h-screen"
                            loop
                            muted={isMuted}
                            playsInline
                            onClick={toggleMute}
                            onTimeUpdate={(e) => handleVideoProgress(e, video.id.toString())}
                        />

                        {/* Overlays del Modal */}
                        {!isMuted && activeModalIndex === index && (
                            <div className="absolute bottom-8 left-4 flex h-16 items-end space-x-1 z-10 pointer-events-none">
                                {generateAudioLevels().map((level, i) => (
                                    <motion.div key={i} className="w-1 bg-gradient-to-t from-[#7000ff] to-[#00f0ff] rounded-full" initial={{ height: "10%" }} animate={{ height: `${level}%` }} transition={{ duration: 0.2, delay: i * 0.05, repeat: Infinity, repeatType: "reverse" }} />
                                ))}
                            </div>
                        )}

                        <div className="absolute bottom-20 left-4 z-10 max-w-[70%] text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-white font-bold text-lg drop-shadow-md">@{video.user_id?.username || user?.username}</h3>
                                <div className="bg-[#00f0ff] p-0.5 rounded-full"><Sparkles size={8} className="text-black" /></div>
                            </div>
                            <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md">
                                {video.content || "Mira este increíble video... #viral #fyp"}
                            </p>
                        </div>

                        {/* Barra de Progreso del Modal */}
                        <div className="absolute bottom-0 left-0 right-0 z-20 px-0 h-1 hover:h-2 transition-all group">
                            {(() => {
                                const vidId = video.id.toString();
                                const duration = videoDuration[vidId] || 1;
                                const progress = videoProgress[vidId] || 0;
                                const percentage = (progress / duration) * 100;
                                return (
                                    <div className="w-full h-full bg-gray-600/30 cursor-pointer">
                                        <div className="h-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff]" style={{ width: `${percentage}%` }} />
                                        <input 
                                            type="range" min="0" max={duration} value={progress} step="0.1"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleSeek(vidId, parseFloat(e.target.value))}
                                        />
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Botones Laterales del Modal */}
                        <div className="absolute right-2 bottom-20 md:right-4 md:bottom-24 flex flex-col items-center gap-6 z-20">
                            <div className="relative mb-2">
                                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                                    <img src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${video.user_id?.profile_picture || user?.profile_picture}`} className="w-full h-full object-cover" alt="user" />
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#ff0050] rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-white text-xs font-bold">+</div>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <motion.button 
                                    whileTap={{ scale: 0.8 }} 
                                    onClick={(e) => { e.stopPropagation(); handleLikeClick(video.id.toString()); }}
                                    className="bg-black/20 p-2 rounded-full backdrop-blur-sm relative"
                                >
                                    <Heart className={`w-8 h-8 drop-shadow-lg ${video.liked ? "fill-[#ff0050] text-[#ff0050]" : "text-white"}`} />
                                    <AnimatePresence>
                                        {showLikeAnimation[video.id] && (
                                            [...Array(3)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                                                    animate={{ opacity: 0, y: -60 - Math.random() * 40, x: (Math.random() - 0.5) * 30, scale: 1.2 }}
                                                    className="absolute top-0 left-0 pointer-events-none"
                                                >
                                                    <Heart className="w-6 h-6 fill-[#ff0050] text-[#ff0050]" />
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                                <span className="text-white text-xs font-bold drop-shadow-md">{video.likes_count || 0}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <motion.button 
                                    whileTap={{ scale: 0.8 }} 
                                    onClick={(e) => { e.stopPropagation(); handleCommentClick(video); }}
                                    className="bg-black/20 p-2 rounded-full backdrop-blur-sm"
                                >
                                    <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" />
                                </motion.button>
                                <span className="text-white text-xs font-bold drop-shadow-md">{video.comments_count || 0}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div className="bg-black/20 p-2 rounded-full backdrop-blur-sm">
                                    <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                                </div>
                                <span className="text-white text-xs font-bold drop-shadow-md">{video.view_acount || 0}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <motion.button whileTap={{ scale: 0.8 }} className="bg-black/20 p-2 rounded-full backdrop-blur-sm">
                                    <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                                </motion.button>
                                <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE COMENTARIOS --- */}
      <AnimatePresence>
        {showCommentsModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[70]" onClick={() => setShowCommentsModal(false)} />
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 h-[60vh] z-[80] bg-[#0c1033] rounded-t-3xl flex flex-col border-t border-[#2a2f5e]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[#2a2f5e]">
                    <h3 className="text-white font-bold">Comentarios</h3>
                    <button onClick={() => setShowCommentsModal(false)}><X className="text-gray-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(!comments || comments.length === 0) ? (
                         <div className="h-full flex items-center justify-center text-gray-500">Sé el primero en comentar.</div>
                    ) : (
                        comments.map((c, i) => (
                            <div key={c.uuid || i} className="flex gap-3">
                                <img src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${c.user_id.profile_picture}`} className="w-8 h-8 rounded-full object-cover" alt="u" />
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-gray-400 font-bold">{c.user_id.username}</span>
                                        <span className="text-xs text-gray-500">{c.create_at}</span>
                                    </div>
                                    <p className="text-sm text-white mt-0.5">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-3 border-t border-[#2a2f5e] bg-[#050718] flex items-center gap-2 pb-6 md:pb-3">
                    <img src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${currentUser?.profile_picture}`} className="w-8 h-8 rounded-full" alt="me" />
                    <input 
                        className="flex-1 bg-[#1a1f3a] rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                        placeholder="Añadir comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                    />
                    <button onClick={handlePostComment} className="text-[#00f0ff] font-bold text-sm px-2">Publicar</button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

const mapStateToProps = (state: RootState): ProfileSeccionProps => ({
  media_user: state.getMediaByUser.media_user,
  user: state.getUserDetail.user as UserInterface | null,
  getUser,
  getUserMedia,
})

export default connect(mapStateToProps, { getUser, getUserMedia })(ProfileSeccion)