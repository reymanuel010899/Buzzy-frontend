import { useEffect, useRef, useState, useCallback, useMemo } from "react"
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
  UserPlus,
  UserCheck,
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
  LogOut,
} from "lucide-react"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import BottomNavbar from "../Layout/ButtonNavar"
import { connect, useDispatch, useSelector } from "react-redux"
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
import { logout } from "../../redux/actions/Login"
import type { SocialAccount } from "../../redux/reducers/socialAccountsReducer"
import { FaTiktok } from "react-icons/fa"
import EditProfileModal from "./EditProfileModal"
import BankAccountModal from "./BankAccountModal"
import SocialConnectionsModal from "./SocialConnectionsModal"
import { div } from "three/src/nodes/TSL.js"
import { getActiveStories } from "../../redux/actions/history/listActiveHistory"
import { viewStory } from "../../redux/actions/history/makeViewed"
import type { StoryList } from "../index/main.interface"
import VipGiftExperience from "../giftModal/modalGift"
import TokenShopModal from "../giftModal/TokenShopModal"
import InsufficientFundsModal from "../giftModal/InsufficientFundsModal"
import TokenPurchaseSuccessModal from "../giftModal/TokenPurchaseSuccessModal"
import { getActiveGift } from "../../redux/actions/gift/listGiftActive"
import { sendVideoGift } from "../../redux/actions/gift/sendVideoGift"
import { getWallet } from "../../redux/actions/getWallet"
import type { GiftI } from "../../interfaces/gift"

const WS_URL = "ws://localhost:8001/ws"

// --- Interfaces ---
interface UserInterface {
  chat_uuid?: string
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
  subscribers_count: number
  is_following?: boolean
  has_active_stories?: boolean
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
  media_type?: 'video' | 'image'
}

interface Comment {
  uuid: string;
  is_priority_comment?: boolean;
  priority_plan_name?: string | null;
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
  created_at?: string;
  parent?: { uuid: string } | null;
}

interface ProfileSeccionProps {
  getUser: (username: string) => void
  user: UserInterface | null
  getUserMedia: (username: string) => void
  media_user: VideoItem[]
  getSubscriptionPlans: () => any
  createCheckoutSession: (planId: number, subscribedToId: number) => any
  startCall: (subscribedToId: number, callType?: 'voice' | 'video') => any
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
  const activeGifts = useSelector((state: any) => state.activeGiftReducer?.gift);
  const getWalletReducer = useSelector((state: any) => state.getWalletReducer);
  const walletTokens = getWalletReducer?.tokens || 0;

  // --- Estados Generales ---
  const [isMuted, setIsMuted] = useState(true)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [activeTab, setActiveTab] = useState("latest")
  const currentUser = useSelector((state: any) => state.LoginReducer?.user);
  const isOwnProfile = !!currentUser && !!user && (
    currentUser.id === user.id ||
    currentUser.username === username ||
    currentUser.username === user.username
  );

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
  const modalScrollSettleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const normalizeIncomingComment = useCallback((comment: any): Comment => ({
    ...comment,
    create_at: comment?.create_at || comment?.created_at || new Date().toISOString(),
  }), []);

  const upsertComment = useCallback((list: Comment[] | null, incoming: any) => {
    const normalized = normalizeIncomingComment(incoming);
    const nextList = list ? [...list] : [];
    const existingIndex = nextList.findIndex((comment) => comment.uuid === normalized.uuid);

    if (existingIndex >= 0) {
      nextList[existingIndex] = { ...nextList[existingIndex], ...normalized };
      return nextList;
    }

    return [normalized, ...nextList];
  }, [normalizeIncomingComment]);
  const [showVideoGiftModal, setShowVideoGiftModal] = useState(false);
  const [selectedVideoForGift, setSelectedVideoForGift] = useState<string | number | null>(null);
  const [_fullGifts, setFullGifts] = useState<GiftI[] | GiftI | []>([]);
  const [showTokenShopModal, setShowTokenShopModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showTokenPurchaseSuccessModal, setShowTokenPurchaseSuccessModal] = useState(false);
  const [purchasedTokenAmount, setPurchasedTokenAmount] = useState(0);
  const [isBlackout, setIsBlackout] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{
    type: string;
    sender: string;
    videoId?: string | number;
    giftId: string;
    gift: string;
    amount?: number;
    color_premiun?: string;
  } | null>(null);

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
  const { setShowMessages, setSelectedChat } = useChat();
  const [showProfileMediaOptions, setShowProfileMediaOptions] = useState(false);
  const [showFullProfileMedia, setShowFullProfileMedia] = useState(false);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [stories, setStories] = useState<StoryList>([]);
  const [showProfileStoriesViewer, setShowProfileStoriesViewer] = useState(false);
  const [activeProfileStoryIndex, setActiveProfileStoryIndex] = useState(0);
  const [profileStoryProgresses, setProfileStoryProgresses] = useState<number[]>([]);
  const profileStoryVideoRef = useRef<HTMLVideoElement | null>(null);

  // Social Modal
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<'followers' | 'following' | 'subscribers'>('followers');

  const [availabilityStatus, setAvailabilityStatus] = useState<{
    is_available: boolean;
    can_voice: boolean;
    can_video: boolean;
    remaining_calls: number;
    remaining_video_calls: number;
    plan_name: string;
    upgrade_required: boolean;
  } | null>(null);
  const [callAlert, setCallAlert] = useState<string | null>(null);
  const callAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    dispatch(getWallet() as any);
  }, [dispatch]);

  useEffect(() => {
    if (activeGifts !== null) {
      const mappedGifts = activeGifts.map((gift: any) => ({
        id: gift.id?.toString(),
        name: gift.name,
        emoji: gift.emoji,
        cost: gift.token_price,
        color: "getColorFromSlug(gift.slug)",
        animation: "getAnimationFromSlug(gift.slug)",
        video: gift.video ? `${getBaseUrl()}${gift.video}` : "",
        slug: gift.slug,
        token_price: gift.token_price || 0,
        is_active: gift.is_active ?? true,
        created_at: gift.created_at || new Date().toISOString(),
      }));
      setFullGifts(mappedGifts);
      return;
    }

    getActiveGift()(dispatch).then((response: any) => {
      const giftsData = Array.isArray(response?.data) ? response.data : [];
      const mappedGifts = giftsData.map((gift: GiftI) => ({
        id: gift?.id?.toString(),
        name: gift.name,
        emoji: gift.emoji,
        cost: gift.token_price,
        color: "getColorFromSlug(gift.slug)",
        animation: "getAnimationFromSlug(gift.slug)",
        video: gift.video ? `${getBaseUrl()}${gift.video}` : "",
        slug: gift.slug,
        token_price: gift.token_price || 0,
        is_active: gift.is_active ?? true,
        created_at: gift.created_at || new Date().toISOString(),
      }));
      setFullGifts(mappedGifts);
    }).catch(() => null);
  }, [activeGifts, dispatch]);

  const handleWSMessage = useCallback((data: any) => {
    if (data.event === "like_updated") {
      setLocalMedia(prev => prev.map((video) => {
        if (video.id?.toString() === data.video_id?.toString()) {
          return { ...video, likes_count: data.likes, liked: data.liked };
        }
        return video;
      }));
    }
    if (data.event === "new_comment") {
      if (data && data.user_id) {
        setLocalMedia(prev => prev.map((video) => {
          if (video.id?.toString() === data.video_id?.toString()) {
            return { ...video, comments_count: data.comments_count };
          }
          return video;
        }));
        if (currentVideoId?.toString() === data.video_id?.toString()) {
          setComments((prevComments) => upsertComment(prevComments, data));
        }
      }
    }
    if (data.event === "new_view") {
      setLocalMedia(prev => prev.map((video) => {
        if (video.id?.toString() === data.video_id?.toString()) {
          return { ...video, view_acount: data.view_acount };
        }
        return video;
      }));
    }
    if (data.event === "video_gift_received") {
      const activeVideo = localMedia[activeModalIndex];
      const isTargetVideoOpen = activeVideo?.id?.toString() === data.video_id?.toString();

      if (currentUser?.id == data.from_user || (currentUser?.id == data.to_user && isTargetVideoOpen)) {
        setGiftAnimation({
          type: data.gift_type,
          giftId: data.gift_uuid,
          videoId: data.video_id,
          sender: data.sender,
          amount: data.amount || 1,
          gift: data.gift_video,
          color_premiun: data.color_premiun,
        });
      }
    }
    if (data.event === "new_follower" || data.event === "delete_follower") {
      setLocalMedia(prev => prev.map((video) => {
        if (video.user_id?.id?.toString() === data.channel_profile?.toString()) {
          return { ...video, current_user_followered: data.current_user_followered };
        }
        return video;
      }));
    }
  }, [currentVideoId, currentUser?.id, localMedia, activeModalIndex, upsertComment]);

  useWebSocket(WS_URL, handleWSMessage);

  // --- 2. Carga Inicial de Usuario ---
  useEffect(() => {
    console.log("ProfileSeccion useEffect triggering for username:", username);
    if (username) {
      console.log("Calling getUser and getUserMedia for:", username);
      getUser(username)
      getUserMedia(username)
    } else {
      console.log("No username found in params");
    }
  }, [getUser, getUserMedia, username])

  // Sincronizar localMedia cuando cambian los videos de Redux
  useEffect(() => {
    console.log("Syncing localMedia with media_user:", media_user);
    setLocalMedia(media_user || []);
  }, [media_user]);

  // Limpiar estados locales al cambiar de perfil
  useEffect(() => {
    if (username) {
      setActiveTab("latest");
      setViewedVideos(new Set());
      setVideoProgress({});
    }
  }, [username]);

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
  // console.log(user, "**********")
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
    setLocalMedia(prev => prev.map((video) => {
      if (video.id?.toString() !== videoId) return video;
      const nextLiked = !video.liked;
      const nextCount = Math.max(0, (video.likes_count || 0) + (nextLiked ? 1 : -1));
      return { ...video, liked: nextLiked, likes_count: nextCount };
    }));

    createLike({ video_id: videoId })(dispatch).then(() => {
      ;
    }).catch((error) => console.error("Error like:", error));

    setShowLikeAnimation((prev) => ({ ...prev, [videoId]: true }));
    setTimeout(() => {
      setShowLikeAnimation((prev) => ({ ...prev, [videoId]: false }));
    }, 1000);
  };

  const handleToggleDescription = (videoId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const handleModalFollowClick = (targetUserId?: string | number) => {
    if (!targetUserId || isOwnProfile) return;

    setLocalMedia(prev => prev.map((video) => {
      if (video.user_id?.id?.toString() !== targetUserId.toString()) return video;
      return { ...video, current_user_followered: !video.current_user_followered };
    }));

    createFollower({ follower_user_id: targetUserId.toString() })(dispatch).catch(() => {
      setLocalMedia(prev => prev.map((video) => {
        if (video.user_id?.id?.toString() !== targetUserId.toString()) return video;
        return { ...video, current_user_followered: !video.current_user_followered };
      }));
    });
  };

  const handleVideoGiftClick = (videoId: string | number) => {
    setSelectedVideoForGift(videoId);
    const index = localMedia?.findIndex(v => v.id?.toString() === videoId?.toString());
    if (index !== undefined && index !== -1) {
      const videoElement = modalVideoRefs.current[index];
      videoElement?.pause();
    }
    setShowVideoGiftModal(true);
  };

  const handleSendVideoGift = async (giftTypeOrGift: string | GiftI, amount?: number) => {
    let type = typeof giftTypeOrGift === 'string'
      ? giftTypeOrGift
      : (giftTypeOrGift.emoji || giftTypeOrGift.slug || giftTypeOrGift.name);
    const cost = amount || (typeof giftTypeOrGift !== 'string' ? giftTypeOrGift.token_price : 0);

    if (walletTokens < cost) {
      setShowTokenShopModal(true);
      return;
    }

    if (!selectedVideoForGift) return;

    try {
      await sendVideoGift({ video_id: Number(selectedVideoForGift), gift_type: type })(dispatch);
      setShowVideoGiftModal(false);
    } catch (error) {
      console.error("Error dispatching video gift:", error);
    }
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
    })(dispatch).then((res: any) => {
      if (res) {
        setComments(prev => upsertComment(prev, res));
      }
      setCommentText("");
    }).catch(console.error);
  }

  const handleOpenSubscriptionModal = () => {
    getSubscriptionPlans();
    setShowSubscriptionModal(true);
  };

  const handleSelectPlan = (planId: number) => {
    if (user?.id) {
      createCheckoutSession(planId, user.id);
    }
  };

  const showCallAlert = (message: string) => {
    setCallAlert(message);
    if (callAlertTimeoutRef.current) clearTimeout(callAlertTimeoutRef.current);
    callAlertTimeoutRef.current = setTimeout(() => setCallAlert(null), 2600);
  };

  const handleStartCall = (callType: 'voice' | 'video' = 'voice') => {
    if (user?.id) {
      startCall(user.id, callType).then((res: any) => {
        showCallAlert(res.message);
        // Here you would navigate to the call room if implemented
      }).catch((err: string) => {
        showCallAlert(typeof err === 'string' ? err : 'No se pudo iniciar la llamada.');
      });
    }
  };

  const handleOpenSocialModal = (tab: 'followers' | 'following' | 'subscribers') => {
    setSocialModalTab(tab);
    setShowSocialModal(true);
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

  useEffect(() => {
    if (!isModalOpen || !modalContainerRef.current) return;

    const container = modalContainerRef.current;

    const settleActiveIndex = () => {
      const containerHeight = container.clientHeight || 1;
      const nextIndex = Math.round(container.scrollTop / containerHeight);
      const clampedIndex = Math.max(0, Math.min(nextIndex, localMedia.length - 1));
      setActiveModalIndex((prev) => (prev === clampedIndex ? prev : clampedIndex));
    };

    const handleScroll = () => {
      if (modalScrollSettleTimeoutRef.current) {
        clearTimeout(modalScrollSettleTimeoutRef.current);
      }
      modalScrollSettleTimeoutRef.current = setTimeout(settleActiveIndex, 90);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    settleActiveIndex();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (modalScrollSettleTimeoutRef.current) {
        clearTimeout(modalScrollSettleTimeoutRef.current);
        modalScrollSettleTimeoutRef.current = null;
      }
    };
  }, [isModalOpen, localMedia.length]);

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
    if (!isOwnProfile && user && !user.is_following) {
      setShowFollowPrompt(true);
      return;
    }

    // If we follow them or it's our profile or there is no clear state, just try to open chat
    setShowMessages(true);
    setSelectedChat(user?.chat_uuid)
    navigate("/")
  };

  const handleFollowAndMessage = () => {
    if (user?.id) {
      createFollower({ follower_user_id: user.id.toString() })(dispatch).then((res) => {
        setShowFollowPrompt(false);
        // Force opening messages after following

        setShowMessages(true);
        setSelectedChat(res?.data.chat_uuid)
        navigate("/")

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

  const profileStoriesMedia = useMemo(() => {
    if (!user || !stories?.length) return [];

    return stories
      .filter((story: any) =>
        story?.user?.id === user.id ||
        story?.user?.username === user.username
      )
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      .flatMap((story: any) =>
        (story.media || [])
          .slice()
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((media: any) => ({
            ...media,
            storyUuid: media?.uuid || story?.uuid,
            storyId: story?.id,
            username: story?.user?.username,
          }))
      );
  }, [stories, user]);

  const closeProfileStoriesViewer = useCallback(() => {
    setShowProfileStoriesViewer(false);
    setActiveProfileStoryIndex(0);
    setProfileStoryProgresses([]);
  }, []);

  const handleNextProfileStory = useCallback(() => {
    setActiveProfileStoryIndex((prev) => {
      setProfileStoryProgresses((current) => {
        const next = current.length ? [...current] : new Array(profileStoriesMedia.length).fill(0);
        if (prev >= 0 && prev < next.length) {
          next[prev] = 1;
        }
        return next;
      });

      if (prev >= profileStoriesMedia.length - 1) {
        closeProfileStoriesViewer();
        return 0;
      }
      return prev + 1;
    });
  }, [profileStoriesMedia.length, closeProfileStoriesViewer]);

  const handlePrevProfileStory = useCallback(() => {
    setActiveProfileStoryIndex((prev) => {
      const nextIndex = Math.max(prev - 1, 0);
      setProfileStoryProgresses((current) => {
        const next = current.length ? [...current] : new Array(profileStoriesMedia.length).fill(0);
        if (prev < next.length) {
          next[prev] = 0;
        }
        if (nextIndex < next.length) {
          next[nextIndex] = 0;
        }
        return next;
      });
      return nextIndex;
    });
  }, [profileStoriesMedia.length]);

  const handleOpenProfileStories = useCallback(async () => {
    setShowProfileMediaOptions(false);

    let activeStories: any = stories;
    if (!activeStories?.length) {
      activeStories = await getActiveStories()(dispatch);
      if (Array.isArray(activeStories)) {
        setStories(activeStories);
      }
    }

    const currentStories = (Array.isArray(activeStories) ? activeStories : stories)
      .filter((story: any) =>
        story?.user?.id === user?.id ||
        story?.user?.username === user?.username
      )
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      .flatMap((story: any) =>
        (story.media || [])
          .slice()
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      );

    if (!currentStories.length) {
      return;
    }

    setProfileStoryProgresses(new Array(currentStories.length).fill(0));
    setActiveProfileStoryIndex(0);
    setShowProfileStoriesViewer(true);
  }, [dispatch, stories, user]);

  useEffect(() => {
    if (!showProfileStoriesViewer || !profileStoriesMedia.length) return;

    const activeStory = profileStoriesMedia[activeProfileStoryIndex];
    if (!activeStory?.id) return;

    viewStory({ story_uuid: activeStory.id })(dispatch).catch(() => null);
  }, [showProfileStoriesViewer, activeProfileStoryIndex, profileStoriesMedia, dispatch]);

  useEffect(() => {
    if (!showProfileStoriesViewer || !profileStoriesMedia.length) return;

    const activeStory = profileStoriesMedia[activeProfileStoryIndex];
    if (!activeStory) return;

    if (activeStory.type === "video") {
      profileStoryVideoRef.current?.play().catch(() => null);
      return;
    }
  }, [showProfileStoriesViewer, activeProfileStoryIndex, profileStoriesMedia]);

  useEffect(() => {
    if (!showProfileStoriesViewer || !profileStoriesMedia.length) return;

    setProfileStoryProgresses((current) => {
      const next = current.length === profileStoriesMedia.length
        ? [...current]
        : new Array(profileStoriesMedia.length).fill(0);

      for (let i = 0; i < next.length; i += 1) {
        if (i < activeProfileStoryIndex) next[i] = 1;
        if (i > activeProfileStoryIndex) next[i] = 0;
      }

      if (profileStoriesMedia[activeProfileStoryIndex]?.type !== "video") {
        next[activeProfileStoryIndex] = 0;
      }

      return next;
    });
  }, [showProfileStoriesViewer, activeProfileStoryIndex, profileStoriesMedia]);

  const handleProfileStoryVideoProgress = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (!video.duration || Number.isNaN(video.duration)) return;

    const progress = Math.min(video.currentTime / video.duration, 1);
    setProfileStoryProgresses((current) => {
      const next = current.length === profileStoriesMedia.length
        ? [...current]
        : new Array(profileStoriesMedia.length).fill(0);

      next[activeProfileStoryIndex] = progress;
      return next;
    });
  }, [activeProfileStoryIndex, profileStoriesMedia.length]);

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
                  ) : user && !user?.profile_picture.startsWith("media") ? (
                    <img
                      className="w-full h-full object-cover"
                      src={`${import.meta.env.VITE_DOMAIN_SERVER}/media/${user.profile_picture}`}
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
              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenSocialModal('followers')}
              >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {(user?.follower_all_acount || 0) + (user?.total_social_followers || 0)}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">Seguidores</span>
              </div>

              <div className="w-px h-8 bg-white/10"></div>

              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenSocialModal('following')}
              >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {user?.followed_all_acount || 0}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">Seguidos</span>
              </div>

              <div className="w-px h-8 bg-white/10"></div>

              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenSocialModal('subscribers')}
              >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {currentUser?.id === user?.id ? (user?.subscribers_count || 0) : (user?.like_all_count || 0)}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">
                  {currentUser?.id === user?.id ? "Suscriptores" : "Likes"}
                </span>
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

              {!isOwnProfile && (
                <div className="flex gap-2">
                  {/* Icono de Llamada de Voz */}
                  <div className="relative">
                    <Button
                      onClick={() => handleStartCall('voice')}
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
                    {availabilityStatus?.is_available && availabilityStatus?.can_voice && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400/70 blur-[1px] animate-ping"></span>
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#050718] bg-gradient-to-br from-pink-300 via-fuchsia-400 to-pink-500 shadow-[0_0_12px_rgba(244,114,182,0.85)]"></span>
                      </span>
                    )}
                  </div>

                  {/* Icono de Video Llamada */}
                  <div className="relative">
                    <Button
                      onClick={() => handleStartCall('video')}
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
                    {availabilityStatus?.is_available && availabilityStatus?.can_video && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400/70 blur-[1px] animate-ping"></span>
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#050718] bg-gradient-to-br from-pink-300 via-fuchsia-400 to-pink-500 shadow-[0_0_12px_rgba(244,114,182,0.85)]"></span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                  <Share size={18} />
                </Button>
                {isOwnProfile && (
                  <Button onClick={() => setShowSettingsModal(true)} variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10">
                    <Settings size={18} />
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Mensaje de Upgrade si es necesario */}
            {availabilityStatus?.upgrade_required && !isOwnProfile && (
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
              <div className="sticky top-0 z-30 px-0 pt-2 pb-2 bg-[#050718]/80 backdrop-blur-xl border-b border-white/5 rounded-xl">
                <div className="relative mx-auto max-w-sm px-1">
                  <div className="absolute -inset-px rounded-full bg-gradient-to-r from-[#7000ff]/30 to-[#00f0ff]/30 opacity-50 blur-sm"></div>
                  <TabsList className="relative grid w-full grid-cols-3 bg-[#0c1033]/90 backdrop-blur-xl border border-white/10 rounded-full p-1 h-auto">
                    {["latest", "popular", "oldest"].map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className={`rounded-full text-[10px] md:text-sm font-bold py-2 transition-all duration-300 capitalize
                                data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7000ff] data-[state=active]:to-[#00f0ff] data-[state=active]:text-white data-[state=active]:shadow-lg
                                ${activeTab === tab ? "" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              <TabsContent value={activeTab} className="px-1 md:px-4">
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {[...localMedia].sort((a, b) => {
                    if (activeTab === 'popular') return (b.view_acount || 0) - (a.view_acount || 0);
                    if (activeTab === 'oldest') return new Date(a.create_at || 0).getTime() - new Date(b.create_at || 0).getTime();
                    return new Date(b.create_at || 0).getTime() - new Date(a.create_at || 0).getTime();
                  }).map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group rounded-lg overflow-hidden bg-zinc-900 aspect-[3/4]"
                      onClick={() => handleVideoClickOrDoubleClick(video, index)}
                    >
                      <div className="relative h-full w-full">
                        {video.media_type === 'image' ? (
                          <img
                            src={video.video}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            alt="Profile Media"
                          />
                        ) : (
                          <video
                            ref={(el) => (videoRefs.current[index] = el)}
                            muted={isMuted}
                            loop
                            playsInline
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                          >
                            <source src={video.video} type="video/mp4" />
                          </video>
                        )}
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

      {showEditProfileModal && (user || currentUser) && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          user={user || currentUser}
        />
      )}

      <BankAccountModal
        isOpen={showBankAccountModal}
        onClose={() => setShowBankAccountModal(false)}
      />

      <SocialConnectionsModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        username={username || ''}
        initialTab={socialModalTab}
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

              <div className="px-8 py-6 flex items-center justify-between text-[10px] text-white/40">
                <div className="flex flex-col">
                  <span>Versión 1.4.2</span>
                  <span>Soporte wallet activa</span>
                </div>
                <button
                  onClick={() => logout()(dispatch)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/70 hover:text-red-500 transition-all active:scale-95"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                  <span className="font-bold uppercase tracking-tighter">Salir</span>
                </button>
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setShowAvailabilityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-[#0a0a0f] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-600/10 blur-[90px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              {/* Header consistente con Configuración */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Disponibilidad</h2>
                </div>
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {/* 1. Hora de Inicio (Estilo Fila) */}
                <div className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <Clock size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-400/80 font-bold mb-1">Hora de inicio</p>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-end border-l border-white/10 pl-4 h-10 justify-center">
                    <span className="text-[10px] text-white/40 leading-none">MODO</span>
                    <span className="text-sm font-bold text-emerald-400">{formatTime12h(startTime).split(" ")[1]}</span>
                  </div>
                </div>

                {/* 2. Hora de Fin (Estilo Fila) */}
                <div className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-11 h-11 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                    <Clock size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-widest text-red-400/80 font-bold mb-1">Hora de fin</p>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-end border-l border-white/10 pl-4 h-10 justify-center">
                    <span className="text-[10px] text-white/40 leading-none">MODO</span>
                    <span className="text-sm font-bold text-red-400">{formatTime12h(endTime).split(" ")[1]}</span>
                  </div>
                </div>

                {/* Separador sutil */}
                <div className="h-px bg-white/5 mx-5 my-2"></div>

                {/* Selección de Días (Estilo Mejorado) */}
                <div className="px-5 py-3">
                  <p className="text-white/50 text-xs font-medium mb-4 ml-1">Repetir estos días:</p>
                  <div className="flex justify-between gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isActive = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all duration-300 border ${isActive
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10"
                            }`}
                        >
                          {day.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer con botón estilo premium */}
              <div className="px-6 pb-8 pt-4">
                {availabilitySaveSuccess ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    <span>¡HORARIO ACTUALIZADO!</span>
                  </motion.div>
                ) : (
                  <>
                    {availabilityError && (
                      <div className="text-center text-red-400 text-xs mb-3 animate-pulse">{availabilityError}</div>
                    )}
                    <button
                      onClick={handleSaveAvailability}
                      disabled={availabilitySaving}
                      className="w-full relative group"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#7000ff]/20 to-[#00f0ff]/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                      <div className="relative w-full bg-gradient-to-r from-[#1c1427] to-[#142122] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#7000ff]/30 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-3">
                        {availabilitySaving ? (
                          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <Zap size={18} />
                            GUARDAR CONFIGURACIÓN
                          </>
                        )}
                      </div>
                    </button>
                  </>
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
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain"
                style={{ scrollbarWidth: 'none' }}
              >
                {localMedia.map((video, index) => (
                  <div
                    key={video.id}
                    id={`modal-video-${index}`}
                    data-index={index}
                    className="modal-video-item w-full h-full snap-center relative flex items-center justify-center bg-black"
                  >
                    {video.media_type === 'image' ? (
                      <img
                        src={video.video}
                        className="w-full h-full object-cover md:object-contain max-h-screen"
                        alt="Profile Media Full"
                      />
                    ) : (
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
                    )}

                    <div className="absolute bottom-1 left-0 right-0 z-10 px-1 pb-1 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-bold text-lg drop-shadow-md">@{video.user_id?.username || user?.username}</h3>
                        <div className="bg-[#00f0ff] p-0.5 rounded-full"><Sparkles size={8} className="text-black" /></div>
                      </div>
                      {!!(video.content || video.user_id?.username) && (
                        <motion.div
                          className={`
                            w-full backdrop-blur-md border border-white/10 bg-black/35 shadow-2xl transition-all duration-500 ease-in-out rounded-none
                            ${expandedDescriptions[video.id] ? 'px-4 pt-4 pb-5 max-h-[52vh] overflow-hidden' : 'px-4 py-3 max-h-[96px] overflow-hidden cursor-pointer hover:bg-black/40'}
                          `}
                          onClick={(e) => {
                            if (!expandedDescriptions[video.id]) {
                              e.stopPropagation();
                              handleToggleDescription(video.id.toString());
                            }
                          }}
                          initial={false}
                          animate={{
                            scale: 1,
                            y: expandedDescriptions[video.id] ? -6 : 0
                          }}
                        >
                          <div className="text-[13px] leading-relaxed text-white/95 drop-shadow-sm font-light">
                            {expandedDescriptions[video.id] && (
                              <div className="flex justify-center mb-3">
                                <div
                                  className="w-10 h-1 bg-white/30 rounded-full cursor-pointer hover:bg-[#00f0ff]/60 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDescription(video.id.toString());
                                  }}
                                />
                              </div>
                            )}

                            {expandedDescriptions[video.id] ? (
                              <div className="flex flex-col gap-2">
                                <p className="whitespace-pre-wrap">{video.content || "Sin descripcion."}</p>
                                <button
                                  className="text-[#00f0ff] text-xs font-semibold mt-2 self-start hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDescription(video.id.toString());
                                  }}
                                >
                                  Ocultar
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center">
                                <span className="line-clamp-2">{video.content || "Mira este increíble video... #viral #fyp"}</span>
                                {(video.content || "").length > 70 && (
                                  <span className="ml-1 text-[#00f0ff] font-bold text-[11px]">... ver más</span>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
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
                    <div className="absolute right-2 bottom-28 md:right-4 md:bottom-28 flex flex-col items-center gap-4 z-20">
                      <div className="relative mb-1">
                        <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                          <img
                            src={`${getBaseUrl()}${
                              (() => {
                                const pic = video.user_id?.profile_picture || user?.profile_picture;
                                if (pic && !pic.startsWith('media/')) {
                                  return `media/${pic}`;
                                }
                                return pic;
                              })()
                            }`}
                            className="w-full h-full object-cover"
                            alt="user"
                          />
                        </div>
                      </div>

                      {!isOwnProfile && (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModalFollowClick(video.user_id?.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center"
                        >
                          {video.current_user_followered ? (
                            <UserCheck className="h-4 w-4 text-white" strokeWidth={2.4} />
                          ) : (
                            <UserPlus className="h-4 w-4 text-white" strokeWidth={2.4} />
                          )}
                        </motion.button>
                      )}

                      <div className="flex flex-col items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleLikeClick(video.id.toString()); }}
                          className="relative flex flex-col items-center gap-1"
                        >
                          <motion.div
                            animate={{ scale: video.liked ? [1, 1.3, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${video.liked ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"}`}
                          >
                            <Heart className={`h-5 w-5 ${video.liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                          </motion.div>
                          <AnimatePresence>
                            {showLikeAnimation[video.id] && (
                              [...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                                  animate={{ opacity: 0, y: -50 - Math.random() * 50, x: (Math.random() - 0.5) * 40, scale: 1.5 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1 + Math.random() * 0.5 }}
                                  className="absolute text-red-500 pointer-events-none"
                                  style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                                >
                                  ❤️
                                </motion.div>
                              ))
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <span className="text-white text-xs font-bold drop-shadow-md">{video.likes_count || 0}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => { e.stopPropagation(); handleCommentClick(video); }}
                          className="flex flex-col items-center relative"
                        >
                          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                            <MessageCircle className="h-5 w-5 text-white" />
                          </div>
                        </motion.button>
                        <span className="text-white text-xs font-bold drop-shadow-md">{video.comments_count || 0}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                          <Eye className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                        <span className="text-white text-xs font-bold drop-shadow-md">{video.view_acount || 0}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <motion.button whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                          <Share2 className="h-5 w-5 text-white drop-shadow-lg" />
                        </motion.button>
                        <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoGiftClick(video.id);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/35 to-purple-500/25 backdrop-blur-md border border-pink-400/40 shadow-md"
                        >
                          <svg width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g><g><g><path d="M94 58H26V104H94V58Z" fill="#FF4F64"></path><path opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black"></path><path opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white"></path><path opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black"></path><path opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black"></path><path d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9"></path></g></g><g><path d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64"></path><path d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9"></path></g></g></svg>
                        </motion.button>
                        <span className="text-[10px] text-pink-300/90 font-medium drop-shadow-md">Regalar</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >

      <AnimatePresence>
        {giftAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 200, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 400, scale: 0.7 }}
            transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-[90vw] max-w-lg overflow-visible"
          >
            <video
              key={giftAnimation.giftId}
              src={`${getBaseUrl()}${giftAnimation.gift}`}
              autoPlay
              playsInline
              muted={false}
              className="w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] rounded-3xl"
              style={{
                WebkitMaskImage: `
                  linear-gradient(to top, transparent 10%, black 50%),
                  linear-gradient(to bottom, transparent 10%, black 50%),
                  linear-gradient(to left, transparent 0%, black 30%),
                  linear-gradient(to right, transparent 0%, black 30%)
                `,
                WebkitMaskComposite: "destination-in",
                maskComposite: "intersect"
              }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (giftAnimation.type === 'Space' || giftAnimation.type === '🪐') {
                  if (video.currentTime >= 4.0 && video.currentTime < 6.0) {
                    if (!isBlackout) setIsBlackout(true);
                  } else if (video.currentTime >= 6.0 && isBlackout) {
                    setIsBlackout(false);
                  }
                }
              }}
              onEnded={() => {
                setIsBlackout(false);
                setGiftAnimation(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callAlert && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[120] rounded-2xl border border-[#00f0ff]/20 bg-[#08101f]/95 px-4 py-3 text-sm text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            {callAlert}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE COMENTARIOS --- */}
      <AnimatePresence>
        {
          showCommentsModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]"
                onClick={() => setShowCommentsModal(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className="fixed bottom-0 left-0 right-0 h-[72vh] z-[80] bg-[#0a0a0f]/95 rounded-t-[40px] flex flex-col border-t border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center pt-3">
                  <div className="h-1.5 w-12 rounded-full bg-white/20" />
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">Comentarios</h3>
                    <p className="text-xs text-white/45">Conversacion en tiempo real</p>
                  </div>
                  <button
                    onClick={() => setShowCommentsModal(false)}
                    className="rounded-full bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                  {(!comments || comments.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10">
                        <MessageCircle className="h-6 w-6 text-white/40" />
                      </div>
                      <p className="text-white/70 font-medium">Aun no hay comentarios</p>
                      <p className="text-sm text-white/35">Se el primero en comentar esta publicacion.</p>
                    </div>
                  ) : (
                    [...comments].sort((a, b) => {
                      const planOrder: { [key: string]: number } = {
                        'FRIEND': 0,
                        'PLUS': 1,
                        'VIP': 2,
                        'NONE': 3
                      };
                      const aPlan = a.is_priority_comment ? (a.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE';
                      const bPlan = b.is_priority_comment ? (b.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE';
                      const priorityDiff = (planOrder[aPlan] ?? 4) - (planOrder[bPlan] ?? 4);
                      if (priorityDiff !== 0) return priorityDiff;
                      return new Date(b.create_at || b.created_at || 0).getTime() - new Date(a.create_at || a.created_at || 0).getTime();
                    })
                      .map((c, i) => {
                        const planName = c.is_priority_comment ? (c.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE';
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
                            <div className={`relative p-[1.5px] rounded-full h-fit ${isFriend
                              ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.4)] transition-transform group-hover:scale-105'
                              : isVip
                                ? 'bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 animate-pulse'
                                : isPlus
                                  ? 'bg-gradient-to-tr from-purple-400 to-pink-500'
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
                                  <span className="text-[7px] bg-white/10 backdrop-blur-md text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/20 font-bold tracking-widest uppercase">FRIEND</span>
                                )}
                                {isVip && (
                                  <span className="text-[8px] bg-amber-400/20 text-amber-400 px-1 rounded-sm font-bold uppercase border border-amber-400/20">VIP</span>
                                )}
                                {isPlus && (
                                  <span className="text-[8px] bg-purple-400/20 text-purple-400 px-1 rounded-sm font-bold uppercase border border-purple-400/20">PLUS</span>
                                )}
                                <span className="text-[10px] text-gray-500">{new Date(c.create_at || c.created_at || 0).toLocaleDateString()}</span>
                              </div>
                              <p className={`text-sm mt-0.5 ${isVip ? 'text-amber-50/90' : 'text-white'}`}>{c.content}</p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
                <div className="border-t border-white/8 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent px-4 py-3 pb-6 md:pb-3">
                  <div className="flex items-end gap-3 rounded-[28px] border border-white/10 bg-[#1a1a24] p-2 backdrop-blur-xl">
                    <img
                      src={`${getBaseUrl()}${currentUser?.profile_picture}`}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-lg"
                      alt="me"
                    />
                    <div className="flex-1">
                      <input
                        className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
                        placeholder="Escribe un comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                      />
                    </div>
                    <button
                      onClick={handlePostComment}
                      disabled={!commentText.trim()}
                      className="rounded-xl bg-gradient-to-r from-[#7000ff] to-[#00f0ff] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publicar
                    </button>
                  </div>
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-all duration-300"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] px-4"
            >
              <div className="bg-[#0c1033]/95 border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl">
                {/* Header con gradiente sutil */}
                <div className="bg-gradient-to-r from-white/5 to-transparent px-5 py-4 flex justify-between items-center border-b border-white/5">
                  <h3 className="text-white font-semibold text-lg tracking-tight">Opciones de perfil</h3>
                  <button
                    onClick={() => setShowProfileMediaOptions(false)}
                    className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-2 flex flex-col gap-1">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-white hover:bg-white/5 group transition-all duration-300"
                    onClick={() => {
                      setShowProfileMediaOptions(false);
                      setShowFullProfileMedia(true);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                      <User size={20} />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="font-medium">Ver Perfil</span>
                      <span className="text-xs text-white/40">Visualizar foto de perfil</span>
                    </div>
                  </button>

                  {user?.has_active_stories && (
                    <button
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-white hover:bg-white/5 group transition-all duration-300"
                      onClick={handleOpenProfileStories}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300">
                        <Sparkles size={20} />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="font-medium">Ver historias</span>
                        <span className="text-xs text-white/40">Ver momentos recientes</span>
                      </div>
                    </button>
                  )}
                </div>

                <div className="h-2 bg-gradient-to-t from-white/5 to-transparent opacity-50" />
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
              ) : user && !user?.profile_picture.startsWith('media/') ? (
                <img
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-[#7000ff]/20"
                  src={`${getBaseUrl() + '/media/' + user.profile_picture}`}
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

      <AnimatePresence>
        {showProfileStoriesViewer && profileStoriesMedia.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />

            <div className="relative z-[81] flex h-full w-full max-w-md items-center justify-center overflow-hidden">
              <button
                onClick={closeProfileStoriesViewer}
                className="absolute right-4 top-4 z-[83] rounded-full bg-black/40 p-2 text-white/90 backdrop-blur-md transition hover:bg-black/60"
              >
                <X size={20} />
              </button>

              <div className="absolute left-4 right-4 top-4 z-[83] flex gap-1">
                {profileStoriesMedia.map((_: any, index: number) => (
                  <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-150"
                      style={{ width: `${Math.max(0, Math.min((profileStoryProgresses[index] || 0) * 100, 100))}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-4 top-8 z-[83] flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full border border-white/15">
                  {user?.profile_picture ? (
                    <img
                      className="h-full w-full object-cover"
                      src={`${user?.profile_picture.startsWith("http") ? user.profile_picture : `${getBaseUrl()}/media/${user.profile_picture}`}`}
                      alt={user?.username}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/10">
                      <User className="h-5 w-5 text-white/70" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">@{user?.username}</p>
                  <p className="text-xs text-white/55">Historias</p>
                </div>
              </div>

              <button
                onClick={handlePrevProfileStory}
                className="absolute inset-y-0 left-0 z-[82] w-1/3"
                aria-label="Historia anterior"
              />
              <button
                onClick={handleNextProfileStory}
                className="absolute inset-y-0 right-0 z-[82] w-1/3"
                aria-label="Historia siguiente"
              />

              {profileStoriesMedia[activeProfileStoryIndex]?.type === "video" ? (
                <video
                  ref={profileStoryVideoRef}
                  key={`profile-story-${activeProfileStoryIndex}`}
                  src={`${getBaseUrl()}/media/${profileStoriesMedia[activeProfileStoryIndex]?.file}`}
                  className="h-full w-full object-contain"
                  autoPlay
                  playsInline
                  onTimeUpdate={handleProfileStoryVideoProgress}
                  onEnded={handleNextProfileStory}
                />
              ) : (
                <img
                  key={`profile-story-${activeProfileStoryIndex}`}
                  src={`${getBaseUrl()}/media/${profileStoriesMedia[activeProfileStoryIndex]?.file}`}
                  className="h-full w-full object-contain"
                  alt={`Historia de ${user?.username}`}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TokenShopModal
        isOpen={showTokenShopModal}
        onClose={() => setShowTokenShopModal(false)}
        onPurchase={async (amount, _price) => {
          setPurchasedTokenAmount(amount);
          setShowTokenShopModal(false);
          setShowTokenPurchaseSuccessModal(true);
        }}
      />
      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
      />
      <TokenPurchaseSuccessModal
        isOpen={showTokenPurchaseSuccessModal}
        onClose={() => setShowTokenPurchaseSuccessModal(false)}
        purchasedAmount={purchasedTokenAmount}
        newTotalBalance={walletTokens + purchasedTokenAmount}
      />
      <AnimatePresence>
        {showVideoGiftModal && (
          <VipGiftExperience
            onClose={() => setShowVideoGiftModal(false)}
            onSendGift={handleSendVideoGift}
            gifts={Array.isArray(_fullGifts) ? _fullGifts : []}
            walletTokens={walletTokens}
            subscriptionStatus={
              (localMedia?.find(v => v.id == selectedVideoForGift)?.user_id as any)?.subscription_status
            }
          />
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
                    src={`${user && !user?.profile_picture.startsWith('media') ? getBaseUrl() + '/media/' + user?.profile_picture : ''}`}
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
