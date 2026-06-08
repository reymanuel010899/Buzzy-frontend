import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useRingtoneStore, RINGTONE_OPTIONS } from "../../store/ringtoneStore"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings,
  Play,
  X,
  Share2,
  MoreVertical,
  Download,
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
  Loader2,
  Phone,
  LogOut,
  Gift,
  Crown,
  Globe,
  Users,
  Lock,
  Bookmark,
} from "lucide-react"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import BottomNavbar from "../Layout/ButtonNavar"
import { connect, useDispatch, useSelector } from "react-redux"
import type { RootState } from "../../store"
import { getUser } from "../../redux/actions/GetUser"
import { getUserMedia } from "../../redux/actions/GetUserMedia"
import { saveProfileVideos, loadProfileVideos } from "../../services/feedCacheDB"
import { useWsEvent } from "../../context/WebSocketContext"
import { createLike } from "../../redux/actions/createLike"
import { createView } from "../../redux/actions/createView"
import { getComment } from "../../redux/actions/getComment"
import { createComment } from "../../redux/actions/createComment"
import { apiClient, getBaseUrl, getMediaUrl } from "../../redux/client/api-client"
import { createFollower } from "../../redux/actions/createFollower"
import SubscriptionModal from "./SubscriptionModal"
import { getSubscriptionPlans, createCheckoutSession, startCall } from "../../redux/actions/subscriptionActions"
import { saveAvailability, getAvailability, getAvailabilityStatus } from "../../redux/actions/saveAvailability"
import { getSocialAccounts, initSocialOAuth, disconnectSocialAccount, refreshSocialFollowers, SocialPlatform } from "../../redux/actions/socialAccountsActions"
import { useChat } from "../../context/ChatContext"
import { logout } from "../../redux/actions/Login"
import type { SocialAccount } from "../../redux/reducers/socialAccountsReducer"
import { FaTiktok } from "react-icons/fa"
import EditProfileModal from "./EditProfileModal"
import ChatPrivacyModal from "./ChatPrivacyModal"
import BankAccountModal from "./BankAccountModal"
import SocialConnectionsModal from "./SocialConnectionsModal"
import { getActiveStories } from "../../redux/actions/history/listActiveHistory"
import { viewStory } from "../../redux/actions/history/makeViewed"
import { LanguageSwitcher } from "../Layout/LanguageSwitcher"
import type { StoryList } from "../index/main.interface"
import VipGiftExperience from "../giftModal/modalGift"
import BuzzyBannerSpace from "../banner/BuzzyBannerSpace"
import { fetchActiveBanner } from "../../redux/actions/getBanner"
import TokenShopModal from "../giftModal/TokenShopModal"
import InsufficientFundsModal from "../giftModal/InsufficientFundsModal"
import TokenPurchaseSuccessModal from "../giftModal/TokenPurchaseSuccessModal"
import { getActiveGift } from "../../redux/actions/gift/listGiftActive"
import { getVideoGiftsReceived, markVideoGiftsSeen } from "../../redux/actions/gift/getVideoGiftsReceived"
import { getUserGiftsReceived, markUserGiftsSeen } from "../../redux/actions/gift/getUserGiftsReceived"
import { sendVideoGift } from "../../redux/actions/gift/sendVideoGift"
import { sendUserGift } from "../../redux/actions/gift/sendUserGift"
import { getWallet } from "../../redux/actions/getWallet"
import { getSavedVideos, saveVideo, unsaveVideo } from "../../redux/actions/savedVideos"
import type { GiftI } from "../../interfaces/gift"
import { useCallStore } from "../../store/callStore"
import { useTranslation } from "react-i18next"
import { useVideoMetrics } from "../../hooks/useVideoMetrics"
import axios from "axios"
import { registerFCMToken } from "../../utils/fcm"
import { isNotifEnabled } from "../../utils/notifPrefs"
import { prefetchAudioUrl } from "../../hooks/useVideoAudio"

// Muestra el emoji de fallback hasta que el video esté listo — evita flash negro en Android
const GiftVideoThumb: React.FC<{ src: string; emoji: string; playing: boolean; thumbnail?: string }> = ({ src, emoji, playing, thumbnail }) => {
  const [ready, setReady] = React.useState(false);
  return (
    <div className="w-full h-full relative">
      {thumbnail ? (
        <img
          src={thumbnail}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{ opacity: ready ? 0 : 1 }}
          alt=""
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-200" style={{ opacity: ready ? 0 : 1 }}>{emoji}</span>
      )}
      <video src={src} autoPlay={playing} loop muted={!playing} playsInline preload="auto"
        poster={thumbnail}
        onCanPlayThrough={() => setReady(true)}
        className="w-full h-full object-cover transition-opacity duration-200"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
};

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
  is_buzzy_premium?: boolean
}

interface VideoItem {
  id: string
  uuid?: string
  video: string
  video_url?: string
  user_id?: { username: string; profile_picture: string; id: number }
  likes_count: number
  comments_count: number
  media_user?: object
  view_acount?: number
  liked?: boolean
  current_user_followered?: boolean
  create_at?: string
  content?: string
  description?: string
  media_type?: 'video' | 'image'
  status?: 'pending' | 'processing' | 'ready' | 'blocked'
  thumbnail_url?: string
  privacy?: 'public' | 'followers' | 'private'
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
  refreshSocialFollowers: () => Promise<void>
  // Availability Redux state
  availabilitySaving: boolean
  availabilitySaved: boolean
  availabilityError: string | null
  availabilityData: any | null
  // Social accounts Redux state
  socialAccounts: SocialAccount[]
  socialLoading: boolean
  getAvailabilityStatus: (username: string) => any
  notFoundUsername: string | null
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
  refreshSocialFollowers: _refreshSocialFollowers,
  initSocialOAuth,
  disconnectSocialAccount,
  notFoundUsername,
}: ProfileSeccionProps) {
  const userParams = useParams<{ username?: string }>()
  const { username } = userParams
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { t } = useTranslation(['profile', 'videos', 'common'])
  const activeGifts = useSelector((state: any) => state.activeGiftReducer?.gift);
  const getWalletReducer = useSelector((state: any) => state.getWalletReducer);
  const walletTokens = getWalletReducer?.tokens || 0;

  // --- Estados Generales ---
  const [isProfileSwitching, setIsProfileSwitching] = useState(false)

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [activeTab, setActiveTab] = useState("public")
  const [savedVideos, setSavedVideos] = useState<any[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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
  const [modalVideoSource, setModalVideoSource] = useState<'local' | 'saved'>('local')
  const modalContainerRef = useRef<HTMLDivElement>(null)
  const modalVideoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const modalScrollSettleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const modalMusicRef = useRef<HTMLAudioElement | null>(null)

  // Lógica importada de StreamingUI
  const [localMedia, setLocalMedia] = useState<VideoItem[]>(media_user || []);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoDuration, setVideoDuration] = useState<Record<string, number>>({});
  const { onVideoPlay, onTimeUpdate: trackTimeUpdate, resetVideo } = useVideoMetrics();
  const [showLikeAnimation, setShowLikeAnimation] = useState<Record<string, boolean>>({});

  // Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [commentText, setCommentText] = useState("")
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentVideoUuid, setCurrentVideoUuid] = useState<string | null>(null);
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
    blobUrl?: string;
    amount?: number;
    color_premiun?: string;
  } | null>(null);
  const giftAnimBlobRef = useRef<string | null>(null);
  const playingGiftBlobRef = useRef<string | null>(null);

  // Suscripciones
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Wallet
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifPush, setNotifPush] = useState(() => localStorage.getItem('notif_push') !== 'false');
  const [notifMessages, setNotifMessages] = useState(() => localStorage.getItem('notif_messages') !== 'false');
  const [notifGifts, setNotifGifts] = useState(() => localStorage.getItem('notif_gifts') !== 'false');
  const [notifFollowers, setNotifFollowers] = useState(() => localStorage.getItem('notif_followers') !== 'false');
  const handleSaveNotifications = async () => {
    const prevPush = isNotifEnabled('notif_push');
    localStorage.setItem('notif_push', String(notifPush));
    localStorage.setItem('notif_messages', String(notifMessages));
    localStorage.setItem('notif_gifts', String(notifGifts));
    localStorage.setItem('notif_followers', String(notifFollowers));

    // Push: activar → registrar FCM token; desactivar → borrar token del dispositivo
    if (notifPush && !prevPush) {
      try {
        await registerFCMToken();
      } catch {
        showProfileToast('No se pudo activar las notificaciones push.', true);
        localStorage.setItem('notif_push', 'false');
        setNotifPush(false);
        return;
      }
    } else if (!notifPush && prevPush) {
      localStorage.removeItem('device_token');
      try {
        await apiClient.post(`${getBaseUrl()}api/v1/users/update-device-token/`, { device_token: null });
      } catch { /* silent — el token ya no existe en el dispositivo */ }
    }

    setShowNotificationsModal(false);
    showProfileToast('Preferencias de notificaciones guardadas.');
  };
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [profileToast, setProfileToast] = useState<{ message: string; error?: boolean } | null>(null);
  const profileToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showProfileToast = useCallback((message: string, error = false) => {
    if (profileToastTimerRef.current) clearTimeout(profileToastTimerRef.current);
    setProfileToast({ message, error });
    profileToastTimerRef.current = setTimeout(() => setProfileToast(null), 3500);
  }, []);

  const handlePremiumCheckout = async () => {
    setPremiumLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await axios.post(`${getBaseUrl()}api/premium/checkout/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.checkout_url) window.location.href = res.data.checkout_url
    } catch (e: any) {
      showProfileToast(e?.response?.data?.error || 'Error al iniciar el pago.', true)
    } finally {
      setPremiumLoading(false)
    }
  }
  const [showRingtonePanel, setShowRingtonePanel] = useState(false);
  const [showReferralPanel, setShowReferralPanel] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const { selectedId: ringtoneId, setRingtone } = useRingtoneStore();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopRingtonePreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
  }, []);
  const previewRingtone = useCallback((file: string) => {
    stopRingtonePreview();
    const a = new Audio(file);
    a.volume = 0.7;
    previewAudioRef.current = a;
    a.play().catch(() => {});
    a.addEventListener('ended', () => { previewAudioRef.current = null; });
  }, [stopRingtonePreview]);
  const [showConnectSocialModal, setShowConnectSocialModal] = useState(false);
  // === NUEVOS ESTADOS PARA HORARIO DE DISPONIBILIDAD ===
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  ]);
  const [isProfileOffline, setIsProfileOffline] = useState(false);
  const [availabilitySaveSuccess, setAvailabilitySaveSuccess] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showReceivedGiftsModal, setShowReceivedGiftsModal] = useState(false);
  const [receivedVideoGifts, setReceivedVideoGifts] = useState<any[]>([]);
  const [receivedUserGifts, setReceivedUserGifts] = useState<any[]>([]);
  const [unseenGiftsCount, setUnseenGiftsCount] = useState(0);
  const [playingGiftUuid, setPlayingGiftUuid] = useState<string | null>(null);
  const [playingGiftBlobUrl, setPlayingGiftBlobUrl] = useState<string | null>(null);

  const openGiftPreview = (uuid: string, videoUrl: string | undefined) => {
    if (playingGiftBlobRef.current) URL.revokeObjectURL(playingGiftBlobRef.current);
    setPlayingGiftBlobUrl(null);
    if (videoUrl) {
      fetch(getMediaUrl(videoUrl))
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          playingGiftBlobRef.current = blobUrl;
          setPlayingGiftBlobUrl(blobUrl);
          setPlayingGiftUuid(uuid);
        })
        .catch(() => setPlayingGiftUuid(uuid));
    } else {
      setPlayingGiftUuid(uuid);
    }
  };
  const [showUserGiftModal, setShowUserGiftModal] = useState(false);
  const [giftsTab, setGiftsTab] = useState<'video' | 'user'>('video');
  const [sentGiftPreview, setSentGiftPreview] = useState<GiftI | null>(null);
  const [giftBlackout, setGiftBlackout] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showChatPrivacyModal, setShowChatPrivacyModal] = useState(false);
  const { setShowMessages, setSelectedChat } = useChat();
  const [showProfileMediaOptions, setShowProfileMediaOptions] = useState(false);
  const [activeVideoOptions, setActiveVideoOptions] = useState<string | null>(null);
  const [confirmDeleteVideoId, setConfirmDeleteVideoId] = useState<string | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
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
  const { setActiveOutgoingCall, setAgoraData, activeIncomingCall, activeOutgoingCall } = useCallStore();
  const isCallActive = activeIncomingCall?.status === 'active' || activeOutgoingCall?.status === 'active';

  // Fetch banner una sola vez al entrar al perfil
  useEffect(() => {
    dispatch(fetchActiveBanner() as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Duck video audio if a call is active
  useEffect(() => {
    videoRefs.current.forEach(video => {
      if (video) {
        video.volume = isCallActive ? 0.05 : 1.0;
      }
    });
  }, [isCallActive, activeModalIndex, isGridVideoPlaying]);


  // const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  // Auto-open video modal when navigating from a notification deep-link
  useEffect(() => {
    const targetUuid = (location.state as { targetVideoUuid?: string } | null)?.targetVideoUuid
    if (!targetUuid || !localMedia.length) return
    const idx = localMedia.findIndex(v => v.uuid === targetUuid)
    if (idx === -1) return
    // Clear state so it doesn't re-trigger
    navigate(location.pathname, { replace: true, state: {} })
    openModalAtIndex(idx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMedia, location.state]);

  useEffect(() => {
    dispatch(getWallet() as any);
  }, [dispatch]);

  useEffect(() => {
    if (!isOwnProfile) return;
    Promise.all([
      getVideoGiftsReceived()(dispatch),
      getUserGiftsReceived()(dispatch),
    ]).then(([videoRes, userRes]: any[]) => {
      if (videoRes?.gifts) setReceivedVideoGifts(videoRes.gifts);
      if (userRes?.gifts) setReceivedUserGifts(userRes.gifts);
      const unseenVideo = videoRes?.unseen_count ?? 0;
      const unseenUser = userRes?.gifts?.filter((g: any) => !g.is_seen).length ?? 0;
      setUnseenGiftsCount(unseenVideo + unseenUser);
    });
  }, [isOwnProfile, dispatch]);

  useEffect(() => {
    if (activeGifts !== null) {
      const mappedGifts = activeGifts.map((gift: any) => ({
        id: gift.id?.toString(),
        name: gift.name,
        emoji: gift.emoji,
        cost: gift.token_price,
        color: "getColorFromSlug(gift.slug)",
        animation: "getAnimationFromSlug(gift.slug)",
        video: gift.video ? getMediaUrl(gift.video) : "",
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
        video: gift.video ? getMediaUrl(gift.video) : "",
        slug: gift.slug,
        token_price: gift.token_price || 0,
        is_active: gift.is_active ?? true,
        created_at: gift.created_at || new Date().toISOString(),
      }));
      setFullGifts(mappedGifts);
    }).catch(() => null);
  }, [activeGifts, dispatch]);

  // ─── WebSocket events (via singleton context) ─────────────────────────────

  useWsEvent("like_updated", useCallback((ev) => {
    const data = ev as { event: string; video_id: string; likes: number; liked: boolean };
    setLocalMedia(prev => prev.map(video =>
      video.id?.toString() === data.video_id?.toString()
        ? { ...video, likes_count: data.likes, liked: data.liked }
        : video
    ));
  }, []));

  useWsEvent("new_comment", useCallback((ev) => {
    const data = ev as { event: string; video_id: string; comments_count: number; user_id: unknown };
    if (!data?.user_id) return;
    setLocalMedia(prev => prev.map(video =>
      video.id?.toString() === data.video_id?.toString()
        ? { ...video, comments_count: data.comments_count }
        : video
    ));
    if (currentVideoId?.toString() === data.video_id?.toString()) {
      setComments(prev => upsertComment(prev, data));
    }
  }, [currentVideoId, upsertComment]));

  useWsEvent("new_view", useCallback((ev) => {
    const data = ev as { event: string; video_id: string; view_acount: number };
    setLocalMedia(prev => prev.map(video =>
      video.id?.toString() === data.video_id?.toString()
        ? { ...video, view_acount: data.view_acount }
        : video
    ));
  }, []));

  useWsEvent("video_gift_received", useCallback((ev) => {
    const data = ev as {
      event: string; video_id: string; from_user: number; to_user: number;
      gift_type: string; gift_uuid: string; sender: string;
      amount: number; gift_video: string; color_premiun: string;
    };
    const activeVideo = localMedia[activeModalIndex];
    const isTargetVideoOpen = activeVideo?.id?.toString() === data.video_id?.toString();
    if (currentUser?.id == data.from_user || (currentUser?.id == data.to_user && isTargetVideoOpen)) {
      const entry = {
        type: data.gift_type, giftId: data.gift_uuid, videoId: data.video_id,
        sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
        color_premiun: data.color_premiun,
      };
      if (data.gift_video) {
        if (giftAnimBlobRef.current) URL.revokeObjectURL(giftAnimBlobRef.current);
        fetch(getMediaUrl(data.gift_video))
          .then(r => r.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            giftAnimBlobRef.current = blobUrl;
            setGiftAnimation({ ...entry, blobUrl });
          })
          .catch(() => setGiftAnimation(entry));
      } else {
        setGiftAnimation(entry);
      }
    }
  }, [currentUser?.id, localMedia, activeModalIndex]));

  useWsEvent("new_follower", useCallback((ev) => {
    const data = ev as { event: string; channel_profile: string; current_user_followered: boolean };
    setLocalMedia(prev => prev.map(video =>
      video.user_id?.id?.toString() === data.channel_profile?.toString()
        ? { ...video, current_user_followered: data.current_user_followered }
        : video
    ));
  }, []));

  useWsEvent("delete_follower", useCallback((ev) => {
    const data = ev as { event: string; channel_profile: string; current_user_followered: boolean };
    setLocalMedia(prev => prev.map(video =>
      video.user_id?.id?.toString() === data.channel_profile?.toString()
        ? { ...video, current_user_followered: data.current_user_followered }
        : video
    ));
  }, []));

  // --- 2. Carga Inicial de Usuario ---
  const loadProfileData = useCallback(() => {
    if (!username) return;
    setIsProfileOffline(false);
    // Solo mostrar skeleton si el perfil cargado es diferente al que se pide
    const currentUsername = (user as any)?.username;
    if (!currentUsername || currentUsername.toLowerCase() !== username.toLowerCase()) {
      setIsProfileSwitching(true);
    }

    if (!navigator.onLine) {
      setIsProfileOffline(true);
    }

    // Si es perfil propio: mostrar cache inmediatamente, luego sincronizar
    if (isOwnProfile) {
      loadProfileVideos().then((cached) => {
        if (cached.length > 0) setLocalMedia(cached as VideoItem[]);
      });
    } else {
      setLocalMedia([]);
    }

    // Quitar skeleton en cuanto llega el usuario, sin esperar al grid de videos
    Promise.resolve(getUser(username)).finally(() => setIsProfileSwitching(false))
    getUserMedia(username)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isOwnProfile]);

  useEffect(() => {
    loadProfileData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isOwnProfile]);

  useEffect(() => {
    if (activeTab !== 'saved' || !isOwnProfile) return;
    setSavedLoading(true);
    getSavedVideos()(dispatch as any).then((data: any[]) => {
      setSavedVideos(Array.isArray(data) ? data : []);
    }).finally(() => setSavedLoading(false));
  }, [activeTab, isOwnProfile]);

  // Detectar cuando vuelve internet y recargar
  useEffect(() => {
    const handleOnline = () => {
      if (isProfileOffline) {
        setIsProfileOffline(false);
        loadProfileData();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isProfileOffline, loadProfileData]);

  // Suscripción al evento global de refresh
  useEffect(() => {
    const handleRefresh = () => {
      if (username) {
        getUser(username);
        getUserMedia(username);
      }
      dispatch(getWallet() as any);
    };
    window.addEventListener("buzzy:refresh", handleRefresh);
    return () => window.removeEventListener("buzzy:refresh", handleRefresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, dispatch]);

  // Sincronizar localMedia cuando llegan videos frescos de Redux
  useEffect(() => {
    if (!media_user) return;
    setLocalMedia(media_user);
    // Persistir solo si es perfil propio
    if (isOwnProfile && media_user.length > 0) {
      saveProfileVideos(media_user).catch(() => {});
    }
  }, [media_user, isOwnProfile]);

  // Limpiar estados locales al cambiar de perfil
  useEffect(() => {
    if (username) {
      setActiveTab("public");
      setViewedVideos(new Set());
      setVideoProgress({});
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      _getAvailabilityStatus(username).then((data: any) => {
        if (data) setAvailabilityStatus(data);
      }).catch(() => { /* sin internet */ });
      _getSocialAccounts();
      _refreshSocialFollowers();
    }
  }, [_getAvailabilityStatus, _getSocialAccounts, _refreshSocialFollowers, username]);

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
    setLocalMedia(prev => prev.map((video) => {
      if (video.id?.toString() !== videoId) return video;
      const nextLiked = !video.liked;
      const nextCount = Math.max(0, (video.likes_count || 0) + (nextLiked ? 1 : -1));
      return { ...video, liked: nextLiked, likes_count: nextCount };
    }));

    createLike({ video_id: videoId })(dispatch).catch(() => {
      showProfileToast('No se pudo registrar el like.', true);
      setLocalMedia(prev => prev.map((video) => {
        if (video.id?.toString() !== videoId) return video;
        const revert = !video.liked;
        return { ...video, liked: revert, likes_count: Math.max(0, (video.likes_count || 0) + (revert ? 1 : -1)) };
      }));
    });

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
    const giftObj = typeof giftTypeOrGift !== 'string' ? giftTypeOrGift : null;

    if (walletTokens < cost) {
      setShowTokenShopModal(true);
      return;
    }

    if (!selectedVideoForGift) return;

    try {
      const vip_message = typeof giftTypeOrGift !== 'string' ? ((giftTypeOrGift as GiftI & { vip_message?: string }).vip_message || "") : "";
      await sendVideoGift({ video_id: Number(selectedVideoForGift), gift_type: type, vip_message })(dispatch);
      setShowVideoGiftModal(false);
      if (giftObj?.video) setSentGiftPreview(giftObj);
    } catch {
      showProfileToast('No se pudo enviar el regalo. Inténtalo de nuevo.', true);
    }
  };

  const handleSendUserGift = async (giftTypeOrGift: string | GiftI, amount?: number) => {
    let type = typeof giftTypeOrGift === 'string'
      ? giftTypeOrGift
      : (giftTypeOrGift.emoji || giftTypeOrGift.slug || giftTypeOrGift.name);
    const cost = amount || (typeof giftTypeOrGift !== 'string' ? giftTypeOrGift.token_price : 0);
    const giftObj = typeof giftTypeOrGift !== 'string' ? giftTypeOrGift : null;

    if (walletTokens < cost) {
      setShowTokenShopModal(true);
      return;
    }

    if (!user?.username) return;

    try {
      const vip_message = typeof giftTypeOrGift !== 'string' ? ((giftTypeOrGift as GiftI & { vip_message?: string }).vip_message || "") : "";
      await sendUserGift({ recipient_username: user.username, gift_type: type, vip_message })(dispatch);
      setShowUserGiftModal(false);
      if (giftObj?.video) setSentGiftPreview(giftObj);
    } catch {
      showProfileToast('No se pudo enviar el regalo. Inténtalo de nuevo.', true);
    }
  };

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoElement = e.currentTarget;
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;

    // Monetization tracking — 50% mark, min 10s for monetizable
    trackTimeUpdate(videoId, currentTime, duration);

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
    setCurrentVideoId(video.id.toString());
    setCurrentVideoUuid(video.uuid || null);
    setShowCommentsModal(true);
    getComment({ video_id: video.uuid || "" })(dispatch).then((res) => {
      setComments(Array.isArray(res) ? res : [])
    });
  }

  const handlePostComment = () => {
    if (!commentText.trim() || !currentVideoUuid) return;
    createComment({
      video_id: currentVideoUuid,
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
        setActiveOutgoingCall(res?.call || null);
        // Guardar datos de Agora en el store global para que GlobalCallWrapper los use
        if (res.token && res.app_id && res.call?.agora_uid_caller) {
          setAgoraData({
            appId: res.app_id,
            token: res.token,
            uid: res.call.agora_uid_caller
          });
        }
        showCallAlert(res.message);
      }).catch((err: string) => {
        showCallAlert(typeof err === 'string' ? err : 'No se pudo iniciar la llamada.');
      });
    }
  };

  const handleOpenSocialModal = (tab: 'followers' | 'following' | 'subscribers') => {
    setSocialModalTab(tab);
    setShowSocialModal(true);
  };

  const handleDeleteVideo = async (videoUuid: string) => {
    setIsDeletingVideo(true);
    try {
      await apiClient.delete(`/api/videos/${videoUuid}/`);
      setLocalMedia(prev => prev.filter(v => (v as any).uuid !== videoUuid && v.id.toString() !== videoUuid));
      setConfirmDeleteVideoId(null);
      closeModal();
    } catch {
      // silent
    } finally {
      setIsDeletingVideo(false);
    }
  };

  // --- 5. Lógica Modal FullScreen ---
  const openModalAtIndex = (index: number, source: 'local' | 'saved' = 'local') => {
    videoRefs.current.forEach(v => v?.pause());
    setIsGridVideoPlaying({});
    setInitialScrollIndex(index);
    setActiveModalIndex(index);
    setModalVideoSource(source);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveModalIndex(-1);
    setShowCommentsModal(false);
    setModalVideoSource('local');
    if (modalMusicRef.current) {
      modalMusicRef.current.pause();
      modalMusicRef.current = null;
    }
  };

  const handleModalVideoTap = (index: number) => {
    const videoEl = modalVideoRefs.current[index];
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      modalMusicRef.current?.play().catch(() => {});
    } else {
      videoEl.pause();
      modalMusicRef.current?.pause();
    }
  };
  // const generateAudioLevels = () => Array.from({ length: 15 }, () => Math.random() * 100);

  useEffect(() => {
    if (!isModalOpen || !modalContainerRef.current) return;

    const container = modalContainerRef.current;

    const settleActiveIndex = () => {
      const containerHeight = container.clientHeight || 1;
      const nextIndex = Math.round(container.scrollTop / containerHeight);
      const modalList = modalVideoSource === 'saved' ? savedVideos : localMedia;
      const clampedIndex = Math.max(0, Math.min(nextIndex, modalList.length - 1));
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

    // Audio track para el video activo
    const source = modalVideoSource === 'saved' ? savedVideos : localMedia;
    const activeVid = source[activeModalIndex];
    const trackUrl = activeVid?.audio_track_url;

    if (modalMusicRef.current) {
      modalMusicRef.current.pause();
      modalMusicRef.current.src = '';
      modalMusicRef.current = null;
    }

    // Aplicar volumen original al elemento de video
    const videoEl = modalVideoRefs.current[activeModalIndex];
    if (videoEl) {
      videoEl.volume = Math.min(Math.max(activeVid?.volume_original ?? 1.0, 0), 1);
    }

    if (trackUrl) {
      const volumeMusic = Math.min(Math.max(activeVid?.volume_music ?? 0.8, 0), 1);
      const trimStart = Math.max(0, activeVid?.audio_trim_start ?? 0);
      const trimEnd = typeof activeVid?.audio_trim_end === 'number' && isFinite(activeVid.audio_trim_end)
        ? Math.max(trimStart, activeVid.audio_trim_end)
        : null;

      prefetchAudioUrl(trackUrl).then(blobUrl => {
        if (modalMusicRef.current) return; // ya cambió de video
        const audio = new Audio(blobUrl);
        audio.loop = false;
        audio.volume = volumeMusic;
        audio.currentTime = trimStart;

        if (trimEnd) {
          audio.ontimeupdate = () => {
            if (audio.currentTime >= trimEnd) {
              audio.currentTime = trimStart;
              audio.play().catch(() => {});
            }
          };
        } else {
          audio.loop = true;
        }

        audio.play().catch(() => {});
        modalMusicRef.current = audio;
      }).catch(() => {});
    }

    return () => {
      if (modalMusicRef.current) {
        modalMusicRef.current.pause();
        modalMusicRef.current = null;
      }
    };
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
    } else if (option === "Privacidad de chats") {
      setShowChatPrivacyModal(true);
    } else if (option === "Notificaciones") {
      setShowSettingsModal(false);
      // Resetear al valor guardado en caso de que haya cambios sin guardar
      setNotifPush(localStorage.getItem('notif_push') !== 'false');
      setNotifMessages(localStorage.getItem('notif_messages') !== 'false');
      setNotifGifts(localStorage.getItem('notif_gifts') !== 'false');
      setNotifFollowers(localStorage.getItem('notif_followers') !== 'false');
      setShowNotificationsModal(true);
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
    if (!isOwnProfile && user && !user.is_following) {
      setShowFollowPrompt(true);
      return;
    }
    setShowMessages(true);
    setSelectedChat(user?.chat_uuid ?? null);
  };

  const handleFollowAndMessage = () => {
    if (user?.id) {
      createFollower({ follower_user_id: user.id.toString() })(dispatch).then((res) => {
        setShowFollowPrompt(false);
        setShowMessages(true);
        setSelectedChat(res?.data.chat_uuid ?? null);
      }).catch(() => {
        showProfileToast('No se pudo seguir al usuario.', true);
        setShowFollowPrompt(false);
      });
    }
  };

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    // Espera un frame para que el estado visual cambie antes de limpiar la sesión.
    window.requestAnimationFrame(() => {
      logout()(dispatch);
    });
  }, [dispatch, isLoggingOut]);

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

  if (isLoggingOut) {
    return (
      <div className="min-h-screen w-full bg-[#050718] flex items-center justify-center overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-purple-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-cyan-500/15 blur-[60px] pointer-events-none" />

        <div className="relative flex flex-col items-center gap-6 text-center px-8">
          {/* Rings */}
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* Outer slow ring */}
            <div className="absolute inset-0 rounded-full border border-white/5" />
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{
                background: "linear-gradient(#050718, #050718) padding-box, linear-gradient(135deg, #7000ff, #00f0ff) border-box",
                animation: "spin 2.4s linear infinite",
              }}
            />
            {/* Inner fast ring */}
            <div
              className="absolute inset-3 rounded-full border-2 border-transparent"
              style={{
                background: "linear-gradient(#050718, #050718) padding-box, linear-gradient(225deg, #00f0ff, #7000ff) border-box",
                animation: "spin 1.1s linear infinite reverse",
              }}
            />
            {/* Center dot */}
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 shadow-[0_0_12px_rgba(112,0,255,0.8)]" />
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-white font-semibold text-base tracking-wide">Cerrando sesión</p>
            <p className="text-white/30 text-xs">Hasta pronto 👋</p>
          </div>

          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Mostrar skeleton mientras carga el nuevo perfil (evita flash del perfil anterior)
  if (isProfileSwitching || (!user && !notFoundUsername)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center">
        {/* Banner skeleton */}
        <div className="w-full h-20 bg-gradient-to-r from-[#7000ff]/30 via-[#4c1d95]/30 to-[#00f0ff]/30 rounded-b-[2.5rem] animate-pulse" />
        <div className="flex flex-col items-center gap-4 -mt-10 w-full px-4">
          {/* Avatar skeleton */}
          <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse border-4 border-[#050718]" />
          {/* Name skeleton */}
          <div className="h-7 w-36 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-white/8 animate-pulse" />
          {/* Stats skeleton */}
          <div className="flex gap-8 w-full max-w-sm justify-center py-3 px-6 rounded-2xl bg-white/5 border border-white/10">
            {[0,1,2].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-6 w-10 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-3 w-14 rounded-md bg-white/8 animate-pulse" />
              </div>
            ))}
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-3 gap-1 w-full mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/8 animate-pulse rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen text-white flex flex-col items-center bg-black font-sans">
        {/* Fondo Dinámico */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-black opacity-100"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div>
          {/* <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div> */}
        </div>

        {/* --- CONTENIDO PRINCIPAL DEL PERFIL RESTAURADO --- */}
        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center pb-24">

          {/* Banner Curvo */}
          <div className="w-full h-20 md:h-52 relative overflow-hidden rounded-b-[2.5rem] shadow-2xl shadow-[#7000ff]/20">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff] via-[#4c1d95] to-[#00f0ff] opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            {/* Buzzy Banner Space — dentro del header curvo */}
            <div className="absolute inset-0 z-20">
              <BuzzyBannerSpace />
            </div>

            {/* Banner usuario no encontrado */}
            {notFoundUsername && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10 px-6 -translate-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="11" y1="16" x2="11.01" y2="16"/>
                  </svg>
                  <span className="text-white/60 text-[11px] font-medium uppercase tracking-widest">Usuario no encontrado</span>
                </div>
                <p className="text-white text-center text-sm font-semibold leading-snug drop-shadow">
                  <span className="text-white/50">@</span>{notFoundUsername}{" "}
                  <span className="text-white/70 font-normal">no existe en Buzzy.</span>
                </p>
                <p className="text-white/45 text-[11px] text-center mt-0.5">
                  Te mostramos el perfil oficial de Buzzy.
                </p>
              </div>
            )}
          </div>

          <div className="px-4 w-full flex flex-col items-center -mt-5 md:-mt-20 space-y-4 relative z-30">

            {/* Foto de Perfil */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative p-1.5 rounded-full cursor-pointer"
              style={{ background: "linear-gradient(135deg, #ff0080, #7928ca, #00d4ff)" }}
              onClick={() => setShowProfileMediaOptions(true)}
            >
              <div className="rounded-full bg-[#050718]">
                <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden">
                  {user?.profile_video ? (
                    <video
                      className="w-full h-full object-cover"
                      src={`${user.profile_video}`}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : user ? (
                    <img
                      className="w-full h-full object-cover"
                      src={getMediaUrl(user.profile_picture)}
                      alt={user.username}
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                </div>
              </div>
              {/* Badge — logo Buzzy */}
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full border-[3px] border-[#050718] overflow-hidden shadow-[0_0_14px_rgba(0,240,255,0.4)]">
                <img src="/screenshots/buzzy_icon_1024.png" alt="Buzzy" className="w-full h-full object-cover" />
              </div>
            </motion.div>

            {/* Texto de Información (Restaurado) */}
            <div className="text-center space-y-1">
              <motion.h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {user?.first_name || t('profile:placeholders.user')}
              </motion.h1>
              <motion.p className="text-[#a2b0ff] font-medium">
                @{user?.username || user?.email?.split('@')[0] || t('profile:placeholders.anonymous')}
              </motion.p>
            </div>

            {/* Stats en Tarjeta Glassmorphism (Restaurada COMPLETAMENTE) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-8 md:gap-12 py-1 px-6 rounded-2xl  w-full max-w-sm mt-4 shadow-xl"
            >
              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenSocialModal('followers')}
              >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {(user?.follower_all_acount || 0) + (user?.total_social_followers || 0)}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">{t('profile:header.followers')}</span>
              </div>

              <div className="w-px h-8 bg-white/10"></div>

              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenSocialModal('following')}
              >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                  {user?.followed_all_acount || 0}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-200">{t('profile:header.following')}</span>
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
                  {currentUser?.id === user?.id ? t('profile:stats.subscribers') : t('profile:header.likes')}
                </span>
              </div>
            </motion.div>

            {/* Botones de acción propios — debajo de stats */}
            {isOwnProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2"
              >
                <Button
                  onClick={() => setShowPremiumModal(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-10 w-10 border-0 relative overflow-hidden flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
                >
                  <span className="relative z-10 text-white font-black text-base">✦</span>
                </Button>
                <Button
                  onClick={() => setShowReceivedGiftsModal(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10 relative flex-shrink-0"
                >
                  <Gift size={18} />
                  {unseenGiftsCount > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center shadow-lg shadow-pink-500/50"
                    >
                      {unseenGiftsCount > 99 ? "99+" : unseenGiftsCount}
                    </motion.span>
                  )}
                </Button>
                <Button onClick={() => setShowEditProfileModal(true)} variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10 flex-shrink-0">
                  <UserCog size={18} />
                </Button>
                <Button onClick={() => setShowSettingsModal(true)} variant="ghost" size="icon" className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 w-10 flex-shrink-0">
                  <Settings size={18} />
                </Button>
              </motion.div>
            )}

            {/* Bio y Enlace (Restaurado) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center max-w-md px-4 pt-2"
            >
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                {user?.bio || t('profile:bio.default')}
              </p>

            </motion.div>

            {/* Botones de Acción */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 pt-2 w-full max-w-xs justify-center"
            >
              {(!currentUser || !user) ? null : !isOwnProfile && (
                <div className="flex gap-2">
                  {/* Subscribe */}
                  <Button
                    onClick={handleOpenSubscriptionModal}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-10 w-10 flex-shrink-0 border bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 border-yellow-500/30"
                  >
                    <Crown size={18} />
                  </Button>

                  {/* Message */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMessageClick}
                    className="rounded-xl h-10 w-10 flex-shrink-0 border bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
                  >
                    <MessageCircle size={18} />
                  </Button>
                </div>
              )}

              {(!currentUser || !user) ? null : !isOwnProfile && (
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

                  {/* Botón de regalo a usuario */}
                  <Button
                    onClick={() => setShowUserGiftModal(true)}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-10 w-10 flex-shrink-0 border bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 border-pink-500/30"
                  >
                    <Gift size={18} />
                  </Button>
                </div>
              )}

            </motion.div>

            {/* Mensaje de Upgrade si es necesario */}
            {availabilityStatus?.upgrade_required && !isOwnProfile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xs mt-4 relative"
              >
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-500"></div>
                <Button
                  onClick={handleOpenSubscriptionModal}
                  className="relative w-full h-11 bg-black/40 backdrop-blur-sm border border-white/20 text-white font-bold rounded-2xl shadow-2xl overflow-hidden group transition-all duration-300 hover:border-[#00f0ff]/50 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/20 to-[#00f0ff]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      {t('profile:subscription.upgradeMessage')}
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
            className="w-full mt-3 px-2 md:px-0"
          >
            <Tabs defaultValue="public" value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Botones de acción + Tabs — sticky al hacer scroll */}
              <div className="sticky top-0 z-30 backdrop-blur-sm  pb-3 rounded-xl flex flex-col gap-4">
                <div className="relative w-full px-2">
                  <TabsList className={`relative grid gap-1.5 bg-transparent h-auto p-0 w-full ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-2'}`}>
                    {(isOwnProfile
                      ? [
                          { value: 'public',    label: 'Público',    Icon: Globe,     activeColor: 'text-cyan-400',   glowColor: 'shadow-cyan-500/40'   },
                          { value: 'followers', label: 'Seguidores', Icon: Users,     activeColor: 'text-purple-400', glowColor: 'shadow-purple-500/40' },
                          { value: 'private',   label: 'Privado',    Icon: Lock,      activeColor: 'text-amber-400',  glowColor: 'shadow-amber-500/40'  },
                          { value: 'saved',     label: 'Guardados',  Icon: Bookmark,  activeColor: 'text-pink-400',   glowColor: 'shadow-pink-500/40'   },
                        ]
                      : [
                          { value: 'public',    label: 'Público',    Icon: Globe,  activeColor: 'text-cyan-400',   glowColor: 'shadow-cyan-500/40'   },
                          { value: 'followers', label: 'Seguidores', Icon: Users,  activeColor: 'text-purple-400', glowColor: 'shadow-purple-500/40' },
                        ]
                    ).map((tab) => {
                      const isActive = activeTab === tab.value;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          title={tab.label}
                          className={`relative w-full h-10 rounded-xl transition-all duration-300 flex items-center justify-center p-0
                            ${isActive
                              ? `bg-gradient-to-br from-[#1c1427] to-[#0e1a22] border border-white/10 shadow-md ${tab.glowColor}`
                              : 'bg-white/5 border border-white/5 hover:bg-white/10'
                            }`}
                        >
                          <tab.Icon
                            size={15}
                            className={`transition-all duration-300 ${isActive ? `${tab.activeColor} drop-shadow-[0_0_5px_currentColor]` : 'text-white/30'}`}
                            strokeWidth={isActive ? 2.5 : 1.5}
                          />
                          {isActive && (
                            <motion.div
                              layoutId="privacy-tab-indicator"
                              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${tab.activeColor.replace('text-', 'bg-')}`}
                            />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              {isProfileOffline && (
                <div className="mx-1 md:mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-3">
                  <span className="text-yellow-400 text-sm">Sin conexión</span>
                  <button
                    onClick={loadProfileData}
                    className="text-xs font-bold text-yellow-300 bg-yellow-500/20 px-3 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-all whitespace-nowrap"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {/* Tab guardados — grid propio */}
              {activeTab === 'saved' && (
                <TabsContent value="saved" className="px-1 md:px-4">
                  {savedLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-pink-400 rounded-full animate-spin" />
                    </div>
                  ) : savedVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
                      <Bookmark size={36} strokeWidth={1.2} />
                      <span className="text-sm">No tienes videos guardados</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-4">
                      {savedVideos.map((video: any, index: number) => (
                        <motion.div
                          key={video.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.04 }}
                          className="relative group rounded-lg overflow-hidden bg-zinc-900 aspect-[3/4] cursor-pointer"
                          onClick={() => openModalAtIndex(index, 'saved')}
                        >
                          {video.media_type === 'image' ? (
                            <img src={video.thumbnail_url || video.video_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <video src={video.video_url} muted playsInline preload="none" poster={video.thumbnail_url || undefined} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
                          <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-full p-1">
                            <Bookmark size={10} className="text-pink-400 fill-pink-400" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value={activeTab} className="px-1 md:px-4">
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {activeTab === 'saved' ? null : [...localMedia].filter((video) => {
                    const p = video.privacy ?? 'public';
                    if (activeTab === 'public')    return p === 'public';
                    if (activeTab === 'followers') return p === 'followers';
                    if (activeTab === 'private')   return p === 'private';
                    return true;
                  }).sort((a, b) =>
                    new Date(b.create_at || 0).getTime() - new Date(a.create_at || 0).getTime()
                  ).map((video, index) => {
                    // Índice real en localMedia para que el modal scroll al video correcto
                    const realIndex = localMedia.findIndex(v => v.id === video.id);
                    return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group rounded-lg overflow-hidden bg-zinc-900 aspect-[3/4]"
                      onClick={() => handleVideoClickOrDoubleClick(video, realIndex)}
                    >
                      <div className="relative h-full w-full">
                        {video.media_type === 'image' ? (
                          <img
                            src={getMediaUrl(video.video_url || video.video)}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            alt="Profile Media"
                          />
                        ) : (
                          <video
                            ref={(el) => { videoRefs.current[index] = el }}
                            src={getMediaUrl(video.video_url || video.video)}
                            muted
                            playsInline
                            preload="none"
                            poster={video.thumbnail_url ? getMediaUrl(video.thumbnail_url) : undefined}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                        {video.status && video.status !== 'ready' && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-10">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-white/70 text-[10px] font-medium tracking-wide">Procesando</span>
                          </div>
                        )}
                        {video.privacy === 'private' && (
                          <div className="absolute top-2 right-2 z-20 bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          </div>
                        )}
                        {video.privacy === 'followers' && (
                          <div className="absolute top-2 right-2 z-20 bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium">
                          {video.media_type === 'image' ? (
                            <>
                              <Heart className="h-3 w-3 text-red-400" fill="currentColor" />
                              <span className="text-white">{(video as any).like_count || 0}</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 text-white" fill="white" />
                              <span className="text-white">{video.view_acount || 0}</span>
                            </>
                          )}
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
                  )})}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
        <BottomNavbar />
      </div >

      {/* Modal de regalos de video recibidos */}
      <AnimatePresence>
        {showReceivedGiftsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowReceivedGiftsModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0e0e1a] rounded-t-3xl overflow-hidden border-t border-white/10 shadow-2xl flex flex-col"
              style={{ height: '55vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Gift size={20} className="text-pink-400" />
                  <span className="text-white font-bold text-base">Regalos recibidos</span>
                  {unseenGiftsCount > 0 && (
                    <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unseenGiftsCount} nuevos
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowReceivedGiftsModal(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-5 pb-3">
                <button
                  onClick={() => setGiftsTab('video')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${giftsTab === 'video' ? 'bg-pink-500/30 text-pink-300' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  Videos ({receivedVideoGifts.length})
                </button>
                <button
                  onClick={() => setGiftsTab('user')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${giftsTab === 'user' ? 'bg-pink-500/30 text-pink-300' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  Perfil ({receivedUserGifts.length})
                </button>
              </div>

              {/* Lista de regalos */}
              <div className="overflow-y-auto flex-1 px-4 pb-8 space-y-3" style={{ minHeight: 0 }}>
                {giftsTab === 'user' ? (
                  receivedUserGifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
                      <Gift size={48} />
                      <p className="text-sm">Aún no tienes regalos de perfil</p>
                    </div>
                  ) : (
                    receivedUserGifts.map((gift, i: number) => {
                      const isNew = !gift.is_seen;
                      const isPlaying = playingGiftUuid === gift.uuid;
                      return (
                        <motion.div
                          key={gift.uuid}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`flex items-center gap-3 rounded-2xl p-3 border transition-all cursor-pointer ${isNew ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/5'}`}
                          onClick={() => {
                            if (!isPlaying) {
                              markUserGiftsSeen(gift.uuid)(dispatch);
                              if (isNew) setUnseenGiftsCount(prev => Math.max(0, prev - 1));
                              openGiftPreview(gift.uuid, gift.gift_video_url);
                            }
                          }}
                        >
                          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-black/40">
                            {gift.gift_video_url ? (
                              <GiftVideoThumb src={getMediaUrl(gift.gift_video_url)} emoji={gift.gift_emoji || "🎁"} playing={isPlaying} thumbnail={gift.video_thumbnail ? getMediaUrl(gift.video_thumbnail) : undefined} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">{gift.gift_emoji || "🎁"}</div>
                            )}
                            {isNew && (
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                                className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-pink-500 shadow-lg shadow-pink-500/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {gift.sender_avatar ? (
                                <img src={gift.sender_avatar.startsWith('http') ? gift.sender_avatar : getMediaUrl(gift.sender_avatar)} className="w-5 h-5 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"><User size={10} className="text-white/50" /></div>
                              )}
                              <span className="text-white/80 text-xs font-semibold truncate">@{gift.sender_username}</span>
                            </div>
                            <p className="text-white font-bold text-sm mt-0.5 truncate">{gift.gift_emoji} {gift.gift_name}</p>
                            {(gift as any).vip_message && (
                              <p className="text-pink-300/80 text-[10px] mt-0.5 italic truncate">"{(gift as any).vip_message}"</p>
                            )}
                            <p className="text-white/40 text-[10px] mt-0.5">{isPlaying ? "▶ Reproduciendo..." : "Toca para ver"}</p>
                          </div>
                          <span className="text-white/30 text-[10px] flex-shrink-0">
                            {new Date(gift.created_at).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                          </span>
                        </motion.div>
                      );
                    })
                  )
                ) : receivedVideoGifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
                    <Gift size={48} />
                    <p className="text-sm">Aún no tienes regalos recibidos</p>
                  </div>
                ) : (
                  receivedVideoGifts.map((gift, i: number) => {
                    const isNew = !gift.is_seen;
                    const isPlaying = playingGiftUuid === gift.uuid;
                    return (
                      <motion.div
                        key={gift.uuid}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`flex items-center gap-3 rounded-2xl p-3 border transition-all cursor-pointer ${isNew ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/5'}`}
                        onClick={() => {
                          if (!isPlaying) {
                            // Marcar como visto en BD inmediatamente al tocar
                            markVideoGiftsSeen(gift.uuid)(dispatch);
                            if (isNew) setUnseenGiftsCount(prev => Math.max(0, prev - 1));
                            openGiftPreview(gift.uuid, gift.gift_video_url);
                          }
                        }}
                      >
                        {/* Miniatura del regalo — al hacer click muestra la animación full */}
                        <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-black/40">
                          {gift.gift_video_url ? (
                            <video
                              src={getMediaUrl(gift.gift_video_url)}
                              autoPlay={isPlaying}
                              loop
                              muted={!isPlaying}
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {gift.gift_emoji || "🎁"}
                            </div>
                          )}
                          {isNew && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-pink-500 shadow-lg shadow-pink-500/60"
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {gift.sender_avatar ? (
                              <img
                                src={gift.sender_avatar.startsWith('http') ? gift.sender_avatar : getMediaUrl(gift.sender_avatar)}
                                className="w-5 h-5 rounded-full object-cover"
                                alt=""
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                <User size={10} className="text-white/50" />
                              </div>
                            )}
                            <span className="text-white/80 text-xs font-semibold truncate">@{gift.sender_username}</span>
                          </div>
                          <p className="text-white font-bold text-sm mt-0.5 truncate">
                            {gift.gift_emoji} {gift.gift_name}
                          </p>
                          {(gift as any).vip_message && (
                            <p className="text-pink-300/80 text-[10px] mt-0.5 italic truncate">"{(gift as any).vip_message}"</p>
                          )}
                          <p className="text-white/40 text-[10px] mt-0.5">
                            {isPlaying ? "▶ Reproduciendo..." : "Toca para ver"}
                          </p>
                        </div>

                        {/* Miniatura del video + tiempo */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {gift.video_thumbnail ? (
                            <img
                              src={getMediaUrl(gift.video_thumbnail)}
                              className="w-10 h-14 rounded-lg object-cover border border-white/10"
                              alt=""
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : null}
                          <span className="text-white/30 text-[10px]">
                            {new Date(gift.created_at).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Blackout de regalo (Space/agujero negro) */}
      <AnimatePresence>
        {giftBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Overlay de reproducción del regalo — emerge de la pantalla */}
      <AnimatePresence>
        {playingGiftUuid && (() => {
          const giftItem = receivedVideoGifts.find(g => g.uuid === playingGiftUuid)
            ?? receivedUserGifts.find(g => g.uuid === playingGiftUuid);
          if (!giftItem?.gift_video_url) return null;
          return (
            <motion.div
              key="gift-play-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="fixed inset-0 z-[300] pointer-events-auto"
            >
              {/* Poster mientras carga el video */}
              {giftItem.video_thumbnail && (
                <img
                  src={getMediaUrl(giftItem.video_thumbnail)}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    maskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                    WebkitMaskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                  }}
                />
              )}

              {/* Video a pantalla completa con máscara que disuelve todos los bordes */}
              <motion.video
                key={giftItem.uuid}
                src={playingGiftBlobUrl || getMediaUrl(giftItem.gift_video_url)}
                autoPlay
                playsInline
                muted
                poster={giftItem.video_thumbnail ? getMediaUrl(giftItem.video_thumbnail) : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  display: 'block',
                  maskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                  WebkitMaskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  const slug = giftItem.gift_name?.toLowerCase();
                  if (slug?.includes('space') || slug?.includes('Space') || giftItem.gift_emoji === '🪐') {
                    if (v.currentTime >= 4.0 && v.currentTime < 6.0) {
                      if (!giftBlackout) setGiftBlackout(true);
                    } else if (v.currentTime >= 6.0 && giftBlackout) {
                      setGiftBlackout(false);
                    }
                  }
                }}
                onEnded={() => {
                  setGiftBlackout(false);
                  if (playingGiftBlobRef.current) {
                    URL.revokeObjectURL(playingGiftBlobRef.current);
                    playingGiftBlobRef.current = null;
                  }
                  setPlayingGiftBlobUrl(null);
                  setReceivedVideoGifts(prev => prev.filter(g => g.uuid !== playingGiftUuid));
                  setReceivedUserGifts(prev => prev.filter(g => g.uuid !== playingGiftUuid));
                  setPlayingGiftUuid(null);
                }}
              />
              {/* Nombre + sender centrado abajo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none"
              >
                <p className="text-white font-black text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {giftItem.gift_emoji} {giftItem.gift_name}
                </p>
                <p className="text-white/70 text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  de @{giftItem.sender_username}
                </p>
                {(giftItem as any).vip_message && (
                  <p className="text-pink-300 text-sm italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xs text-center px-4">
                    "{(giftItem as any).vip_message}"
                  </p>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Overlay de preview para el SENDER tras enviar regalo */}
      <AnimatePresence>
        {sentGiftPreview && (
          <motion.div
            key="sent-gift-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[300] pointer-events-auto"
          >
            <motion.video
              key={sentGiftPreview.slug}
              src={getMediaUrl(sentGiftPreview.video) || undefined}
              autoPlay
              playsInline
              muted
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                display: 'block',
                maskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                WebkitMaskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
              }}
              onEnded={() => setSentGiftPreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none"
            >
              <p className="text-white font-black text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                {sentGiftPreview.emoji} {sentGiftPreview.name}
              </p>
              <p className="text-white/70 text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                para @{user?.username}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showEditProfileModal && (user || currentUser) && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSaveSuccess={() => getUser(username!)}
          user={user || currentUser}
        />
      )}

      <ChatPrivacyModal
        isOpen={showChatPrivacyModal}
        onClose={() => setShowChatPrivacyModal(false)}
      />

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

      {/* ===================== MODAL BUZZY PREMIUM ===================== */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setShowPremiumModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[2rem] overflow-hidden"
              style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d0118 100%)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              {(currentUser?.is_buzzy_premium || user?.is_buzzy_premium) ? (
                <>
                  {/* Header — activo */}
                  <div className="relative px-6 pt-4 pb-6 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-transparent pointer-events-none" />
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="text-5xl mb-3"
                    >👑</motion.div>
                    <h2 className="text-2xl font-black text-white tracking-tight">¡Eres Premium!</h2>
                    <p className="text-purple-300/70 text-sm mt-1">Disfruta de todos tus beneficios exclusivos</p>
                  </div>

                  {/* Beneficios activos */}
                  <div className="px-6 pb-4 space-y-3">
                    {[
                      { icon: '🚫', title: 'Sin anuncios', desc: 'Tu feed siempre limpio y sin interrupciones' },
                      { icon: '🎬', title: 'Videos más largos', desc: 'Sube videos de hasta 5 minutos' },
                      { icon: '🎁', title: 'Regalos exclusivos', desc: 'Envía y recibe regalos que solo los Premium tienen' },
                      { icon: '⚡', title: 'Prioridad en comentarios', desc: 'Tus comentarios destacan sobre el resto' },
                    ].map((b, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="flex items-center gap-4 bg-purple-500/10 border border-purple-400/20 rounded-2xl px-4 py-3"
                      >
                        <span className="text-2xl flex-shrink-0">{b.icon}</span>
                        <div>
                          <p className="text-white font-semibold text-sm">{b.title}</p>
                          <p className="text-purple-300/60 text-xs">{b.desc}</p>
                        </div>
                        <div className="ml-auto flex-shrink-0 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Botón cerrar */}
                  <div className="px-6 pb-8 pt-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowSubscriptionModal(false)}
                      className="w-full h-14 rounded-2xl font-black text-white text-base relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
                    >
                      <motion.span
                        className="absolute inset-0 bg-white/15"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        style={{ skewX: '-20deg' }}
                      />
                      <span className="relative">¡Seguir disfrutando!</span>
                    </motion.button>
                    <p className="text-center text-white/25 text-xs mt-3">Renovación automática mensual · Cancela cuando quieras</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Header — no activo */}
                  <div className="relative px-6 pt-4 pb-6 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-transparent pointer-events-none" />
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className="text-5xl mb-3"
                    >✦</motion.div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Buzzy Premium</h2>
                    <p className="text-purple-300/70 text-sm mt-1">Lleva tu experiencia al siguiente nivel</p>
                    <div className="mt-4 inline-flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">$5.99</span>
                      <span className="text-white/40 text-sm">/mes</span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="px-6 pb-4 space-y-3">
                    {[
                      { icon: '🚫', title: 'Sin anuncios', desc: 'Disfruta el feed sin interrupciones' },
                      { icon: '🎬', title: 'Videos más largos', desc: 'Sube videos de hasta 5 minutos' },
                      { icon: '🎁', title: 'Envía regalos exclusivos', desc: 'Accede a regalos Premium que nadie más puede enviar' },
                      { icon: '👑', title: 'Recibe regalos exclusivos', desc: 'Desbloquea regalos especiales de tus fans Premium' },
                    ].map((b, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-2xl px-4 py-3"
                      >
                        <span className="text-2xl flex-shrink-0">{b.icon}</span>
                        <div>
                          <p className="text-white font-semibold text-sm">{b.title}</p>
                          <p className="text-white/40 text-xs">{b.desc}</p>
                        </div>
                        <div className="ml-auto flex-shrink-0 h-5 w-5 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center">
                          <span className="text-purple-300 text-[10px]">✓</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-8 pt-2">
                    {(() => {
                      const alreadyPremium = currentUser?.is_buzzy_premium || user?.is_buzzy_premium;
                      return (
                        <motion.button
                          whileTap={alreadyPremium ? {} : { scale: 0.97 }}
                          onClick={alreadyPremium ? undefined : handlePremiumCheckout}
                          disabled={premiumLoading || alreadyPremium}
                          className="w-full h-14 rounded-2xl font-black text-white text-base relative overflow-hidden disabled:cursor-default"
                          style={{ background: alreadyPremium ? 'linear-gradient(135deg, #4a4a6a, #6b6b8a)' : 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
                        >
                          {!alreadyPremium && (
                            <motion.span
                              className="absolute inset-0 bg-white/15"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                              style={{ skewX: '-20deg' }}
                            />
                          )}
                          <span className="relative">
                            {alreadyPremium ? '✦ Disfrutando Premium' : premiumLoading ? 'Redirigiendo...' : 'Activar Premium — $5.99/mes'}
                          </span>
                        </motion.button>
                      );
                    })()}
                    <p className="text-center text-white/25 text-xs mt-3">Cancela cuando quieras · Renovación automática mensual</p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL CONFIGURACIÓN (SETTINGS) ===================== */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => { stopRingtonePreview(); setShowRingtonePanel(false); setShowSettingsModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 30, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-[#0a0a0f] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"> </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">{t('profile:settings.title')}</h2>
                </div>
                <button
                  onClick={() => { stopRingtonePreview(); setShowRingtonePanel(false); setShowSettingsModal(false); }}
                  className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de opciones */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* 1. Cuenta Bancaria (especial) */}
                <div
                  onClick={handleSaveBankAccount}
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors">{t('profile:settings.bankAccount')}</p>
                    <p className="text-xs text-gray-400 truncate">{t('profile:settings.bankSubtitle')}</p>
                  </div>
                  <div className="text-emerald-400 shrink-0">
                    <span className="text-xs font-medium">{t('profile:settings.add')}</span>
                  </div>
                </div>

                <div
                  onClick={() => handleEditOption("Privacidad de chats")}
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-9 h-9 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <Shield size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white group-hover:text-amber-400">{t('profile:settings.privacy', 'Privacy')}</p>
                    <p className="text-xs text-gray-400 truncate">PIN de 6 dígitos para ocultos</p>
                  </div>
                </div>

                <div
                  onClick={() => handleEditOption("Notificaciones")}
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-9 h-9 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white group-hover:text-sky-400">{t('profile:settings.notifications')}</p>
                  </div>
                </div>

                {/* Horario de disponibilidad para llamadas */}
                <div
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                >
                  <div className="w-9 h-9 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                    <UserCog size={18} />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => handleOpenAvailabilityModal(), 280);
                  }}
                  >
                    <p className="font-semibold text-sm text-white group-hover:text-violet-400">{t('profile:settings.availability')}</p>
                    <p className="text-xs text-gray-400 truncate">{t('profile:settings.availabilitySubtitle')}</p>
                  </div>
                  <div className="text-violet-400 shrink-0">
                    <span className="text-xs font-medium">{t('profile:settings.edit')}</span>
                  </div>
                </div>

                {/* Sonido de llamada */}
                <div className="rounded-2xl overflow-hidden">
                  <div
                    onClick={() => { stopRingtonePreview(); setShowRingtonePanel(p => !p); }}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                  >
                    <div className="w-9 h-9 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white group-hover:text-pink-400 transition-colors">Sonido de llamada</p>
                      <p className="text-xs text-gray-400 truncate">{RINGTONE_OPTIONS.find(r => r.id === ringtoneId)?.label ?? '—'}</p>
                    </div>
                    <span className={`text-white/40 transition-transform duration-200 ${showRingtonePanel ? 'rotate-180' : ''}`}>▾</span>
                  </div>

                  <AnimatePresence>
                    {showRingtonePanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 grid grid-cols-1 gap-1">
                          {RINGTONE_OPTIONS.map(opt => {
                            const active = opt.id === ringtoneId;
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${active ? 'bg-pink-500/15 border border-pink-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                onClick={() => {
                                  setRingtone(opt.id);
                                  previewRingtone(opt.file);
                                }}
                              >
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-pink-400' : 'bg-white/20'}`} />
                                <span className={`text-sm flex-1 ${active ? 'text-pink-300 font-semibold' : 'text-white/70'}`}>{opt.label}</span>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); previewRingtone(opt.file); }}
                                  className="text-white/30 hover:text-white/80 transition-colors text-xs px-2 py-0.5 rounded-lg hover:bg-white/10"
                                >
                                  ▶
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Invitar a un amigo */}
                <div className="rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setShowReferralPanel(p => !p)}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.985]"
                  >
                    <div className="w-9 h-9 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white group-hover:text-violet-400 transition-colors">Invitar a un amigo</p>
                      <p className="text-xs text-gray-400 truncate">Gana 100 tokens por cada 5 invitados</p>
                    </div>
                    <span className={`text-white/40 transition-transform duration-200 ${showReferralPanel ? 'rotate-180' : ''}`}>▾</span>
                  </div>

                  <AnimatePresence>
                    {showReferralPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 flex flex-col gap-3">
                          {/* Botón generar */}
                          <button
                            onClick={async () => {
                              setReferralLoading(true);
                              try {
                                const res = await apiClient.post('/api/referrals/generate/');
                                const token: string = res.data.token;
                                // El link apunta al backend Django que sirve la página
                                // inteligente: detecta si la app está instalada → la abre,
                                // si no → redirige a Play Store
                                setReferralLink(`${getBaseUrl()}/join?code=${token}`);
                                setReferralCopied(false);
                              } catch {
                                // silently ignore
                              } finally {
                                setReferralLoading(false);
                              }
                            }}
                            disabled={referralLoading}
                            className="relative w-full py-3 rounded-2xl font-bold text-sm text-white overflow-hidden active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:brightness-110"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {referralLoading ? (
                                <>
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                  </svg>
                                  Generando...
                                </>
                              ) : (
                                <>
                                  <span>🔗</span>
                                  Generar link único
                                </>
                              )}
                            </span>
                          </button>

                          {/* Caja del link */}
                          {referralLink && (
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                              <span className="flex-1 text-xs text-cyan-300 truncate select-all">{referralLink}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(referralLink);
                                  setReferralCopied(true);
                                  setTimeout(() => setReferralCopied(false), 2000);
                                }}
                                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 active:scale-95 transition-all"
                              >
                                {referralCopied ? '✓ Copiado' : 'Copiar'}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Idioma */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-base shrink-0">
                    🌐
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{t('profile:settings.language')}</p>
                    <p className="text-xs text-gray-400 truncate">{t('profile:settings.languageSubtitle')}</p>
                  </div>
                  <LanguageSwitcher isAuthenticated={!!currentUser} compact />
                </div>

                {/* ===================== BOTÓN CONECTAR REDES ===================== */}
                <div
                  onClick={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => setShowConnectSocialModal(true), 300);
                  }}
                  className="mt-3 mx-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#1c1427] to-[#142122] text-white font-semibold py-3 px-6 rounded-2xl shadow-xl shadow-[#7000ff]/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Share2 size={16} />
                  <span className="text-sm">{t('profile:settings.connectSocial')}</span>
                </div>
              </div>

              <div className="px-5 py-3 flex items-center justify-between text-[10px] text-white/40 border-t border-white/5 shrink-0">
                <div className="flex flex-col">
                  <span>{t('profile:settings.version', { version: '1.4.2' })}</span>
                  <span>{t('profile:settings.walletSupport')}</span>
                </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/70 hover:text-red-500 transition-all active:scale-95"
                    title={t('profile:settings.logout')}
                  >
                    <LogOut size={16} />
                    <span className="font-bold uppercase tracking-tighter">{t('profile:settings.logoutButton')}</span>
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
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
                  <h2 className="text-2xl font-bold text-white">{t('profile:availability.title')}</h2>
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
                    <p className="text-[11px] uppercase tracking-widest text-emerald-400/80 font-bold mb-1">{t('profile:availability.startLabel')}</p>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-end border-l border-white/10 pl-4 h-10 justify-center">
                    <span className="text-[10px] text-white/40 leading-none">{t('profile:availability.mode')}</span>
                    <span className="text-sm font-bold text-emerald-400">{formatTime12h(startTime).split(" ")[1]}</span>
                  </div>
                </div>

                {/* 2. Hora de Fin (Estilo Fila) */}
                <div className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-11 h-11 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                    <Clock size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-widest text-red-400/80 font-bold mb-1">{t('profile:availability.endLabel')}</p>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-end border-l border-white/10 pl-4 h-10 justify-center">
                    <span className="text-[10px] text-white/40 leading-none">{t('profile:availability.mode')}</span>
                    <span className="text-sm font-bold text-red-400">{formatTime12h(endTime).split(" ")[1]}</span>
                  </div>
                </div>

                {/* Separador sutil */}
                <div className="h-px bg-white/5 mx-5 my-2"></div>

                {/* Selección de Días (Estilo Mejorado) */}
                <div className="px-5 py-3">
                  <p className="text-white/50 text-xs font-medium mb-4 ml-1">{t('profile:availability.repeat')}</p>
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
                          {(t as (k: string) => string)(`profile:availability.days.${day}`)}
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
                    <span>{t('profile:availability.updated')}</span>
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
                            {t('profile:availability.saveSettings')}
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
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
                <h3 className="text-xl font-bold text-white tracking-tight">{t('profile:connectSocial.title')}</h3>
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
                              {connected ? `@${connected.platform_username}` : t('profile:connectSocial.notConnected')}
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
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title={t('profile:connectSocial.connected')}>
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('instagram')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title={t('profile:connectSocial.disconnect')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('instagram')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            {t('profile:connectSocial.connect')}
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
                              {connected ? `@${connected.platform_username}` : t('profile:connectSocial.notConnected')}
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
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title={t('profile:connectSocial.connected')}>
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('tiktok')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title={t('profile:connectSocial.disconnect')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('tiktok')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            {t('profile:connectSocial.connect')}
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
                              {connected ? `@${connected.platform_username}` : t('profile:connectSocial.notConnected')}
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
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-400" title={t('profile:connectSocial.connected')}>
                              <Check size={14} />
                            </div>
                            <button
                              onClick={() => handleDisconnectSocial('facebook')}
                              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
                              title={t('profile:connectSocial.disconnect')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnectSocial('facebook')}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-4 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                          >
                            {t('profile:connectSocial.connect')}
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
                    {t('profile:connectSocial.note')}
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
                {(modalVideoSource === 'saved' ? savedVideos : localMedia).map((video, index) => (
                  <div
                    key={video.id}
                    id={`modal-video-${index}`}
                    data-index={index}
                    className="modal-video-item w-full h-full snap-center relative flex items-center justify-center bg-black"
                  >
                    {video.media_type === 'image' ? (
                      <img
                        src={getMediaUrl(video.video_url || video.video)}
                        className="w-full h-full object-cover md:object-contain max-h-screen"
                        alt="Profile Media Full"
                      />
                    ) : (
                      <video
                        ref={(el) => (modalVideoRefs.current[index] = el)}
                        src={getMediaUrl(video.video_url || video.video)}
                        className="w-full h-full object-cover md:object-contain max-h-screen"
                        loop
                        muted={false}
                        playsInline
                        preload="auto"
                        poster={video.thumbnail_url ? getMediaUrl(video.thumbnail_url) : undefined}
                        x-webkit-airplay="deny"
                        style={{ display: 'block' }}
                        onClick={() => handleModalVideoTap(index)}
                        onPlay={() => onVideoPlay(video.id.toString())}
                        onEnded={() => resetVideo(video.id.toString())}
                        onTimeUpdate={(e) => handleVideoProgress(e, video.id.toString())}
                      />
                    )}

                    <div className={`absolute bottom-1 left-0 right-0 px-1 pb-1 text-left ${expandedDescriptions[video.id] ? 'z-[80]' : 'z-10'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3
                          className="text-white font-bold text-lg drop-shadow-md cursor-pointer hover:text-[#00f0ff] transition-colors"
                          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${video.user_id?.username || user?.username}`); closeModal(); }}
                        >@{video.user_id?.username || user?.username}</h3>
                        <img src="/screenshots/buzzy_icon_1024.png" alt="" className="w-4 h-4 rounded-full border border-white/20 object-cover flex-shrink-0" />
                      </div>
                      {!!(video.description || video.content || video.user_id?.username) && (
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
                                <p className="whitespace-pre-wrap">{video.description || video.content || "Sin descripcion."}</p>
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
                                <span className="line-clamp-2">{video.description || video.content || "Mira este increíble video... #viral #fyp"}</span>
                                {(video.description || video.content || "").length > 70 && (
                                  <span className="ml-1 text-[#00f0ff] font-bold text-[11px]">... ver más</span>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Barra de Progreso del Modal */}
                    <div className={`absolute bottom-0 left-0 right-0 px-0 h-1 hover:h-2 transition-all group ${expandedDescriptions[video.id] ? 'z-10 pointer-events-none' : 'z-20'}`}>
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
                    <div className={`absolute right-2 bottom-28 md:right-4 md:bottom-28 flex flex-col items-center gap-4 z-20 ${expandedDescriptions[video.id] ? 'pointer-events-none opacity-0' : ''}`}>
                      <div className="relative mb-1">
                        <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                          <img
                            src={getMediaUrl(video.user_id?.profile_picture || user?.profile_picture)}
                            className="w-full h-full object-cover"
                            alt="user"
                          />
                        </div>
                        <img
                          src="/screenshots/buzzy_icon_1024.png"
                          alt=""
                          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black object-cover"
                        />
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

                      <div className="flex flex-col items-center gap-1 relative">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); setActiveVideoOptions(prev => prev === video.id.toString() ? null : video.id.toString()); }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
                        >
                          <MoreVertical className="h-5 w-5 text-white/70" />
                        </motion.button>

                        {/* Mini options menu */}
                        {activeVideoOptions === video.id.toString() && (
                          <>
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[9998]"
                              onPointerDown={(e) => { e.stopPropagation(); setActiveVideoOptions(null); }}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 8 }}
                              className="absolute bottom-12 right-0 z-[9999] flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/95 p-2 shadow-2xl backdrop-blur-xl min-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {[
                                { icon: <Bookmark size={14} className={savedVideos.some(s => s.id === video.id) ? 'fill-pink-400 text-pink-400' : 'text-white/80'} />, label: savedVideos.some(s => s.id === video.id) ? 'Quitar' : 'Guardar', onClick: () => { const isSaved = savedVideos.some(s => s.id === video.id); if (isSaved) { setSavedVideos(prev => prev.filter((v: any) => v.id !== video.id)); unsaveVideo(video.id)(dispatch); closeModal(); } else { setSavedVideos(prev => [...prev, video]); saveVideo(video.id)(dispatch); } setActiveVideoOptions(null); } },
                                { icon: <Share2 size={14} className="text-cyan-300" />, label: 'Compartir', onClick: () => { if (navigator.share) { navigator.share({ url: video.video_url || '' }); } setActiveVideoOptions(null); } },
                                { icon: <Download size={14} className="text-violet-300" />, label: 'Descargar', onClick: () => { const a = document.createElement('a'); a.href = video.video_url || ''; a.download = ''; a.click(); setActiveVideoOptions(null); } },
                                ...(isOwnProfile && (video as any).user_id?.id === (user as any)?.id ? [{ icon: <Trash2 size={14} className="text-red-400" />, label: 'Eliminar', onClick: () => { setConfirmDeleteVideoId((video as any).uuid || video.id.toString()); setActiveVideoOptions(null); } }] : []),
                              ].map((opt) => (
                                <button key={opt.label} onClick={opt.onClick}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 text-white text-xs font-medium transition-colors text-left w-full"
                                >
                                  {opt.icon}
                                  {opt.label}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
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
                        <span className="text-[10px] text-pink-300/90 font-medium drop-shadow-md">{t('videos:actions.sendGift')}</span>
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
              src={giftAnimation.blobUrl || getMediaUrl(giftAnimation.gift)}
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
                if (giftAnimBlobRef.current) {
                  URL.revokeObjectURL(giftAnimBlobRef.current);
                  giftAnimBlobRef.current = null;
                }
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
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[120] rounded-2xl border border-[#00f0ff]/20 bg-[#08101f]/95 px-4 py-3 text-sm text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm"
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
                className="fixed bottom-0 left-0 right-0 h-[72vh] z-[80] bg-[#0a0a0f]/95 rounded-t-[40px] flex flex-col border-t border-white/10 backdrop-blur-sm shadow-2xl overflow-hidden"
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
                              <img src={getMediaUrl(c.user_id.profile_picture)} className="w-8 h-8 rounded-full object-cover border border-black" alt="u" />
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
                  <div className="flex items-end gap-3 rounded-[28px] border border-white/10 bg-[#1a1a24] p-2 backdrop-blur-sm">
                    <img
                      src={getMediaUrl(currentUser?.profile_picture)}
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
                      className="rounded-xl bg-[#10b981] px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_28px_rgba(16,185,129,0.55)] transition disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Confirm Delete Video Modal */}
      <AnimatePresence>
        {confirmDeleteVideoId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
              onClick={() => !isDeletingVideo && setConfirmDeleteVideoId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[301] rounded-3xl border border-white/10 bg-black p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">¿Eliminar video?</p>
                  <p className="text-white/50 text-sm mt-1">Esta acción no se puede deshacer. El video se eliminará permanentemente.</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setConfirmDeleteVideoId(null)}
                    disabled={isDeletingVideo}
                    className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(confirmDeleteVideoId)}
                    disabled={isDeletingVideo}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isDeletingVideo ? <><Loader2 size={16} className="animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              <div className="bg-black border border-white/8 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur-xl">
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
              ) : user ? (
                <img
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-[#7000ff]/20"
                  src={getMediaUrl(user.profile_picture)}
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
                      src={getMediaUrl(user?.profile_picture)}
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
                  src={getMediaUrl(profileStoriesMedia[activeProfileStoryIndex]?.file)}
                  className="h-full w-full object-contain"
                  autoPlay
                  playsInline
                  onTimeUpdate={handleProfileStoryVideoProgress}
                  onEnded={handleNextProfileStory}
                />
              ) : (
                <img
                  key={`profile-story-${activeProfileStoryIndex}`}
                  src={getMediaUrl(profileStoriesMedia[activeProfileStoryIndex]?.file)}
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

      <AnimatePresence>
        {showUserGiftModal && (
          <VipGiftExperience
            onClose={() => setShowUserGiftModal(false)}
            onSendGift={handleSendUserGift}
            gifts={Array.isArray(_fullGifts) ? _fullGifts : []}
            walletTokens={walletTokens}
            subscriptionStatus={(user as { subscription_status?: { is_active: boolean; plan?: string | { name: string }; plan_name?: string } | null })?.subscription_status}
          />
        )}
      </AnimatePresence>

      {/* Follow Before Message Prompt */}
      <AnimatePresence>
        {showFollowPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFollowPrompt(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] overflow-hidden rounded-[28px]"
              style={{ background: "rgba(8,10,24,0.98)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(168,85,247,0.12)" }} />

              <div className="relative z-10 px-6 pt-7 pb-6 text-center">
                {/* avatar */}
                <div className="relative mx-auto mb-5 w-fit">
                  <div className="absolute inset-0 rounded-full blur-xl" style={{ background: "rgba(168,85,247,0.3)" }} />
                  <div className="relative w-18 h-18 rounded-full p-[2px]" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
                    <img
                      className="w-16 h-16 object-cover rounded-full"
                      src={getMediaUrl(user?.profile_picture)}
                      alt="user"
                    />
                  </div>
                </div>

                <h3 className="text-[17px] font-bold text-white mb-1.5 tracking-tight">
                  {t('profile:prompts.followToMessage.title')}
                </h3>
                <p className="text-[13px] leading-relaxed mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {t('profile:prompts.followToMessage.description', { username: user?.username })}
                </p>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowFollowPrompt(false)}
                    className="flex-1 h-11 rounded-2xl text-sm font-semibold transition-all duration-200 hover:bg-white/8"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {t('common:actions.cancel')}
                  </button>
                  <button
                    onClick={handleFollowAndMessage}
                    className="flex-1 h-11 rounded-2xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", boxShadow: "0 0 20px rgba(168,85,247,0.35)" }}
                  >
                    {t('profile:actions.followAndMessage')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        plans={subscriptionPlans}
        onSelectPlan={handleSelectPlan}
      />

      {/* Toast de feedback */}
      <AnimatePresence>
        {profileToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] rounded-2xl px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl border ${profileToast.error ? 'bg-red-900/90 border-red-500/30' : 'bg-[#08101f]/95 border-[#00f0ff]/20'}`}
          >
            {profileToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Notificaciones */}
      <AnimatePresence>
        {showNotificationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setNotifPush(localStorage.getItem('notif_push') !== 'false');
              setNotifMessages(localStorage.getItem('notif_messages') !== 'false');
              setNotifGifts(localStorage.getItem('notif_gifts') !== 'false');
              setNotifFollowers(localStorage.getItem('notif_followers') !== 'false');
              setShowNotificationsModal(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#0d0d1a] border-t border-white/10 rounded-t-3xl p-6 pb-10"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Notificaciones</h3>
                  <p className="text-gray-500 text-xs">Elige qué quieres recibir</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Notificaciones push', sub: 'Alertas en tu dispositivo', state: notifPush, set: setNotifPush },
                  { label: 'Mensajes', sub: 'Nuevos chats y mensajes', state: notifMessages, set: setNotifMessages },
                  { label: 'Regalos', sub: 'Cuando alguien te envíe un regalo', state: notifGifts, set: setNotifGifts },
                  { label: 'Seguidores', sub: 'Nuevos seguidores', state: notifFollowers, set: setNotifFollowers },
                ].map(({ label, sub, state, set }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5">
                    <div>
                      <p className="text-sm text-white font-semibold">{label}</p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                    <button
                      onClick={() => set(v => !v)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${state ? 'bg-sky-500' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${state ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveNotifications}
                className="w-full mt-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition-colors"
              >
                Guardar preferencias
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  )
}

const mapStateToProps = (state: RootState): any => ({
  media_user: state.getMediaByUser.media_user,
  user: state.getUserDetail.user as UserInterface | null,
  notFoundUsername: (state.getUserDetail as { notFoundUsername: string | null }).notFoundUsername,
  subscriptionPlans: state.subscriptionReducer.plans,
  // Availability
  availabilitySaving: state.availabilityReducer.saving,
  availabilitySaved: state.availabilityReducer.saved,
  availabilityError: state.availabilityReducer.error,
  availabilityData: state.availabilityReducer.availability,
  // Social accounts
  socialAccounts: state.socialAccountsReducer.accounts,
  socialLoading: state.socialAccountsReducer.loading,
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
  refreshSocialFollowers,
  initSocialOAuth,
  disconnectSocialAccount,
  getAvailabilityStatus,
})(ProfileSeccion)
