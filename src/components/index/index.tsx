import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom"
import sendMessageSound from "../../assets/sounds/sendMessage.mp3";
import { prefetchAudioUrl } from "../../hooks/useVideoAudio";
import { fetchFreshMediaUrl } from "../../hooks/useFreshMediaUrl";
import { BuzzyVideoFeed } from "../../plugins/buzzyVideoFeed";
import { App as CapApp } from "@capacitor/app";
import { Howler } from "howler";
import { Eye, MessageCircle, Heart, Volume2, VolumeX, Play, Pause, UserPlus, UserCheck, X, MoreVertical, Music2, MapPin, Bookmark, Share2, Download, Lock, Gem, Forward } from "lucide-react"
import AdCard from "../ads/AdCard"
import StoryEditor from "./StoryEditor"
import BottomNavbar from "../Layout/ButtonNavar"
import { motion, AnimatePresence } from "framer-motion"
import AdOverlay from "../ads/AdOverlay"
import { createStory } from "../../redux/actions/history/createHistory"
import { StoryList, Story, Video as videoI, StoryTextLayer, StoryStickerLayer } from './main.interface';
import { useDispatch, useSelector } from "react-redux"
import { getComment } from "../../redux/actions/getComment"
import { createComment } from "../../redux/actions/createComment"
import { createView } from "../../redux/actions/createView"
import { createFollower } from "../../redux/actions/createFollower"
import { createLike } from "../../redux/actions/createLike"
import { tapHaptic, ImpactStyle } from "../../utils/haptics"
import { useWsEvent } from "../../context/WebSocketContext"
import { getActiveStories } from "../../redux/actions/history/listActiveHistory"
import { viewStory } from "../../redux/actions/history/makeViewed"
import { getStoryViewers } from "../../redux/actions/history/getHIstoryViewers"
import { likeStory } from "../../redux/actions/history/likeHistory"
import { sendGift } from "../../redux/actions/gift/sendGift"
import { getActiveGift } from "../../redux/actions/gift/listGiftActive"
import { sendVideoGift } from "../../redux/actions/gift/sendVideoGift"
import { getRecivedGift } from "../../redux/actions/gift/listGiftRecived"
// import { getOneActiveGift } from "../../redux/actions/gift/getGiftActive"
import { getRecivedGiftByUser } from "../../redux/actions/gift/getGiftsByUser"
import { GiftI } from "../../interfaces/gift"
import { ShowComments } from "../comments/modalComents"
import { useChat } from "../../context/ChatContext"
import { apiClient, getBaseUrl, getMediaUrl } from "../../redux/client/api-client";
import { useTypingUsers } from "../../context/useTyping";
import { useNotificationsStore } from "../../context/NotificationsStore";
import { isNotifEnabled } from "../../utils/notifPrefs";
import HorizontalCarousel from "./HorizontalCarousel";
import StoryFilterCanvas from "./StoryFilterCanvas";
import { useUserVideos } from "../../hooks/useUserVideos";
import { pickMedia } from "../../hooks/useMediaPicker";
import { useVideoMetrics } from "../../hooks/useVideoMetrics";
import typingSound from "../../assets/sounds/whatsapp-typing.mp3";
import VipGiftExperience from "../giftModal/modalGift";
import TokenShopModal from "../giftModal/TokenShopModal";
import InsufficientFundsModal from "../giftModal/InsufficientFundsModal";

const clampWords = (text: string, maxWords = 4): string => {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text
  return `${words.slice(0, maxWords).join(" ")}…`
}

const shortLocationLabel = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const mainPart = trimmed.split(",")[0]?.trim() || trimmed
  if (mainPart.length <= 22) return mainPart
  return `${mainPart.slice(0, 21).trimEnd()}…`
}

// Tiempo relativo de una historia, calculado EN EL CLIENTE a partir del
// created_at absoluto (ISO). Antes se usaba el string `formatted_created_at` que
// llega del backend, pero ese string se congela en el caché del dispositivo: una
// historia subida hace 17h seguía mostrando "Hace 3 horas" en el celular porque
// ese era el valor cuando se guardó en caché. Calcularlo aquí garantiza que
// siempre refleje el tiempo real, sin importar cuán viejo sea el caché.
const formatStoryTimeAgo = (createdAt?: string | null): string => {
  if (!createdAt) return ""
  const then = new Date(createdAt).getTime()
  if (Number.isNaN(then)) return ""
  const diffMs = Date.now() - then
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins} ${mins === 1 ? "minuto" : "minutos"}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hora" : "horas"}`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "día" : "días"}`
}
import TokenPurchaseSuccessModal from "../giftModal/TokenPurchaseSuccessModal";
import { buyTokens } from "../../redux/actions/buyTokens";
import { getWallet } from "../../redux/actions/getWallet";
import { useVideoEngagement } from "../../hooks/useVideoEngagement";
import { deleteStory } from "../../redux/actions/history/deleteHistory";
import { reportStory, ReportPayload } from "../../redux/actions/history/reportStory";
import { refreshFeed, loadMoreFeed, getFollowingFeed, loadMoreFollowingFeed } from "../../redux/actions/getMedia";
import { saveVideo, unsaveVideo } from "../../redux/actions/savedVideos";
import { loadStoriesCache, saveStories } from "../../services/chatCacheDB";
import { useCallStore } from "../../store/callStore";
import { useHeaderStoriesStore } from "../../store/headerStoriesStore";
import { useFeedModeStore, type FeedMode } from "../../store/feedModeStore";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { AppDispatch, RootState } from "../../store";
interface StreamingUIProps {
  media: videoI[] | null
  getComment?: ({ video_id }: { video_id: string }) => any
}
export interface CommentData {
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
  audio_url?: string | null;
  audio_duration?: number | null;
  image_url?: string | null;
}
// Module-level guard — survives re-mounts when navigating away and back
let _storiesFetched = false;

// Poda un Record a solo las claves presentes en `live`. Devuelve el MISMO objeto
// si nada cambió (identidad estable → no dispara re-render innecesario).
function pruneRecord<T>(rec: Record<string, T>, live: Set<string>): Record<string, T> {
  let changed = false;
  const next: Record<string, T> = {};
  for (const k in rec) {
    if (live.has(k)) next[k] = rec[k];
    else changed = true;
  }
  return changed ? next : rec;
}

const StreamingUI = ({ media }: StreamingUIProps) => {
  const { t } = useTranslation(['videos', 'common']);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch and prepend a video when navigating via deep-link /video/:uuid
  useEffect(() => {
    const uuid = (location.state as { targetVideoUuid?: string } | null)?.targetVideoUuid
    if (!uuid) return
    navigate(location.pathname, { replace: true, state: {} })
    apiClient.get(`/api/videos/${uuid}/`).then((res) => {
      const video: videoI = res.data
      setMedia(prev => {
        if (!prev) return [video]
        if (prev.some(v => v.uuid === video.uuid)) return prev
        return [video, ...prev]
      })
      activeVideoRef.current = 0;
      setActiveVideo(0)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])
  // Redux selectors para gifts
  const activeGifts = useSelector((state: any) => state.activeGiftReducer?.gift);
  // const receivedGifts = useSelector((state: any) => state.RecivedGiftReducer?.gift);
  const { setTypingUser, removeTypingUser } = useTypingUsers();
  // const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { selectedChat, showMessages } = useChat();
  // const oneActiveGift = useSelector((state: any) => state.GetOneactiveGiftReducer?.gift);
  const getWalletReducer = useSelector((state: any) => state.getWalletReducer);
  const walletTokens = getWalletReducer?.tokens || 0;
  const walletBalance = parseFloat(getWalletReducer?.balance || '0');
  const [offlineToast, setOfflineToast] = useState(false);
  const [commentsOffline, setCommentsOffline] = useState(false);
  const [showTokenShopModal, setShowTokenShopModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showTokenPurchaseSuccessModal, setShowTokenPurchaseSuccessModal] = useState(false);
  const [purchasedTokenAmount, setPurchasedTokenAmount] = useState(0);
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const activeVideoRef = useRef<number | null>(null)
  const hasPlayedFirstVideo = useRef(false)
  const hasUserInteracted = useRef(false)
  const lastClickTimestamp = useRef(0)
  const isPlayTransitioningRef = useRef(false)
  const hasLeftInitialVideoRef = useRef(false)
  const videosPausedRef = useRef(true)
  const activeCarouselSlideRef = useRef(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [videosPaused, setVideosPaused] = useState(true)
  const feedMode = useFeedModeStore((state) => state.feedMode);
  const setFeedMode = useFeedModeStore((state) => state.setFeedMode);
  const syncFeedPlaybackState = useCallback((paused: boolean) => {
    videosPausedRef.current = paused
    setVideosPaused(paused)
  }, [])
  // feedLocked = true until the user taps a video for the first time.
  // While locked, scrolling does NOT autoplay — every video stays paused.
  const [feedLocked, setFeedLocked] = useState(true)
  const feedLockedRef = useRef(true)
  const mainRef = useRef<HTMLDivElement>(null)
  // Feed de video 100% NATIVO: el video SIEMPRE lo reproduce ExoPlayer. Inicia en
  // true para que NUNCA se renderice el <video> HTML (ni un parpadeo inicial).
  const exoActiveRef = useRef(true)
  const [exoActive, setExoActive] = useState(true)
  // Estado de pausa del video NATIVO (para el candado/tap). El feed nativo arranca
  // PAUSADO (candado) hasta el primer tap, igual que antes.
  const exoPausedRef = useRef(true)
  const [exoPaused, setExoPaused] = useState(true)
  // true mientras el usuario ARRASTRA/asienta el feed nativo. Mientras es true se
  // OCULTA la UI HTML (botones/overlays) para no mostrar data del video viejo, y se
  // bloquea abrir comentarios (evita comentarios del video equivocado).
  const feedScrollingRef = useRef(false)
  const [feedScrolling, setFeedScrolling] = useState(false)
  // ID del video ACTIVO según el nativo (fuente de verdad para mostrar el slide
  // correcto). Se decide por ID, no por índice, para evitar el desfase nativo↔HTML.
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [showLikeAnimation, setShowLikeAnimation] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [activeOptionsVideoId, setActiveOptionsVideoId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{ videoId: string; videoUrl: string; description: string } | null>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [shareSearch, setShareSearch] = useState('');
  const [shareSending, setShareSending] = useState<string | null>(null);
  const [shareSent, setShareSent] = useState<Record<string, boolean>>({});
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const videoProgressRef = useRef<Record<string, number>>({});
  const videoDurationRef = useRef<Record<string, number>>({});
  const progressFillRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [, setIsGridVideoPlaying] = useState<Record<string, boolean>>({})
  const [stories, setStories] = useState<StoryList>([]);
  const audioUnlockedRef = useRef(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const activeFeedAudioTrimStartRef = useRef<number>(0);
  const activeFeedAudioTrimEndRef = useRef<number>(0);
  const LoginReducer = useSelector((state: RootState) => (state as unknown as Record<string, { user?: Record<string, unknown> }>).LoginReducer);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedStoryLocation, setSelectedStoryLocation] = useState<string | null>(null);
  const [mediaVideo, setMedia] = useState<videoI[] | null>(media);
  // Separate like state so updating a like never mutates mediaVideo → prevents video src re-assignment on Android
  const [likeOverrides, setLikeOverrides] = useState<Record<string, { liked: boolean; like_count: number }>>({});
  const { prefetchBatch } = useUserVideos();
  const { onVideoPlay, onTimeUpdate: trackTimeUpdate, resetVideo, pruneTo } = useVideoMetrics();
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  // Stabilize user object to prevent unnecessary re-renders and WebSocket reconnections
  const user = useMemo(() => {
    const defaultUser = {
      username: 'BuzzyUser',
      profile_picture: '/avatar.webp',
      id: null as string | null,
    };
    const userData = LoginReducer?.user as Record<string, string> | undefined;
    if (!userData) return defaultUser;
    return {
      ...defaultUser,
      ...userData,
      profile_picture: (userData.profile_picture as string) || defaultUser.profile_picture,
    };
  }, [LoginReducer?.user]);
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<CommentData[] | null>(null)

  const normalizeIncomingComment = useCallback((comment: any): CommentData => ({
    ...comment,
    create_at: comment?.create_at || comment?.created_at || new Date().toISOString(),
  }), []);

  const upsertComment = useCallback((list: CommentData[] | null, incoming: any) => {
    const normalized = normalizeIncomingComment(incoming);
    const nextList = list ? [...list] : [];
    const existingIndex = nextList.findIndex((comment) => comment.uuid === normalized.uuid);

    if (existingIndex >= 0) {
      nextList[existingIndex] = { ...nextList[existingIndex], ...normalized };
      return nextList;
    }

    return [normalized, ...nextList];
  }, [normalizeIncomingComment]);
  // New state for Story Upload
  const [isUploadingStory, setIsUploadingStory] = useState(false)
  const [storyEditorFile, setStoryEditorFile] = useState<File | null>(null);

  // --- New State for Story Viewer ---
  const [viewingStoryUserIndex, setViewingStoryUserIndex] = useState<number | null>(null);
  const [currentStoryItemIndex, setCurrentStoryItemIndex] = useState(0);
  const [groupProgresses, setGroupProgresses] = useState<Record<string, number[]>>({});
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: true, message: "" });
  const storyVideoRef = useRef<HTMLVideoElement>(null);
  // --- New States for User Switch Animation ---
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [incomingUser, setIncomingUser] = useState<any>(null);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | null>(null);
  // --- New State for Viewers Modal ---
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [realViewers, setRealViewers] = useState<any[]>([]);
  const [giftRecived, setGiftRecived] = useState<any[]>([]);
  const [viewerGiftOverlay, setViewerGiftOverlay] = useState<{ gift_video: string; gift_type: string; sender: string; uuid?: string; blobUrl?: string } | null>(null);
  const [viewerGiftBlackout, setViewerGiftBlackout] = useState(false);
  const [viewerGiftReady, setViewerGiftReady] = useState(false);
  const viewerGiftBlobRef = useRef<string | null>(null);
  // --- Fixed State for Viewed Items per Media UUID ---
  const [viewedItems, setViewedItems] = useState<Record<string, boolean>>({});
  // --- New States for Gift System ---
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [showFullGiftMenu, setShowFullGiftMenu] = useState(false);
  // const [giftAnimation, setGiftAnimation] = useState<{ type: string; sender: string; storyUuid: string; phase: 'initial' | 'crazy' | 'explode' | 'reward'; giftId: string } | null>(null);
  const [, setStoryPremiumStates] = useState<Record<string, boolean>>({});
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const [, setStoryPremiumColors] = useState<Record<string, string>>({});
  const isGiftsRef = useRef<GiftI[]>([]);
  const currentStoryUuidRef = useRef<string | null>(null);
  const chatSocketActiveRef = useRef(false);

  // Audio refs for sounds
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioTrackRef = useRef<string | null>(null);
  const storyAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeStoryAudioTrackRef = useRef<string | null>(null);
  const storyAudioRequestIdRef = useRef(0);
  const storyAudioFadeTimerRef = useRef<number | null>(null);
  const [_fullGifts, setFullGifts] = useState<GiftI[] | GiftI | []>([]);
  const [, setGiftsLoading] = useState(true);
  const [showVideoGiftModal, setShowVideoGiftModal] = useState(false);
  const [videoGiftModalKey, setVideoGiftModalKey] = useState(0);
  const [selectedVideoForGift, setSelectedVideoForGift] = useState<string | number | null>(null);

  const [isBlackout, setIsBlackout] = useState(false);

  // --- R3F Scope for Gift3D ---
  // Memoizar función para evitar recreaciones
  const isVideoContent = useCallback((file: string) => /\.(mp4|webm|ogg|mov)$/i.test(file), []);
  const [isGifts, setIsGift] = useState<any[]>([]);
  // Ref para trackear qué storyUuid ya se ha cargado y evitar llamadas duplicadas
  const loadedGiftsByStoryUuid = useRef<Set<string>>(new Set());
  const lastLoadedStoryUuid = useRef<string | null>(null);
  const [giftAnimation, setGiftAnimation] = useState<{
    type: string;
    sender: string;
    storyUuid?: string;
    videoId?: string | number;
    giftId: string;
    gift: string;
    blobUrl?: string;
    amount?: number;
    color_premiun?: string;
  } | null>(null);
  const giftAnimBlobRef = useRef<string | null>(null);

  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [carouselDots, setCarouselDots] = useState<{ [key: string]: { index: number; total: number } }>({});
  const [ads, setAds] = useState<any[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState<number | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [shownAds, setShownAds] = useState<Set<string>>(new Set());
  const [lastAdTimestamp, setLastAdTimestamp] = useState<number>(() => Date.now());
  const [adSequenceCount, setAdSequenceCount] = useState<number>(0);
  // Espejos para leer estado FRESCO de los ads dentro del listener 'progress'
  // nativo y de applyVideoProgress (que son callbacks/closures registrados una
  // sola vez → sin estos refs leerían valores viejos). El feed nativo dispara los
  // ads desde el evento 'progress' del ExoPlayer (Fase 4), no desde onTimeUpdate
  // del <video> HTML (que no existe en modo nativo).
  const adsRef = useRef(ads);
  adsRef.current = ads;
  const activeAdIndexRef = useRef(activeAdIndex);
  activeAdIndexRef.current = activeAdIndex;
  const shownAdsRef = useRef(shownAds);
  shownAdsRef.current = shownAds;
  const lastAdTimestampRef = useRef(lastAdTimestamp);
  lastAdTimestampRef.current = lastAdTimestamp;
  const [, setVideoLoopCount] = useState<Record<string, number>>({});
  const lastVideoTimeRef = useRef<Record<string, number>>({});
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  // const [showStoriesBar, setShowStoriesBar] = useState(true);
  const lastFeedScrollTopRef = useRef(0);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // ── Feed de video 100% NATIVO (ExoPlayer) ───────────────────────────────────
  // El video lo reproduce SIEMPRE ExoPlayer nativo (detrás del WebView). Del
  // WebView solo quedan botones/overlays/layout. Esto elimina de raíz los
  // cuadritos, el ícono de play, las transiciones, etc. del <video> en WebView.
  //
  // show() se llama UNA SOLA VEZ (cuando llegan los primeros videos). Antes el
  // efecto dependía de mediaVideo.length y se re-disparaba en cada paginación →
  // reiniciaba ExoPlayer en bucle (nunca mostraba nada). Este guard lo evita.
  const exoShownRef = useRef(false)
  // Cuántas URLs de video ya enviamos al feed nativo (para append incremental).
  const exoSentCountRef = useRef(0)
  // ITEMS del feed que van al nativo: SOLO videos reproducibles (sin imágenes ni
  // ads), en el MISMO orden e índice que el ViewPager2 nativo. El 'pageChanged'
  // nativo indexa en ESTA lista (no en mergedFeed, que intercala ads → desalinearía
  // los botones). Es la fuente de verdad para alinear UI ↔ video nativo.
  const buildExoItems = useCallback(() => (mediaVideo ?? [])
    .filter(v => v.media_type !== 'image' && v.video)
    .map(v => ({ ...v, type: 'video' as const })), [mediaVideo]);
  const exoItemsRef = useRef<ReturnType<typeof buildExoItems>>([]);
  // Índice CRUDO del video activo en exoItems (lo da 'pageChanged'). Distinto de
  // activeVideoRef (que indexa en mergedFeed con ads). Lo usa la re-firma para
  // confirmar que el video que falló sigue siendo el activo antes de reproducirlo.
  const activeVideoNativeRef = useRef(0);
  // Último uuid re-firmado, para no entrar en bucle si la URL fresca también falla.
  const lastRefreshedUuidRef = useRef<string | null>(null);
  const buildExoUrls = useCallback(() => buildExoItems()
    .map(v => (v.video.startsWith('http') ? v.video : getMediaUrl(v.video))), [buildExoItems]);
  // Mantener exoItemsRef sincronizado con la lista que ve el nativo.
  useEffect(() => { exoItemsRef.current = buildExoItems(); }, [buildExoItems]);
  useEffect(() => {
    if (exoShownRef.current) return;
    const urls = buildExoUrls();
    if (urls.length === 0) return;
    exoShownRef.current = true;
    exoSentCountRef.current = urls.length;
    BuzzyVideoFeed.show({ videoUrls: urls })
      .then(() => {
        exoActiveRef.current = true;
        setExoActive(true);
        // Hace transparentes body/html/#root → se ve el video nativo detrás
        // (el body #1a1a1a opaco era lo que tapaba el ViewPager2/ExoPlayer).
        document.documentElement.classList.add('native-video-feed');
        // Bajar el video debajo del navbar para que el avatar del autor se vea por
        // fuera del header (no tapado detrás). Se mide tras pintar la UI.
        // Y REVELAR el feed nativo (insertado INVISIBLE) recién cuando el chrome del
        // WebView ya pintó → así el video y la UI (navbar/historias/tabs) aparecen
        // JUNTOS al volver a la app, no el video primero y la UI un instante después.
        // Doble rAF: el primero deja a React confirmar el commit; el segundo asegura
        // que ese frame se haya PINTADO antes de mostrar el video nativo.
        requestAnimationFrame(() => {
          syncNativeInsets();
          requestAnimationFrame(() => {
            BuzzyVideoFeed.reveal().catch(() => {});
          });
        });
      })
      .catch(() => { exoShownRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaVideo?.length]);

  // PASO 4 — Cleanup al DESMONTAR el feed: liberar ExoPlayer (video + música) y
  // restaurar el WebView, para no dejar players vivos (fuga de memoria/recursos).
  useEffect(() => {
    return () => {
      if (exoShownRef.current) {
        BuzzyVideoFeed.hide().catch(() => {});
        exoShownRef.current = false;
        exoActiveRef.current = false;
        document.documentElement.classList.remove('native-video-feed');
      }
    };
  }, []);

  // CAMBIO DE TAB ("Para ti" ↔ "Seguidos"): el feed se REEMPLAZA por completo. El
  // nativo debe recargar TODA su lista (replaceUrls) y volver a la página 0 — no sirve
  // appendUrls (que solo agrega al final). Detectamos el cambio de feedMode y marcamos
  // que el próximo mediaVideo va por replaceUrls.
  const pendingFeedReplaceRef = useRef(false);
  const prevFeedModeForExoRef = useRef(feedMode);
  useEffect(() => {
    if (prevFeedModeForExoRef.current !== feedMode) {
      prevFeedModeForExoRef.current = feedMode;
      pendingFeedReplaceRef.current = true; // el feed que llegue es de otro tab
    }
  }, [feedMode]);

  // Sincroniza la lista del feed NATIVO con mediaVideo:
  //  - Cambio de tab (pendingFeedReplaceRef): replaceUrls → reemplaza todo, vuelve arriba.
  //  - Paginación normal (el feed crece): appendUrls → solo las URLs nuevas (scroll infinito).
  useEffect(() => {
    if (!exoShownRef.current) return;
    const urls = buildExoUrls();

    if (pendingFeedReplaceRef.current) {
      // Esperar a que el nuevo feed haya llegado (no reemplazar con lista vacía del RESET).
      if (urls.length === 0) return;
      pendingFeedReplaceRef.current = false;
      exoSentCountRef.current = urls.length;
      activeVideoNativeRef.current = 0;
      activeVideoRef.current = 0;
      BuzzyVideoFeed.replaceUrls({ videoUrls: urls }).catch(() => {});
      return;
    }

    if (urls.length <= exoSentCountRef.current) return;
    const newOnes = urls.slice(exoSentCountRef.current);
    exoSentCountRef.current = urls.length;
    BuzzyVideoFeed.appendUrls({ videoUrls: newOnes }).catch(() => {});
    // Depende también del PRIMER id: al cambiar de tab, dos feeds pueden tener la
    // misma longitud pero distinto contenido → sin el id, el efecto no correría y el
    // replaceUrls no se enviaría.
  }, [mediaVideo?.length, mediaVideo?.[0]?.id, buildExoUrls]);

  // Mide el navbar (arriba) y el nav inferior y se los pasa al feed nativo para que
  // el video quede ENTRE ambos (avatar del autor visible, no detrás del header).
  const syncNativeInsets = useCallback(() => {
    if (!exoActiveRef.current) return;
    const nav = document.querySelector('nav');
    const top = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    // 1) Bajar el VIDEO nativo esa altura. 2) Bajar la CAPA HTML del slide la MISMA
    //    altura (CSS var) → el avatar del autor (top-2 del slide) cae debajo del nav.
    BuzzyVideoFeed.setInsets({ top, bottom: 0 }).catch(() => {});
    document.documentElement.style.setProperty('--feed-top-inset', `${top}px`);
  }, []);

  // Posición del avatar del AUTOR del video para que NO quede tapado por el navbar.
  // Nativo: la capa del slide ya bajó --feed-top-inset → el avatar solo necesita 8px.
  // Web: el slide NO baja → el avatar debe bajar la altura del navbar + 8px.
  useEffect(() => {
    const nav = document.querySelector('nav');
    const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 56;
    const authorTop = exoActive ? '0.5rem' : `${navH + 8}px`;
    document.documentElement.style.setProperty('--author-top', authorTop);
  }, [exoActive, mediaVideo?.length]);

  // Reaplicar al rotar/redimensionar (cambia la altura del header).
  useEffect(() => {
    const onResize = () => syncNativeInsets();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncNativeInsets]);

  // El SCROLL lo hace el ViewPager2 NATIVO. Cuando el swipe cambia de video, el
  // nativo emite 'pageChanged' → actualizamos activeVideo para que la UI HTML
  // (botones like/comment/gift de ESE video) refleje el video correcto.
  // Espejo de applyVideoProgress (definido más abajo) para el listener 'progress'
  // nativo, que se monta una sola vez. Arranca no-op; se reasigna tras definirla.
  const applyVideoProgressRef = useRef<(videoId: string, currentTime: number, duration: number) => void>(() => {});

  // FASE 3.3 — Música 100% NATIVA. Pasa la pista del video activo al segundo
  // ExoPlayer (volumen video/música y trim). url vacío = sin música → silencia.
  // Respeta candado/mute/ad/stories (igual que el antiguo musicAudioRef).
  const applyNativeMusic = useCallback((item: any) => {
    if (!exoActiveRef.current) return;
    const blocked = feedLockedRef.current || isMuted || activeAdIndex !== null
      || viewingStoryUserIndex !== null;
    if (!item || item.type !== 'video' || !item.audio_track_url || blocked) {
      BuzzyVideoFeed.setMusic({ url: '', volumeOriginal: item?.volume_original ?? 1.0 }).catch(() => {});
      return;
    }
    const trimStart = Math.max(0, item.audio_trim_start ?? 0);
    const trimEndRaw = item.audio_trim_end;
    // trimEnd válido solo si es un número > trimStart; si no, 0 = sin recorte final.
    const trimEnd = (typeof trimEndRaw === 'number' && isFinite(trimEndRaw) && trimEndRaw > trimStart)
      ? trimEndRaw : 0;
    BuzzyVideoFeed.setMusic({
      url: item.audio_track_url,
      volumeMusic: Math.min(Math.max(item.volume_music ?? 0.8, 0), 1),
      volumeOriginal: Math.min(Math.max(item.volume_original ?? 1.0, 0), 1),
      trimStart,
      trimEnd,
    }).catch(() => {});
  }, [isMuted, activeAdIndex, viewingStoryUserIndex]);

    // El nativo da un índice en la lista de SOLO-videos (exoItems). Lo mapeamos al
    // índice de mergedFeed (que intercala ads) buscando por id → así toda la UI que
    // indexa en mergedFeed (slide activo, botones) sigue alineada con el video.
    const nativeToMergedIndex = (nativeIdx: number) => {
      const exoItem = exoItemsRef.current[nativeIdx];
      if (!exoItem) return { mergedIdx: nativeIdx, item: undefined };
      const mergedIdx = mergedFeedRef.current.findIndex(
        (m) => m?.type === 'video' && m.id === exoItem.id);
      return { mergedIdx: mergedIdx >= 0 ? mergedIdx : nativeIdx, item: exoItem };
    };

  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    // Limpiar cualquier listener previo ANTES de registrar (evita acumular
    // listeners duplicados si el componente se re-monta → un solo evento
    // disparaba el handler varias veces).
    BuzzyVideoFeed.removeAllListeners?.().catch?.(() => {});
    BuzzyVideoFeed.addListener('pageChanged', ({ index }) => {
      const { mergedIdx, item } = nativeToMergedIndex(index);
      activeVideoNativeRef.current = index; // índice CRUDO en exoItems (para re-firma)
      lastRefreshedUuidRef.current = null;  // nuevo video → permitir re-firma de nuevo
      // Scroll VERTICAL: liberar la música horizontal prebuferada del video anterior
      // → no acumular pistas en memoria entre videos del feed.
      BuzzyVideoFeed.clearMusicPrefetch().catch(() => {});
      activeVideoRef.current = mergedIdx;
      setActiveVideo(mergedIdx);
      // ID del video ACTIVO según el nativo (fuente de verdad). La opacity del slide
      // se decide por ESTE id, no por el índice (que podía desfasarse → mostrabas los
      // botones de un video y el video de otro = "números congelados/equivocados").
      if (item?.id != null) setActiveVideoId(String(item.id));
      setActiveOptionsVideoId(null);
      if (item && item.type === 'video') {
        onIntersectionChange(item.id, true, item.category || null);
      }
      // Cambiar la música nativa al del nuevo video.
      applyNativeMusic(item);
      // Llegamos a la nueva página: ya hay un video activo definido → mostrar la UI
      // (los datos ya son del video correcto). scrollState(IDLE) también lo hará.
      feedScrollingRef.current = false;
      setFeedScrolling(false);
    }).then(h => { handle = h; }).catch(() => {});

    // Ocultar la UI HTML MIENTRAS se arrastra/asienta el feed (no mostrar data del
    // video viejo en transición). Al quedar quieto, pageChanged la vuelve a mostrar.
    let scrollHandle: { remove: () => void } | undefined;
    BuzzyVideoFeed.addListener('scrollState', ({ scrolling }) => {
      feedScrollingRef.current = scrolling;
      setFeedScrolling(scrolling);
      // IDLE (scrolling=false): el feed quedó quieto. Si NO cambió de página (volviste
      // al mismo video), pageChanged no llega, así que aquí restauramos la UI igual.
    }).then(h => { scrollHandle = h; }).catch(() => {});

    // FASE 3.4 — Progreso nativo de ExoPlayer → barra + vistas + métricas.
    let progHandle: { remove: () => void } | undefined;
    BuzzyVideoFeed.addListener('progress', ({ index, position, duration }) => {
      const item = exoItemsRef.current[index];
      if (!item || item.type !== 'video') return;
      const videoId = item.id?.toString();
      if (!videoId) return;
      // ExoPlayer da ms → la lógica de progreso/vistas trabaja en segundos.
      applyVideoProgressRef.current(videoId, position / 1000, duration / 1000);
    }).then(h => { progHandle = h; }).catch(() => {});

    // RE-FIRMA estilo TikTok: un video falló (típicamente 403 por URL firmada
    // vencida tras volver a la app horas después). En vez de quedar en negro,
    // pedimos al backend una URL RECIÉN firmada del video activo y la reproducimos
    // de nuevo (video + su música). Guard anti-bucle: no re-intentar el mismo uuid
    // más de una vez seguida (si la URL fresca también falla, es otro problema).
    let errHandle: { remove: () => void } | undefined;
    BuzzyVideoFeed.addListener('playerError', ({ index }) => {
      const item = exoItemsRef.current[index];
      const uuid = item?.uuid?.toString();
      if (!uuid) return;
      if (lastRefreshedUuidRef.current === uuid) return; // ya reintentado
      lastRefreshedUuidRef.current = uuid;
      fetchFreshMediaUrl(uuid).then(fresh => {
        if (!fresh?.video) return;
        // Solo reproducir si SIGUE siendo el video activo (el usuario no scrolleó).
        if (exoItemsRef.current[activeVideoNativeRef.current]?.uuid?.toString() !== uuid) return;
        BuzzyVideoFeed.playUrl({ url: fresh.video }).catch(() => {});
        // Re-firmar también la música del item con la URL fresca.
        applyNativeMusic({ ...item, audio_track_url: fresh.audio_track_url });
      });
    }).then(h => { errHandle = h; }).catch(() => {});

    // FRAME LISTO del player nativo (tras playUrl al cambiar de slide horizontal).
    // Lo retransmitimos como evento global del DOM → el HorizontalCarousel activo lo
    // escucha y RECIÉN AHÍ desvanece el thumbnail del slide (revela el ExoPlayer). Así
    // nunca se ve el frame del slide vecino mientras el nuevo video aún bufferea.
    let frameHandle: { remove: () => void } | undefined;
    BuzzyVideoFeed.addListener('frameReady', () => {
      window.dispatchEvent(new Event('buzzy:nativeframeready'));
    }).then(h => { frameHandle = h; }).catch(() => {});

    return () => { handle?.remove(); scrollHandle?.remove(); progHandle?.remove(); errHandle?.remove(); frameHandle?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PASO 2 — Mute nativo: el botón de volumen silencia/activa el ExoPlayer (video +
  // música), no solo el <video> HTML viejo.
  useEffect(() => {
    if (!exoActiveRef.current) return;
    BuzzyVideoFeed.setMuted({ muted: isMuted }).catch(() => {});
  }, [isMuted]);

  // BLOQUEAR el scroll nativo cuando hay un modal HTML encima (comentarios, gifts,
  // opciones) → el feed no se mueve detrás del modal.
  useEffect(() => {
    if (!exoActiveRef.current) return;
    const modalOpen = showCommentsModal || showGiftMenu || activeOptionsVideoId !== null;
    BuzzyVideoFeed.setScrollEnabled({ enabled: !modalOpen }).catch(() => {});
  }, [showCommentsModal, showGiftMenu, activeOptionsVideoId]);

  // Reaplicar la música nativa cuando cambia ad/story (sin esperar a un
  // pageChanged). El mute lo maneja setMuted (arriba) sin recargar la pista.
  useEffect(() => {
    if (!exoActiveRef.current) return;
    if (feedLockedRef.current) return; // aún con candado: la música no debe sonar
    applyNativeMusic(mergedFeedRef.current[activeVideoRef.current ?? 0]);
  }, [activeAdIndex, viewingStoryUserIndex, applyNativeMusic]);

  // FASE 4 — Pausar el video NATIVO mientras el AdOverlay está abierto. El ad se
  // reproduce en el WebView (con su propio audio) encima del feed; si no pausamos
  // el ExoPlayer, el video + su música seguirían sonando POR DEBAJO del anuncio.
  // Al cerrar el ad (activeAdIndex → null) reanudamos, salvo candado/pausa manual.
  useEffect(() => {
    if (!exoActiveRef.current) return;
    if (activeAdIndex !== null) {
      BuzzyVideoFeed.setPaused({ paused: true }).catch(() => {});
    } else if (!feedLockedRef.current && !exoPausedRef.current && !videosPausedRef.current) {
      BuzzyVideoFeed.setPaused({ paused: false }).catch(() => {});
    }
  }, [activeAdIndex]);

  // FASE 3.2 — Mostrar/ocultar el feed NATIVO al salir/volver del Home. El video
  // nativo vive detrás del WebView; si no se oculta, sigue VISIBLE y SONANDO al
  // abrir chat, stories, ir a perfil, etc. Oculto = GONE + pausa; visible = se
  // muestra (y se reanuda solo si no está en candado/pausa manual).
  const onHomeRoute = location.pathname === '/';
  useEffect(() => {
    if (!exoActiveRef.current) return;
    const feedHidden = !onHomeRoute || showMessages || viewingStoryUserIndex !== null
      || storyEditorFile !== null;
    BuzzyVideoFeed.setVisible({ visible: !feedHidden }).catch(() => {});
    if (!feedHidden) {
      // Volvimos al feed: reanudar solo si NO está bloqueado/pausado manualmente.
      if (!feedLockedRef.current && !exoPausedRef.current) {
        BuzzyVideoFeed.setPaused({ paused: false }).catch(() => {});
      }
    }
  }, [onHomeRoute, showMessages, viewingStoryUserIndex, storyEditorFile]);

  // PASO 3 — Ciclo de vida de la app: al pasar a BACKGROUND (minimizar, bloquear
  // pantalla, entra llamada), pausar+ocultar el ExoPlayer (no debe sonar fuera de
  // foco). Al volver, reanudar solo si el feed está visible y sin candado/pausa.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!exoActiveRef.current) return;
      if (!isActive) {
        BuzzyVideoFeed.setPaused({ paused: true }).catch(() => {});
      } else {
        const feedVisible = location.pathname === '/' && !showMessages
          && viewingStoryUserIndex === null && storyEditorFile === null;
        if (feedVisible && !feedLockedRef.current && !exoPausedRef.current) {
          BuzzyVideoFeed.setPaused({ paused: false }).catch(() => {});
        }
      }
    }).then(h => { handle = h; }).catch(() => {});
    return () => { handle?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFeedPosition = useCallback(() => {
    activeVideoRef.current = 0;
    setActiveVideo(0);
    lastFetchedLengthRef.current = 0;
    lastFeedScrollTopRef.current = 0;
    // setShowStoriesBar(true);

    window.requestAnimationFrame(() => {
      feedScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.requestAnimationFrame(() => {
        feedScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  }, []);

  // Custom hook for interest-based recommendation tracking
  const { onIntersectionChange, recordInteraction } = useVideoEngagement();

  // Infinite Scroll Trigger based on session interests
  const [isFetchingFeed, setIsFetchingFeed] = useState(false);
  const lastFetchedLengthRef = useRef<number>(0);

  // Pull-to-refresh — usa el hook compartido
  const { isPulling: isPullRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refreshFeed()(dispatch),
        getActiveStories()(dispatch),
      ]);
      resetFeedPosition();
    },
    // Feed vacío: siempre permitir. Feed con videos: solo desde el primer video en scroll 0
    checkScrollTop: () => !mediaVideo?.length || (activeVideo === 0 && (feedScrollRef.current?.scrollTop ?? 0) <= 8),
    global: true,
  });

  useEffect(() => {
    // Pre-fetch music for next 2 videos as user scrolls (balance fluidez/datos).
    if (activeVideo !== null && mediaVideo) {
      mediaVideo.slice(activeVideo + 1, activeVideo + 3).forEach(v => {
        if (v.audio_track_url) prefetchAudioUrl(v.audio_track_url)
      })
    }

    // Threshold: prefetch the next page when the user is 3 videos from the end.
    // (Lower than before so we don't refetch — which REPLACES the array — while
    // there's still plenty to watch; fewer fetches = steadier feed.)
    const threshold = 3;
    const currentLength = mediaVideo?.length || 0;

    if (activeVideo !== null && mediaVideo && activeVideo >= currentLength - threshold && !isFetchingFeed) {
      // Only fetch if we haven't already attempted to fetch for this specific length
      // or if we have less than 5 videos left to show
      if (currentLength > lastFetchedLengthRef.current) {

        setIsFetchingFeed(true);
        lastFetchedLengthRef.current = currentLength;

        // Paginar según el tab activo: "Seguidos" usa su propio endpoint.
        const loadMore = feedMode === 'following' ? loadMoreFollowingFeed : loadMoreFeed;
        loadMore()(dispatch)
          .then((res: any) => {
            setIsFetchingFeed(false);
            if (!res || res.length === 0) {
              // We keep lastFetchedLengthRef at currentLength to avoid re-triggering
              // until more media is added from somewhere else
            }
          })
          .catch(() => {
            setIsFetchingFeed(false);
            // On failure, we might want to allow a retry if they scroll more
            lastFetchedLengthRef.current = 0;
          });
      }
    }
  }, [activeVideo, mediaVideo, dispatch, isFetchingFeed, feedMode]);
  // Removed interestWeights from dependencies to avoid re-triggering the effect 
  // every time a video leaves the view, but they are still captured by the closure 
  // when the fetch actually starts.

  // Ad delivery config from backend
  const [adConfig, setAdConfig] = useState({
    ad_every_nth_video: 3,
    ad_cooldown_seconds: 360,
    ads_refresh_seconds: 300,
  });
  const adConfigRef = useRef(adConfig);
  adConfigRef.current = adConfig;
  const userGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch delivery config once on mount
  useEffect(() => {
    const base = getBaseUrl();
    if (!base?.startsWith('http')) return;
    axios.get(`${base.replace(/\/+$/, '')}/api/ads/campaigns/config/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
    }).then(r => setAdConfig(r.data)).catch(() => { });
  }, []);

  // Get user GPS once on mount (best-effort)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { userGpsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => { }
    );
  }, []);

  // Fetch ads on mount + refresh periodically
  useEffect(() => {
    fetchAds();
    const interval = setInterval(fetchAds, adConfig.ads_refresh_seconds * 1000);
    return () => clearInterval(interval);
  }, [adConfig.ads_refresh_seconds]);

  useEffect(() => {
    setMedia(media);
    if (!media?.length) return
    // Inicializar savedMap con los videos ya guardados
    const saved: Record<string, boolean> = {};
    media.forEach(v => { if (v.is_saved) saved[String(v.id)] = true; });
    if (Object.keys(saved).length) setSavedMap(prev => ({ ...prev, ...saved }));
    const entries = media.map(v => ({ username: v.user_id.username, excludeId: v.id }))
    prefetchBatch(entries)
    // Pre-fetch only first 2 music tracks — suficiente para arranque inmediato
    // sin descargar de mas (balance fluidez/datos moviles).
    media.slice(0, 2).forEach(v => {
      if (v.audio_track_url) prefetchAudioUrl(v.audio_track_url)
    })
  }, [media, prefetchBatch]);

  useEffect(() => {
    if (activeVideo === null || !mediaVideo?.length) return;
    // Solo el activo + 2 adelante (no precargamos hacia atras: el scroll natural
    // es hacia abajo). Mantiene el feed fluido sin descargar musica de mas.
    const start = activeVideo;
    const end = Math.min(mediaVideo.length, activeVideo + 3);
    mediaVideo.slice(start, end).forEach(v => {
      if (v.audio_track_url) prefetchAudioUrl(v.audio_track_url)
    })
  }, [activeVideo, mediaVideo]);

  const { activeIncomingCall, activeOutgoingCall } = useCallStore();
  const isCallActive = activeIncomingCall?.status === 'active' || activeOutgoingCall?.status === 'active';


  const isPlayableAd = (ad: any) => {
    if (!ad?.id) return false;
    // Boost de video propio: el contenido reproducible viene en promoted_content.
    if (ad?.is_boost) {
      const url = ad?.promoted_content?.video_url;
      return typeof url === "string" && url.trim().length > 0;
    }
    // Anuncio externo clásico: el video está en el creative.
    const mediaFile = ad?.creative?.media_file;
    return Boolean(typeof mediaFile === "string" && mediaFile.trim());
  };

  const pickRandomAd = (pool: any[]) => {
    const validAds = pool.filter(isPlayableAd);
    if (validAds.length === 0) {
      return null;
    }

    const randIndex = Math.floor(Math.random() * validAds.length);
    return validAds[randIndex];
  };

  const fetchAds = async () => {
    const base = getBaseUrl();
    if (!base?.startsWith('http')) return;
    try {
      const params: Record<string, any> = {};
      if (userGpsRef.current) {
        params.lat = userGpsRef.current.lat;
        params.lng = userGpsRef.current.lng;
      }
      const response = await axios.get(`${base.replace(/\/+$/, '')}/api/ads/campaigns/serve/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params,
      });
      const validAds = Array.isArray(response.data) ? response.data.filter(isPlayableAd) : [];
      setAds(validAds);
    } catch { }
  };

  const isPremiumUser = LoginReducer?.user?.is_buzzy_premium === true;
  const isPremiumUserRef = useRef(isPremiumUser);
  isPremiumUserRef.current = isPremiumUser;

  const stopStoryAudio = useCallback((restoreVideoVolume = true) => {
    storyAudioRequestIdRef.current += 1;

    if (storyAudioFadeTimerRef.current !== null) {
      window.clearInterval(storyAudioFadeTimerRef.current);
      storyAudioFadeTimerRef.current = null;
    }

    const prev = storyAudioRef.current;
    if (prev) {
      prev.pause();
      prev.onended = null;
      prev.ontimeupdate = null;
      prev.src = "";
      prev.load();
      storyAudioRef.current = null;
    }

    activeStoryAudioTrackRef.current = null;

    if (restoreVideoVolume && storyVideoRef.current) {
      storyVideoRef.current.volume = 1;
    }
  }, []);

  const mergedFeed = useMemo(() => {
    if (!mediaVideo) {
      return [];
    }
    const feed: any[] = [];
    let adIndex = 0;

    mediaVideo.forEach((video, index) => {
      feed.push({ ...video, type: 'video' });
      // Premium users never see ads in the static feed
      if (!isPremiumUser && (index + 1) % (adConfig.ad_every_nth_video * 5) === 0 && ads[adIndex]) {
        feed.push({ ...ads[adIndex], type: 'ad' });
        adIndex++;
      }
    });

    // El feed que llega ya viene filtrado por el backend según el modo:
    // "Para ti" → /recommendations/feed/, "Seguidos" → /recommendations/following/.
    // No filtramos en cliente para no descartar videos válidos ni romper la paginación.
    return feed;
  }, [mediaVideo, ads]);
  // Espejo de mergedFeed para leerlo en el listener de pageChanged (que se
  // registra antes en el archivo, sin poder depender de mergedFeed directamente).
  const mergedFeedRef = useRef(mergedFeed);
  mergedFeedRef.current = mergedFeed;

  // Al montar arrancamos siempre en "Para ti" (el feed inicial ya lo carga el
  // contenedor padre). El cambio de feed lo gestiona el efecto de abajo.
  useEffect(() => {
    setFeedMode('for-you');
    setActiveVideo(0);
    activeVideoRef.current = 0;
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = 0;
    }
  }, [setFeedMode]);

  // Reacciona al cambio de tab ("Para ti" ↔ "Seguidos"). Resetea el scroll y el
  // índice activo y pide al backend el feed correcto. Ignora el primer render
  // (prevFeedModeRef === null) para no re-pedir el feed que el padre ya cargó.
  const prevFeedModeRef = useRef<FeedMode | null>(null);
  useEffect(() => {
    const prev = prevFeedModeRef.current;
    prevFeedModeRef.current = feedMode;
    if (prev === null || prev === feedMode) return;

    setActiveVideo(0);
    activeVideoRef.current = 0;
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = 0;
    }
    lastFetchedLengthRef.current = 0;

    if (feedMode === 'following') {
      getFollowingFeed(true)(dispatch);
    } else {
      refreshFeed()(dispatch);
    }
  }, [feedMode, dispatch]);

  // ── Ventana de virtualización (memoria acotada) ──────────────────────────
  // Solo se montan los slides dentro de [activeVideo - BEHIND, activeVideo + AHEAD].
  // El resto se renderiza como un placeholder de la MISMA altura para preservar
  // el scroll-snap y, sobre todo, el índice posicional del que depende el
  // IntersectionObserver, el audio (mergedFeed[activeVideo]) y los ads.
  // Ventana de virtualización ajustada para máximo rendimiento en WebView:
  // solo se montan ~6 slides (2 atrás + actual + 3 adelante) en vez de 21.
  // Más adelante que atrás porque el scroll natural es hacia abajo → precarga
  // el siguiente sin cargar peso innecesario. El resto del feed son placeholders.
  const WINDOW_BEHIND = 2;
  const WINDOW_AHEAD = 3;
  // Ventana de DECODERS de hardware: cuántos <video> tienen `src` cargado a la
  // vez. Ventana mínima = el ANTERIOR + el ACTIVO + el SIGUIENTE (3 en total). El
  // "anterior" hace que volver atrás sea instantáneo (sin pantalla negra); el
  // "siguiente" hace que bajar sea instantáneo. Solo 3 decoders → lo más seguro
  // para el pool limitado de Android. Los demás sueltan su decoder.
  //   Viendo el 3 → decoders en [2,3,4];  bajas al 4 → [3,4,5] (el 2 se libera).
  const isInDecoderWindow = (index: number) => {
    const delta = index - (activeVideo ?? 0);
    return delta >= -1 && delta <= 1;
  };
  // Liberación EXPLÍCITA del decoder. React pone src={undefined} al salir de la
  // ventana, PERO en el WebView de Android quitar el atributo no suelta el decoder
  // físico de inmediato → medido con dec(): al scrollear quedaban 4 con src en vez
  // de 3. Aquí, al cambiar de video activo, recorremos los <video> FUERA de la
  // ventana y forzamos removeAttribute('src')+load(), que SÍ libera el decoder.
  // Solo tocamos los de fuera (nunca el activo ni los 2 precargados), así no
  // interrumpimos ninguna reproducción ni causa pausas/blanco.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (!isInDecoderWindow(index) && video.getAttribute('src')) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load(); // suelta el decoder de hardware de verdad
        } catch { /* no-op */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideo]);
  const { windowStart, windowEnd } = useMemo(() => {
    const center = activeVideo ?? 0;
    const last = Math.max(0, mergedFeed.length - 1);
    return {
      windowStart: Math.max(0, center - WINDOW_BEHIND),
      windowEnd: Math.min(last, center + WINDOW_AHEAD),
    };
  }, [activeVideo, mergedFeed.length]);

  // ── Poda de estados por-video (Tier-1, transitorios) ─────────────────────
  // Acota los Records/refs que crecen 1 entrada por video a solo los de la
  // ventana visible. NO se podan likeOverrides/savedMap/followingState/viewedVideos
  // (Tier-2): son acciones del usuario y deben sobrevivir el back-scroll.
  useEffect(() => {
    const live = new Set<string>();
    for (let i = windowStart; i <= windowEnd; i++) {
      const d = mergedFeed[i];
      if (!d) continue;
      live.add(d.type === 'video' ? String(d.id) : `ad-${d.id}`);
    }
    setShowLikeAnimation(p => pruneRecord(p, live));
    setExpandedDescriptions(p => pruneRecord(p, live));
    setCarouselDots(p => pruneRecord(p, live));
    setVideoLoopCount(p => pruneRecord(p, live));
    // refs: borrar in-place las claves fuera de la ventana
    for (const k in videoProgressRef.current) {
      if (!live.has(k)) delete videoProgressRef.current[k];
    }
    for (const k in videoDurationRef.current) {
      if (!live.has(k)) delete videoDurationRef.current[k];
    }
    for (const k in progressFillRefs.current) {
      if (!live.has(k)) delete progressFillRefs.current[k];
    }
    for (const k in lastVideoTimeRef.current) {
      if (!live.has(k)) delete lastVideoTimeRef.current[k];
    }
    // firedEvents en useVideoMetrics
    pruneTo(live);
  }, [windowStart, windowEnd, mergedFeed, pruneTo]);

  // Duck video audio if a call is active, otherwise apply volume_original from the feed item
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (isCallActive) {
        video.volume = 0.05;
      } else {
        const feedItem = mergedFeed[index];
        const volOriginal = feedItem?.volume_original ?? 1.0;
        video.volume = Math.min(Math.max(volOriginal, 0), 1);
      }
    });
  }, [isCallActive, activeVideo, mergedFeed]);

  // Ref to cancel any pending retry RAF for audio sync
  const audioSyncRafRef = useRef<number>(0);

  const ensureAudioForTrack = useCallback(
    (feedItem?: any, videoElement?: HTMLVideoElement | null) => {
      // En modo ExoPlayer nativo la música la reproduce el SEGUNDO ExoPlayer
      // (applyNativeMusic → setMusic), NO el <audio> HTML. Cortamos aquí para no
      // tener dos músicas sonando a la vez.
      if (exoActiveRef.current) {
        musicAudioRef.current?.pause();
        return;
      }
      // Cancel any pending retry before evaluating new state
      if (audioSyncRafRef.current) {
        cancelAnimationFrame(audioSyncRafRef.current);
        audioSyncRafRef.current = 0;
      }

      const globallyBlocked =
        !isAudioUnlocked ||
        feedLockedRef.current ||   // feed bloqueado (candado, video en pausa inicial)
        !feedItem ||               // → la música NO debe sonar hasta el primer tap
        feedItem.type !== 'video' ||
        !feedItem.audio_track_url ||
        isMuted ||
        activeAdIndex !== null ||
        viewingStoryUserIndex !== null;

      if (globallyBlocked) {
        musicAudioRef.current?.pause();
        if (!feedItem || feedItem.type !== 'video' || !feedItem.audio_track_url) {
          activeAudioTrackRef.current = null;
        }
        return;
      }

      // Video might be in a transitional state (play() called but paused still true for one frame).
      // If so, retry on the next animation frame instead of giving up.
      if (!videoElement || videoElement.paused) {
        audioSyncRafRef.current = requestAnimationFrame(() => {
          audioSyncRafRef.current = 0;
          if (!videoElement || videoElement.paused) {
            // Still paused after one frame — legitimately stopped, nothing to do
            musicAudioRef.current?.pause();
            return;
          }
          ensureAudioForTrack(feedItem, videoElement);
        });
        return;
      }

      const audioUrl = feedItem.audio_track_url;
      const volumeMusic = Math.min(Math.max(feedItem.volume_music ?? 0.8, 0), 1);
      const volumeOriginal = Math.min(Math.max(feedItem.volume_original ?? 1.0, 0), 1);
      const trackId = feedItem.audio_track_id || audioUrl;
      const trimStart = Math.max(0, feedItem.audio_trim_start ?? 0);
      const trimEndCandidate = feedItem.audio_trim_end;
      const trimEndFromFeed = typeof trimEndCandidate === "number" && isFinite(trimEndCandidate)
        ? Math.max(trimStart, trimEndCandidate)
        : null;

      // Apply original-audio volume to the video element immediately
      videoElement.volume = volumeOriginal;
      activeFeedAudioTrimStartRef.current = trimStart;
      activeFeedAudioTrimEndRef.current = trimEndFromFeed ?? trimStart;

      if (
        !musicAudioRef.current ||
        activeAudioTrackRef.current !== trackId
      ) {
        // Cleanup previous track — fully release the old <audio> so it can be GC'd
        // (pause, drop listeners, clear src). Leaking these is a big mobile memory
        // sink over a long feed session.
        if (musicAudioRef.current) {
          const old = musicAudioRef.current;
          old.pause();
          old.onended = null;
          old.ontimeupdate = null;
          old.removeAttribute('src');
          old.load();
          musicAudioRef.current = null;
        }

        // Mark track as pending AFTER clearing — this prevents the null-ref path
        // in the else branch from running while the fetch is in flight
        activeAudioTrackRef.current = trackId;

        prefetchAudioUrl(audioUrl)
          .then(blobUrl => {
            // Discard if the user scrolled to a different track while fetching.
            // IMPORTANT: clear the marker so a later return to this track re-fetches
            // cleanly instead of being stuck "pending" with no audio (this was the
            // root cause of "some videos have no sound").
            if (activeAudioTrackRef.current !== trackId) {
              return;
            }

            const audio = new Audio(blobUrl);
            audio.loop = false;
            audio.muted = false;
            audio.preload = "auto";

            const initAudio = () => {
              audio.volume = volumeMusic;
              audio.currentTime = trimStart;
              activeFeedAudioTrimEndRef.current =
                trimEndFromFeed ??
                Math.max(trimStart, isFinite(audio.duration) ? audio.duration : trimStart);
            };

            // loadedmetadata fires asynchronously; blob URLs often already have
            // metadata ready so we also check readyState synchronously as fallback
            audio.addEventListener("loadedmetadata", initAudio, { once: true });
            if (audio.readyState >= 1) initAudio();

            audio.onended = () => {
              audio.currentTime = trimStart;
              audio.play().catch(() => {});
            };
            // Loop the trimmed window. Guard with a small epsilon so we don't fire
            // a seek+play on every single timeupdate frame near the end (that
            // constant restart is what made the audio sound "frozen"/stuttery).
            audio.ontimeupdate = () => {
              const trimEnd = activeFeedAudioTrimEndRef.current;
              if (trimEnd > trimStart && audio.currentTime >= trimEnd - 0.05) {
                audio.currentTime = trimStart;
                if (audio.paused && videoElement && !videoElement.paused) {
                  audio.play().catch(() => {});
                }
              }
            };

            musicAudioRef.current = audio;

            // Play if the video is currently playing. If it's still buffering, the
            // video's own "play"/"playing" listeners (ensureAudioForTrack effect)
            // will re-invoke us and start the audio then — so no track is left
            // silent just because the fetch finished a frame too early.
            if (videoElement && !videoElement.paused) {
              audio.play().catch(() => {});
            }
          })
          .catch(() => {
            // Fetch failed — clear the pending marker so the next scroll attempt retries
            if (activeAudioTrackRef.current === trackId) {
              activeAudioTrackRef.current = null;
            }
          });

        return;
      }

      // Same track already loaded — just resume
      if (!musicAudioRef.current) return;
      musicAudioRef.current.volume = volumeMusic;
      musicAudioRef.current.muted = false;
      if (trimEndFromFeed !== null) {
        activeFeedAudioTrimEndRef.current = trimEndFromFeed;
      }
      musicAudioRef.current.play().catch(() => {});
    },
    [activeAdIndex, isAudioUnlocked, isMuted, viewingStoryUserIndex],
  );

  // (story audio is now handled directly in the useEffect below)

  useEffect(() => {
    const feedItem = mergedFeed[activeVideo ?? -1];
    const videoElement = videoRefs.current[activeVideo ?? -1];

    const syncAudio = () => ensureAudioForTrack(feedItem, videoElement);
    const pauseAudio = () => {
      musicAudioRef.current?.pause();
    };

    let prevTime = 0;
    const watchLoop = () => {
      if (!videoElement) return;
      const ct = videoElement.currentTime;
      const trimStart = activeFeedAudioTrimStartRef.current;

      if (ct < prevTime - 0.5 && musicAudioRef.current && feedItem?.audio_track_url) {
        // Assign currentTime only if metadata logic is somewhat initialized
        if (musicAudioRef.current.readyState >= 1) {
          musicAudioRef.current.currentTime = trimStart;
        }
        if (musicAudioRef.current.paused && !videoElement.paused) {
          musicAudioRef.current.play().catch(() => { });
        }
      }
      prevTime = ct;
    };

    if (videoElement) {
      videoElement.addEventListener("play", syncAudio);
      videoElement.addEventListener("playing", syncAudio);
      videoElement.addEventListener("pause", pauseAudio);
      videoElement.addEventListener("timeupdate", watchLoop);
    }

    syncAudio();

    return () => {
      if (videoElement) {
        videoElement.removeEventListener("play", syncAudio);
        videoElement.removeEventListener("playing", syncAudio);
        videoElement.removeEventListener("pause", pauseAudio);
        videoElement.removeEventListener("timeupdate", watchLoop);
      }
      pauseAudio();
    };
  }, [activeVideo, ensureAudioForTrack, mergedFeed]);


  useEffect(() => {
    return () => {
      musicAudioRef.current?.pause();
      musicAudioRef.current = null;
      activeAudioTrackRef.current = null;
      activeFeedAudioTrimStartRef.current = 0;
      activeFeedAudioTrimEndRef.current = 0;
      storyAudioRef.current?.pause();
      storyAudioRef.current = null;
      activeStoryAudioTrackRef.current = null;
    };
  }, []);

  // When an ad starts, pause the underlying feed video.
  // Play/pause for normal feed scrolling is handled by the IntersectionObserver.
  // Manual tap play/pause is handled exclusively by handleVideoClick.
  useEffect(() => {
    if (activeAdIndex !== null) {
      videoRefs.current.forEach(v => { if (v && !v.paused) v.pause(); });
    }
  }, [activeAdIndex]);

  // Pause active feed video when upload modal opens
  useEffect(() => {
    const onPause = () => {
      videoRefs.current.forEach(v => { if (v && !v.paused) v.pause() })
      // Feed nativo: ocultar+pausar (un modal lo tapa).
      if (exoActiveRef.current) BuzzyVideoFeed.setVisible({ visible: false }).catch(() => {});
    }
    const onResume = () => {
      const shouldBlockInitialAutoplay = activeVideo === 0 && !hasUserInteracted.current && !hasLeftInitialVideoRef.current;
      if (activeVideo !== null && !shouldBlockInitialAutoplay) {
        const v = videoRefs.current[activeVideo]
        if (v && v.paused) v.play().catch(() => { })
      }
      // Feed nativo: volver a mostrar y reanudar si no está en candado/pausa.
      if (exoActiveRef.current) {
        BuzzyVideoFeed.setVisible({ visible: true }).catch(() => {});
        if (!feedLockedRef.current && !exoPausedRef.current) {
          BuzzyVideoFeed.setPaused({ paused: false }).catch(() => {});
        }
      }
    }
    window.addEventListener('buzzy:pausefeed', onPause)
    window.addEventListener('buzzy:resumefeed', onResume)
    return () => {
      window.removeEventListener('buzzy:pausefeed', onPause)
      window.removeEventListener('buzzy:resumefeed', onResume)
    }
  }, [activeVideo])

  // Pause feed video when chat modal opens, resume when it closes
  useEffect(() => {
    if (showMessages) {
      videoRefs.current.forEach(v => { if (v && !v.paused) v.pause() })
      musicAudioRef.current?.pause()
    } else {
      const shouldBlockInitialAutoplay = activeVideo === 0 && !hasUserInteracted.current && !hasLeftInitialVideoRef.current;
      if (activeVideo !== null && !shouldBlockInitialAutoplay) {
        const v = videoRefs.current[activeVideo]
        if (v && v.paused) v.play().catch(() => { })
        if (musicAudioRef.current?.paused) musicAudioRef.current?.play().catch(() => { })
      }
    }
  }, [showMessages, activeVideo])

  useEffect(() => {
    sendAudioRef.current = new Audio(sendMessageSound);
    typingAudioRef.current = new Audio(typingSound);
    // Fetch wallet on mount so balance/tokens are always up to date
    dispatch(getWallet() as any);
  }, []);

  const handleToggleDescription = (videoId: string | number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const groupedStories = useMemo(() => {
    if (!stories || !Array.isArray(stories)) return [];
    const groups = new Map();
    stories.forEach((story: any) => {
      const userId = story?.user?.id;
      const isSub = story?.privacy === 'subscribers';
      // Etiquetar cada media con el privacy y el created_at de SU historia, para
      // que el label dentro del visor (privacy + "Hace X") dependa de la media
      // actual, no del grupo entero. created_at se usa para calcular el tiempo
      // relativo EN EL CLIENTE al renderizar (ver formatStoryTimeAgo): así nunca
      // se congela en caché un string como "Hace 3 horas".
      const taggedMedia = (story.media || []).map((m: any) => ({ ...m, privacy: story.privacy, created_at: story.created_at }));
      if (!groups.has(userId)) {
        groups.set(userId, { ...story, user: story.user, media: taggedMedia, hasSubscriberStory: isSub });
      } else {
        const existing = groups.get(userId);
        existing.media.push(...taggedMedia);
        if (isSub) existing.hasSubscriberStory = true;
      }
    });
    const result = Array.from(groups.values());
    return result;
  }, [stories]);

  // ── Story Audio — direct, clean approach ──────────────────────────────────
  // This effect creates/destroys the audio when the story changes.
  // Pause/resume is handled separately below to avoid restarting from trimStart on unpause.
  useEffect(() => {
    stopStoryAudio(false);

    if (viewingStoryUserIndex === null) return;

    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) return;
    const currentStoryItem = currentGroup.media?.[currentStoryItemIndex];
    if (!currentStoryItem) return;

    const originalStory = (stories as Story[])?.find((s) => s.id === currentStoryItem.story);
    if (!originalStory?.audio_track_url) return;

    const audioUrl = originalStory.audio_track_url;
    const trimStart = originalStory.audio_trim_start ?? 0;
    const trimEnd = originalStory.audio_trim_end ?? null;
    const volume = Math.min(Math.max(originalStory.audio_volume_music ?? 0.8, 0), 1);

    const videoEl = storyVideoRef.current;
    if (videoEl) videoEl.volume = 0;

    const requestId = storyAudioRequestIdRef.current;

    prefetchAudioUrl(audioUrl).then(blobUrl => {
      if (requestId !== storyAudioRequestIdRef.current) return;

      const audio = new Audio(blobUrl);
      audio.loop = false;
      audio.preload = "auto";
      audio.muted = true;
      audio.volume = 0;

      const loop = () => {
        const end = trimEnd !== null ? trimEnd : audio.duration;
        if (end && audio.currentTime >= end - 0.15) {
          audio.currentTime = trimStart;
          audio.play().catch(() => { });
        }
      };
      audio.ontimeupdate = loop;
      audio.onended = () => {
        audio.currentTime = trimStart;
        audio.play().catch(() => { });
      };

      const beginPlay = () => {
        if (requestId !== storyAudioRequestIdRef.current) return;
        audio.currentTime = trimStart;
        audio.muted = true;
        audio.play().then(() => {
          if (requestId !== storyAudioRequestIdRef.current) {
            audio.pause();
            return;
          }
          audio.muted = false;
          if (isStoryPaused || isMuted) {
            audio.pause();
            return;
          }
          const targetVolume = volume;
          const steps = 8;
          const stepMs = 25;
          const stepSize = targetVolume / steps;
          let currentStep = 0;
          audio.volume = 0;
          if (storyAudioFadeTimerRef.current !== null) {
            window.clearInterval(storyAudioFadeTimerRef.current);
          }
          storyAudioFadeTimerRef.current = window.setInterval(() => {
            if (requestId !== storyAudioRequestIdRef.current) {
              if (storyAudioFadeTimerRef.current !== null) {
                window.clearInterval(storyAudioFadeTimerRef.current);
                storyAudioFadeTimerRef.current = null;
              }
              return;
            }
            currentStep += 1;
            audio.volume = Math.min(targetVolume, currentStep * stepSize);
            if (currentStep >= steps) {
              if (storyAudioFadeTimerRef.current !== null) {
                window.clearInterval(storyAudioFadeTimerRef.current);
                storyAudioFadeTimerRef.current = null;
              }
            }
          }, stepMs);
        }).catch(() => {
          document.addEventListener("click", () => {
            if (requestId !== storyAudioRequestIdRef.current) return;
            audio.muted = false;
            audio.play().catch(() => { });
          }, { once: true });
        });
      };

      if (audio.readyState >= 1) {
        beginPlay();
      } else {
        audio.addEventListener("loadedmetadata", beginPlay, { once: true });
      }

      storyAudioRef.current = audio;
      activeStoryAudioTrackRef.current = audioUrl;
    });

    activeStoryAudioTrackRef.current = audioUrl;

    return () => {
      stopStoryAudio(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories, stories, stopStoryAudio]);

  // Pause/resume existing story audio when isStoryPaused or isMuted changes (no audio recreation)
  useEffect(() => {
    const audio = storyAudioRef.current;
    if (!audio) return;
    if (isStoryPaused || isMuted) {
      audio.pause();
    } else {
      audio.play().catch(() => { });
    }
  }, [isStoryPaused, isMuted]);


  useEffect(() => {
    sendAudioRef.current = new Audio(sendMessageSound);
  }, []);

  useEffect(() => {
    const removeListeners = () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("touchend", unlockAudio);
    };

    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;

      // A real user gesture IS the browser's autoplay authorization. The feed
      // plays plain HTML5 <audio>, so once a gesture happened we can mark audio
      // unlocked unconditionally — don't gate it on Howler's ctx reaching
      // "running", which can lag indefinitely in Android WebView and was the
      // reason some videos never played their music.
      audioUnlockedRef.current = true;
      setIsAudioUnlocked(true);
      removeListeners();

      // Best-effort: resume Howler's AudioContext (used by the editor/preview).
      const howlerCtx = (Howler as any).ctx as AudioContext | undefined;
      if (howlerCtx && howlerCtx.state === "suspended") {
        howlerCtx.resume().catch(() => {});
      }

      // Best-effort: prime the small SFX elements within the gesture so later
      // programmatic .play() calls are already allowed.
      const sa = sendAudioRef.current;
      if (sa) {
        sa.volume = 0;
        sa.play().then(() => { sa.pause(); sa.currentTime = 0; sa.volume = 1; }).catch(() => {});
      }
      const ta = typingAudioRef.current;
      if (ta) {
        ta.volume = 0;
        ta.play().then(() => { ta.pause(); ta.currentTime = 0; ta.volume = 1; }).catch(() => {});
      }
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio, { passive: true });
    window.addEventListener("touchend", unlockAudio, { passive: true });

    return removeListeners;
  }, []);

  useEffect(() => {
    isGiftsRef.current = isGifts;
  }, [isGifts]);
  useEffect(() => {
    chatSocketActiveRef.current = !!selectedChat;
  }, [selectedChat]);


  // ─── WebSocket events (via singleton context) ─────────────────────────────

  // Stats en VIVO de un video para el carrusel (botones del WebView): combina el
  // override de likes del socket (likeOverrides) y el comments_count actualizado en
  // mediaVideo. Así los botones reflejan el tiempo real, no el valor del montaje.
  const getLiveStats = useCallback((videoId: number) => {
    const lo = likeOverrides[String(videoId)];
    const vid = mediaVideo?.find(v => String(v.id) === String(videoId));
    return {
      liked: lo ? lo.liked : undefined,
      likeCount: lo ? lo.like_count : undefined,
      commentsCount: vid?.comments_count,
    };
  }, [likeOverrides, mediaVideo]);

  useWsEvent("like_updated", useCallback((data: any) => {
    // Aceptar varios nombres posibles del backend (video_id/video/id, likes/like_count).
    const key = String(data.video_id ?? data.video ?? data.id);
    const count = data.likes ?? data.like_count ?? data.likes_count ?? 0;
    setLikeOverrides(prev => ({
      ...prev,
      [key]: { liked: data.liked, like_count: count },
    }));
  }, []));

  useWsEvent("gift_received", useCallback((data: any) => {
    const giftEntry = {
      type: data.gift_type, giftId: data.gift_uuid, storyUuid: data.story_uuid,
      sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
      uuid: data.gift_uuid,
    };
    const normalizeGiftList = (value: any) => (Array.isArray(value) ? value : []);
    if (user.id == data.from_user) {
      // Reproducción directa por streaming (sin descargar el video entero como
      // blob): el <video> usa getMediaUrl(giftAnimation.gift) y arranca al instante.
      if (giftAnimBlobRef.current) {
        URL.revokeObjectURL(giftAnimBlobRef.current);
        giftAnimBlobRef.current = null;
      }
      setGiftAnimation(giftEntry);
    } else {
      setIsGift(prev => {
        const current = normalizeGiftList(prev);
        return current.some(g => g.uuid === data.gift_uuid) ? current : [...current, giftEntry];
      });
      setGiftRecived(prev => {
        const current = normalizeGiftList(prev);
        return current.some(g => g.uuid === data.gift_uuid) ? current : [...current, giftEntry];
      });
      if (isNotifEnabled('notif_gifts')) {
        useNotificationsStore.getState().pushRealtime({
          id: Date.now(),
          notification_type: "gift",
          message: `${data.sender?.username ?? data.sender} te mandó un regalo 🎁`,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          actor: { id: data.from_user, username: data.sender?.username ?? data.sender, profile_picture: data.sender?.profile_picture ?? null },
          video_thumbnail: null,
          video_uuid: null,
        });
      }
    }
    // Usar ref para evitar TDZ — currentStoryUuid se declara más abajo en el módulo
    if (currentStoryUuidRef.current === data.story_uuid) {
      setGiftRecived(prev => {
        const current = normalizeGiftList(prev);
        return current.some(g => g.uuid === data.gift_uuid) ? current : [...current, giftEntry];
      });
    }
  }, [user.id, setGiftAnimation, setIsGift, setGiftRecived]));

  useWsEvent("video_gift_received", useCallback((data: any) => {
    if (user.id == data.from_user) {
      setGiftAnimation({
        type: data.gift_type, giftId: data.gift_uuid, videoId: data.video_id,
        sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
        color_premiun: data.color_premiun,
      });
    } else if (isNotifEnabled('notif_gifts')) {
      useNotificationsStore.getState().pushRealtime({
        id: Date.now(),
        notification_type: "gift",
        message: `${data.sender?.username ?? data.sender} te mandó un regalo 🎁`,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        actor: { id: data.from_user, username: data.sender?.username ?? data.sender, profile_picture: data.sender?.profile_picture ?? null },
        video_thumbnail: null,
        video_uuid: data.video_uuid ?? null,
      });
    }
  }, [user.id, activeVideo, setGiftAnimation]));

  useWsEvent("new_comment", useCallback((data: any) => {
    if (!data?.user_id) return;
    // Comparar como STRING (el backend puede mandar id numérico o string → === fallaba).
    const vid = String(data.video_id ?? data.video ?? data.id);
    const count = data.comments_count ?? data.comment_count ?? data.comments;
    setMedia(prev =>
      prev ? prev.map(video =>
        String(video.id) === vid
          ? { ...video, comments_count: count ?? video.comments_count }
          : video
      ) : prev
    );
    if (currentVideoIdRef.current?.toString() === vid) {
      setComments(prev => upsertComment(prev, data));
    }
  }, [setMedia, upsertComment]));

  useWsEvent("new_view", useCallback((data: any) => {
    const vid = String(data.video_id ?? data.video ?? data.id);
    const count = data.view_acount ?? data.view_count ?? data.views;
    setMedia(prev =>
      prev ? prev.map(video =>
        String(video.id) === vid ? { ...video, view_acount: count ?? video.view_acount } : video
      ) : prev
    );
  }, [setMedia]));

  useWsEvent("new_follower", useCallback((data: any) => {
    setMedia(prev =>
      prev ? prev.map(video =>
        video.user_id.id == data.channel_profile
          ? { ...video, current_user_followered: data.current_user_followered }
          : video
      ) : prev
    );
  }, [setMedia]));

  useWsEvent("delete_follower", useCallback((data: any) => {
    setMedia(prev =>
      prev ? prev.map(video =>
        video.user_id.id == data.channel_profile
          ? { ...video, current_user_followered: data.current_user_followered }
          : video
      ) : prev
    );
  }, [setMedia]));

  // send_message — sonido y unread manejados globalmente en Navar (siempre montado)
  // index.tsx no necesita duplicar esa lógica

  useWsEvent("new_story", useCallback((data: any) => {
    if (data.story) {
      setStories(prev => {
        const current = Array.isArray(prev) ? prev : [];
        return [...current, data.story];
      });
    }
  }, [setStories]));

  useWsEvent("gift_see", useCallback((data: any) => {
    if (user.id === data.to_user) {
      const updated = isGiftsRef.current.filter(g => g.uuid !== data.gift_uuid);
      setIsGift(updated);
      setGiftRecived(updated);
      setGiftAnimation({
        type: data.gift_type, giftId: data.gift_uuid, storyUuid: data.story_uuid,
        sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
      });
    }
    setShowViewersModal(false);
  }, [user.id, isGiftsRef, setIsGift, setGiftRecived, setGiftAnimation, setShowViewersModal]));

  useWsEvent("typing", useCallback((data: any) => {
    if (data.user_id === user.id) return;
    if (data.is_typing) {
      setTypingUser(data.chat_uuid, data.user_id, data.username ?? "Alguien");
    } else {
      removeTypingUser(data.chat_uuid, data.user_id);
    }
  }, [user.id, setTypingUser, removeTypingUser]));

  useEffect(() => {
    setMedia(media);
  }, [media]);

  useEffect(() => {
    setSelectedStoryLocation(null);
  }, [viewingStoryUserIndex, currentStoryItemIndex]);

  // Reset scroll to top on mount so stories bar is always visible on reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = 0;
    }
    lastFeedScrollTopRef.current = 0;
    // setShowStoriesBar(true);
  }, []);

  // Cargar stories. Una carga EXITOSA se marca con `_storiesFetched` para no
  // re-pedir al servidor en cada montaje. Pero si el primer intento falla (red)
  // o el componente se desmonta antes de que llegue la respuesta, el flag NO se
  // quema, así que al volver al home se reintenta. Esto arregla el bug de "a
  // veces las historias no aparecen hasta cambiar de sección y volver".
  useEffect(() => {
    let cancelled = false;

    // 1. Mostrar cache inmediatamente (siempre, aunque ya se haya hecho fetch)
    loadStoriesCache().then((cached) => {
      if (cancelled || cached.length === 0) return;
      setStories((prev) => (prev.length > 0 ? prev : cached));
      cached.forEach((s: Story) => { if (s.audio_track_url) prefetchAudioUrl(s.audio_track_url); });
    }).catch(() => {});

    // Si ya hubo una carga exitosa esta sesión, no re-pedimos al servidor.
    if (_storiesFetched) return;

    // 2. Pedir al servidor y actualizar. El servidor es la fuente de verdad:
    //    si devuelve [] (todas las historias expiraron a las 24h) hay que
    //    REEMPLAZAR el caché y vaciar la barra, no conservar historias muertas.
    //    Solo un fallo de red (res === undefined) preserva lo que ya se ve.
    getActiveStories()(dispatch).then((res: unknown) => {
      if (!Array.isArray(res)) return; // fallo de red: NO quemamos el flag → reintenta al volver
      _storiesFetched = true;          // éxito real (aunque sea []) → no re-pedir esta sesión
      if (cancelled) return;
      const fresh = res as Story[];
      setStories(fresh);
      saveStories(fresh).catch(() => {});
      fresh.forEach((s: Story) => { if (s.audio_track_url) prefetchAudioUrl(s.audio_track_url); });
    });

    return () => { cancelled = true; };
  }, [dispatch]); // Solo depende de dispatch que es estable

  // Suscripción al evento global de refresh — refresca feed + stories
  useEffect(() => {
    const handleRefresh = async () => {
      if (!navigator.onLine) {
        window.dispatchEvent(new CustomEvent("buzzy:offline-toast"));
        return;
      }
      // Refresca el feed del tab activo: "Seguidos" tiene su propio endpoint.
      if (feedMode === 'following') {
        await getFollowingFeed()(dispatch);
      } else {
        await refreshFeed()(dispatch);
      }
      const res = await getActiveStories()(dispatch);
      resetFeedPosition();
      if (Array.isArray(res)) {
        // El servidor manda: una respuesta real (aunque sea []) reemplaza la barra,
        // así si las historias expiran a las 24h se vacían al refrescar. Solo un
        // fallo de red (res no-array) preserva lo que ya se ve.
        const refreshed = res as Story[];
        setStories(refreshed);
        saveStories(refreshed).catch(() => {});
        refreshed.forEach((s: Story) => { if (s.audio_track_url) prefetchAudioUrl(s.audio_track_url); });
      }
    };
    const handleOfflineToast = () => {
      setOfflineToast(true);
      setTimeout(() => setOfflineToast(false), 3000);
    };
    window.addEventListener("buzzy:refresh", handleRefresh);
    window.addEventListener("buzzy:offline-toast", handleOfflineToast);
    return () => {
      window.removeEventListener("buzzy:refresh", handleRefresh);
      window.removeEventListener("buzzy:offline-toast", handleOfflineToast);
    };
  }, [dispatch, feedMode]);

  const handleCommentClick = (index: number) => {
    if (mediaVideo && mediaVideo[index]) {
      const videoId = mediaVideo[index].id.toString();
      const videoUuid = mediaVideo[index].uuid?.toString() ?? "";
      setCurrentVideoId(videoId);
      currentVideoIdRef.current = videoId;
      setComments(null);
      setShowCommentsModal(true);

      if (!navigator.onLine) {
        setCommentsOffline(true);
        return;
      }

      setCommentsOffline(false);
      getComment({ video_id: videoUuid })(dispatch).then((res: unknown) => {
        setComments(Array.isArray(res) ? res : [])
      })
    }
  }

  const handleRetryComments = () => {
    setCommentsOffline(false);
    const videoUuid = mediaVideo?.find(v => v.id.toString() === currentVideoId)?.uuid?.toString() ?? "";
    if (!videoUuid) return;
    getComment({ video_id: videoUuid })(dispatch).then((res: unknown) => {
      setComments(Array.isArray(res) ? res : [])
    })
  }
  const handlePostComment = (parent_uuid?: string, audioBlob?: Blob, audioDuration?: number, imageFile?: File) => {
    if (!commentText.trim() && !audioBlob && !imageFile) return;
    if (!currentVideoId) return;

    // Record interaction for recommendation system
    const videoItem = mediaVideo?.find(v => v.id.toString() === currentVideoId);
    if (videoItem) {
      recordInteraction(videoItem.category || null);
    }

    createComment({
      video_id: currentVideoId,
      content: commentText,
      parent_uuid: parent_uuid || null,
      audioBlob,
      audioDuration,
      imageFile,
    })(dispatch)
      .then((res: any) => {
        if (res) {
          setComments((prevComments) => upsertComment(prevComments, res));
        }
        setCommentText("");
      })
      .catch((error: any) => {
        console.error("Error publicando comentario:", error);
        setFeedbackModal({ show: true, success: false, message: "No se pudo publicar el comentario. Inténtalo de nuevo." });
      });
  };

  // Refs para throttling de actualizaciones de progreso de videos del grid
  const lastVideoProgressUpdate = useRef<Record<string, number>>({});
  const videoProgressUpdateInterval = 200; // Actualizar solo cada 200ms (5 veces por segundo)

  // Núcleo de progreso, desacoplado del <video> HTML: toma (videoId, segundos,
  // duración). Lo usan TANTO el <video> HTML (handleVideoProgress) COMO el evento
  // 'progress' nativo de ExoPlayer (Fase 3.4) → barra + vistas + métricas.
  const applyVideoProgress = useCallback((videoId: string, currentTime: number, duration: number) => {
    const now = Date.now();
    const lastUpdate = lastVideoProgressUpdate.current[videoId] || 0;
    if (now - lastUpdate < videoProgressUpdateInterval) return;
    lastVideoProgressUpdate.current[videoId] = now;

    // Monetization tracking — 50% mark, min 10s for monetizable
    trackTimeUpdate(videoId, currentTime, duration);

    const currentProgress = videoProgressRef.current[videoId] || 0;
    if (Math.abs(currentTime - currentProgress) > 0.25 || currentTime === 0) {
      videoProgressRef.current[videoId] = currentTime;
      const progressFill = progressFillRefs.current[videoId];
      if (progressFill) {
        const safeDuration = isFinite(duration) && duration > 0 ? duration : 1;
        progressFill.style.width = `${Math.min(100, (currentTime / safeDuration) * 100)}%`;
      }
    }

    if (isFinite(duration) && duration > 0) {
      videoDurationRef.current[videoId] = duration;
    }
    const viewThreshold = isFinite(duration) && duration > 0 && duration < 10
      ? duration * 0.8
      : 10;
    if (currentTime >= viewThreshold && !viewedVideos.has(videoId)) {
      createView({ video_id: videoId })(dispatch)
        .then(() => {})
        .catch((err: any) => console.error("API View Error:", err));
      setViewedVideos((prev) => {
        const newSet = new Set(prev instanceof Set ? prev : []);
        newSet.add(videoId);
        return newSet;
      });
    }

    // ── ADS en el FEED NATIVO (Fase 4) ───────────────────────────────────────
    // En modo nativo (ExoPlayer) el <video> HTML no existe → su onTimeUpdate (que
    // dispara los ads en web) nunca corre. Aquí replicamos ese trigger desde el
    // 'progress' del ExoPlayer: a los ~5s, en cada Nth video, respetando cooldown
    // y "ya mostrado", abrimos el AdOverlay (mismo componente que web). El video
    // nativo se pausa al abrir y se reanuda al cerrar (lo maneja el efecto de
    // activeAdIndex). Solo en nativo: en web sigue el path de onTimeUpdate.
    if (exoActiveRef.current && !isPremiumUserRef.current
        && currentTime >= 5 && currentTime < 6.5
        && adsRef.current.length > 0
        && activeAdIndexRef.current === null
        && !shownAdsRef.current.has(videoId)) {
      const cfg = adConfigRef.current;
      const now2 = Date.now();
      const cooldownPassed = now2 - lastAdTimestampRef.current > cfg.ad_cooldown_seconds * 1000;
      // Índice del video en mergedFeed (donde se renderiza el AdOverlay). El ad se
      // muestra cada Nth video → usamos la posición del video en mergedFeed.
      const mergedIdx = mergedFeedRef.current.findIndex(
        (m) => m?.type === 'video' && m.id?.toString() === videoId);
      // Contamos solo los videos hasta este punto para el "cada Nth" (mergedFeed
      // intercala ads, así que mergedIdx no sirve para el módulo directamente).
      const videoOrdinal = mergedIdx >= 0
        ? mergedFeedRef.current.slice(0, mergedIdx + 1).filter(m => m?.type === 'video').length - 1
        : -1;
      if (cooldownPassed && mergedIdx >= 0 && videoOrdinal >= 0
          && videoOrdinal % cfg.ad_every_nth_video === 0) {
        const nextAd = pickRandomAd(adsRef.current);
        if (nextAd) {
          setSelectedAd(nextAd);
          setActiveAdIndex(mergedIdx);
          setShownAds(prev => new Set(prev instanceof Set ? prev : []).add(videoId));
          setIsMuted(false);       // el ad siempre con sonido (igual que web)
          setAdSequenceCount(1);
          setExpandedDescriptions(prev => ({ ...prev, [videoId]: false }));
        }
      }
    }
  }, [viewedVideos, dispatch, trackTimeUpdate]);

  const handleVideoProgress = useCallback((e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoElement = e.currentTarget;
    applyVideoProgress(videoId, videoElement.currentTime, videoElement.duration);
  }, [applyVideoProgress]);

  // Mantener el espejo actualizado (declarado arriba para el listener 'progress').
  applyVideoProgressRef.current = applyVideoProgress;
  const handleFollowClick = (userIdToFollow: number, userIdAsString: string, actions: "create" | "delete") => {
    if (!userIdToFollow) {
      return;
    }
    // Feedback háptico al seguir/dejar de seguir (ligeramente más marcado).
    tapHaptic(ImpactStyle.Medium);
    createFollower({ follower_user_id: userIdToFollow.toString() })(dispatch)
      .then(() => {
        setFollowingState((prev) => ({
          ...prev,
          [userIdAsString]: actions == "delete" ? false : true,
        }));
      })
      .catch((err: any) => {
        console.error("❌ Error al crear el seguidor:", err);
        // Revertir estado optimista en caso de error
        setFollowingState((prev) => ({
          ...prev,
          [userIdAsString]: actions == "delete" ? true : false,
        }));
        setFeedbackModal({ show: true, success: false, message: "No se pudo completar la acción. Inténtalo de nuevo." });
      });
  };
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          const index = videoRefs.current.findIndex((ref) => ref === video)
          const videoItem = mergedFeed[index];

          // Guard: al liberar/reasignar refs (gestión de decoders) o si el feed
          // cambió de tamaño, el observer puede dispararse para un <video> cuyo
          // índice ya no existe en mergedFeed (index === -1 o item undefined).
          // Sin esto, más abajo se lee `.id` de undefined → crash del observer.
          if (index < 0 || !videoItem) return;

          // MODO ExoPlayer nativo: el ref es un <div> placeholder (no un <video>).
          // Solo actualizamos el video activo → el efecto llama setActive() a
          // ExoPlayer, que reproduce el nativo. NO tocamos .play()/.pause() (el div
          // no los tiene). Track de intersección para recomendaciones sí.
          if (exoActiveRef.current) {
            if (entry.isIntersecting) {
              if (videoItem.type === 'video') {
                onIntersectionChange(videoItem.id, true, videoItem.category || null);
              }
              if (index !== 0) hasLeftInitialVideoRef.current = true;
              activeVideoRef.current = index;
              setActiveVideo(index);
              setActiveOptionsVideoId(null);
            } else if (videoItem.type === 'video') {
              onIntersectionChange(videoItem.id, false, videoItem.category || null);
            }
            return;
          }

          if (entry.isIntersecting) {
            // Track intersection for recommendation system
          if (videoItem && videoItem.type === 'video') {
              onIntersectionChange(videoItem.id, true, videoItem.category || null);
            }

            if (index !== 0) {
              hasLeftInitialVideoRef.current = true;
            }

            const shouldBlockInitialAutoplay = index === 0 && !hasUserInteracted.current && !hasLeftInitialVideoRef.current;
            const isSameFirstVideo = index === 0 && activeVideoRef.current === 0 && hasUserInteracted.current;
            // If returning to a video whose carousel is on a slide > 0, the feed
            // video (slide 0) should stay paused — the carousel slide is the active media.
            const carouselIsOnExtraSlide = index === activeVideoRef.current && activeCarouselSlideRef.current > 0;
            if (!isSameFirstVideo && !carouselIsOnExtraSlide) {
              video.currentTime = 0;
              if (activeAdIndex !== index && !shouldBlockInitialAutoplay && !feedLockedRef.current) {
                // Solo marcamos "reproduciendo" cuando DE VERDAD vamos a reproducir.
                // Antes syncFeedPlaybackState(false) corría también con el candado
                // puesto → algún efecto arrancaba el video un instante (destello de
                // ~100ms) hasta que el guard lo pausaba. Ahora con candado NO se
                // marca como reproduciendo → el video queda quieto desde el inicio.
                syncFeedPlaybackState(false);
                video.play().catch(() => {/* Autoplay ignored */ })
              } else {
                video.pause()
              }
            }
            // When scrolling away from a carousel video, reset its slide to 0
            if (activeVideoRef.current !== null && activeVideoRef.current !== index) {
              activeCarouselSlideRef.current = 0;
            }
            activeVideoRef.current = index;
            setActiveVideo(index)
            setActiveOptionsVideoId(null)
            // Reset loop count for this video when it comes into view
            const vidId = mergedFeed[index]?.type === 'video' ? mergedFeed[index].id?.toString() : `ad-${mergedFeed[index].id}`;
            if (vidId) {
              setVideoLoopCount(prev => ({ ...prev, [vidId]: 0 }));
              lastVideoTimeRef.current[vidId] = 0;
            }
          } else {
            // Track leaving view
            if (videoItem && videoItem.type === 'video') {
              onIntersectionChange(videoItem.id, false, videoItem.category || null);
            }
            // Pause the video and its music track immediately when leaving view.
            // The active-video useEffect will resume the correct audio for the new video.
            video.pause();
            musicAudioRef.current?.pause();
          }
        })
      },
      // threshold 0.3: el video se considera "activo" y arranca cuando solo el
      // 30% está visible (no el 60%), así reproduce mucho antes durante el desliz.
      // rootMargin vertical: pre-dispara el play un poco antes de que entre en
      // pantalla, eliminando el frame congelado al cambiar de video.
      { threshold: 0.3, rootMargin: "20% 0px" },
    )
    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video)
    })
    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video)
      })
    }
    // windowStart/windowEnd: al deslizar la ventana se montan nuevos <video>;
    // re-crear el observer asegura que esos slides recién montados se observen.
  }, [mergedFeed, activeAdIndex, onIntersectionChange, windowStart, windowEnd])
  // --- Pause the feed (video + music) whenever a story surface is open ---
  // Covers story viewing and the story editor modal.
  // Without pausing musicAudioRef too, the feed track kept playing over the modal.
  useEffect(() => {
    const storyOpen = viewingStoryUserIndex !== null || storyEditorFile !== null;
    if (storyOpen) {
      videoRefs.current.forEach((video) => {
        if (video && !video.paused) video.pause();
      });
      musicAudioRef.current?.pause();
      setIsGridVideoPlaying({});
    } else {
      // Returned to the feed — resume the active video (and its music) unless the
      // user had it manually paused.
      if (!videosPausedRef.current && activeVideoRef.current !== null) {
        const v = videoRefs.current[activeVideoRef.current];
        if (v && v.paused) v.play().catch(() => {});
      }
    }
  }, [viewingStoryUserIndex, storyEditorFile]);
  // Tap vs scroll: guardamos dónde empezó el toque. En onTouchEnd, si el dedo se
  // movió más que TAP_SLOP px (o tardó demasiado), es un SCROLL → no es un tap de
  // play/pausa. Así NUNCA llamamos preventDefault durante el scroll (eso disparaba
  // el warning [Intervention] y entorpecía el momentum del scroll nativo, que es
  // justo lo que impide el feel "tipo TikTok").
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const TAP_SLOP = 12;     // px de tolerancia de movimiento para seguir siendo "tap"
  const TAP_MAX_MS = 400;  // un tap es rápido; más que esto es un gesto/scroll

  const handleVideoTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchStartRef.current = t ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
  };

  const handleVideoTouchEnd = (index: number) => (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const movedX = Math.abs(t.clientX - start.x);
    const movedY = Math.abs(t.clientY - start.y);
    const elapsed = Date.now() - start.t;
    // Si se movió o tardó demasiado, fue scroll → dejamos pasar el gesto nativo.
    if (movedX > TAP_SLOP || movedY > TAP_SLOP || elapsed > TAP_MAX_MS) return;
    // Es un tap real. NO preventDefault: no hace falta y rompe el scroll.
    handleVideoClick(index);
  };

  const handleVideoClick = (index: number) => {
    if (isPlayTransitioningRef.current) return;
    const now = Date.now();
    if (now - lastClickTimestamp.current < 800) return;
    lastClickTimestamp.current = now;
    if (activeAdIndex !== null) return;

    // ── MODO ExoPlayer nativo: el candado/tap controla el video NATIVO ──────────
    if (exoActiveRef.current) {
      hasUserInteracted.current = true;
      // Primer tap: quitar el candado y reproducir. Taps siguientes: toggle.
      const wasLocked = feedLockedRef.current;
      if (wasLocked) { feedLockedRef.current = false; setFeedLocked(false); }
      const nextPaused = wasLocked ? false : !exoPausedRef.current;
      exoPausedRef.current = nextPaused;
      setExoPaused(nextPaused);
      syncFeedPlaybackState(nextPaused);
      BuzzyVideoFeed.setPaused({ paused: nextPaused }).catch(() => {});
      // Al QUITAR el candado por primera vez: arrancar la música nativa del video
      // activo (estaba bloqueada por feedLocked). En toggle no hace falta (la música
      // ya está cargada; setPaused la pausa/reanuda con el video).
      if (wasLocked) applyNativeMusic(mergedFeedRef.current[activeVideoRef.current ?? index]);
      return;
    }

    const videoElement = videoRefs.current[index];
    if (!videoElement) return;

    hasUserInteracted.current = true;

    // Unlock audio context on first user gesture
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      setIsAudioUnlocked(true);
      const howlerCtx = (Howler as any).ctx as AudioContext | undefined;
      if (howlerCtx && howlerCtx.state === "suspended") {
        howlerCtx.resume().catch(() => {});
      }
    }

    // First tap on a locked feed just unlocks — don't toggle play/pause
    if (feedLockedRef.current) {
      feedLockedRef.current = false;
      setFeedLocked(false);
      if (index === 0) hasPlayedFirstVideo.current = true;
      syncFeedPlaybackState(false);
      isPlayTransitioningRef.current = true;
      videoElement.play().catch(() => {}).finally(() => { isPlayTransitioningRef.current = false; });
      return;
    }

    // Decide intent from the live <video> state only. videosPausedRef is React
    // mirror state that can lag behind the element (and behind a pending play()
    // promise), so OR-ing it in caused the 3rd tap to misread the state.
    const isCurrentlyPaused = videoElement.paused;

    if (isCurrentlyPaused) {
      // Resume. The music track is started/stopped by the <video> "play"/"pause"
      // listeners (see ensureAudioForTrack effect), so we do NOT start it here —
      // doing so let the music play even when play() was rejected/interrupted,
      // which is exactly the "only music, video frozen" bug.
      if (index === 0) hasPlayedFirstVideo.current = true;
      isPlayTransitioningRef.current = true;
      videoElement.play()
        .then(() => { syncFeedPlaybackState(false); })
        .catch(() => { syncFeedPlaybackState(true); })
        .finally(() => { isPlayTransitioningRef.current = false; });
    } else {
      // Pause. onPause handler + the pauseAudio listener stop the music track.
      syncFeedPlaybackState(true);
      videoElement.pause();
    }
  };
  const handleShareVideo = async (videoUrl: string, description?: string) => {
    setActiveOptionsVideoId(null);
    setShareSent({});
    setShareSearch('');
    setShareModal({ videoId: '', videoUrl, description: description || '' });
    // Cargar contactos (chats existentes)
    try {
      const res = await apiClient.get('/api/chats/');
      const chats = res.data?.chats ?? res.data ?? [];
      setShareContacts(Array.isArray(chats) ? chats : []);
    } catch { setShareContacts([]); }
  };

  const handleSendShareToContact = async (chatUuid: string) => {
    if (!shareModal || shareSending) return;
    setShareSending(chatUuid);
    try {
      const form = new FormData();
      form.append('chat_uuid', chatUuid);
      form.append('content', shareModal.videoUrl);
      form.append('message_type', 'text');
      await apiClient.post('api/chats/send/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShareSent(prev => ({ ...prev, [chatUuid]: true }));
    } catch { /* silent */ }
    finally { setShareSending(null); }
  };

  const handleDownloadVideo = async (videoUrl: string, videoId: string) => {
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buzzy_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // fallback: abrir en nueva pestaña
      window.open(videoUrl, '_blank');
    }
    setActiveOptionsVideoId(null);
  };

  const handleSaveClick = (videoId: string) => {
    const isSaved = savedMap[videoId];
    setSavedMap(prev => ({ ...prev, [videoId]: !isSaved }));
    if (isSaved) {
      unsaveVideo(videoId)(dispatch as any);
    } else {
      saveVideo(videoId)(dispatch as any);
    }
  };

  const handleLikeClick = (videoId: string, index: number) => {
    // Feedback háptico inmediato al tocar (se siente nativo). No-op en web.
    tapHaptic(ImpactStyle.Light);
    // Record interaction for recommendation system
    const videoItem = mediaVideo?.[index];
    if (videoItem) {
      recordInteraction(videoItem.category || null);
    }

    // Optimistic update — flip liked state immediately without touching mediaVideo
    setLikeOverrides(prev => {
      const current = prev[videoId];
      const currentLiked = current ? current.liked : (mediaVideo?.find(v => String(v.id) === videoId)?.liked ?? false);
      const currentCount = current ? current.like_count : (mediaVideo?.find(v => String(v.id) === videoId)?.like_count ?? 0);
      return {
        ...prev,
        [videoId]: { liked: !currentLiked, like_count: currentLiked ? currentCount - 1 : currentCount + 1 },
      };
    });

    createLike({ video_id: videoId })(dispatch).catch((error: any) => {
      console.error("Error dispatching like action for video ID:", videoId, error);
    });
    setShowLikeAnimation((prev) => ({
      ...prev,
      [videoId]: true,
    }));
    setTimeout(() => {
      setShowLikeAnimation((prev) => ({
        ...prev,
        [videoId]: false,
      }));
    }, 450);
  };
  const toggleMute = () => setIsMuted(!isMuted)
  // --- Logic for Create History ---
  const openStoryEditor = (file: File) => {
    // Pause feed video when story editor opens
    videoRefs.current.forEach(v => { if (v && !v.paused) v.pause(); });
    musicAudioRef.current?.pause();
    setStoryEditorFile(file);
  }

  const handlePickStoryFromLibrary = async () => {
    const picked = await pickMedia("any", 50);
    if (!picked) return;
    openStoryEditor(picked.file);
  }

  const handleCaptureStoryPhoto = async () => {
    const picked = await pickMedia("image", 50, "camera");
    if (!picked) return;
    openStoryEditor(picked.file);
  }

  // const handleCaptureStoryVideo = async () => {
  //   const picked = await pickMedia("video", 50, "camera");
  //   if (!picked) return;
  //   openStoryEditor(picked.file);
  // }

  const handleStoryPublish = async (
    file: File,
    caption: string,
    music?: any,
    filterCss?: string,
    textLayers: any[] = [],
    stickerLayers: any[] = [],
    location?: string,
    stickerFiles: { id: string; file: File }[] = [],
    privacy: 'public' | 'subscribers' = 'public',
  ) => {
    setIsUploadingStory(true);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', caption || '');
    formData.append('privacy', privacy);
    if (filterCss && filterCss !== "none") {
      formData.append('filter_css', filterCss);
    }
    // Strip blob/base64 src from image and video stickers — backend will receive them as files
    const stickerLayersClean = stickerLayers.map(l =>
      (l.kind === "image" || l.kind === "video") ? { ...l, src: "" } : l
    );
    formData.append('text_layers', JSON.stringify(textLayers));
    formData.append('sticker_layers', JSON.stringify(stickerLayersClean));
    // Upload sticker image files with id-prefixed filenames so backend can map them
    for (const { id, file: sf } of stickerFiles) {
      const ext = sf.name.split(".").pop() || "png";
      formData.append('sticker_files', sf, `${id}__sticker.${ext}`);
    }
    if (location) {
      formData.append('location', location);
    }
    if (music) {
      formData.append('audio_track_url', music.track.audio_url);
      formData.append('audio_track_title', music.track.title);
      formData.append('audio_track_artist', music.track.artist);
      formData.append('audio_volume_music', String(music.volume_music));
      formData.append('audio_trim_start', String(music.trim_start));
      formData.append('audio_trim_end', String(music.trim_end));
    }
    try {
      await createStory(formData)(dispatch);
      setStoryEditorFile(null);
    } catch (error) {
      console.error("Error creando la historia:", error);
      setFeedbackModal({ show: true, success: false, message: "Error al subir la historia. Inténtalo de nuevo." });
    } finally {
      setIsUploadingStory(false);
    }
  }
  // --- Story Viewer Logic ---
  const handleStoryClick = (index: number) => {
    const groupUserId = groupedStories[index]?.user?.id;
    if (groupUserId) {
      const mediaLength = groupedStories[index].media.length;
      setGroupProgresses(prev => ({
        ...prev,
        [groupUserId]: new Array(mediaLength).fill(0)
      }));
    }

    setViewingStoryUserIndex(index);
    setCurrentStoryItemIndex(0);
    setIsStoryPaused(false);
  };

  // ── Publicar las historias al header global (Navar) ──────────────────────
  // El header (componente compartido) lee de useHeaderStoriesStore y renderiza
  // la fila de historias. Aquí el home publica sus datos; al desmontarse, los
  // limpia para que el header no muestre historias fuera del feed.
  useEffect(() => {
    useHeaderStoriesStore.getState().setStoriesData({
      enabled: true,
      currentUser: user
        ? { id: (user as any).id, username: (user as any).username, profile_picture: (user as any).profile_picture }
        : null,
      isUploading: isUploadingStory,
      groups: groupedStories as any,
      onStoryClick: handleStoryClick,
      onAddStory: () => {},
      onPickStoryFromLibrary: handlePickStoryFromLibrary,
      onCaptureStoryPhoto: handleCaptureStoryPhoto,
    });
  }, [groupedStories, user, isUploadingStory, handlePickStoryFromLibrary, handleCaptureStoryPhoto]);

  useEffect(() => {
    return () => useHeaderStoriesStore.getState().reset();
  }, []);

  const closeStoryViewer = useCallback(() => {
    stopStoryAudio(true);
    setViewingStoryUserIndex(null);
    const shouldBlockInitialAutoplay = activeVideo === 0 && !hasUserInteracted.current && !hasLeftInitialVideoRef.current;
    if (activeVideo !== null && !shouldBlockInitialAutoplay) {
      const v = videoRefs.current[activeVideo];
      if (v && v.paused) v.play().catch(() => {});
    }
    setCurrentStoryItemIndex(0);
    setGroupProgresses({});
    setIsStoryPaused(false);
    setShowOptionsModal(false);
    setIsSwitchingUser(false);
    setIncomingUser(null);
    setTransitionDirection(null);
    setShowViewersModal(false);
    setRealViewers([]);
    setShowGiftMenu(false);
    setShowFullGiftMenu(false);
    setGiftAnimation(null);
  }, [activeVideo, stopStoryAudio]);
  const getCurrentProgress = useMemo(() => {
    if (viewingStoryUserIndex === null) return [];
    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) return [];
    const userId = currentGroup.user.id;
    return groupProgresses[userId] || new Array(currentGroup.media.length).fill(0);
  }, [viewingStoryUserIndex, groupedStories, groupProgresses]);

  const updateProgress = useCallback((newProgress: number[]) => {
    if (viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) return;
    const userId = currentGroup.user.id;
    setGroupProgresses(prev => ({
      ...prev,
      [userId]: newProgress
    }));
  }, [viewingStoryUserIndex, groupedStories]);

  // Ref para throttling de actualizaciones de progreso
  const lastProgressUpdate = useRef<number>(0);
  const progressUpdateInterval = 100; // Actualizar solo cada 100ms (10 veces por segundo en lugar de ~30)

  const handleStoryVideoProgress = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isStoryPaused || isSwitchingUser) return;

    const now = Date.now();
    // Throttle: solo actualizar si ha pasado el intervalo
    if (now - lastProgressUpdate.current < progressUpdateInterval) {
      return;
    }
    lastProgressUpdate.current = now;

    const video = e.currentTarget;
    const progress = video.currentTime / video.duration;
    if (!isNaN(progress) && viewingStoryUserIndex !== null) {
      const currentProgress = getCurrentProgress;
      // Solo actualizar si el cambio es significativo (más de 1%)
      const currentItemProgress = currentProgress[currentStoryItemIndex] || 0;
      const progressDiff = Math.abs(progress - currentItemProgress);

      if (progressDiff > 0.01 || progress >= 1) { // Actualizar si cambio > 1% o si está completo
        const np = [...currentProgress];
        np[currentStoryItemIndex] = Math.min(progress, 1);
        updateProgress(np);
      }
    }
  }, [viewingStoryUserIndex, currentStoryItemIndex, isStoryPaused, isSwitchingUser, getCurrentProgress, updateProgress]);
  // useEffect(()=>{
  //   getRecivedGiftByUser(currentMediaUuid)(dispatch)
  // }, [currentMediaUuid])
  const handleTogglePause = useCallback(() => {
    setIsStoryPaused(prev => {
      const newPaused = !prev;
      if (storyVideoRef.current) {
        if (newPaused) {
          storyVideoRef.current.pause();
        } else {
          storyVideoRef.current.play().catch(console.error);
        }
      }
      return newPaused;
    });
  }, []);


  const handleNextStory = useCallback(() => {
    if (viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) {
      closeStoryViewer();
      return;
    }
    // --- Fixed: Create viewStory for the current media item UUID ---
    const currentMediaUuid = currentGroup.media[currentStoryItemIndex]?.id;
    if (currentMediaUuid && !viewedItems[currentMediaUuid]) {
      viewStory({ story_uuid: currentMediaUuid })(dispatch).then(() => {
        setViewedItems(prev => ({ ...prev, [currentMediaUuid]: true }));
      }).catch((err: any) => {
        console.error("Error creating viewStory:", err);
      });
    }
    const next_media_uuid = currentGroup.media[currentStoryItemIndex + 1]?.id;
    if (next_media_uuid && user.id == currentGroup.user?.id) {
      getRecivedGiftByUser(next_media_uuid)(dispatch).then((res) => {
        if (res && Array.isArray(res)) {
          setIsGift(res);
        }
      })
    }



    if (currentStoryItemIndex < currentGroup.media.length - 1) {
      // Next in same group
      const currentProgress = getCurrentProgress;
      const np = [...currentProgress];
      np[currentStoryItemIndex] = 1;
      updateProgress(np);
      setCurrentStoryItemIndex(prev => prev + 1);
    } else {
      // Next group - complete current group and animate transition
      const completeProgress = new Array(currentGroup.media.length).fill(1);
      updateProgress(completeProgress);
      if (viewingStoryUserIndex < groupedStories.length - 1) {
        const nextIndex = viewingStoryUserIndex + 1;
        const nextGroup = groupedStories[nextIndex];
        setIncomingUser(nextGroup.user);
        setTransitionDirection('next');
        setIsSwitchingUser(true);
        setIsStoryPaused(true);
        setTimeout(() => {
          setGroupProgresses(prev => ({
            ...prev,
            [nextGroup.user.id]: new Array(nextGroup.media.length).fill(0)
          }));
          setViewingStoryUserIndex(nextIndex);
          setCurrentStoryItemIndex(0);
          setIsSwitchingUser(false);
          setIncomingUser(null);
          setTransitionDirection(null);
          setIsStoryPaused(false);
        }, 500);
      } else {
        closeStoryViewer();
      }
    }
    setIsStoryPaused(false);
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories, getCurrentProgress, updateProgress, closeStoryViewer, viewedItems, dispatch]);

  const handlePrevStory = useCallback(() => {
    if (viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) {
      closeStoryViewer();
      return;
    }
    // --- Fixed: Create viewStory for the current media item UUID when going prev ---
    const currentMediaUuid = currentGroup.media[currentStoryItemIndex]?.uuid;
    if (currentMediaUuid && !viewedItems[currentMediaUuid]) {
      viewStory({ story_uuid: currentMediaUuid })(dispatch).then(() => {
        setViewedItems(prev => ({ ...prev, [currentMediaUuid]: true }));
      }).catch((err: any) => {
        console.error("Error creating viewStory:", err);
      });
    }
    if (currentStoryItemIndex > 0) {
      // Prev in same group - reset target to 0, keep leaving as is
      const currentProgress = getCurrentProgress;
      const np = [...currentProgress];
      np[currentStoryItemIndex - 1] = 0;
      updateProgress(np);
      setCurrentStoryItemIndex(prev => prev - 1);
    } else {
      // Prev group - animate transition
      if (viewingStoryUserIndex > 0) {
        const prevUserIndex = viewingStoryUserIndex - 1;
        const prevGroup = groupedStories[prevUserIndex];
        const prevUserId = prevGroup.user.id;
        const prevLength = prevGroup.media.length;
        setIncomingUser(prevGroup.user);
        setTransitionDirection('prev');
        setIsSwitchingUser(true);
        setIsStoryPaused(true);
        setTimeout(() => {
          const prevProgress = new Array(prevLength).fill(1);
          prevProgress[prevLength - 1] = 0;
          setGroupProgresses(prev => ({
            ...prev,
            [prevUserId]: prevProgress
          }));
          setViewingStoryUserIndex(prevUserIndex);
          setCurrentStoryItemIndex(prevLength - 1);
          setIsSwitchingUser(false);
          setIncomingUser(null);
          setTransitionDirection(null);
          setIsStoryPaused(false);
        }, 500);
      }
    }
    setIsStoryPaused(false);
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories, getCurrentProgress, updateProgress, closeStoryViewer, viewedItems, dispatch]);


  const isOwner = viewingStoryUserIndex !== null && user.username === groupedStories[viewingStoryUserIndex]?.user.username;
  const handleReport = () => {
    setShowOptionsModal(false);
    setShowReportSheet(true);
  };

  const handleReportReason = async (reason: ReportPayload["reason"]) => {
    if (reportLoading || viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    const storyUuid = currentGroup?.uuid;
    if (!storyUuid) return;
    setReportLoading(true);
    const result = await reportStory(storyUuid, { reason })(dispatch);
    setReportLoading(false);
    setShowReportSheet(false);
    setFeedbackModal({ show: true, success: result.success, message: result.message });
  };

  const handleDelete = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteLoading || viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    const storyUuid = currentGroup?.uuid;
    if (!storyUuid) return;
    setDeleteLoading(true);
    await deleteStory(storyUuid)(dispatch);
    setDeleteLoading(false);
    setShowDeleteConfirm(false);
    setStories((prev) => prev.filter((s: any) => s.uuid !== storyUuid));
    closeStoryViewer();
  };
  const handleCloseViewers = () => setShowViewersModal(false);
  const handleEyeClick = () => {
    if (isOwner && viewingStoryUserIndex !== null) {
      const currentGroup = groupedStories[viewingStoryUserIndex];
      const currentMediaUuid = currentGroup.media[currentStoryItemIndex]?.id;
      if (currentMediaUuid) {
        getStoryViewers(currentMediaUuid)(dispatch).then((res: any) => {
          setRealViewers(Array.isArray(res) ? res : []);
        });

        getRecivedGift(currentMediaUuid)(dispatch).then((res: any) => {
          if (Array.isArray(res)) {
            const mapped = res.map((g: any) => ({
              type: g.gift_type || g.type,
              gift: g.gift_video_url || g.gift,
              uuid: g.uuid,
              sender: g.sender_username || g.sender,
              amount: g.quantity || 1,
              giftId: g.uuid,
            }));
            setGiftRecived(mapped);
          }
        })

      }
      setShowViewersModal(true);
    }
  };

  const [storyLikedStates, setStoryLikedStates] = useState<{ [key: string]: boolean }>({});
  const [storyLikeCounts, setStoryLikeCounts] = useState<{ [key: string]: number }>({});
  const [showStoryLikeAnimation, setShowStoryLikeAnimation] = useState<{ [key: string]: boolean }>({});
  const [storyReplyText, setStoryReplyText] = useState("")
  const [storyReplySending, setStoryReplySending] = useState(false)

  const [, setGifts] = useState<GiftI[]>([]);

  const handleLikeStory = useCallback(() => {
    if (viewingStoryUserIndex === null) return;
    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) return;
    const currentMedia = currentGroup.media[currentStoryItemIndex];
    const storyId = currentMedia?.id;
    if (!storyId) return;
    // Optimistic local update
    const currentLiked = storyLikedStates[storyId] || false;
    const newLiked = !currentLiked;
    const currentCount = storyLikeCounts[storyId] || 0;
    const newCount = newLiked ? currentCount + 1 : currentCount - 1;
    setStoryLikedStates(prev => ({ ...prev, [storyId]: newLiked }));
    setStoryLikeCounts(prev => ({ ...prev, [storyId]: newCount }));
    setShowStoryLikeAnimation(prev => ({ ...prev, [storyId]: true }));
    setTimeout(() => {
      setShowStoryLikeAnimation(prev => ({ ...prev, [storyId]: false }));
    }, 450);
    // Dispatch action
    likeStory({ story_uuid: storyId })(dispatch).then((res: any) => {
      // Update from response if available
      if (res && res.like_count !== undefined && res.liked !== undefined) {
        setStoryLikeCounts(prev => ({ ...prev, [storyId]: res.like_count }));
        setStoryLikedStates(prev => ({ ...prev, [storyId]: res.liked }));
      }
    }).catch((error: any) => {
      // Revert on error
      setStoryLikedStates(prev => ({ ...prev, [storyId]: currentLiked }));
      setStoryLikeCounts(prev => ({ ...prev, [storyId]: currentCount }));
      console.error("Error liking story:", error);
    });
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories, storyLikedStates, storyLikeCounts, dispatch]);
  // --- Gift System Logic ---
  const currentStoryUuid = useMemo<string | null>(() => {
    if (viewingStoryUserIndex === null) return null;

    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup?.media || !Array.isArray(currentGroup.media)) return null;

    const currentMedia = currentGroup.media[currentStoryItemIndex];
    return currentMedia?.id ?? null;
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories]);

  // Mantener ref sincronizado para usarlo en handlers WS sin TDZ
  useEffect(() => {
    currentStoryUuidRef.current = currentStoryUuid;
  }, [currentStoryUuid]);

  const handleStoryReply = async () => {
    if (!storyReplyText.trim() || storyReplySending || viewingStoryUserIndex === null) return
    const currentGroup = groupedStories[viewingStoryUserIndex]
    const recipientId = currentGroup?.user?.id
    if (!recipientId) return
    const currentMedia = currentGroup?.media?.[currentStoryItemIndex]
    const storyMediaUrl = currentMedia?.file ?? null
    const storyUuid = currentMedia?.id ?? null
    const storyAudioUrl = currentGroup?.audio_track_url ?? null
    setStoryReplySending(true)
    try {
      const { apiClient } = await import("../../redux/client/api-client")
      const form = new FormData()
      form.append("recipient_id", String(recipientId))
      form.append("content", storyReplyText.trim())
      form.append("message_type", "story_reply")
      if (storyUuid) form.append("story_uuid", String(storyUuid))
      if (storyMediaUrl) form.append("story_media_url", storyMediaUrl)
      if (storyAudioUrl) form.append("story_audio_url", storyAudioUrl)
      await apiClient.post("api/chats/send/", form, { headers: { "Content-Type": "multipart/form-data" } })
      setStoryReplyText("")
    } catch (e) {
      console.error("Error enviando respuesta a historia:", e)
    } finally {
      setStoryReplySending(false)
    }
  }

  const handleGiftClick = () => {
    if (currentStoryUuid) {
      setIsStoryPaused(true);
      if (storyVideoRef.current && !storyVideoRef.current.paused) {
        storyVideoRef.current.pause();
      }
      setShowFullGiftMenu(true);
    }
  };


  useEffect(() => {
    // FIX: Check for null to avoid infinite loop when the list is empty ([])
    if (activeGifts !== null) {
      const mappedGifts = activeGifts.map((gift: any) => ({
        id: gift.id?.toString(),
        name: gift.name,
        emoji: gift.emoji,
        cost: gift.token_price,
        color: "getColorFromSlug(gift.slug)",
        animation: "getAnimationFromSlug(gift.slug)",
        video: getMediaUrl(gift.video),
        slug: gift.slug,
        token_price: gift.token_price || 0,
        is_active: gift.is_active ?? true,
        created_at: gift.created_at || new Date().toISOString(),
      }));
      setFullGifts(mappedGifts);
      setGiftsLoading(false);
    } else {
      // Solo hacer la llamada si no tenemos los gifts en Redux
      const loadRealGifts = async () => {
        try {
          setGiftsLoading(true);
          const response = await getActiveGift()(dispatch);
          const giftsData = Array.isArray(response?.data) ? response.data : [];
          const mappedGifts = giftsData.map((gift: GiftI) => ({
            id: gift?.id?.toString(),
            name: gift.name,
            emoji: gift.emoji,
            cost: gift.token_price,
            color: "getColorFromSlug(gift.slug)",
            animation: "getAnimationFromSlug(gift.slug)",
            video: getMediaUrl(gift.video),
            slug: gift.slug,
            token_price: gift.token_price || 0,
            is_active: gift.is_active ?? true,
            created_at: gift.created_at || new Date().toISOString(),
          }));
          setFullGifts(mappedGifts);
        } catch (error) {
          console.error("Error cargando regalos:", error);
        } finally {
          setGiftsLoading(false);
        }
      };
      loadRealGifts();
    }
  }, [dispatch, activeGifts]);


  // Usar Redux para gifts recibidos por usuario - CON VALIDACIÓN DE PROPIEDAD
  const hasEverLoadedGifts = useRef(false); // ← NUEVO: saber si ya hicimos la primera llamada

  useEffect(() => {
    if (!currentStoryUuid || !user?.id) {
      setIsGift([]);
      return;
    }

    // Si ya cargamos para este story exacto → salir
    if (lastLoadedStoryUuid.current === currentStoryUuid) {
      return;
    }

    const currentStory = stories.find(s => s.uuid === currentStoryUuid);
    const isMyStory = String(currentStory?.user?.id) === String(user.id);

    // CASO 1: Es MI story → siempre permitimos cargar (pueden llegar regalos nuevos)
    if (isMyStory) {
      // Si ya lo cargamos antes, pero queremos permitir recarga si hay nuevos regalos, puedes quitar esta condición o dejarla
      // Aquí lo dejamos siempre cargar si es tuyo (opcional)
      // O si prefieres cachear también los tuyos, quita el return de abajo

      if (loadedGiftsByStoryUuid.current.has(currentStoryUuid)) {
        // Opcional: si quieres que tus stories también se cacheen, deja esto
        // Si quieres que siempre recargue cuando abres tu story, quita este if
        return;
      }
    }
    // CASO 2: NO es mi story
    else {
      // Si ya hicimos la primera llamada en cualquier momento → nunca más cargamos gifts de stories ajenos
      if (hasEverLoadedGifts.current) {
        setIsGift([]);
        lastLoadedStoryUuid.current = currentStoryUuid;
        return;
      }
    }

    // Si llegamos aquí → hacemos la llamada (primera vez o es mi story)

    // Marcar que ya hicimos al menos una llamada (solo para stories ajenos)
    if (!isMyStory) {
      hasEverLoadedGifts.current = true;
    }

    loadedGiftsByStoryUuid.current.add(currentStoryUuid);
    lastLoadedStoryUuid.current = currentStoryUuid;

    getRecivedGiftByUser(currentStoryUuid)(dispatch)
      .then((res) => {
        if (res && Array.isArray(res)) {
          setIsGift(res);
          // giftRecived(res)
        } else {
          setIsGift([]);
        }
      })
      .catch((error) => {
        console.error("Error al cargar regalos:", error);
        setIsGift([]);
        loadedGiftsByStoryUuid.current.delete(currentStoryUuid);
        if (lastLoadedStoryUuid.current === currentStoryUuid) {
          lastLoadedStoryUuid.current = null;
        }
        // Si falla la primera llamada, permitimos reintento
        if (!isMyStory) {
          hasEverLoadedGifts.current = false;
        }
      });

  }, [currentStoryUuid, user?.id, stories, dispatch]);

  const handleCategoryClick = useCallback((giftType: string, amount: number) => {
    if (giftType === 'support') {
      // Usar Redux si ya tenemos los gifts, sino hacer la llamada
      if (activeGifts && activeGifts.length > 0) {
        setGifts(activeGifts);
      } else {
        getActiveGift()(dispatch).then((res) => {
          setGifts(res?.data as GiftI[]);
        });
      }
      setShowGiftMenu(false);
      setShowFullGiftMenu(true);
    } else {
      // For other categories, send the gift immediately
      handleSendGift(giftType, amount);
    }
  }, [activeGifts, dispatch]);
  let countSendGift = useRef(false)
  const handleSendGift = async (giftTypeOrGift: string | GiftI, amount?: number) => {
    let type: string | null = null;
    let cost: string | number | null = null
    if (typeof giftTypeOrGift === 'string') {
      type = giftTypeOrGift;
      cost = amount || 0;
    } else {
      type = giftTypeOrGift.emoji;
      cost = giftTypeOrGift.token_price;
    }

    if (cost !== null && cost !== undefined && walletTokens < Number(cost)) {
      setShowFullGiftMenu(false);
      setShowGiftMenu(false);
      setShowTokenShopModal(true);
      return;
    }

    if (!currentStoryUuid) return;
    try {
      if (countSendGift.current == true) {
        setShowFullGiftMenu(false);
        return
      }

      countSendGift.current = true
      sendGift({ story_uuid: currentStoryUuid, gift_type: type })(dispatch).then(() => {
        if (cost !== null && cost > 20) {
          setStoryPremiumStates(prev => ({ ...prev, [currentStoryUuid]: true }));
        }
      }).catch((err: any) => {
        console.error("Error sending gift:", err);
        if (err?.response?.data?.insufficient_tokens) {
          setShowFullGiftMenu(false);
          setShowGiftMenu(false);
          setShowTokenShopModal(true);
        }
      }).finally(() => {
        countSendGift.current = false;
      });
      // if (sound) sound.play();
      // El giftAnimation se establecerá cuando se reciba la respuesta del WebSocket
      // No establecer aquí porque no tenemos el video del regalo todavía
      // If high value (e.g., cost > 20), update premium

    } catch (error) {
      console.error("Error dispatching gift:", error);
    }
  };

  const handleVideoGiftClick = (videoId: string | number) => {
    setSelectedVideoForGift(videoId);
    // Pause the video in the feed
    const index = mediaVideo?.findIndex(v => v.id?.toString() === videoId?.toString());
    if (index !== undefined && index !== -1) {
      const videoElement = videoRefs.current[index];
      if (videoElement && !videoElement.paused) {
        videoElement.pause();
        setIsGridVideoPlaying(prev => ({ ...prev, [videoId.toString()]: false }));
      }
    }
    setVideoGiftModalKey(k => k + 1);
    setShowVideoGiftModal(true);
  };
  const sendVideoGiftCount = useRef(false)
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
    if (sendVideoGiftCount.current) return;
    try {
      sendVideoGiftCount.current = true
      await sendVideoGift({ video_id: Number(selectedVideoForGift), gift_type: type })(dispatch);
      setShowVideoGiftModal(false);
    } catch (error) {
      console.error("Error dispatching video gift:", error);
    } finally {
      sendVideoGiftCount.current = false;
    }
  };
  // Preload sounds
  // Preload sounds - SONIDOS REALES Y BRUTALES
  useEffect(() => {
    const soundMap: Record<string, string> = {
      '1': '/sounds/gift.mp3',          // Apoyo básico
      '2': '/sounds/diamond.mp3',       // Diamante
      '3': '/sounds/crown.mp3',         // Corona
      '4': '/sounds/vip.mp3',           // Llave mágica
      '5': '/src/assets/sounds/rosa.wav',          // Rosa
      '6': '/sounds/firework.mp3',      // Estrella fugaz
      '7': '/sounds/rocket.mp3',        // Cohete
      '8': '/sounds/rainbow.mp3',       // Fuego artificial
      '9': '/sounds/butterfly.mp3',     // Mariposa
      '10': '/src/assets/sounds/thunder.mp3',      // Rayo
      '11': '/sounds/lucky.mp3',        // Trébol
      '12': '/sounds/vip.mp3',          // Arcoíris
      'support': '/sounds/coin.mp3',
    }

    Object.entries(soundMap).forEach(([id, url]) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.volume = 0.7
      audioRefs.current[id] = audio
    })
  }, [])
  const giftsSentByThisViewer = useCallback((viewer: any) => {
    return giftRecived?.filter((gift: any) =>
      gift.sender === viewer.username || gift.sender === viewer.user_id
    ) || [];
  }, [giftRecived]);


  const claimAndShowGift = (g: any, senderUsername: string) => {
    setGiftRecived(prev => (prev || []).filter((gift: any) => gift.uuid !== g.uuid));
    setIsGift(prev => (prev || []).filter((gift: any) => gift.uuid !== g.uuid));
    setViewerGiftReady(false);

    if (g.uuid) {
      apiClient.post('/api/stories/gifts/mark-seen/', { uuid: g.uuid })
        .then(() => apiClient.get('/api/get-wallet/'))
        .then(res => dispatch({ type: 'SUCCEES_GET_WALLET', payload: res.data }))
        .catch(() => {});
    }

    // Reproducción directa por streaming: el <video> del overlay usa
    // getMediaUrl(viewerGiftOverlay.gift_video) y arranca apenas llegan los
    // primeros bytes, sin descargar el archivo completo (sin freeze de ~1s).
    if (viewerGiftBlobRef.current) {
      URL.revokeObjectURL(viewerGiftBlobRef.current);
      viewerGiftBlobRef.current = null;
    }
    setViewerGiftOverlay({ gift_video: g.gift, gift_type: g.type, sender: senderUsername, uuid: g.uuid });
  };

  const showGiftRecived = (viewer: any) => {
    const gifts = giftRecived?.filter((gift: any) =>
      gift.sender === viewer.username || gift.sender === viewer.user_id
    ) || [];

    if (gifts.length > 0) {
      claimAndShowGift(gifts[0], viewer.username);
    }
  }

  const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const previousScrollTop = lastFeedScrollTopRef.current;
    const scrollDelta = currentScrollTop - previousScrollTop;

    if (currentScrollTop <= 8) {
      // setShowStoriesBar(true);
    } else if (scrollDelta > 6) {
      // setShowStoriesBar(false);
    } else if (scrollDelta < -6) {
      // setShowStoriesBar(true);
    }

    lastFeedScrollTopRef.current = currentScrollTop;
  };


  return (
    <>
    <div className={`relative min-h-dvh overflow-hidden text-white font-sans ${exoActive ? '' : 'bg-black'}`}>
      {/* Story Editor */}
      <AnimatePresence>
        {storyEditorFile && (
          <StoryEditor
            file={storyEditorFile}
            onPublish={handleStoryPublish}
            onClose={() => {
              setStoryEditorFile(null);
              // Resume feed video when story editor closes
              const shouldBlockInitialAutoplay = activeVideo === 0 && !hasUserInteracted.current && !hasLeftInitialVideoRef.current;
              if (activeVideo !== null && !shouldBlockInitialAutoplay) {
                const v = videoRefs.current[activeVideo];
                if (v && v.paused) v.play().catch(() => {});
                if (musicAudioRef.current?.paused) musicAudioRef.current?.play().catch(() => {});
              }
            }}
            isUploading={isUploadingStory}
          />
        )}
      </AnimatePresence>

      {/* Fondo fijo: negro sólido. Antes había un blob con `blur-3xl
          animate-float-delayed` (blur enorme + animación continua). En el WebView
          de Android un blur animado permanente consume GPU y compite con la
          composición de la surface de video → contribuye al jank/tiling del feed.
          Como el video ocupa toda la pantalla, ese adorno no se ve: lo quitamos. */}
      {!exoActive && <div className="fixed inset-0 z-0 bg-black" />}
      <main
        ref={mainRef}
        // h-dvh (dynamic viewport height) en vez de h-screen (100vh): en el WebView
        // de Android 100vh es inestable (cambia con las barras del sistema), lo que
        // colapsa la cadena de alturas y hace que el video del feed arranque
        // "mochado" a media pantalla. 100dvh da una base de altura estable.
        className="flex h-dvh w-full flex-col overflow-hidden pt-[5rem] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]"
      >
        <section className="flex-1 min-h-0">
          <div
            ref={feedScrollRef}
            // Con ExoPlayer nativo: el HTML NO scrollea (overflow-hidden). El SWIPE
            // lo reenvía el plugin nativo al ViewPager2 (no necesita pointer-events
            // -none aquí). El TAP de play/pause SÍ lo captura el HTML, por eso NO
            // ponemos pointer-events-none (eso bloqueaba el tap → video pausado).
            className={exoActive
              ? "flex h-full flex-col overflow-hidden"
              : "flex h-full flex-col overflow-y-auto overscroll-y-contain snap-y snap-mandatory"}
            onScroll={handleFeedScroll}
          >
            {/* ── Offline toast ── */}
            {offlineToast && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9200] flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/15 animate-fade-in">
                <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
                </svg>
                <span className="text-xs font-bold text-white/90">Sin conexión</span>
              </div>
            )}
            {/* ── Pull-to-refresh indicator ── */}
            {(isPullRefreshing || pullProgress > 0) && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9100] flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15"
                style={{ opacity: isPullRefreshing ? 1 : pullProgress }}
              >
                <svg
                  className={`w-4 h-4 text-cyan-400 ${isPullRefreshing ? 'animate-spin' : ''}`}
                  style={{ transform: isPullRefreshing ? undefined : `rotate(${pullProgress * 360}deg)` }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs font-bold text-white/70">
                  {isPullRefreshing ? "Actualizando..." : "Suelta para actualizar"}
                </span>
              </div>
            )}
            {/* ── Empty feed state ── */}
            {mediaVideo !== null && mergedFeed.length === 0 && (
              <div className="relative h-full w-full snap-start snap-always flex-shrink-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="text-5xl">🎬</div>
                <h3 className="text-white font-black text-lg">
                  {feedMode === 'following' ? 'No hay publicaciones de seguidos' : 'No hay videos disponibles'}
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  {feedMode === 'following'
                    ? 'Sigue más personas para ver contenido aquí.'
                    : 'Pronto habrá más contenido. Vuelve a intentarlo en un momento.'}
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("buzzy:refresh"))}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-bold hover:bg-cyan-500/30 transition-all"
                >
                  Recargar
                </button>
              </div>
            )}

            {/* ── Loading skeleton ── */}
            {mediaVideo === null && (
              <div className="relative h-full w-full snap-start snap-always flex-shrink-0 flex items-end pb-20 px-3">
                {/* Background shimmer */}
                <div className="absolute inset-0 bg-[#0a0a0a] animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {/* Fake action bar (right side) */}
                <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
                  {[40, 40, 40, 40].map((size, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="rounded-full bg-white/10 animate-pulse"
                        style={{ width: size, height: size }}
                      />
                      <div className="h-2.5 w-6 rounded bg-white/10 animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Fake user info (bottom left) */}
                <div className="relative z-10 flex flex-col gap-2 w-[70%]">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
                  </div>
                  <div className="h-2.5 w-48 rounded bg-white/10 animate-pulse" />
                  <div className="h-2.5 w-36 rounded bg-white/10 animate-pulse" />
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-2.5 w-32 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            {mergedFeed.map((data, index) => {
              const videoId = data.type === 'video' ? data.id?.toString() : `ad-${data.id}`;

              // En modo ExoPlayer nativo: el video y el scroll los maneja el nativo.
              // El HTML solo muestra los BOTONES/overlays del video ACTIVO, fijos
              // encima del video. ANTES renderizábamos SOLO el activo y los demás
              // `hidden` → al cambiar de video se MONTABA/DESMONTABA el slide, y ese
              // remontaje hacía repintar el WebView entero → FLASH NEGRO sobre el
              // video nativo. AHORA mantenemos montados el activo + vecino anterior +
              // siguiente, y solo cambiamos la OPACIDAD (sin remontar) → sin flash.
              const exoActiveIdx = activeVideo ?? 0;
              if (exoActive) {
                // El slide ACTIVO (por ID, fuente de verdad nativa) + sus vecinos
                // quedan MONTADOS. El inactivo se oculta con `visibility:hidden`
                // (NO con opacity ni desmontando):
                //  • `opacity-0` → crea capa GPU que el WebView Android NO repinta →
                //    los números quedaban CONGELADOS.
                //  • desmontar (hidden total) → al volver REMONTA → el WebView repinta
                //    toda la capa → PESTAÑAZO NEGRO sobre el video.
                //  • `visibility:hidden` → NO crea capa congelada, el DOM SÍ se
                //    actualiza, y NO remonta → sin flash Y sin números congelados.
                const isActiveSlide = activeVideoId ? videoId === activeVideoId : index === exoActiveIdx;
                const isNeighbor = Math.abs(index - exoActiveIdx) === 1;
                if (!isActiveSlide && !isNeighbor) {
                  // Lejos del activo: vacío real (no cuesta).
                  return <div key={videoId} data-feed-index={index} className="hidden" />;
                }
              } else if (index < windowStart || index > windowEnd) {
                // Virtualización normal (modo WebView): placeholder fuera de ventana.
                return (
                  <div
                    key={videoId}
                    data-feed-index={index}
                    className="relative h-full w-full min-h-full snap-start snap-always flex-shrink-0"
                  />
                );
              }

              // ¿Es el video ACTIVO? En exo se decide por ID (el índice podía
              // desfasarse del nativo → botones/label/candado del video equivocado).
              // En web, por índice. Reemplaza todos los viejos `activeVideo === index`.
              const isActiveVideo = exoActive
                ? (activeVideoId ? videoId === activeVideoId : activeVideo === index)
                : activeVideo === index;

              const isExpanded = expandedDescriptions[videoId];
              // While an ad plays on this slide, hide ALL the video's own UI
              // (like/comment/gift/avatar/music/progress/description/dots…) so the
              // ad shows clean with only its own buttons.
              const adActive = activeAdIndex === index;

              const renderDescriptionWithMentions = (description: string, truncate = false) => {
                if (!description) {
                  return { content: [], needsTruncation: false };
                }
                const maxChars = 47;
                let displayDescription = description;
                let needsTruncation = false;

                if (truncate && description.length > maxChars) {
                  displayDescription = description.substring(0, maxChars);
                  needsTruncation = true;
                }

                const regex = /(@[a-zA-Z0-9_]+)/g;
                const parts = displayDescription.split(regex);

                const content = parts.map((part: string, i: number) => {
                  if (part.match(regex)) {
                    const username = part.substring(1);
                    return (
                      <span
                        key={`mention-${index}-${i}`}
                        className="text-[#00f0ff] font-semibold hover:text-white transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${username}`);
                        }}
                      >
                        {part}
                      </span>
                    );
                  } else {
                    return <span key={`text-${index}-${i}`}>{part}</span>;
                  }
                });

                return { content, needsTruncation };
              };

              const fullContent = renderDescriptionWithMentions(data.description || "", false).content;

              if (data.type === 'ad') {
                return (
                  <div
                    key={`ad-${data.id}`}
                    className="relative h-full min-h-full snap-start snap-always"
                  >
                    <AdCard
                      ad={data}
                      isVisible={activeVideo === index}
                      isMuted={isMuted}
                      toggleMute={toggleMute}
                    />
                    <video
                      ref={(el) => { if (el) videoRefs.current[index] = el }}
                      className="hidden"
                    />
                  </div>
                );
              }

                return (
                  <div
                    key={videoId}
                    // En modo exo: slide FIJO encima del video nativo, mostrando solo
                    // los botones/avatar del activo. Empieza DEBAJO del navbar (top =
                    // --feed-top-inset, la misma altura que el margen del video nativo)
                    // para que el avatar del autor (top-2 del slide) NO quede tapado.
                    // Los vecinos quedan MONTADOS pero invisibles (opacity-0) → cambiar
                    // de video es un toggle de opacidad, NO un remontaje (sin flash).
                    // En modo WebView: parte del scroll con snap.
                    className={exoActive
                      ? `absolute left-0 right-0 bottom-0 w-full ${(isActiveVideo && !feedScrolling) ? '' : 'pointer-events-none'}`
                      : "relative h-full min-h-full w-full snap-start snap-always"}
                    // OJO (causa de "video por cuadritos" en WebView Android):
                    //  • NADA de `content-visibility:auto` aquí: descarta el render
                    //    del slide fuera de viewport y, al volver con el scroll, lo
                    //    RE-PINTA progresivamente tile por tile sobre la surface del
                    //    <video> → ese es el tiling. Con video debe renderizarse de
                    //    una sola vez, no diferido.
                    //  • NADA de `transform-gpu`/translateZ aquí: el <video> ya crea
                    //    su propia capa GPU; anidar otra capa multiplica las surfaces
                    //    de composición y fuerza recomposición en cada frame.
                    //  • NADA de `shadow-2xl`: una box-shadow con blur sobre el
                    //    contenedor del video se recalcula en cada frame del scroll
                    //    (y ni se ve, el video ocupa toda la pantalla).
                    // Solo `contain: layout` (sin `paint`) para acotar el reflow sin
                    // recortar/diferir el pintado. En exo, además, `top` baja el slide
                    // debajo del navbar (avatar del autor visible, no tapado).
                    // visibility (no opacity/display): el slide inactivo se oculta SIN
                    // crear capa GPU congelada y SIN remontar → sin números congelados
                    // ni pestañazo negro. El activo (y no scrolleando) es visible.
                    style={exoActive
                      ? { contain: "layout", top: 'var(--feed-top-inset, 0px)',
                          visibility: (isActiveVideo && !feedScrolling) ? 'visible' : 'hidden' } as React.CSSProperties
                      : { contain: "layout" } as React.CSSProperties}
                  >
                  <HorizontalCarousel
                    video={data}
                    feedIndex={index}
                    hideVideos={exoActive}
                    isActive={isActiveVideo}
                    isMuted={isMuted}
                    isExpanded={!!expandedDescriptions[videoId]}
                    isPaused={(exoActive ? exoPaused : videosPaused) && activeVideo === index}
                    adActive={adActive}
                    feedScrollRef={feedScrollRef}
                    onTapToggle={() => {
                      // Tap sobre un slide horizontal → pausar/reanudar el video nativo,
                      // igual que un tap en el video vertical. Reusa handleVideoClick, que
                      // en modo ExoPlayer hace toggle de exoPaused + setPaused nativo (el
                      // player activo es el del slide horizontal en curso).
                      if (activeVideo === index) handleVideoClick(index);
                    }}
                    onHorizontalDrag={(dragging) => {
                      // Cortar el audio nativo (video + música) mientras se arrastra de
                      // lado entre slides del carrusel → sin "feedback" del slide viejo.
                      if (exoActiveRef.current) {
                        BuzzyVideoFeed.setScrollPausing({ pausing: dragging }).catch(() => {});
                      }
                    }}
                    getLiveStats={getLiveStats}
                    onToggleMute={toggleMute}
                    onCarouselAudio={(playing) => {
                      // Belt-and-suspenders: when a slide's track actually starts
                      // (async), make sure the feed music is silenced. Resuming the
                      // feed music is handled by onSlideChange when returning to
                      // slide 0, so we never re-start it here (that caused two tracks
                      // to overlap).
                      if (playing) {
                        musicAudioRef.current?.pause();
                      }
                    }}
                    onLike={(_uuid, id) => createLike({ video_id: id })(dispatch)}
                    onComment={(uuid, id) => {
                      setComments(null)
                      setCurrentVideoId(String(id))
                      currentVideoIdRef.current = String(id)
                      setShowCommentsModal(true)
                      getComment({ video_id: uuid })(dispatch).then((res: any) => {
                        const list = Array.isArray(res) ? res : []
                        setComments(list)
                        // Corregir el contador del badge con la cantidad REAL del
                        // servidor (el comments_count del feed podía venir cacheado/
                        // viejo → "3" cuando en realidad hay 0).
                        const realCount = list.length
                        setMedia(prev => prev ? prev.map(v =>
                          v.id === id ? { ...v, comments_count: realCount } : v
                        ) : prev)
                      })
                    }}
                    onGift={(id) => handleVideoGiftClick(id)}
                    onMoreOptions={() => setActiveOptionsVideoId(videoId)}
                    onSlideChange={(idx, total, slideUrl, slide, nextSlide) => {
                      setCarouselDots(prev => ({ ...prev, [videoId]: { index: idx, total } }));
                      if (activeVideo === index) {
                        activeCarouselSlideRef.current = idx;
                        // MODO ExoPlayer nativo: el carrusel horizontal cambia de slide,
                        // pero el video lo reproduce el nativo. Le pasamos la URL del
                        // slide para que ExoPlayer cambie de video (slide 0 = video del
                        // feed, slide >0 = otros videos del mismo usuario).
                        if (exoActiveRef.current) {
                          if (slideUrl) BuzzyVideoFeed.playUrl({ url: slideUrl }).catch(() => {});
                          // Música nativa del slide actual (PASO 6): cada slide es un
                          // video con su PROPIA canción → applyNativeMusic con el item
                          // del slide (slide 0 = video del feed; slides extra = su música).
                          // CRÍTICO: los slides del carrusel vienen del prefetch (useUserVideos)
                          // y NO pasan por mergedFeed, así que NO traen `type: 'video'`.
                          // applyNativeMusic descarta cualquier item con type !== 'video'
                          // (lo trata como "sin música" → silencia). Por eso la música de
                          // los videos horizontales no se oía. Le inyectamos el type aquí.
                          const slideItem = idx === 0
                            ? mergedFeedRef.current[index]
                            : (slide ? { ...slide, type: 'video' as const } : undefined);
                          applyNativeMusic(slideItem);
                          // PRE-BUFERAR la música del SIGUIENTE slide horizontal → al
                          // llegar suena al instante (baja latencia). Solo si tiene
                          // pista; si no, no-op. El nativo la libera al scroll vertical.
                          if (nextSlide?.audio_track_url && !isMuted) {
                            const ts = Math.max(0, nextSlide.audio_trim_start ?? 0);
                            const teRaw = nextSlide.audio_trim_end;
                            const te = (typeof teRaw === 'number' && isFinite(teRaw) && teRaw > ts) ? teRaw : 0;
                            BuzzyVideoFeed.prefetchMusic({
                              url: nextSlide.audio_track_url, trimStart: ts, trimEnd: te,
                            }).catch(() => {});
                          }
                          return;
                        }
                        // Coordinate the feed (slide 0) audio/video with the carousel.
                        // On an extra slide, the SlideVideo owns playback — fully stop
                        // the feed video AND its music so they don't play on top of the
                        // slide's track ("two songs at once" bug).
                        const feedVideo = videoRefs.current[index];
                        if (idx > 0) {
                          if (feedVideo && !feedVideo.paused) feedVideo.pause();
                          musicAudioRef.current?.pause();
                        } else {
                          // Back on the main slide — resume unless the feed is paused.
                          if (!videosPausedRef.current && feedVideo && feedVideo.paused) {
                            feedVideo.play().catch(() => {});
                          }
                        }
                      }
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden pt-0 group">

                      <div className={`relative h-full w-full overflow-hidden ${exoActive ? '' : 'bg-black'}`}>
                        {data.media_type === 'image' ? (
                          <img
                            src={data.video?.startsWith("http") ? data.video : getMediaUrl(data.video)}
                            className="h-full w-full object-cover border-[#00f0ff]/5"
                            alt=""
                            loading="lazy"
                          />
                        ) : exoActive ? (
                          // ExoPlayer nativo activo: NO renderizamos el <video> ni el
                          // thumbnail HTML, ni ref. El video + scroll los maneja el
                          // ViewPager2 nativo, que avisa el cambio de video vía
                          // 'pageChanged' (no el IntersectionObserver). Sin ref aquí
                          // para no engañar al código que asume <video> (.pause/.volume).
                          <div className="absolute inset-0" />
                        ) : (
                          <div className="absolute inset-0 overflow-hidden bg-black">
                            <img
                              src={data.thumbnail_url?.startsWith("http") ? data.thumbnail_url : getMediaUrl(data.thumbnail_url)}
                              alt=""
                              aria-hidden="true"
                              decoding="async"
                              {...{ fetchpriority: activeVideo === index ? "high" : "auto" }}
                              className="absolute inset-0 h-full w-full object-cover border-[#00f0ff]/5 opacity-100"
                            />
                            <video
                              ref={(el) => { videoRefs.current[index] = el }}
                              // Ventana de DECODERS = activo + 2 adelante (ver
                              // isInDecoderWindow). Fuera de la ventana el src es undefined
                              // → React lo quita → se libera el decoder. preload "auto" para
                              // los 3 de la ventana (decodifican su primer frame antes de
                              // verlos); "none" para el resto.
                              src={isInDecoderWindow(index) ? (data.video?.startsWith("http") ? data.video : getMediaUrl(data.video)) : undefined}
                              // poster = thumbnail: tapa el ÍCONO DE PLAY por defecto que el
                              // WebView pinta cuando el <video> aún no tiene primer frame
                              // (eso es lo que se veía "pixelado/por cuadritos" — NO era el
                              // video, era el play-button por defecto). El poster muestra el
                              // thumbnail mientras carga, así nunca se ve ese ícono.
                              poster={data.thumbnail_url?.startsWith("http") ? data.thumbnail_url : getMediaUrl(data.thumbnail_url)}
                              preload={isInDecoderWindow(index) ? "auto" : "none"}
                              muted={isMuted || activeAdIndex === index}
                              loop
                              playsInline
                              // Capa GPU propia para decodificación por hardware en el
                              // WebView de Android. NO usamos fade de opacity en el video:
                              // animar opacity sobre la surface de video fuerza al WebView
                              // a recomponer la pila de capas → repinta por tiles (el video
                              // aparece "por cuadritos"). El video va SIEMPRE opaco; el
                              // thumbnail (<img> detrás) + poster cubren el área hasta que
                              // el video pinta su primer frame. NO usamos visibility:hidden
                              // sobre el <video> porque eso TAMBIÉN oculta su poster → se
                              // veía el ícono de play por defecto. Dejamos el poster hacer su
                              // trabajo (mostrar el thumbnail) hasta que hay frame de video.
                              style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                              className={`feed-video absolute inset-0 h-full w-full object-cover`}
                              onPlay={(e) => {
                                // Red de seguridad: con el feed bloqueado (candado, antes
                                // del primer tap) el video NO debe reproducirse. Si algo lo
                                // arranca (autoplay del WebView, efecto residual), lo
                                // pausamos en el acto. Es el guard definitivo del candado.
                                if (feedLockedRef.current) {
                                  e.currentTarget.pause();
                                  return;
                                }
                                syncFeedPlaybackState(false);
                                onVideoPlay(videoId);
                                // Unlock audio context on first video play (Capacitor/Android)
                                if (!audioUnlockedRef.current) {
                                  const howlerCtx = (Howler as any).ctx as AudioContext | undefined;
                                  if (howlerCtx && howlerCtx.state === "suspended") {
                                    howlerCtx.resume().catch(() => {});
                                  }
                                  audioUnlockedRef.current = true;
                                  setIsAudioUnlocked(true);
                                }
                              }}
                              onLoadedData={(e) => {
                                // Con el candado puesto: asegurar que quede en el frame 0 y
                                // PAUSADO en cuanto hay datos, ANTES de que el WebView pueda
                                // autoreproducir → elimina el destello de ~100ms que se veía
                                // al recargar (reproducía un instante y luego se pausaba).
                                if (feedLockedRef.current) {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                  return;
                                }
                                // Recuperación de scroll rápido: si al llegar (saltando
                                // varios) este video es el activo pero llegó SIN datos, el
                                // observer ya intentó play() y falló. Ahora que tiene su
                                // primer frame, lo arrancamos — así no queda negro/parado
                                // esperando que vuelvas atrás manualmente.
                                if (activeVideoRef.current === index && !feedLockedRef.current
                                    && activeAdIndex === null && !videosPausedRef.current) {
                                  e.currentTarget.play().catch(() => {});
                                }
                              }}
                              onPlaying={() => {
                                syncFeedPlaybackState(false);
                              }}
                              onPause={() => {
                                syncFeedPlaybackState(true);
                              }}
                              onLoadedMetadata={(e) => {
                                // Populate duration as soon as metadata is ready so the
                                // progress bar shows immediately, even before playback.
                                const d = e.currentTarget.duration;
                                if (isFinite(d) && d > 0 && videoDurationRef.current[videoId] !== d) {
                                  videoDurationRef.current[videoId] = d;
                                }
                              }}
                              onEnded={() => {
                                videoProgressRef.current[videoId] = 0;
                                const progressFill = progressFillRefs.current[videoId];
                                if (progressFill) progressFill.style.width = '0%';
                                resetVideo(videoId);
                              }}
                              onTimeUpdate={(e) => {
                                handleVideoProgress(e, videoId);
                                // Trigger ad logic: if video is at 5s, we have an ad, cooldown passed (4m), and not shown yet
                                const now = Date.now();
                                const cooldownPassed = now - lastAdTimestamp > adConfig.ad_cooldown_seconds * 1000;
                                const currentTime = e.currentTarget.currentTime;
                                const prevTime = lastVideoTimeRef.current[videoId] || 0;
                                lastVideoTimeRef.current[videoId] = currentTime;

                                // Loop detection: if time jumped backwards significantly
                                if (prevTime > currentTime + 1) {
                                  const videoElement = e.currentTarget;
                                  setVideoLoopCount(prev => {
                                    const currentCount = (prev[videoId] || 0) + 1;
                                    if (currentCount >= 5) {
                                      if (ads.length > 0 && activeAdIndex === null) {
                                        const nextAd = pickRandomAd(ads);
                                        if (nextAd) {
                                          setSelectedAd(nextAd);
                                          setActiveAdIndex(index);
                                          videoElement.pause();
                                          setIsMuted(false); // Force unmute for ad
                                          setAdSequenceCount(1); // Start sequence
                                        }
                                      }
                                      return { ...prev, [videoId]: 0 }; // Reset count
                                    }
                                    return { ...prev, [videoId]: currentCount };
                                  });
                                }

                                if (!isPremiumUser && currentTime >= 5 && currentTime < 6 && ads.length > 0 && activeAdIndex === null && index % adConfig.ad_every_nth_video === 0 && !shownAds.has(videoId) && cooldownPassed) {
                                  // Pick a random ad from the pool
                                  const nextAd = pickRandomAd(ads);
                                  if (nextAd) {
                                    setSelectedAd(nextAd);
                                    setActiveAdIndex(index);
                                    setShownAds(prev => new Set(prev instanceof Set ? prev : []).add(videoId));
                                    e.currentTarget.pause();
                                    setIsMuted(false); // Force unmute for ad
                                    setAdSequenceCount(1); // Start sequence
                                    // Auto-collapse description if it's open
                                    setExpandedDescriptions(prev => ({ ...prev, [videoId]: false }));
                                  }
                                }
                              }}
                            >
                            </video>
                          </div>
                        )}



                        <AnimatePresence>
                          {activeAdIndex === index && selectedAd && (
                            <AdOverlay
                              key={`ad-${selectedAd.id}-${adSequenceCount}`}
                              ad={selectedAd}
                              isMuted={isMuted}
                              toggleMute={toggleMute}
                              isVisible={activeVideo === index}
                              onClose={(finished, duration) => {
                                // User's rule: If finished naturally AND duration > 60s AND sequence < 3, show next ad
                                // "si el anuncio pasa de 1 minuto quiero este flujo [sequence]"
                                if (finished && duration && duration >= 60 && adSequenceCount < 3) {
                                  // Show another different ad
                                  const otherAds = ads.filter(a => a.id !== selectedAd.id);
                                  const nextAdPool = otherAds.length > 0 ? otherAds : ads;
                                  const nextAd = pickRandomAd(nextAdPool);
                                  if (nextAd) {
                                    setSelectedAd(nextAd);
                                    setAdSequenceCount(prev => prev + 1);
                                    // Stay in activeAdIndex = index, so AdOverlay remounts with new ad
                                  } else {
                                    setSelectedAd(null);
                                    setActiveAdIndex(null);
                                    setAdSequenceCount(0);
                                    setLastAdTimestamp(Date.now());
                                    videoRefs.current[index]?.play();
                                  }
                                } else {
                                  // End sequence
                                  setSelectedAd(null);
                                  setActiveAdIndex(null);
                                  setAdSequenceCount(0);
                                  setLastAdTimestamp(Date.now());
                                  videoRefs.current[index]?.play();
                                }
                              }}
                            />
                          )}
                        </AnimatePresence>
                        {/* Sin tinte sobre el video: se quitó el scrim inferior y el
                            overlay lateral morado→cyan (inset-0 bg-gradient-to-r) que
                            oscurecían/teñían el video (más oscuro a un lado). El video se
                            muestra con su COLOR ORIGINAL. La legibilidad del texto la dan
                            los drop-shadow de cada texto, no un velo encima del video. */}
                        {/* Single tap capture zone — only source of play/pause taps.
                            Disabled while an ad is active so it never sits over the ad. */}
                        {!adActive && (
                          <div
                            className="absolute inset-0 z-10"
                            onTouchStart={handleVideoTouchStart}
                            onTouchEnd={handleVideoTouchEnd(index)}
                            // onClick para ratón (desktop). En móvil, el click sintético
                            // que sigue al touch cae dentro del debounce de 800ms de
                            // handleVideoClick, así que no provoca doble toggle.
                            onClick={() => handleVideoClick(index)}
                          />
                        )}

                        {/* Lock overlay — visual only, no onClick (tap zone above handles it) */}
                        <AnimatePresence>
                          {(feedLocked || (exoActive && exoPaused)) && isActiveVideo && data.media_type === 'video' && !adActive && (
                            <motion.div
                              key="feed-lock"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                              className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                            >
                              <div className="flex items-center justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                                  {/* Candado en el bloqueo inicial; Pause cuando el usuario
                                      pausó manualmente el video nativo. */}
                                  {feedLocked ? <Lock className="h-7 w-7 text-white" /> : <Pause className="h-7 w-7 text-white" fill="white" />}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Play/Pause icon overlay */}
                        {/* PERFIL + DESCRIPCIÓN — esquina superior izquierda */}
                        {/* Pill central — siempre visible arriba, tap para expandir descripción */}
                        <div
                          className={`absolute top-0 left-0 right-0 z-[60] flex justify-center pointer-events-auto cursor-pointer ${isExpanded || !data.description || adActive ? 'invisible' : ''}`}
                          style={{ paddingTop: 6, paddingBottom: 10 }}
                          onClick={(e) => { e.stopPropagation(); handleToggleDescription(videoId); }}
                        >
                          <div className="w-10 h-1.5 rounded-full bg-white/50" />
                        </div>

                        {/* Descripción pegada al borde superior — solo visible cuando expandida */}
                        {data.description && isExpanded && !adActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 left-0 right-0 z-40 pointer-events-auto backdrop-blur-md bg-black/70 border-b border-white/10 px-3 pt-10 pb-3"
                          >
                            {/* Pill dentro del panel expandido */}
                            <div
                              className="flex justify-center items-center mb-3 py-2 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleToggleDescription(videoId); }}
                            >
                              <div className="w-10 h-1 rounded-full bg-white/30" />
                            </div>
                            <p className="text-[13px] text-white/95 leading-relaxed whitespace-pre-wrap">{fullContent}</p>
                            {data.tags?.tags && Array.isArray(data.tags.tags) && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {data.tags.tags.map((tag: string, i: number) => (
                                  <span key={i} className="text-[11px] font-medium text-[#00f0ff]">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Avatar + follow — encima del contenedor de descripción */}
                        <div className={`absolute top-2 left-3 right-3 z-50 flex items-center justify-between transition-opacity ${adActive ? 'opacity-0 pointer-events-none' : 'pointer-events-auto'}`}>
                          <Link
                            to={`/profile/${data.user_id?.username}`}
                            onClick={e => e.stopPropagation()}
                            className="relative h-9 w-9 flex-shrink-0 block rounded-full overflow-hidden"
                          >
                            <img
                              className="h-full w-full object-cover"
                              src={getMediaUrl(data.user_id?.profile_picture) || getMediaUrl("profile_pics/avatar.webp")}
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${index}`; }}
                              alt={data.user_id?.username}
                              loading="lazy"
                            />
                            {!isMuted && videoRefs.current[index]?.paused === false && (
                              <motion.div
                                className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60"
                                animate={{ boxShadow: ["0 0 0 0 rgba(0,240,255,0)", "0 0 12px 3px rgba(0,240,255,0.4)", "0 0 0 0 rgba(0,240,255,0)"], scale: [1, 1.05, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                              />
                            )}
                          </Link>
                          {/* Disco de música (movido aquí arriba a la derecha) */}
                          {data.audio_track_title && (
                            <motion.div
                              animate={{ rotate: videosPaused ? 0 : 360 }}
                              transition={videosPaused ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: 'linear' }}
                              className="relative h-9 w-9 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/20 shadow-lg pointer-events-none"
                            >
                              {data.audio_track_cover ? (
                                <img src={data.audio_track_cover} className="h-full w-full object-cover" alt="" />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                  <Music2 className="h-4 w-4 text-white" />
                                </div>
                              )}
                              {/* Agujero central tipo CD/vinilo */}
                              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 border border-white/30 backdrop-blur-sm" />
                            </motion.div>
                          )}
                        </div>

{/* FOOTER INFERIOR — música + audio + dots */}
                        <div className={`absolute bottom-8 left-0 right-0 px-3 pb-[calc(env(safe-area-inset-bottom)+2.85rem)] pt-10 pointer-events-none flex flex-col justify-end gap-2 transition-opacity ${isExpanded ? 'z-[80]' : 'z-20'} ${adActive ? 'opacity-0 pointer-events-none' : ''}`}>

                          {/* Dots carrusel */}
                          {carouselDots[videoId] && carouselDots[videoId].total > 1 && (
                            <div className="flex justify-center gap-1.5 pointer-events-none">
                              {Array.from({ length: Math.max(carouselDots[videoId].total, 4) }).map((_, i) => {
                                const isActiveDot = i === carouselDots[videoId].index
                                const isReal = i < carouselDots[videoId].total
                                return (
                                  <motion.div
                                    key={i}
                                    animate={{ width: isActiveDot ? 16 : 5, opacity: isActiveDot ? 1 : isReal ? 0.45 : 0.2 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-1.5 rounded-full bg-white"
                                  />
                                )
                              })}
                            </div>
                          )}

                          {/* Fila: botón seguir izquierda + música centro + mute derecha.
                              items-center → los 3 alineados en la misma línea.
                              Bajada pegada al borde inferior (mt-2 mb-[-22px]). */}
                          <div
                            className="relative flex items-center justify-between w-full pointer-events-auto mt-2 mb-[-22px]"
                            // OJO: NADA de `contain:paint` / `willChange` / `isolation`
                            // / `translateZ` aquí. En el WebView de Android creaban una
                            // capa GPU AISLADA que NO se re-pintaba cuando cambiaba solo
                            // el TEXTO (el número de likes/comments/views): el DOM
                            // cambiaba pero la capa mostraba el frame viejo → "números
                            // congelados" pese a que el WebSocket actualizaba el estado.
                            style={{}}
                          >
                            {/* Botón seguir (movido aquí abajo a la izquierda) */}
                            <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center">
                              <AnimatePresence mode="wait">
                                {data.user_id.username !== user.username && (
                                  (!followingState[data.user_id.id.toString()] && !data.current_user_followered) ? (
                                    <motion.button
                                      key="bottom-follow"
                                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                      whileTap={{ scale: 0.95 }}
                                      className="flex h-9 w-9 items-center justify-center rounded-full  text-white/95 pointer-events-auto"
                                      onClick={(e) => { e.stopPropagation(); handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "create"); }}
                                    >
                                      <UserPlus className="h-4 w-4 text-white" strokeWidth={2.4} />
                                    </motion.button>
                                  ) : (
                                    <motion.button
                                      key="bottom-following"
                                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }} exit={{ opacity: 0, scale: 0.8 }}
                                      className="flex h-9 w-9 items-center justify-center rounded-full  text-white/95 pointer-events-auto"
                                      onClick={(e) => { e.stopPropagation(); handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "delete"); }}
                                    >
                                      <UserCheck className="h-4 w-4 text-white" strokeWidth={2.4} />
                                    </motion.button>
                                  )
                                )}
                              </AnimatePresence>
                            </div>

                            {data.media_type === 'video' && data.audio_track_title && isActiveVideo && !isExpanded && (
                              <div className="mx-auto flex max-w-[70%] items-center gap-2 rounded-full bg-black/20 px-2 py-1 border border-white/10">
                                <Music2 className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="truncate text-[10px] font-bold uppercase tracking-widest text-white/80">
                                  {clampWords(data.audio_track_title, 4)}
                                </span>
                                {data.audio_track_artist && (
                                  <>
                                    <span className="text-white/30 text-[10px] shrink-0">·</span>
                                    <span className="truncate text-[9px] font-semibold uppercase tracking-widest text-white/60">
                                      {clampWords(data.audio_track_artist, 3)}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}

                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              className="h-9 w-9 flex items-center justify-center rounded-full text-white drop-shadow-lg"
                              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            >
                              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </motion.button>
                          </div>



                          {/* 3. BARRA DE INTERACCIÓN Y BOTÓN DE SUSCRIPCIÓN */}
                          {/* <div className={`flex items-center justify-between w-full ${isExpanded ? "pb-4" : "pb-13"}`}>
                          <div className="flex items-center gap-4">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLikeClick((videoId || "1"), index)
                              }}
                              className="relative flex flex-col items-center gap-1"
                            >
                              <motion.div
                                animate={{ scale: data.liked ? [1, 1.4, 0.9, 1] : 1 }}
                                transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${data.liked
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-white/10 text-white"
                                  }`}
                              >
                                <Heart
                                  className={`h-5 w-5 ${data.liked ? "fill-red-500 text-red-500" : "text-white"
                                    }`}
                                />
                              </motion.div>
                              <span className="text-xs text-white">{data.like_count || 0}</span>
                              <AnimatePresence>
                                {showLikeAnimation[data.id || "1"] && (
                                  <>
                                    {[...Array(5)].map((_, i) => (
                                      <motion.div
                                        key={`heart-particle-${data.id}-${i}`}
                                        initial={{ opacity: 1, y: 0, x: 0, scale: 0.4 }}
                                        animate={{
                                          opacity: 0,
                                          y: -35 - i * 8,
                                          x: (i % 2 === 0 ? 1 : -1) * (8 + i * 5),
                                          scale: 1.2,
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="absolute text-red-500 pointer-events-none"
                                        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                                      >
                                        ❤️
                                      </motion.div>
                                    ))}
                                  </>
                                )}
                              </AnimatePresence>
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              className="flex flex-col items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCommentClick(index)
                              }}
                            >
                              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                                <MessageCircle className="h-5 w-5 text-white" />
                                <AnimatePresence>
                                  {isActiveVideo && (data.comments_count || 0) > 0 && (
                                    <motion.div
                                      key="comment-badge"
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00f0ff] text-[10px] font-bold text-white"
                                    >
                                      {(data.comments_count || 0) > 9 ? "9+" : data.comments_count}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <span className="text-xs text-white">{data.comments_count || 0}</span>
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              className="flex flex-col items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                                <Eye className="h-5 w-5 text-white" />
                              </div>
                              <span className="text-xs text-white">{data.view_acount || 0}</span>
                            </motion.button>

                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoGiftClick(data.id);
                              }}
                              className="flex flex-col items-center gap-1"
                              whileTap={{ scale: 0.95 }}
                              animate={{
                                rotate: [0, -12, 12, -12, 12, 0],
                                x: [0, -8, 8, -8, 8, 0],
                              }}
                              transition={{
                                duration: 0.8,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatDelay: 9.2,
                              }}
                            >
                              <div className="flex h-10 mb-3 w-10 items-center justify-center rounded-full bg-white/10 border-2 border-pink-500/60">
                                <svg data-v-92f2660e width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox" data-v-92f2660e=""><g id="Base" data-v-92f2660e=""><g id="bottom" data-v-92f2660e=""><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)" data-v-92f2660e=""></path></g></g><g id="top" data-v-92f2660e=""><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white" data-v-92f2660e=""></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)" data-v-92f2660e=""></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black" data-v-92f2660e="="></path></g></g><defs data-v-92f2660e=""><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop data-v-92f2660e=""></stop><stop offset="1" stopOpacity="0" data-v-92f2660e=""></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop stopColor="#FF879D" data-v-92f2660e=""></stop><stop offset="0.326625" stopColor="#FF4F64" data-v-92f2660e=""></stop><stop offset="1" stopColor="#E54659" data-v-92f2660e=""></stop></linearGradient></defs></svg>
                              </div>
                            </motion.button>
                          </div>

                          <AnimatePresence mode="wait">
                            {(!followingState[data.user_id.id.toString()] && !data.current_user_followered && data.user_id.username != user.username) ? (
                              <motion.button
                                key="subscribeButton"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                whileTap={{ scale: 0.95 }}
                                className="ml-8 mb-3 px-4 py-2 hover:from-[#7000ff] hover:to-[#00f0ff] backdrop-blur-md border border-white/20 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-black/30 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "create");
                                }}
                              >
                                {t('videos:actions.follow')}
                              </motion.button>
                            ) : (
                              <motion.button
                                key="followingButton"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                className="ml-8 px-2 py-2 mb-3  border border-white/10 text-white text-sm font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-black/20 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "delete");
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {t('videos:actions.following')}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div> */}

                          {/* BARRA VERTICAL PEGADA AL BORDE DERECHO - estilo TikTok real */}
                          {/* 3. COLUMNA DE INTERACCIONES (DERECHA) */}
                          <div
                            className={`
                              absolute right-1 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] flex flex-col items-center gap-3.5
                              pb-[env(safe-area-inset-bottom)+50px]
                              transition-all duration-300
                              ${isExpanded || adActive ? 'pointer-events-none z-[65] opacity-0' : 'pointer-events-auto z-[70] opacity-100'}
                            `}
                            // OJO: NADA de `contain:paint` / `willChange` / `isolation`
                            // / `translateZ` aquí. En el WebView de Android creaban una
                            // capa GPU AISLADA que NO se re-pintaba cuando cambiaba solo
                            // el TEXTO (el número de likes/comments/views): el DOM
                            // cambiaba pero la capa mostraba el frame viejo → "números
                            // congelados" pese a que el WebSocket actualizaba el estado.
                            style={{}}
                          >

                            {/* Like */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLikeClick((videoId || "1"), index)
                              }}
                              className="relative flex flex-col items-center gap-1"
                            >
                              {(() => {
                                const lo = likeOverrides[videoId];
                                const isLiked = lo ? lo.liked : data.liked;
                                const likeCount = lo ? lo.like_count : (data.like_count || 0);
                                return (
                                  <>
                                    <motion.div
                                      animate={{ scale: isLiked ? [1, 1.4, 0.9, 1] : 1 }}
                                      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                                      className={`flex h-10 w-10 items-center justify-center rounded-full ${isLiked ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"}`}
                                    >
                                      <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
                                    </motion.div>
                                    <span className="text-xs text-white">{likeCount}</span>
                                  </>
                                );
                              })()}
                              <AnimatePresence>
                                {showLikeAnimation[data.id || "1"] && (
                                  <>
                                    {[...Array(5)].map((_, i) => (
                                      <motion.div
                                        key={`heart-particle-${data.id}-${i}`}
                                        initial={{ opacity: 1, y: 0, x: 0, scale: 0.4 }}
                                        animate={{
                                          opacity: 0,
                                          y: -35 - i * 8,
                                          x: (i % 2 === 0 ? 1 : -1) * (8 + i * 5),
                                          scale: 1.2,
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="absolute text-red-500 pointer-events-none"
                                        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                                      >
                                        ❤️
                                      </motion.div>
                                    ))}
                                  </>
                                )}
                              </AnimatePresence>
                            </motion.button>

                            {/* Comment */}
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCommentClick(index);
                              }}
                              className="flex flex-col items-center relative"
                            >
                              <div className="relative flex h-7 w-7 items-center justify-center rounded-full">
                                <MessageCircle className="h-6 w-8" />
                                {activeVideo === index && (data.comments_count || 0) > 0 && (
                                  <div className="absolute -top-1 -right-1 min-h-[8px] min-w-[8px] flex items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold px-1 shadow-cyan-500/40">
                                    {data.comments_count > 9 ? "9+" : data.comments_count}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs mt-0.5 text-white">
                                {data.comments_count || 0}
                              </span>
                            </motion.button>

                            {/* Views */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-8 w-8 items-center justify-center">
                                <Eye className="h-7 w-8 " />
                              </div>
                              <span className="text-xs   ">
                                {data.view_acount || 0}
                              </span>
                            </div>

                            {/* Save */}
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveClick(String(data.id));
                              }}
                              className="flex flex-col items-center"
                            >
                              <motion.div
                                animate={{ scale: savedMap[String(data.id)] ? [1, 1.4, 0.9, 1] : 1 }}
                                transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                                className="flex h-8 w-8 items-center justify-center"
                              >
                                <Bookmark
                                  className={`h-6 w-6 transition-colors duration-200 ${savedMap[String(data.id)] ? 'text-pink-400 fill-pink-400' : 'text-white'}`}
                                />
                              </motion.div>
                            </motion.button>

                            {/* Gift */}
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoGiftClick(data.id);
                              }}
                              className="flex flex-col items-center relative"
                              whileTap={{ scale: 0.9 }}
                            >
                              <div className={`
                                  flex h-7 w-8 items-center justify-center rounded-full
                                  bg-gradient-to-br from-pink-500/35 to-purple-500/25
                                  border border-pink-400/40 shadow-md
                                `}>
                                {/* Tu SVG del gift (más pequeño) */}
                                <svg data-v-92f2660e width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox" data-v-92f2660e=""><g id="Base" data-v-92f2660e=""><g id="bottom" data-v-92f2660e=""><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)" data-v-92f2660e=""></path></g></g><g id="top" data-v-92f2660e=""><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white" data-v-92f2660e=""></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)" data-v-92f2660e=""></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black" data-v-92f2660e=""></path></g></g><defs data-v-92f2660e=""><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop data-v-92f2660e=""></stop><stop offset="1" stopOpacity="0" data-v-92f2660e=""></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop stopColor="#FF879D" data-v-92f2660e=""></stop><stop offset="0.326625" stopColor="#FF4F64" data-v-92f2660e=""></stop><stop offset="1" stopColor="#E54659" data-v-92f2660e=""></stop></linearGradient></defs></svg>
                              </div>
                              <span className="text-[10px] mt-0.5 text-pink-300/90 font-medium drop-shadow-md">
                                {t('videos:actions.sendGift')}
                              </span>
                            </motion.button>

                            {/* More options ··· */}
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveOptionsVideoId(prev => prev === videoId ? null : videoId);
                              }}
                              className="flex flex-col items-center"
                            >
                              <div className="flex h-8 w-8 items-center justify-center">
                                <Forward className="h-6 w-6 text-white" />
                              </div>
                            </motion.button>


                          </div>


                        </div>
                        {/* 4. BARRA DE PROGRESO DE VIDEO — OCULTA a propósito.
                            Diseño: que el usuario se enfoque en el contenido y no en
                            cuánto falta del video. El tracking interno (videoProgressRef)
                            sigue activo para loops/ads; solo no se pinta la barra.
                            Para reactivarla, descomentar este bloque. */}
                        {/* {!adActive && data.media_type === 'video' && (
                          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30">
                            <div className="h-1 w-full overflow-hidden bg-white/15">
                              <div
                                ref={(el) => { progressFillRefs.current[videoId] = el; }}
                                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-[width] duration-75 ease-linear"
                                style={{ width: `${Math.min(100, ((videoProgressRef.current[videoId] || 0) / (videoDurationRef.current[videoId] || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )} */}
                        {/* FIN DEL CONTENEDOR DE METADATOS INFERIOR UNIFICADO */}

                      </div>
                    </div>
                  </HorizontalCarousel>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      {/* Full Screen Story Modal - Updated to use groupedStories */}
      <AnimatePresence>
        {viewingStoryUserIndex !== null && groupedStories[viewingStoryUserIndex] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#050718] flex flex-col"
          >
            {/* Dynamic Story Content Background (Blurred) - Can use first frame of video or image */}
            {/* <div className="absolute inset-0 z-0 opacity-30 blur-3xl">
                 {isVideoContent(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file) ? (
                    <video
                        src={getMediaUrl(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file)}
                        className="w-full h-full object-cover"
                    />
                 ) : (
                    <img
                        src={getMediaUrl(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file)}
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                 )}
            </div> */}
            {/* Story Header & Progress Bars */}
            <div className="relative z-20 px-2 bg-gradient-to-b from-black/80 to-transparent pb-8">
              {/* Progress Bars Container - Divided per story item */}
              <div className="flex gap-1 mb-3">
                {groupedStories[viewingStoryUserIndex].media.map((_: any, idx: number) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300 ease-linear"
                      style={{ width: `${(getCurrentProgress[idx] || 0) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              {/* User Info */}
              <div className="flex items-center justify-between px-1">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    closeStoryViewer();
                    navigate(`/profile/${groupedStories[viewingStoryUserIndex].user.username}`);
                  }}
                >
                  <div className={`w-10 h-10 rounded-full p-[1.5px] ${groupedStories[viewingStoryUserIndex]?.user?.subscription_status?.is_active
                    ? groupedStories[viewingStoryUserIndex].user.subscription_status.plan_name === 'VIP'
                      ? 'bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-gradient-to-tr from-[#7000ff] to-[#00f0ff] shadow-[0_0_10px_rgba(112,0,255,0.5)]'
                    : 'bg-[#2a2f5e]'
                    }`}>
                    <img
                      src={getMediaUrl(groupedStories[viewingStoryUserIndex]?.user.profile_picture)}
                      className="w-full h-full rounded-full object-cover border-2 border-[#050718]"
                      alt="User"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          user?.profile_picture
                            ? getMediaUrl(user.profile_picture)
                            : "https://picsum.photos/100/100";
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{groupedStories[viewingStoryUserIndex].user.username}</span>
                      {groupedStories[viewingStoryUserIndex]?.media?.[currentStoryItemIndex]?.privacy === 'subscribers' && (
                        <span className="flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[9px] font-semibold">
                          <Gem size={9} className="text-emerald-400" /> Suscriptores
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-300">Hace {formatStoryTimeAgo(
                      groupedStories[viewingStoryUserIndex]?.media?.[currentStoryItemIndex]?.created_at
                      ?? groupedStories[viewingStoryUserIndex]?.created_at
                    )}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleTogglePause} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    {isStoryPaused ? (
                      <Play size={20} className="text-white" fill="white" />
                    ) : (
                      <Pause size={20} className="text-white" fill="white" />
                    )}
                  </button>
                  <button onClick={() => setShowOptionsModal(true)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <MoreVertical size={20} className="text-white" />
                  </button>
                  <button onClick={closeStoryViewer} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Blackout Overlay — movido al nivel raíz del componente */}

            </div>
            {/* Story Main Content - With slide animation during user switch */}
            <motion.div
              className="flex-1 relative z-10 flex items-center justify-center bg-transparent"
              animate={{
                x: isSwitchingUser ? (transitionDirection === 'next' ? -30 : 30) : 0,
                opacity: isSwitchingUser ? 0.7 : 1
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {/* Tap Zones for Navigation */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20"
                onClick={handlePrevStory}
              ></div>
              <div
                className="absolute inset-y-0 right-0 w-1/3 z-20"
                onClick={handleNextStory}
              ></div>
              {/* Media Display - Video or Image */}
              {(() => {
                const currentMediaItem = groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex];
                const storyForThisMedia = (stories as Story[])?.find(s => s.id === currentMediaItem?.story);
                const hasCustomAudio = Boolean(storyForThisMedia?.audio_track_url);
                const hasStoryFilter = Boolean(storyForThisMedia?.filter_css && storyForThisMedia.filter_css !== "none");
                const storyMediaSrc = getMediaUrl(currentMediaItem.file);
                const textLayers = (storyForThisMedia?.text_layers ?? []) as StoryTextLayer[];
                const stickerLayers = (storyForThisMedia?.sticker_layers ?? []) as StoryStickerLayer[];
                const storyLocation = storyForThisMedia?.location ?? stickerLayers.find(layer => layer.kind === "location" && layer.text)?.text ?? null;
                return isVideoContent(currentMediaItem.file) ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={storyVideoRef}
                      key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`}
                      src={storyMediaSrc}
                      className="absolute inset-0 w-full h-full object-contain"
                      autoPlay={!isStoryPaused}
                      playsInline
                      muted={hasCustomAudio}
                      style={{ opacity: hasStoryFilter ? 0 : 1 }}
                      onEnded={handleNextStory}
                      onTimeUpdate={handleStoryVideoProgress}
                    />
                    <StoryFilterCanvas
                      source={storyMediaSrc}
                      filterCss={storyForThisMedia?.filter_css}
                      active={hasStoryFilter}
                      kind="video"
                      videoRef={storyVideoRef}
                    />
                    {textLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span
                          className="whitespace-pre-wrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                          style={{
                            color: layer.color,
                            fontSize: `${layer.fontSize}px`,
                            fontWeight: layer.bold ? 900 : 600,
                            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                          }}
                        >
                          {layer.text}
                        </span>
                      </div>
                    ))}
                    {stickerLayers.map((layer) => {
                      const isLocation = layer.kind === "location" && !!layer.text;
                      const stickerSrc = layer.src ? (layer.src.startsWith("http") ? layer.src : getMediaUrl(layer.src)) : "";
                      const isImage = layer.kind === "image" && !!stickerSrc;
                      const isVideo = layer.kind === "video" && !!stickerSrc;
                      const rotation = layer.rotation ?? 0;
                      return (
                        <div
                          key={layer.id}
                          className={`absolute z-20 select-none ${isLocation ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                          }}
                          onClick={(e) => {
                            if (!isLocation) return;
                            e.stopPropagation();
                            setSelectedStoryLocation(layer.text || storyLocation);
                          }}
                        >
                          {isLocation ? (
                            <div className="inline-flex max-w-[250px] items-center gap-2 rounded-[22px] border border-white/15 bg-[rgba(10,10,16,0.72)] px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                              <div className="relative flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                                <MapPin size={14} />
                                <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-white/90 ring-2 ring-black/35" />
                              </div>
                              <div className="min-w-0 flex flex-col text-left">
                                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/55">
                                  Ubicación
                                </span>
                                <span className="truncate font-black uppercase tracking-wide text-white" style={{ fontSize: "12px" }}>
                                  {shortLocationLabel(layer.text || storyLocation || "")}
                                </span>
                              </div>
                              <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70">
                                <span className="text-[10px] font-black">›</span>
                              </div>
                            </div>
                          ) : isVideo ? (
                            <video
                              src={stickerSrc}
                              autoPlay
                              loop
                              playsInline
                              className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] rounded-lg"
                              style={{ width: `${layer.size * 1.4}px`, height: "auto", maxHeight: `${layer.size * 2.5}px` }}
                              draggable={false}
                            />
                          ) : isImage ? (
                            <img
                              src={stickerSrc}
                              alt="Sticker"
                              className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                              style={{ width: `${layer.size * 1.4}px`, height: "auto" }}
                              draggable={false}
                            />
                          ) : (
                            <span style={{ fontSize: `${layer.size}px` }}>{layer.emoji}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <motion.img
                      key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={storyMediaSrc}
                      className="absolute inset-0 w-full h-full object-contain"
                      alt="Story Content"
                      style={{ opacity: hasStoryFilter ? 0 : 1 }}
                    />
                    <StoryFilterCanvas
                      source={storyMediaSrc}
                      filterCss={storyForThisMedia?.filter_css}
                      active={hasStoryFilter}
                      kind="image"
                    />
                    {textLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span
                          className="whitespace-pre-wrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                          style={{
                            color: layer.color,
                            fontSize: `${layer.fontSize}px`,
                            fontWeight: layer.bold ? 900 : 600,
                            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                          }}
                        >
                          {layer.text}
                        </span>
                      </div>
                    ))}
                    {stickerLayers.map((layer) => {
                      const isLocation = layer.kind === "location" && !!layer.text;
                      const stickerSrc = layer.src ? (layer.src.startsWith("http") ? layer.src : getMediaUrl(layer.src)) : "";
                      const isImage = layer.kind === "image" && !!stickerSrc;
                      const isVideo = layer.kind === "video" && !!stickerSrc;
                      const rotation = layer.rotation ?? 0;
                      return (
                        <div
                          key={layer.id}
                          className={`absolute z-20 select-none ${isLocation ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                          }}
                          onClick={(e) => {
                            if (!isLocation) return;
                            e.stopPropagation();
                            setSelectedStoryLocation(layer.text || storyLocation);
                          }}
                        >
                          {isLocation ? (
                            <div className="inline-flex max-w-[250px] items-center gap-2 rounded-[22px] border border-white/15 bg-[rgba(10,10,16,0.72)] px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                              <div className="relative flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                                <MapPin size={14} />
                                <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-white/90 ring-2 ring-black/35" />
                              </div>
                              <div className="min-w-0 flex flex-col text-left">
                                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/55">
                                  Ubicación
                                </span>
                                <span className="truncate font-black uppercase tracking-wide text-white" style={{ fontSize: "12px" }}>
                                  {shortLocationLabel(layer.text || storyLocation || "")}
                                </span>
                              </div>
                              <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70">
                                <span className="text-[10px] font-black">›</span>
                              </div>
                            </div>
                          ) : isVideo ? (
                            <video
                              src={stickerSrc}
                              autoPlay
                              loop
                              playsInline
                              className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] rounded-lg"
                              style={{ width: `${layer.size * 1.4}px`, height: "auto", maxHeight: `${layer.size * 2.5}px` }}
                              draggable={false}
                            />
                          ) : isImage ? (
                            <img
                              src={stickerSrc}
                              alt="Sticker"
                              className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                              style={{ width: `${layer.size * 1.4}px`, height: "auto" }}
                              draggable={false}
                            />
                          ) : (
                            <span style={{ fontSize: `${layer.size}px` }}>{layer.emoji}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                );
              })()}
            </motion.div>

            {/* Music Pill */}
            {(() => {
              const currentStoryItem = groupedStories[viewingStoryUserIndex]?.media?.[currentStoryItemIndex];
              const originalStory = (stories as Story[])?.find(s => s.id === currentStoryItem?.story);
              if (!originalStory?.audio_track_url) return null;
              return (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 pointer-events-none z-30 shadow-xl">
                  <Music2 size={12} className="text-cyan-400 font-bold" />
                  <span className="text-white text-[11px] font-medium truncate max-w-[200px]">
                    {originalStory.audio_track_title || 'Sonido añadido'}
                    {originalStory.audio_track_artist ? ` · ${originalStory.audio_track_artist}` : ''}
                  </span>
                </div>
              );
            })()}

            {/* Reply / Interactions (Bottom Overlay) - Added Gift Button */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-2 z-30">
              <input
                type="text"
                placeholder={t('videos:comments.sendMessage')}
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white placeholder-gray-400 focus:outline-none focus:border-[#00f0ff] backdrop-blur-md"
                value={storyReplyText}
                onChange={(e) => setStoryReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleStoryReply() }}
                disabled={storyReplySending || isOwner}
              />
              {storyReplyText.trim() && !isOwner && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleStoryReply}
                  disabled={storyReplySending}
                  className="p-2 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff] disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </motion.button>
              )}
              {isOwner ?
                <motion.button
                  className="p-2  hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    x: [-2, 2, -2, 0],
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}

                  onClick={handleEyeClick}
                >
                  {isGifts && isGifts.length > 0 ?
                    <>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-ping" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full" />
                    </>
                    : ""
                  }
                  <Eye size={20} className="relative z-10" />

                </motion.button>
                : ""
              }
              <motion.button
                onClick={handleLikeStory}
                className="relative p-2 hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                whileTap={{ scale: 0.85 }}
              >
                <motion.div
                  animate={{ scale: storyLikedStates[currentStoryUuid || ''] ? [1, 1.4, 0.9, 1] : 1 }}
                  transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Heart
                    className={`w-5 h-5 ${storyLikedStates[currentStoryUuid || ''] ? 'fill-red-500 text-red-500' : 'text-white'}`}
                  />
                </motion.div>
                <AnimatePresence>
                  {showStoryLikeAnimation[currentStoryUuid || ''] && (
                    <>
                      {[...Array(4)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ y: 0, x: 0, opacity: 1, scale: 0.5 }}
                          animate={{
                            y: -28 - i * 7,
                            x: (i % 2 === 0 ? 1 : -1) * (6 + i * 4),
                            opacity: 0,
                            scale: 1.1,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.38, ease: "easeOut" }}
                          className="text-red-500 text-sm absolute pointer-events-none"
                          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                        >
                          ❤️
                        </motion.span>
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </motion.button>
              {/* New Gift Button */}

              {!isOwner && (
                <motion.button
                  onClick={handleGiftClick}
                  className="p-2  hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    rotate: [0, -12, 12, -12, 12, 0], // sacudida más intensa
                    x: [0, -8, 8, -8, 8, 0],         // también mueve un poco horizontalmente (opcional)
                  }}
                  transition={{
                    duration: 0.8,           // duración de una sacudida completa
                    ease: "easeInOut",
                    repeat: Infinity,        // se repite para siempre
                    repeatDelay: 9.2,        // espera 9.2s + 0.8s = ~10 segundos entre sacudidas
                  }}
                >
                  <svg data-v-92f2660e width="25" height="25" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox" data-v-92f2660e=""><g id="Base" data-v-92f2660e=""><g id="bottom" data-v-92f2660e=""><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)" data-v-92f2660e=""></path></g></g><g id="top" data-v-92f2660e=""><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white" data-v-92f2660e=""></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)" data-v-92f2660e=""></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black" data-v-92f2660e=""></path></g></g><defs data-v-92f2660e=""><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop data-v-92f2660e=""></stop><stop offset="1" stopOpacity="0" data-v-92f2660e=""></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop stopColor="#FF879D" data-v-92f2660e=""></stop><stop offset="0.326625" stopColor="#FF4F64" data-v-92f2660e=""></stop><stop offset="1" stopColor="#E54659" data-v-92f2660e=""></stop></linearGradient></defs></svg>
                </motion.button>


              )}


              {/* <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md text-white">
                <MessageCircle size={20} /> aqui habra el boton de comprartir
              </button> */}
            </div>
            {/* Main Gift Menu Modal - 4 Categories (Original) */}
            <AnimatePresence>
              {showGiftMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black z-50"
                    onClick={() => setShowGiftMenu(false)}
                  />
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-60 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 w-80 max-w-full "
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-center font-bold mb-4 text-white">🎁 {t('videos:actions.sendGift')}</h3>
                    <div className="space-y-3">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('support', 5)}
                        className="w-full bg-yellow-500/20 text-yellow-300 p-3 rounded-xl border border-yellow-500/30"
                      >
                        🎁 {t('videos:actions.giftSupport')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('vip', 20)}
                        className="w-full bg-purple-500/20 text-purple-300 p-3 rounded-xl border border-purple-500/30"
                      >
                        👑 {t('videos:actions.giftVip')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('unlock', 15)}
                        className="w-full bg-indigo-500/20 text-indigo-300 p-3 rounded-xl border border-indigo-500/30"
                      >
                        🔒 {t('videos:actions.giftUnlock')}
                      </motion.button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-center">{t('videos:actions.giftCommission')}</p>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showFullGiftMenu && (
                <VipGiftExperience
                  onClose={() => setShowFullGiftMenu(false)}
                  onSendGift={handleSendGift}
                  onBuyTokens={() => { setShowFullGiftMenu(false); setShowTokenShopModal(true); }}
                  gifts={Array.isArray(_fullGifts) ? _fullGifts : []}
                  walletTokens={walletTokens}
                  subscriptionStatus={groupedStories[viewingStoryUserIndex]?.user?.subscription_status}
                />
              )}
            </AnimatePresence>

            {/* User Switch Overlay Animation */}
            <AnimatePresence>
              {isSwitchingUser && incomingUser && (
                <motion.div
                  initial={{
                    x: transitionDirection === 'next' ? '100%' : '-100%',
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={{
                    x: 0,
                    opacity: 1,
                    scale: 1
                  }}
                  exit={{
                    x: transitionDirection === 'next' ? '100%' : '-100%',
                    opacity: 0,
                    scale: 0.5
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute inset-y-0 z-40 flex items-center ${transitionDirection === 'next' ? 'justify-end pr-8' : 'justify-start pl-8'
                    }`}
                >
                  <div className="flex flex-col items-center gap-3 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                    <div className="relative">
                      <img
                        src={getMediaUrl(incomingUser.profile_picture)}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        alt={incomingUser.username}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://picsum.photos/64/64";
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-50"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.7, 0.5]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-gray-400 block">
                        {transitionDirection === 'next' ? 'Voy a' : 'Volviendo a'}
                      </span>
                      <span className="text-sm font-semibold text-white">@{incomingUser.username}</span>
                      <Heart className="mx-auto mt-1 text-red-400" size={20} fill="currentColor" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div >
        )}
      </AnimatePresence >
      {/* Viewers Modal - Surprise: Flip-in avatars with holographic effect */}
      <AnimatePresence>
        {
          showViewersModal && isOwner && (
            <>
              <motion.div
                key="viewers-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-60"
                onClick={handleCloseViewers}
              />
              <motion.div
                key="viewers-panel"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 h-[50vh] z-70 bg-black backdrop-blur-xl rounded-t-3xl overflow-hidden border-t border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center pt-4 pb-4 relative">
                  <div className="w-12 h-1.5 bg-gradient-to-r from-[#00f0ff] to-[#7000ff] rounded-full cursor-pointer" onClick={handleCloseViewers} />
                  {/* Holographic eye scan effect on top */}
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent animate-scan" />
                  </motion.div>
                </div>
                <div className="px-6 pb-6 space-y-4  max-h-full custom-scrollbar">
                  <h2 className="text-center font-bold text-white text-lg">
                    👁️ View by {realViewers.length} peaple{realViewers.length > 1 ? 's' : ''}
                  </h2>
                  <AnimatePresence>
                    {realViewers.map((viewer, i) => (
                      <motion.div
                        key={viewer.id || i}
                        onClick={() => showGiftRecived(viewer)}
                        initial={{
                          opacity: 0,
                          rotateY: 180,
                          y: 100,
                          x: Math.sin(i) * 50 // Staggered entry from sides
                        }}
                        animate={{
                          opacity: 1,
                          rotateY: 0,
                          y: 0,
                          x: 0
                        }}
                        exit={{ opacity: 0, rotateY: -180, y: 100 }}
                        transition={{
                          delay: i * 0.1,
                          duration: 0.6,
                          type: "spring",
                          stiffness: 200,
                          damping: 15
                        }}
                        className={`flex items-center bg-white/5 backdrop-blur-md rounded-2xl border ${giftsSentByThisViewer(viewer) && giftsSentByThisViewer(viewer).length > 0 ? "border-pink-500" : " border-white/10"} shadow-2xl shadow-[#00f0ff]/10 hover:shadow-[#00f0ff]/20 transition-all pr-4 py-2 gap-2 pl-1`}

                      >
                        <motion.div
                          className="relative w-12 h-12 rounded-full overflow-hidden"
                        >
                          <img
                            src={getMediaUrl(viewer.profile_picture)}
                            className="w-full h-full object-cover"
                            alt={viewer.username}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/48/48?random=${viewer.id || i}`;
                            }}
                          />
                          {/* Holographic ring around avatar */}
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/30"
                            animate={{
                              scale: [1, 1.2, 1],
                              borderColor: ["#00f0ff", "#7000ff", "#00f0ff"]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">@{viewer.username}</p>
                          <p className="text-xs text-gray-400">{viewer.viewed_at || 'Recientemente'}</p>
                        </div>
                        {/* Surprise: Mini sparkles on hover */}
                        <motion.div
                          className="flex items-center justify-center w-8 h-8 rounded-full"
                        >
                          <div className="flex items-center gap-3 pr-15">
                            {viewer.user_liked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{
                                  scale: [1, 1.3, 1],
                                }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  repeatType: "loop",
                                  ease: "easeInOut"
                                }}
                                className="text-red-500  drop-shadow-lg"
                              >
                                ❤️
                              </motion.div>
                            )}

                            {(() => {
                              // ¿Este viewer envió regalos?


                              const hasGifts = giftsSentByThisViewer(viewer) && giftsSentByThisViewer(viewer).length > 0;
                              const giftCount = giftsSentByThisViewer(viewer)?.length || 0;
                              return hasGifts ? (
                                <div className="relative">
                                  <motion.div
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600/40 to-purple-600/40
                                          rounded-full border border-pink-500/60 backdrop-blur-md shadow-lg shadow-pink-500/30 cursor-pointer"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const gifts = giftsSentByThisViewer(viewer);
                                      if (gifts && gifts.length > 0) {
                                        claimAndShowGift(gifts[0], viewer.username);
                                      }
                                    }}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 120 120" fill="none" className="drop-shadow">
                                      <path d="M94 58H26V104H94V58Z" fill="#FF3366" />
                                      <path d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FF99AA" />
                                      <path d="M100 42.665H20V60H100V42.665Z" fill="#FF3366" />
                                      <path d="M76.9491 42.665H42.8248V60H76.9491V42.665Z" fill="#FF99AA" />
                                      <path d="M60 31C58 29 55 24 52 21 47 16 40 16 36 19 32 22 31 28 34 35 37 42 45 43 52 43 58 43 65 42 72 42L60 31ZM48 37C43 36 38 35 36 33 35 32 35 31 35 31 35 29 37 26 41 25 45 24 51 28 56 34 57 36 58 37 58 37 55 37 51 37 48 37ZM72 34C77 28 83 24 87 25 91 26 93 29 93 31 93 31 93 32 92 33 90 35 85 36 80 37 74 37 68 37 65 37 65 37 65 36 66 35 68 34ZM60 43C66 43 72 43 78 43 84 43 90 42 94 39 98 36 99 31 95 25 91 19 86 17 81 18 76 19 71 22 68 27 66 31 65 33 60 31" fill="url(#grad)" />
                                      <defs>
                                        <linearGradient id="grad" x1="60" y1="18" x2="60" y2="43">
                                          <stop stopColor="#FF66CC" />
                                          <stop offset="1" stopColor="#FF3366" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    <span className="text-pink-300 font-bold text-sm">+{giftCount}</span>
                                  </motion.div>

                                  {/* Puntito rosa parpadeante */}
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-ping" />
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full" />
                                </div>
                              ) : null;
                            })()}

                            {/* Corazón solo si dio like */}

                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {realViewers.length === 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-gray-400 italic"
                    >
                      Nadie ha visto esta historia aún...
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </>
          )
        }
      </AnimatePresence >
      {/* Location sticker modal */}
      <AnimatePresence>
        {selectedStoryLocation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              onClick={() => setSelectedStoryLocation(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed inset-x-6 bottom-1/3 z-[201] rounded-[28px] border border-white/10 bg-[#0d0f1e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 shadow-lg">
                  <MapPin size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Ubicación</p>
                  <p className="text-white font-bold text-base leading-snug break-words">{selectedStoryLocation}</p>
                </div>
                <button
                  onClick={() => setSelectedStoryLocation(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 border border-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedStoryLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-sm font-bold shadow-lg shadow-pink-500/25 active:scale-95 transition-transform"
                onClick={() => setSelectedStoryLocation(null)}
              >
                <MapPin size={16} />
                Ver en Google Maps
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Options Modal */}
      <AnimatePresence>
        {showOptionsModal && viewingStoryUserIndex !== null && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
              onClick={() => setShowOptionsModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-70 rounded-t-[32px] overflow-hidden"
              style={{ background: "linear-gradient(160deg, #0c0f2e 0%, #050718 100%)", borderTop: "1px solid rgba(112,0,255,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* glow line top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-[#7000ff]/70 to-transparent" />
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-60" />
              </div>

              <div className="px-5 pb-10 pt-3 space-y-2">
                {!isOwner && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="group relative w-full flex items-center gap-4 py-4 px-5 rounded-2xl overflow-hidden transition-all duration-200"
                    style={{ background: "rgba(255,0,80,0.07)", border: "1px solid rgba(255,0,80,0.15)" }}
                    onClick={handleReport}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0" style={{ background: "rgba(255,0,80,0.15)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    </div>
                    <span className="text-[15px] font-semibold text-[#ff2d55]">Reportar</span>
                    <div className="ml-auto opacity-40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </motion.button>
                )}
                {isOwner && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="group relative w-full flex items-center gap-4 py-4 px-5 rounded-2xl overflow-hidden transition-all duration-200"
                    style={{ background: "rgba(255,0,80,0.07)", border: "1px solid rgba(255,0,80,0.15)" }}
                    onClick={handleDelete}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0" style={{ background: "rgba(255,0,80,0.15)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </div>
                    <span className="text-[15px] font-semibold text-[#ff2d55]">Eliminar</span>
                    <div className="ml-auto opacity-40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center py-4 px-5 rounded-2xl transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={() => setShowOptionsModal(false)}
                >
                  <span className="text-[15px] font-medium text-white/50">Cancelar</span>
                </motion.button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Report Reason Sheet */}
      <AnimatePresence>
        {showReportSheet && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
              onClick={() => setShowReportSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-70 rounded-t-[32px] overflow-hidden"
              style={{ background: "linear-gradient(160deg, #0c0f2e 0%, #050718 100%)", borderTop: "1px solid rgba(112,0,255,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-[#7000ff]/70 to-transparent" />
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-60" />
              </div>

              <div className="px-5 pb-10 pt-3">
                {/* header */}
                <div className="flex items-center gap-3 px-1 pb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: "rgba(112,0,255,0.2)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7000ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  </div>
                  <p className="text-white font-bold text-[16px]">¿Por qué reportas este contenido?</p>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      { reason: "spam",     label: "Spam",                        icon: "🚫" },
                      { reason: "violence", label: "Contenido violento",           icon: "⚠️" },
                      { reason: "nudity",   label: "Desnudez o contenido sexual",  icon: "🔞" },
                      { reason: "hate",     label: "Discurso de odio",             icon: "🗣" },
                      { reason: "other",    label: "Otro motivo",                  icon: "💬" },
                    ] as { reason: ReportPayload["reason"]; label: string; icon: string }[]
                  ).map(({ reason, label, icon }, i) => (
                    <motion.button
                      key={reason}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={reportLoading}
                      className="w-full flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      onClick={() => handleReportReason(reason)}
                    >
                      <span className="text-lg leading-none">{icon}</span>
                      <span className="text-[14px] font-medium text-white/90 flex-1 text-left">{label}</span>
                      {reportLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#7000ff]/40 border-t-[#7000ff] animate-spin" />
                      ) : (
                        <svg className="opacity-30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      )}
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center py-4 mt-3 rounded-2xl transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={() => setShowReportSheet(false)}
                >
                  <span className="text-[15px] font-medium text-white/50">Cancelar</span>
                </motion.button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60"
              onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              className="fixed inset-0 z-70 flex items-center justify-center px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full max-w-[320px] rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(145deg, #0e1235 0%, #07091f 100%)", border: "1px solid rgba(255,0,80,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,0,80,0.08)" }}>
                {/* top glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#ff2d55]/60 to-transparent" />

                <div className="px-6 pt-7 pb-5 text-center">
                  {/* icon */}
                  <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full"
                    style={{ background: "rgba(255,0,80,0.12)", border: "1px solid rgba(255,0,80,0.2)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </div>
                  <p className="text-white font-bold text-[18px] mb-1">¿Eliminar este video?</p>
                  <p className="text-white/40 text-[13px]">Esta acción no se puede deshacer.</p>
                </div>

                <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.07)" }} />

                <div className="flex p-3 gap-2">
                  <button
                    className="flex-1 py-3.5 rounded-2xl text-white/60 font-medium text-[14px] transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-[14px] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #ff2d55, #c0002a)", boxShadow: "0 4px 20px rgba(255,45,85,0.35)" }}
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span className="text-white">Eliminando</span>
                      </>
                    ) : (
                      <span className="text-white">Eliminar</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
      <ShowComments showCommentsModal={showCommentsModal} setShowCommentsModal={setShowCommentsModal} comments={comments as unknown as null} user={user} commentText={commentText} setCommentText={setCommentText} handlePostComment={handlePostComment} isOffline={commentsOffline} onRetry={handleRetryComments} />

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModal.show && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              onClick={() => setFeedbackModal(f => ({ ...f, show: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 24 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              className="fixed inset-0 z-[201] flex items-center justify-center px-6 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-[300px] rounded-3xl overflow-hidden text-center"
                style={{
                  background: "linear-gradient(145deg, #0e1235 0%, #07091f 100%)",
                  border: feedbackModal.success ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,45,85,0.2)",
                  boxShadow: feedbackModal.success
                    ? "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,240,255,0.08)"
                    : "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,45,85,0.08)",
                }}
              >
                {/* top glow line */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px"
                  style={{ background: feedbackModal.success ? "linear-gradient(90deg, transparent, rgba(0,240,255,0.6), transparent)" : "linear-gradient(90deg, transparent, rgba(255,45,85,0.6), transparent)" }}
                />

                <div className="px-6 pt-8 pb-6">
                  {/* icon circle */}
                  <div
                    className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full"
                    style={{
                      background: feedbackModal.success ? "rgba(0,240,255,0.1)" : "rgba(255,45,85,0.1)",
                      border: feedbackModal.success ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,45,85,0.2)",
                    }}
                  >
                    {feedbackModal.success ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    )}
                  </div>

                  <p className="text-white font-bold text-[17px] mb-1">
                    {feedbackModal.success ? "Reporte enviado" : "Algo salió mal"}
                  </p>
                  <p className="text-white/50 text-[13px] leading-relaxed">{feedbackModal.message}</p>
                </div>

                <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.07)" }} />

                <button
                  className="w-full py-4 font-semibold text-[14px] transition-all duration-200"
                  style={{ color: feedbackModal.success ? "#00f0ff" : "#ff2d55" }}
                  onClick={() => setFeedbackModal(f => ({ ...f, show: false }))}
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Gift Animation Overlay — pantalla completa, emerge como en el perfil */}
      <AnimatePresence>
        {giftAnimation && (
          <motion.div
            key="gift-animation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[100] pointer-events-none"
          >
            <motion.video
              key={giftAnimation.giftId}
              src={giftAnimation.blobUrl || getMediaUrl(giftAnimation.gift)}
              autoPlay
              playsInline
              muted={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                display: 'block',
                maskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
                WebkitMaskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)`,
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
              onPlay={() => {
                const storyUuidToActivate = giftAnimation?.storyUuid || currentStoryUuid;
                if (storyUuidToActivate && giftAnimation?.amount && giftAnimation.amount > 20) {
                  if (giftAnimation?.color_premiun) {
                    setStoryPremiumColors(prev => ({ ...prev, [storyUuidToActivate]: giftAnimation.color_premiun! }));
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
            {/* Nombre del regalo abajo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-1"
            >
              <p className="text-white font-black text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                {giftAnimation.type}
              </p>
              <p className="text-white/70 text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                para @{typeof giftAnimation.sender === 'string' ? giftAnimation.sender : (giftAnimation.sender as any)?.username ?? ''}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {
        (viewingStoryUserIndex !== null && groupedStories[viewingStoryUserIndex as number]) || selectedChat
          ? null
          : <BottomNavbar />
      }

      {/* Overlay regalo viewer historia — pantalla completa, no cierra el modal */}
      <AnimatePresence>
        {viewerGiftOverlay && (
          <motion.div
            key="viewer-gift-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)' }}
            onClick={() => { setViewerGiftOverlay(null); setViewerGiftBlackout(false); }}
          >
            {/* Emoji placeholder visible mientras el video no está listo */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 96, opacity: viewerGiftReady ? 0 : 1, transition: 'opacity 0.3s',
              pointerEvents: 'none',
            }}>
              {viewerGiftOverlay.gift_type}
            </div>

            <video
              key={viewerGiftOverlay.blobUrl || viewerGiftOverlay.gift_video}
              src={viewerGiftOverlay.blobUrl || (viewerGiftOverlay.gift_video ? getMediaUrl(viewerGiftOverlay.gift_video) : undefined)}
              autoPlay
              playsInline
              preload="auto"
              muted={false}
              style={{
                display: 'block',
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', pointerEvents: 'none',
                opacity: viewerGiftReady ? 1 : 0, transition: 'opacity 0.3s',
                maskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, black 30%, transparent 75%)',
              }}
              onPlaying={() => setViewerGiftReady(true)}
              onCanPlay={() => setViewerGiftReady(true)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const type = viewerGiftOverlay.gift_type?.toLowerCase();
                if (type?.includes('space') || type === '🪐') {
                  if (v.currentTime >= 4.0 && v.currentTime < 6.0) {
                    if (!viewerGiftBlackout) setViewerGiftBlackout(true);
                  } else if (v.currentTime >= 6.0 && viewerGiftBlackout) {
                    setViewerGiftBlackout(false);
                  }
                }
              }}
              onEnded={() => {
                setViewerGiftOverlay(null);
                setViewerGiftBlackout(false);
                if (viewerGiftBlobRef.current) {
                  URL.revokeObjectURL(viewerGiftBlobRef.current);
                  viewerGiftBlobRef.current = null;
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: viewerGiftReady ? 1 : 0, y: viewerGiftReady ? 0 : 20 }}
              transition={{ duration: 0.4 }}
              style={{ position: 'absolute', bottom: 96, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none' }}
            >
              <p style={{ color: 'white', fontWeight: 900, fontSize: 24, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
                {viewerGiftOverlay.gift_type}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                de @{viewerGiftOverlay.sender}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blackout del regalo del viewer */}
      <AnimatePresence>
        {viewerGiftBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'black', pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* Blackout global — cubre absolutamente todo incluyendo navbar e inputs */}
      <AnimatePresence>
        {isBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'black', pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* Token Shop Modal */}
      <TokenShopModal
        isOpen={showTokenShopModal}
        onClose={() => setShowTokenShopModal(false)}
        onPurchase={(tokens, cost) => {
          if (walletBalance < cost) {
            setShowTokenShopModal(false);
            setShowInsufficientFundsModal(true);
            return;
          }
          buyTokens(tokens, cost)(dispatch)
            .then(() => {
              setShowTokenShopModal(false);
              setPurchasedTokenAmount(tokens);
              setShowTokenPurchaseSuccessModal(true);
            })
            .catch((err: any) => {
              console.error("Error purchasing tokens", err);
              setShowTokenShopModal(false);
              setShowInsufficientFundsModal(true);
            });
        }}
      />
      {/* Insufficient Funds Modal */}
      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
      />
      {/* Token Purchase Success Modal */}
      <TokenPurchaseSuccessModal
        isOpen={showTokenPurchaseSuccessModal}
        onClose={() => setShowTokenPurchaseSuccessModal(false)}
        purchasedAmount={purchasedTokenAmount}
        newTotalBalance={walletTokens + purchasedTokenAmount}
      />
      <AnimatePresence>
        {showVideoGiftModal && (
          <VipGiftExperience
            key={videoGiftModalKey}
            onClose={() => setShowVideoGiftModal(false)}
            onSendGift={handleSendVideoGift}
            onBuyTokens={() => { setShowVideoGiftModal(false); setShowTokenShopModal(true); }}
            gifts={Array.isArray(_fullGifts) ? _fullGifts : []}
            walletTokens={walletTokens}
            subscriptionStatus={
              (mediaVideo?.find(v => v.id == selectedVideoForGift)?.user_id as any)?.subscription_status
            }
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan {
          50% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
          
        :root {
          --yellow-500: 46 204 113;
          --blue-500: 59 130 246;
          --purple-500: 168 85 247;
          --indigo-500: 99 102 241;
          --red-500: 239 68 68;
          --gold-500: 234 179 8;
          --orange-500: 249 115 22;
          --multi-500: 255 0 255;
          --pink-500: 236 72 153;
          --cyan-500: 6 182 212;
          --green-500: 34 197 94;
          --rainbow-500: 147 51 234;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div >

    {/* ── Video options pill — portal al body para escapar overflow:hidden ── */}
    {activeOptionsVideoId && (() => {
      const vid = mergedFeed.find(d => d.type === 'video' && d.id?.toString() === activeOptionsVideoId);
      const opts = [
        {
          icon: <Bookmark size={16} className={savedMap[activeOptionsVideoId] ? 'fill-pink-400 text-pink-400' : 'text-white/80'} />,
          color: 'from-pink-500/30 to-rose-600/15',
          glow: 'rgba(236,72,153,0.4)',
          active: !!savedMap[activeOptionsVideoId],
          onClick: () => { handleSaveClick(activeOptionsVideoId); setActiveOptionsVideoId(null); },
        },
        {
          icon: <Share2 size={16} className="text-cyan-300" />,
          color: 'from-cyan-500/25 to-blue-600/15',
          glow: 'rgba(6,182,212,0.35)',
          active: false,
          onClick: () => handleShareVideo((vid as any)?.video_url || '', (vid as any)?.description),
        },
        {
          icon: <Download size={16} className="text-violet-300" />,
          color: 'from-violet-500/25 to-purple-600/15',
          glow: 'rgba(139,92,246,0.35)',
          active: false,
          onClick: () => handleDownloadVideo((vid as any)?.video_url || '', activeOptionsVideoId),
        },
      ];
      return createPortal(
        <AnimatePresence>
          <motion.div
            key="options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, touchAction: 'none' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setActiveOptionsVideoId(null); }}
          />
          <motion.div
            key="options-pill"
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom) + 9rem)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: '16px',
              background: 'rgba(10,10,16,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {opts.map((opt, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.88 }}
                onClick={opt.onClick}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(to bottom, ${opt.color.replace('from-', '').replace(' to-', ', ')})`,
                  boxShadow: opt.active ? `0 0 14px ${opt.glow}` : 'none',
                  border: opt.active ? `1px solid ${opt.glow}` : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {opt.icon}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      );
    })()}

    {/* ── Share to contact modal ── */}
    {shareModal && createPortal(
      <AnimatePresence>
        <motion.div
          key="share-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShareModal(null)}
        />
        <motion.div
          key="share-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: 10001, borderRadius: '24px 24px 0 0',
            background: 'rgba(10,10,18,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '12px auto 0' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Compartir video</span>
            <button onClick={() => setShareModal(null)} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {/* Search */}
          <div style={{ padding: '0 16px 10px' }}>
            <input
              value={shareSearch}
              onChange={e => setShareSearch(e.target.value)}
              placeholder="Buscar contacto..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Contacts list */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 24px' }}>
            {shareContacts
              .filter(c => {
                const name = (c.other_user?.username || c.other_user?.name || '').toLowerCase();
                return name.includes(shareSearch.toLowerCase());
              })
              .map((contact: any) => {
                const uuid = contact.uuid;
                const sent = shareSent[uuid];
                const sending = shareSending === uuid;
                const avatar = contact.other_user?.profile_picture;
                const name = contact.other_user?.username || contact.other_user?.name || 'Usuario';
                return (
                  <div key={uuid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 14, marginBottom: 4 }}>
                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                      {avatar && <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                    </div>
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 500, flex: 1 }}>@{name}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSendShareToContact(uuid)}
                      disabled={sent || sending}
                      style={{
                        padding: '8px 18px', borderRadius: 20, border: 'none', cursor: sent ? 'default' : 'pointer',
                        fontWeight: 700, fontSize: 12,
                        background: sent ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                        color: sent ? '#4ade80' : 'white',
                        boxShadow: sent ? 'none' : '0 0 14px rgba(6,182,212,0.35)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {sending ? '...' : sent ? '✓ Enviado' : 'Enviar'}
                    </motion.button>
                  </div>
                );
              })}
            {shareContacts.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', paddingTop: 32, fontSize: 14 }}>
                No tienes conversaciones aún
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )}

    </>
  )
}
export default StreamingUI
