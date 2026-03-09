import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
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
  Video,
  CreditCard,
  UserCog,
  Shield,
  Bell,
  Instagram,
  Clock,
  Zap,
  Facebook,
  Check,
  Trash2,
  Phone,
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
import { getBaseUrl } from "../../redux/client/api-client"
import { createFollower } from "../../redux/actions/createFollower"
import SubscriptionModal from "./SubscriptionModal"
import { getSubscriptionPlans, createCheckoutSession, startCall } from "../../redux/actions/subscriptionActions"
import { saveAvailability, getAvailability, getAvailabilityStatus } from "../../redux/actions/saveAvailability"
import { getSocialAccounts, initSocialOAuth, disconnectSocialAccount, SocialPlatform } from "../../redux/actions/socialAccountsActions"
import { useChat } from "../../context/ChatContext"
import type { SocialAccount } from "../../redux/reducers/socialAccountsReducer"
import { FaTiktok } from "react-icons/fa"
import EditProfileModal from "./EditProfileModal"
import BankAccountModal from "./BankAccountModal"

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
  profile_video?: string
  username: string
  follower_all_acount: number | null
  total_social_followers: number
  like_all_count: number
  followed_all_acount: number
  is_following?: boolean
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
  user_id: {
    username: string;
    profile_picture: string;
    subscription_status?: {
      plan_name: string;
      is_active: boolean;
    };
  };
  content: string;
  create_at: string;
}

interface ProfileSeccionProps {
  getUser: (username: string) => void
  user: UserInterface | null
  getUserMedia: (username: string) => void
  media_user: VideoItem[]
  getSubscriptionPlans: () => any
  createCheckoutSession: (planId: number) => any
  startCall: () => any
  subscriptionPlans: any[]
  saveAvailability: (payload: { start_time: string; end_time: string; days: number[] }) => any
  getAvailability: () => any
  initSocialOAuth: (platform: SocialPlatform) => any
  disconnectSocialAccount: (platform: SocialPlatform) => any
  getSocialAccounts: () => any
  // Availability Redux state
  availabilitySaving: boolean
  availabilitySaved: boolean
  availabilityError: string | null
  availabilityData: any | null
  // Social accounts Redux state
  socialAccounts: SocialAccount[]
  socialLoading: boolean
  getAvailabilityStatus: (username: string) => any
}

function ProfileSeccion({
  getUser,
  user,
  getUserMedia,
  media_user,
  getSubscriptionPlans,
  createCheckoutSession,
  startCall,
  subscriptionPlans,
  saveAvailability,
  getAvailability,
  availabilitySaving,
  availabilityError,
  socialAccounts,
  getAvailabilityStatus: _getAvailabilityStatus,
  getSocialAccounts: _getSocialAccounts,
  initSocialOAuth,
  disconnectSocialAccount,
}: ProfileSeccionProps) {
  const userParams = useParams<{ username?: string }>()
  const { username } = userParams
  const navigate = useNavigate()
  const dispatch = useDispatch()

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

  // Suscripciones
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Wallet
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConnectSocialModal, setShowConnectSocialModal] = useState(false);
  // === NUEVOS ESTADOS PARA HORARIO DE DISPONIBILIDAD ===
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  ]);
  const [availabilitySaveSuccess, setAvailabilitySaveSuccess] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const { setShowMessages } = useChat();
  const [showProfileMediaOptions, setShowProfileMediaOptions] = useState(false);
  const [showFullProfileMedia, setShowFullProfileMedia] = useState(false);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    is_available: boolean;
    can_voice: boolean;
    can_video: boolean;
    remaining_calls: number;
    plan_name: string;
    upgrade_required: boolean;
  } | null>(null);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Formatear hora 24h → 12h con AM/PM (igual que la imagen)
  const formatTime12h = (time24: string) => {
    if (!time24) return "08:00 AM";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Day abbreviation → index number (Mon=0 ... Sun=6) matching Django's choices
  const dayToIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const indexToDay: Record<number, string> = {
    0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun",
  };

  const handleSaveAvailability = async () => {
    const days = selectedDays.map(d => dayToIndex[d]).filter(n => n !== undefined);
    try {
      await saveAvailability({ start_time: startTime, end_time: endTime, days });
      setAvailabilitySaveSuccess(true);
      setTimeout(() => {
        setAvailabilitySaveSuccess(false);
        setShowAvailabilityModal(false);
      }, 1800);
    } catch {
      // El error ya queda en Redux state (availabilityError)
    }
  };

  // When modal opens, load saved schedule from the backend
  const handleOpenAvailabilityModal = () => {
    getAvailability().then((data: any[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setStartTime(data[0].start_time);
        setEndTime(data[0].end_time);
        setSelectedDays(data.map((a: any) => indexToDay[a.day_of_week]).filter(Boolean));
      }
    }).catch(() => { });
    setShowAvailabilityModal(true);
  };

  // --- 1. Sincronización y WebSocket ---
  useEffect(() => {
    if (media_user) {
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
        if (currentVideoId === data.video_id) {
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

  useEffect(() => {
    if (username) {
      _getAvailabilityStatus(username).then((data: any) => {
        setAvailabilityStatus(data);
      }).catch(console.error);
      _getSocialAccounts();
    }
  }, [_getAvailabilityStatus, _getSocialAccounts, username]);

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
      ;
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
    if (isModalOpen) {
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

  const handleOpenSubscriptionModal = () => {
    getSubscriptionPlans();
    setShowSubscriptionModal(true);
  };

  const handleSelectPlan = (planId: number) => {
    createCheckoutSession(planId);
  };

  const handleStartCall = () => {
    startCall().then((res: any) => {
      alert(res.message);
      // Here you would navigate to the call room if implemented
    }).catch((err: string) => {
      alert(err);
    });
  };

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

  // === FUNCIONES DE LOS NUEVOS MODALES ===
  const handleSaveBankAccount = () => {
    setShowBankAccountModal(true);
  };

  const handleEditOption = (option: string) => {
    if (option === "Editar perfil") {
      setShowEditProfileModal(true);
    } else {
      alert(`✏️ Opción seleccionada: ${option} (listo para conectar con tu backend)`);
    }
  };

  const handleConnectSocial = (platform: SocialPlatform) => {
    initSocialOAuth(platform);
  };

  const handleDisconnectSocial = (platform: SocialPlatform) => {
    disconnectSocialAccount(platform);
  };

  // Helper to find a connected account by platform
  const getConnectedAccount = (platform: SocialPlatform): SocialAccount | undefined =>
    socialAccounts?.find(a => a.platform === platform);

  const handleMessageClick = () => {
    // Check if we're viewing someone else's profile and we don't follow them
    if (currentUser?.username !== username && user && !user.is_following) {
      setShowFollowPrompt(true);
      return;
    }

    // If we follow them or it's our profile or there is no clear state, just try to open chat
    setShowMessages(true);
  };

  const handleFollowAndMessage = () => {
    if (user?.id) {
      createFollower({ follower_user_id: user.id.toString() })(dispatch).then(() => {
        setShowFollowPrompt(false);
        // Force opening messages after following
        setShowMessages(true);
        // We could theoretically set user.is_following = true locally to prevent prompt next time
        if (user) {
          user.is_following = true;
        }
      }).catch(err => {
        console.error("Error following:", err);
        setShowFollowPrompt(false);
        setShowMessages(true); // fall back to showing messages anyway
      });
    }
  };

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
          <div className="w-full h-30 md:h-52 relative overflow-hidden rounded-b-[2.5rem] shadow-2xl shadow-[#7000ff]/20">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff] via-[#4c1d95] to-[#00f0ff] opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          </div>

          <div className="px-4 w-full flex flex-col items-center -mt-16 md:-mt-20 space-y-4">

            {/* Foto de Perfil (Restaurada) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative p-1.5 rounded-full bg-gradient-to-tr from-[#7000ff] to-[#00f0ff] cursor-pointer"
              onClick={() => setShowProfileMediaOptions(true)}
            >
              <div className="rounded-full p-1 bg-[#050718]">
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden">
                  {user?.profile_video ? (
                    <video
                      className="w-full h-full object-cover"
                      src={`${user.profile_video}`}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : user?.profile_picture ? (
                    <img
                      className="w-full h-full object-cover"
                      src={`${getBaseUrl()}${user.profile_picture}`}
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
              className="flex items-center justify-center gap-8 md:gap-12 py-1 px-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 w-full max-w-sm mt-4 shadow-xl"
            >
              <div className="flex flex-col items-center cursor-pointer group">
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {(user?.follower_all_acount || 0) + (user?.total_social_followers || 0)}
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
                onClick={handleOpenSubscriptionModal}
                className="flex-1 bg-white text-black hover:bg-gray-200 font-semibold rounded-xl h-10 transition-transform active:scale-95"
              >
                Suscribirte
              </Button>
              <Button
                variant="outline"
                onClick={handleMessageClick}
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#00f0ff]/50 text-white rounded-xl h-10 backdrop-blur-md transition-all duration-300"
              >
                Mensaje
              </Button>

              {currentUser?.username !== username && (
                <div className="flex gap-2">
                  {/* Icono de Llamada de Voz */}
                  <div className="relative">
                    <Button
                      onClick={handleStartCall}
                      disabled={!availabilityStatus?.can_voice}
                      variant="ghost"
                      size="icon"
                      className={`rounded-xl h-10 w-10 flex-shrink-0 border ${availabilityStatus?.can_voice
                        ? "bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-500/30"
                        : "bg-gray-600/20 text-gray-400 border-gray-500/30 opacity-50"
                        }`}
                    >
                      <Phone size={18} />
                    </Button>
                    {availabilityStatus?.is_available && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050718] animate-pulse"></div>
                    )}
                  </div>

                  {/* Icono de Video Llamada */}
                  <div className="relative">
                    <Button
                      onClick={handleStartCall}
                      disabled={!availabilityStatus?.can_video}
                      variant="ghost"
                      size="icon"
                      className={`rounded-xl h-10 w-10 flex-shrink-0 border ${availabilityStatus?.can_video
                        ? "bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-500/30"
                        : "bg-gray-600/20 text-gray-400 border-gray-500/30 opacity-50"
                        }`}
                    >
                      <Video size={18} />
                    </Button>
                    {availabilityStatus?.is_available && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050718] animate-pulse"></div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                  <Share size={18} />
                </Button>
                {currentUser?.username === username && (
                  <Button onClick={() => setShowSettingsModal(true)} variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                    <Settings size={18} />
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Mensaje de Upgrade si es necesario */}
            {availabilityStatus?.upgrade_required && currentUser?.username !== username && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xs mt-4 relative"
              >
                {/* Glow Effect */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-500"></div>

                <Button
                  onClick={handleOpenSubscriptionModal}
                  className="relative w-full h-11 bg-black/40 backdrop-blur-xl border border-white/20 text-white font-bold rounded-2xl shadow-2xl overflow-hidden group transition-all duration-300 hover:border-[#00f0ff]/50 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/20 to-[#00f0ff]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    UPGRADE PLAN OR WAIT NEXT MONTH
                  </span>
                </Button>
              </motion.div>
            )}
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
      </div >

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        user={user}
      />

      <BankAccountModal
        isOpen={showBankAccountModal}
        onClose={() => setShowBankAccountModal(false)}
      />

      {/* ===================== MODAL CONFIGURACIÓN (SETTINGS) ===================== */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 30, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className=" bg-[#0a0a0f] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"> </div>
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-brrounded-2xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Configuración</h2>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Lista de opciones */}
              <div className="p-3">
                {/* 1. Cuenta Bancaria (especial) */}
                <div
                  onClick={handleSaveBankAccount}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <CreditCard size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-white group-hover:text-emerald-400 transition-colors">Cuenta Bancaria</p>
                    <p className="text-xs text-gray-400">Donde recibirás el dinero de tu wallet</p>
                  </div>
                  <div className="text-emerald-400">
                    <span className="text-xs font-medium">AGREGAR</span>
                  </div>
                </div>

                {/* Otras opciones de edición */}
                <div
                  onClick={() => handleEditOption("Editar perfil")}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-11 h-11 bg-[#7000ff]/10 text-[#7000ff] rounded-2xl flex items-center justify-center">
                    <UserCog size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white group-hover:text-[#7000ff]">Editar perfil</p>
                  </div>
                </div>

                <div
                  onClick={() => handleEditOption("Privacidad y seguridad")}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-11 h-11 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
                    <Shield size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white group-hover:text-amber-400">Privacidad y seguridad</p>
                  </div>
                </div>

                <div
                  onClick={() => handleEditOption("Notificaciones")}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-11 h-11 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center">
                    <Bell size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white group-hover:text-sky-400">Notificaciones</p>
                  </div>
                </div>

                {/* Nueva opción: Horario de disponibilidad para llamadas */}
                <div
                  onClick={() => {
                    // const horario = prompt(
                    //   "Ingresa tus horarios disponibles para recibir llamadas de tus suscriptores.\nEjemplo: Lun 10:00-12:00; Mie 16:00-18:00"
                    // );
                    // if (horario === null) return; // usuario canceló
                    // if (!horario.trim()) {
                    //   alert("No se guardó: el horario está vacío.");
                    //   return;
                    // }
                    // // Aquí puedes reemplazar el alert por una llamada al backend/Redux
                    // alert("Horario guardado: " + horario);
                  }}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985] mt-2"
                >
                  <div className="w-11 h-11 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center">
                    <UserCog size={26} />
                  </div>
                  <div className="flex-1" onClick={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => handleOpenAvailabilityModal(), 280);
                  }}
                  >
                    <p className="font-semibold text-white group-hover:text-violet-400">Horario de disponibilidad</p>
                    <p className="text-xs text-gray-400">Define cuándo pueden agendarte llamadas tus suscriptores</p>
                  </div>
                  <div className="text-violet-400">
                    <span className="text-xs font-medium">EDITAR</span>
                  </div>
                </div>

                {/* ===================== BOTÓN CONECTAR REDES (item de abajo) ===================== */}
                <div
                  onClick={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => setShowConnectSocialModal(true), 300);
                  }}
                  className="mt-6 mx-auto flex items-center justify-center gap-3 bg-gradient-to-r from-[#1c1427] to-[#142122] text-white font-semibold py-4 px-8 rounded-2xl shadow-xl shadow-[#7000ff]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Share2 size={20} />
                  CONECTAR REDES SOCIALES
                </div>
              </div>

              <div className="px-6 py-6 text-center text-[10px] text-white/40">
                Versión 1.4.2 • Soporte wallet activa
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ===================== NUEVO MODAL HORARIO DE DISPONIBILIDAD (ESTILO IDÉNTICO A TU APP) ===================== */}
      <AnimatePresence>
        {showAvailabilityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setShowAvailabilityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-[#0f0f13] border border-white/10 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header más estilizado */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white tracking-tight">Disponibilidad</h2>
                </div>
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Grid para horas (Inicio y Fin en paralelo o bloques compactos) */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Hora Inicio */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-widest text-emerald-400/80 font-bold ml-1">Hora de inicio</label>
                    <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 group focus-within:border-emerald-500/50 transition-all">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-transparent text-2xl font-medium text-white focus:outline-none w-full appearance-none"
                      />
                      <div className="flex flex-col items-end border-l border-white/10 pl-4">
                        <span className="text-[10px] text-white/40 leading-none">MODO</span>
                        <span className="text-sm font-bold text-emerald-400">{formatTime12h(startTime).split(" ")[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hora Fin */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-widest text-red-400/80 font-bold ml-1">Hora de fin</label>
                    <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 group focus-within:border-red-500/50 transition-all">
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-transparent text-2xl font-medium text-white focus:outline-none w-full appearance-none"
                      />
                      <div className="flex flex-col items-end border-l border-white/10 pl-4">
                        <span className="text-[10px] text-white/40 leading-none">MODO</span>
                        <span className="text-sm font-bold text-red-400">{formatTime12h(endTime).split(" ")[1]}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Días de la Semana con diseño refinado */}
                <div className="pt-2">
                  <p className="text-white/50 text-xs font-medium mb-3 ml-1">Repetir semanalmente:</p>
                  <div className="flex justify-between gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isActive = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all duration-300 border ${isActive
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                            }`}
                        >
                          {day.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer con el botón estilo "Premium" que ya usas */}
              <div className="px-6 pb-8 pt-2">
                {availabilitySaveSuccess ? (
                  <div className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                    <span>✅ ¡Horario guardado!</span>
                  </div>
                ) : availabilityError ? (
                  <div className="w-full text-center text-red-400 text-sm py-2 mb-2">{availabilityError}</div>
                ) : null}
                {!availabilitySaveSuccess && (
                  <button
                    onClick={handleSaveAvailability}
                    disabled={availabilitySaving}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {availabilitySaving ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> Guardando...</>
                    ) : "GUARDAR CONFIGURACIÓN"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ===================== MODAL CONECTAR REDES SOCIALES ===================== */}
      <AnimatePresence>
        {showConnectSocialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setShowConnectSocialModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12121a] border border-white/10 rounded-[32px] w-full max-w-[360px] overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-tight">Conectar redes</h3>
                <button
                  onClick={() => setShowConnectSocialModal(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all transform hover:rotate-90"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-3 relative z-10">
                {/* Instagram */}
                {(() => {
                  const connected = getConnectedAccount('instagram');
                  return (
                    <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#f56040] via-[#c13584] to-[#833ab4] rounded-xl flex items-center justify-center shadow-lg">
                          <Instagram className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">Instagram</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 font-medium">
                              {connected ? `@${connected.platform_username}` : 'Sin conectar'}
                            </p>
                            {connected && (
                              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                                {connected.followers_count?.toLocaleString() || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <>
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title="Conectado">
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('instagram')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title="Desconectar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('instagram')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            Conectar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TikTok */}
                {(() => {
                  const connected = getConnectedAccount('tiktok');
                  return (
                    <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                          <FaTiktok className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">TikTok</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 font-medium">
                              {connected ? `@${connected.platform_username}` : 'Sin conectar'}
                            </p>
                            {connected && (
                              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                                {connected.followers_count?.toLocaleString() || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <>
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title="Conectado">
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('tiktok')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title="Desconectar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('tiktok')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            Conectar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Facebook */}
                {(() => {
                  const connected = getConnectedAccount('facebook');
                  return (
                    <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#1877f2] rounded-xl flex items-center justify-center shadow-lg">
                          <Facebook className="w-6 h-6 text-white" fill="currentColor" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">Facebook</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 font-medium">
                              {connected ? `@${connected.platform_username}` : 'Sin conectar'}
                            </p>
                            {connected && (
                              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                                {connected.followers_count?.toLocaleString() || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <>
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title="Conectado">
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('facebook')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title="Desconectar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('facebook')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            Conectar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="px-6 pb-6 pt-1">
                <div className="bg-white/[0.03] rounded-xl p-3 flex items-center gap-3 border border-white/5">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg">
                    <Zap size={14} className="text-purple-400" />
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug font-medium">
                    Tu alcance total suma tus seguidores de Buzzy y redes externas.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL FULL SCREEN (Lógica Nueva + Estilo TikTok) --- */}
      <AnimatePresence>
        {
          isModalOpen && (
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
                          <img src={`${getBaseUrl()}${video.user_id?.profile_picture || user?.profile_picture}`} className="w-full h-full object-cover" alt="user" />
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
          )
        }
      </AnimatePresence >

      {/* --- MODAL DE COMENTARIOS --- */}
      <AnimatePresence>
        {
          showCommentsModal && (
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
                    [...comments].sort((a, b) => {
                      const planOrder: { [key: string]: number } = {
                        'FRIEND': 0,
                        'PLUS': 1,
                        'VIP': 2,
                        'NONE': 3
                      };
                      const aPlan = a.user_id.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
                      const bPlan = b.user_id.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
                      return (planOrder[aPlan] ?? 4) - (planOrder[bPlan] ?? 4);
                    })
                      .map((c, i) => {
                        const planName = c.user_id.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
                        const isFriend = planName === 'FRIEND';
                        const isPlus = planName === 'PLUS';
                        const isVip = planName === 'VIP';

                        return (
                          <div key={c.uuid || i} className={`flex gap-3 p-3 rounded-2xl transition-all relative overflow-hidden ${isFriend ? 'bg-white/5 backdrop-blur-md border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : isVip ? 'bg-amber-400/5 border border-amber-400/10' : isPlus ? 'bg-purple-400/5 border border-purple-400/10' : ''}`}>
                            {isFriend && (
                              <motion.div
                                initial={{ x: '-100%', opacity: 0 }}
                                animate={{ x: '200%', opacity: [0, 0.3, 0] }}
                                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                                className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent skew-x-12 pointer-events-none"
                              />
                            )}
                            <div className={`relative p-[1.5px] rounded-full h-fit ${c.user_id.subscription_status?.is_active
                              ? isFriend
                                ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.4)] transition-transform group-hover:scale-105'
                                : isVip
                                  ? 'bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 animate-pulse'
                                  : isPlus
                                    ? 'bg-gradient-to-tr from-purple-400 to-pink-500'
                                    : 'bg-transparent'
                              : 'bg-transparent'
                              }`}>
                              <img src={`${getBaseUrl()}${c.user_id.profile_picture}`} className="w-8 h-8 rounded-full object-cover border border-black" alt="u" />
                              {(isVip || isFriend) && (
                                <div className={`absolute -top-1 -right-1 ${isFriend ? 'bg-cyan-400' : 'bg-amber-400'} rounded-full p-0.5 border border-black shadow-sm`}>
                                  <Sparkles size={6} className="text-black" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isFriend ? 'text-cyan-400' : isVip ? 'text-amber-300' : isPlus ? 'text-purple-300' : 'text-gray-400'}`}>
                                  {c.user_id.username}
                                </span>
                                {isFriend && (
                                  <span className="text-[7px] bg-white/10 backdrop-blur-md text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/20 font-bold tracking-widest uppercase">DIAMOND</span>
                                )}
                                {isVip && (
                                  <span className="text-[8px] bg-amber-400/20 text-amber-400 px-1 rounded-sm font-bold uppercase border border-amber-400/20">VIP</span>
                                )}
                                {isPlus && (
                                  <span className="text-[8px] bg-purple-400/20 text-purple-400 px-1 rounded-sm font-bold uppercase border border-purple-400/20">PLUS</span>
                                )}
                                <span className="text-[10px] text-gray-500">{new Date(c.create_at).toLocaleDateString()}</span>
                              </div>
                              <p className={`text-sm mt-0.5 ${isVip ? 'text-amber-50/90' : 'text-white'}`}>{c.content}</p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
                <div className="p-3 border-t border-[#2a2f5e] bg-[#050718] flex items-center gap-2 pb-6 md:pb-3">
                  <img src={`${getBaseUrl()}${currentUser?.profile_picture}`} className="w-8 h-8 rounded-full" alt="me" />
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
          )
        }
      </AnimatePresence >

      {/* Profile Media Options Modal */}
      <AnimatePresence>
        {showProfileMediaOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileMediaOptions(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
            >
              <div className="bg-[#0c1033] border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-2 px-2">
                  <h3 className="text-white font-bold">Opciones de perfil</h3>
                  <button onClick={() => setShowProfileMediaOptions(false)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <button
                  className="w-full text-left px-4 py-3 rounded-xl text-white hover:bg-white/10 font-medium transition-colors"
                  onClick={() => {
                    setShowProfileMediaOptions(false);
                    setShowFullProfileMedia(true);
                  }}
                >
                  Ver Perfil
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-xl text-white hover:bg-white/10 font-medium transition-colors"
                  onClick={() => {
                    setShowProfileMediaOptions(false);
                    navigate("/");
                  }}
                >
                  Ver historias
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Profile Media Modal */}
      <AnimatePresence>
        {showFullProfileMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-lg"
          >
            <button
              onClick={() => setShowFullProfileMedia(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-[70] p-2 bg-black/50 rounded-full"
            >
              <X size={28} />
            </button>
            <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
              {user?.profile_video ? (
                <video
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-[#7000ff]/20"
                  src={`${user.profile_video}`}
                  autoPlay
                  controls
                  playsInline
                />
              ) : user?.profile_picture ? (
                <img
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-[#7000ff]/20"
                  src={`${user.profile_picture}`}
                  alt={user.username}
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center rounded-xl">
                  <User className="w-24 h-24 text-white/50" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow Before Message Prompt */}
      <AnimatePresence>
        {showFollowPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFollowPrompt(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
            >
              <div className="bg-[#0c1033] border border-white/10 rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-[#7000ff] to-[#00f0ff] p-1">
                  <img
                    className="w-full h-full object-cover rounded-full"
                    src={`${user?.profile_picture || '/profile_pics/avatar.webp'}`}
                    alt="user"
                  />
                </div>
                <h3 className="text-xl text-white font-bold mb-2">Seguir para enviar mensaje</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Debes seguir a @{user?.username} antes de enviarle un mensaje directo.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/5 rounded-xl h-11"
                    onClick={() => setShowFollowPrompt(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white hover:opacity-90 rounded-xl h-11 border-none shadow-lg shadow-[#00f0ff]/20"
                    onClick={handleFollowAndMessage}
                  >
                    Seguir y chatear
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        plans={subscriptionPlans}
        onSelectPlan={handleSelectPlan}
      />

    </>
  )
}

const mapStateToProps = (state: RootState): any => ({
  media_user: state.getMediaByUser.media_user,
  user: state.getUserDetail.user as UserInterface | null,
  subscriptionPlans: state.subscriptionReducer.plans,
  // Availability
  availabilitySaving: (state as any).availabilityReducer?.saving ?? false,
  availabilitySaved: (state as any).availabilityReducer?.saved ?? false,
  availabilityError: (state as any).availabilityReducer?.error ?? null,
  availabilityData: (state as any).availabilityReducer?.availability ?? null,
  // Social accounts
  socialAccounts: (state as any).socialAccountsReducer?.accounts ?? [],
  socialLoading: (state as any).socialAccountsReducer?.loading ?? false,
})

export default connect(mapStateToProps, {
  getUser,
  getUserMedia,
  getSubscriptionPlans,
  createCheckoutSession,
  startCall,
  saveAvailability,
  getAvailability,
  getSocialAccounts,
  initSocialOAuth,
  disconnectSocialAccount,
  getAvailabilityStatus,
})(ProfileSeccion)