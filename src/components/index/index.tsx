import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"
import sendMessageSound from "../../assets/sounds/sendMessage.mp3";
import { Eye, MessageCircle, Heart, Volume2, VolumeX, Play, Pause, Plus, UserPlus, UserCheck, Loader2, X, MoreVertical, Music2 } from "lucide-react"
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
import { useWsEvent } from "../../context/WebSocketContext"
import { getActiveStories } from "../../redux/actions/history/listActiveHistory"
import { viewStory } from "../../redux/actions/history/makeViewed"
import { getStoryViewers } from "../../redux/actions/history/getHIstoryViewers"
import { likeStory } from "../../redux/actions/history/likeHistory"
import { sendGift } from "../../redux/actions/gift/sendGift"
import { getActiveGift } from "../../redux/actions/gift/listGiftActive"
import { sendVideoGift } from "../../redux/actions/gift/sendVideoGift"
import { getRecivedGift } from "../../redux/actions/gift/listGiftRecived"
import { getOneActiveGift } from "../../redux/actions/gift/getGiftActive"
import { getRecivedGiftByUser } from "../../redux/actions/gift/getGiftsByUser"
import { GiftI } from "../../interfaces/gift"
import { ShowComments } from "../comments/modalComents"
import { useChat } from "../../context/ChatContext"
import { getBaseUrl, getMediaUrl } from "../../redux/client/api-client";
import { useTypingUsers } from "../../context/useTyping";
import { useNotificationsStore } from "../../context/NotificationsStore";
import HorizontalCarousel from "./HorizontalCarousel";
import StoryFilterCanvas from "./StoryFilterCanvas";
import { useUserVideos } from "../../hooks/useUserVideos";
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
import TokenPurchaseSuccessModal from "../giftModal/TokenPurchaseSuccessModal";
import { buyTokens } from "../../redux/actions/buyTokens";
import { getWallet } from "../../redux/actions/getWallet";
import { useVideoEngagement } from "../../hooks/useVideoEngagement";
import { deleteStory } from "../../redux/actions/history/deleteHistory";
import { reportStory, ReportPayload } from "../../redux/actions/history/reportStory";
import { getRecommendedFeed } from "../../redux/actions/getMedia";
import { useCallStore } from "../../store/callStore";
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
const StreamingUI = ({ media }: StreamingUIProps) => {
  const { t } = useTranslation(['videos', 'common']);
  const dispatch = useDispatch();
  const navigate = useNavigate()
  // Redux selectors para gifts
  const activeGifts = useSelector((state: any) => state.activeGiftReducer?.gift);
  // const receivedGifts = useSelector((state: any) => state.RecivedGiftReducer?.gift);
  const { setTypingUser, removeTypingUser } = useTypingUsers();
  // const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { selectedChat } = useChat();
  const oneActiveGift = useSelector((state: any) => state.GetOneactiveGiftReducer?.gift);
  const getWalletReducer = useSelector((state: any) => state.getWalletReducer);
  const walletTokens = getWalletReducer?.tokens || 0;
  const walletBalance = parseFloat(getWalletReducer?.balance || '0');
  const [showTokenShopModal, setShowTokenShopModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showTokenPurchaseSuccessModal, setShowTokenPurchaseSuccessModal] = useState(false);
  const [purchasedTokenAmount, setPurchasedTokenAmount] = useState(0);
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const hasPlayedFirstVideo = useRef(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [isMuted, setIsMuted] = useState(true)
  const mainRef = useRef<HTMLDivElement>(null)
  const [showLikeAnimation, setShowLikeAnimation] = useState<Record<string, boolean>>({});
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoDuration, setVideoDuration] = useState<Record<string, number>>({});
  const [isGridVideoPlaying, setIsGridVideoPlaying] = useState<Record<string, boolean>>({})
  const [stories, setStories] = useState<StoryList>([]);
  const audioUnlockedRef = useRef(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const LoginReducer = useSelector((state) => state?.LoginReducer);

  const [transientIconState, setTransientIconState] = useState<{
    videoId: string
    icon: 'play' | 'pause'
  } | null>(null)
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [mediaVideo, setMedia] = useState<videoI[] | null>(media);
  const { prefetchBatch } = useUserVideos();
  const { onVideoPlay, onTimeUpdate: trackTimeUpdate, resetVideo } = useVideoMetrics();
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  // Stabilize user object to prevent unnecessary re-renders and WebSocket reconnections
  const user = useMemo(() => {
    // 1. Valores por defecto si no hay nadie logueado
    const defaultUser = {
      username: 'BuzzyUser',
      profile_picture: '/avatar.webp',
      id: null
    };

    // 2. Accedemos a la ruta exacta: LoginReducer -> user
    // (Según tu imagen, los datos están en LoginReducer.user)
    const userData = LoginReducer?.user;
    // 3. Si no existe el objeto user, devolvemos el default
    if (!userData) return defaultUser;

    // 4. Retornamos el usuario combinado
    return {
      ...defaultUser,
      ...userData,
      // Si profile_picture viene vacío o null en la DB, mantenemos el default
      profile_picture: userData.profile_picture || defaultUser.profile_picture
    };

    // IMPORTANTE: Cambiamos la dependencia a LoginReducer.user
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  // --- Fixed State for Viewed Items per Media UUID ---
  const [viewedItems, setViewedItems] = useState<Record<string, boolean>>({});
  // --- New States for Gift System ---
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [showFullGiftMenu, setShowFullGiftMenu] = useState(false);
  // const [giftAnimation, setGiftAnimation] = useState<{ type: string; sender: string; storyUuid: string; phase: 'initial' | 'crazy' | 'explode' | 'reward'; giftId: string } | null>(null);
  const [storyPremiumStates, setStoryPremiumStates] = useState<Record<string, boolean>>({});
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const [storyPremiumStatesSee, setStoryPremiumStatesSee] = useState<Record<string, boolean>>({});
  const [storyPremiumColors, setStoryPremiumColors] = useState<Record<string, string>>({}); // Guardar colores premium por story UUID
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
  const [giftsLoading, setGiftsLoading] = useState(true);
  const [showVideoGiftModal, setShowVideoGiftModal] = useState(false);
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
    amount?: number;
    color_premiun?: string;
  } | null>(null);

  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [carouselDots, setCarouselDots] = useState<{ [key: string]: { index: number; total: number } }>({});
  const [ads, setAds] = useState<any[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState<number | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [shownAds, setShownAds] = useState<Set<string>>(new Set());
  const [lastAdTimestamp, setLastAdTimestamp] = useState<number>(0);
  const [adSequenceCount, setAdSequenceCount] = useState<number>(0);
  const [videoLoopCount, setVideoLoopCount] = useState<Record<string, number>>({});
  const lastVideoTimeRef = useRef<Record<string, number>>({});
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showStoriesBar, setShowStoriesBar] = useState(true);
  const lastFeedScrollTopRef = useRef(0);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // Custom hook for interest-based recommendation tracking
  const { onIntersectionChange, recordInteraction } = useVideoEngagement();

  // Infinite Scroll Trigger based on session interests
  const [isFetchingFeed, setIsFetchingFeed] = useState(false);
  const lastFetchedLengthRef = useRef<number>(0);

  useEffect(() => {
    // Threshold: Trigger when user reaches the 5th video from the end
    const threshold = 5;
    const currentLength = mediaVideo?.length || 0;

    if (activeVideo !== null && mediaVideo && activeVideo >= currentLength - threshold && !isFetchingFeed) {
      // Only fetch if we haven't already attempted to fetch for this specific length
      // or if we have less than 5 videos left to show
      if (currentLength > lastFetchedLengthRef.current) {

        console.log("Fetching next batch of recommendations...");
        setIsFetchingFeed(true);
        lastFetchedLengthRef.current = currentLength;

        getRecommendedFeed()(dispatch)
          .then((res: any) => {
            setIsFetchingFeed(false);
            if (!res || res.length === 0) {
              console.log("End of feed reached or no more content.");
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
  }, [activeVideo, mediaVideo, dispatch, isFetchingFeed]);
  // Removed interestWeights from dependencies to avoid re-triggering the effect 
  // every time a video leaves the view, but they are still captured by the closure 
  // when the fetch actually starts.

  // Ad delivery config from backend
  const [adConfig, setAdConfig] = useState({
    ad_every_nth_video: 3,
    ad_cooldown_seconds: 240,
    ads_refresh_seconds: 300,
  });
  const userGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch delivery config once on mount
  useEffect(() => {
    axios.get(`${getBaseUrl()}api/ads/campaigns/config/`, {
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
    const entries = media.map(v => ({ username: v.user_id.username, excludeId: v.id }))
    prefetchBatch(entries)
  }, [media, prefetchBatch]);

  const { activeIncomingCall, activeOutgoingCall } = useCallStore();
  const isCallActive = activeIncomingCall?.status === 'active' || activeOutgoingCall?.status === 'active';


  const isPlayableAd = (ad: any) => {
    const mediaFile = ad?.creative?.media_file;
    return Boolean(ad?.id && typeof mediaFile === "string" && mediaFile.trim());
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
    try {
      const params: Record<string, any> = {};
      if (userGpsRef.current) {
        params.lat = userGpsRef.current.lat;
        params.lng = userGpsRef.current.lng;
      }
      const response = await axios.get(`${getBaseUrl()}api/ads/campaigns/serve/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params,
      });
      const validAds = Array.isArray(response.data) ? response.data.filter(isPlayableAd) : [];
      setAds(validAds);
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  };

  const isPremiumUser = LoginReducer?.user?.is_buzzy_premium === true;

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
      console.log("mergedFeed: mediaVideo is null");
      return [];
    }
    const feed: any[] = [];
    let adIndex = 0;

    mediaVideo.forEach((video, index) => {
      feed.push({ ...video, type: 'video' });
      // Premium users never see ads in the static feed
      if (!isPremiumUser && (index + 1) % (adConfig.ad_every_nth_video * 5) === 0 && ads[adIndex]) {
        console.log(`Inserting ad at index ${index + 1}`);
        feed.push({ ...ads[adIndex], type: 'ad' });
        adIndex++;
      }
    });

    console.log("mergedFeed total items:", feed.length);
    return feed;
  }, [mediaVideo, ads]);

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

  const ensureAudioForTrack = useCallback(
    (feedItem?: any, videoElement?: HTMLVideoElement | null) => {
      const isVideoPlaying = Boolean(
        videoElement &&
        !videoElement.paused &&
        !videoElement.muted &&
        !isMuted &&
        activeAdIndex === null &&
        viewingStoryUserIndex === null
      );

      if (!isAudioUnlocked || !feedItem || feedItem.type !== 'video' || !feedItem.audio_track_url || !isVideoPlaying) {
        musicAudioRef.current?.pause();
        activeAudioTrackRef.current = null;
        return;
      }

      const audioUrl = feedItem.audio_track_url;
      const volumeMusic = Math.min(Math.max(feedItem.volume_music ?? 0.8, 0), 1);
      const volumeOriginal = Math.min(Math.max(feedItem.volume_original ?? 1.0, 0), 1);
      const trackId = feedItem.audio_track_id || audioUrl;

      // Apply original-audio volume to the video element immediately
      if (videoElement) {
        videoElement.volume = volumeOriginal;
      }

      const trimStart = feedItem.audio_trim_start ?? 0;

      if (
        !musicAudioRef.current ||
        musicAudioRef.current.src !== audioUrl ||
        activeAudioTrackRef.current !== trackId
      ) {
        // Cleanup previous
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
          musicAudioRef.current.onended = null;
        }
        const audio = new Audio(audioUrl);
        audio.loop = false;

        const setTime = () => {
          audio.currentTime = trimStart;
          audio.removeEventListener("loadedmetadata", setTime);
        };
        audio.addEventListener("loadedmetadata", setTime);

        if (audio.readyState >= 1) {
          audio.currentTime = trimStart;
        }

        // Manual loop — always restart from trimStart, never from 0
        audio.onended = () => {
          audio.currentTime = trimStart;
          audio.play().catch(() => { });
        };
        musicAudioRef.current = audio;
        activeAudioTrackRef.current = trackId;
      }

      musicAudioRef.current.volume = volumeMusic;
      musicAudioRef.current.muted = false;
      const playPromise = musicAudioRef.current.play();
      if (playPromise?.catch) {
        playPromise.catch(() => { });
      }
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
      if (ct < prevTime - 0.5 && musicAudioRef.current && feedItem?.audio_track_url) {
        const trimStart = feedItem.audio_trim_start ?? 0;
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
      storyAudioRef.current?.pause();
      storyAudioRef.current = null;
      activeStoryAudioTrackRef.current = null;
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (activeAdIndex !== null && !video.paused) {
        video.pause();
        return;
      }
      if (index === activeVideo && activeAdIndex === null) {
        if (video.paused && (index !== 0 || hasPlayedFirstVideo.current)) {
          video.play().catch(() => { })
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, [activeVideo, activeAdIndex]);

  // Pause active feed video when upload modal opens
  useEffect(() => {
    const onPause = () => {
      videoRefs.current.forEach(v => { if (v && !v.paused) v.pause() })
    }
    const onResume = () => {
      if (activeVideo !== null) {
        const v = videoRefs.current[activeVideo]
        if (v && v.paused) v.play().catch(() => { })
      }
    }
    window.addEventListener('buzzy:pausefeed', onPause)
    window.addEventListener('buzzy:resumefeed', onResume)
    return () => {
      window.removeEventListener('buzzy:pausefeed', onPause)
      window.removeEventListener('buzzy:resumefeed', onResume)
    }
  }, [activeVideo])

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
      if (!groups.has(userId)) {
        groups.set(userId, { ...story, user: story.user, media: story.media ? [...story.media] : [] });
      } else {
        const existing = groups.get(userId);
        if (story.media) existing.media.push(...story.media);
      }
    });
    return Array.from(groups.values());
  }, [stories]);

  // ── Story Audio — direct, clean approach ──────────────────────────────────
  useEffect(() => {
    // Tear down any previous audio before starting the next story
    stopStoryAudio(false);

    if (viewingStoryUserIndex === null || isStoryPaused || isMuted) return;

    const currentGroup = groupedStories[viewingStoryUserIndex];
    if (!currentGroup) return;
    const currentStoryItem = currentGroup.media?.[currentStoryItemIndex];
    if (!currentStoryItem) return;

    // Find the correct story for THIS media item (important for multi-story users)
    const originalStory = (stories as Story[])?.find((s) => s.id === currentStoryItem.story);
    if (!originalStory?.audio_track_url) return;

    const trimStart = originalStory.audio_trim_start ?? 0;
    const trimEnd = originalStory.audio_trim_end ?? null;
    const volume = Math.min(Math.max(originalStory.audio_volume_music ?? 0.8, 0), 1);

    // Silence the story video's native audio if we have a custom track
    const videoEl = storyVideoRef.current;
    if (videoEl) videoEl.volume = 0;

    const audio = new Audio(originalStory.audio_track_url);
    audio.loop = false;
    audio.preload = "auto";
    // Start muted — browsers always allow muted audio to play regardless of autoplay policy
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

    const requestId = storyAudioRequestIdRef.current;
    const beginPlay = () => {
      if (requestId !== storyAudioRequestIdRef.current) return;
      audio.currentTime = trimStart;
      audio.muted = true; // muted = always autoplay allowed
      audio.play().then(() => {
        if (requestId !== storyAudioRequestIdRef.current) {
          audio.pause();
          return;
        }
        // Once playing, immediately unmute to hear the sound
        audio.muted = false;
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
        // If even muted play fails, retry on next click (very rare)
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
    activeStoryAudioTrackRef.current = originalStory.audio_track_url;

    return () => {
      if (storyAudioRef.current === audio) {
        stopStoryAudio(false);
      } else {
        audio.pause();
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.src = "";
        audio.load();
      }
    };
  }, [viewingStoryUserIndex, currentStoryItemIndex, groupedStories, stories, isStoryPaused, isMuted, stopStoryAudio]);

  useEffect(() => {
    sendAudioRef.current = new Audio(sendMessageSound);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (!sendAudioRef.current || audioUnlockedRef.current) return;

      sendAudioRef.current
        .play()
        .then(() => {
          sendAudioRef.current!.pause();
          sendAudioRef.current!.currentTime = 0;
          audioUnlockedRef.current = true;
          setIsAudioUnlocked(true);
          console.log("🔓 Audio desbloqueado");
        })
        .catch(() => { });

      typingAudioRef.current
        ?.play()
        .then(() => {
          typingAudioRef.current!.pause();
          typingAudioRef.current!.currentTime = 0;
        })
        .catch(() => { });

      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    isGiftsRef.current = isGifts;
  }, [isGifts]);
  useEffect(() => {
    chatSocketActiveRef.current = !!selectedChat;
  }, [selectedChat]);

  // Función para convertir nombres de colores a valores RGB/hex con colores MÁS INTENSOS
  const getColorValue = (colorName: string | undefined): { hex: string; rgb: string; rgba: (opacity: number) => string } => {
    if (!colorName) {
      // Color por defecto (azul intenso)
      return {
        hex: '#00f0ff',
        rgb: 'rgb(0, 240, 255)',
        rgba: (opacity: number) => `rgba(0, 240, 255, ${opacity})`
      };
    }

    // Colores originales con ligero aumento de intensidad
    const colorMap: Record<string, { hex: string; rgb: string }> = {
      red: { hex: '#ef4444', rgb: 'rgb(239, 68, 68)' },
      blue: { hex: '#3b82f6', rgb: 'rgb(59, 130, 246)' },
      green: { hex: '#10b981', rgb: 'rgb(16, 185, 129)' },
      yellow: { hex: '#fbbf24', rgb: 'rgb(251, 191, 36)' }, // Un poco más brillante que el original
      purple: { hex: '#a855f7', rgb: 'rgb(168, 85, 247)' },
      pink: { hex: '#ec4899', rgb: 'rgb(236, 72, 153)' },
      orange: { hex: '#f97316', rgb: 'rgb(249, 115, 22)' },
      cyan: { hex: '#06b6d4', rgb: 'rgb(6, 182, 212)' },
      indigo: { hex: '#6366f1', rgb: 'rgb(99, 102, 241)' },
      gold: { hex: '#fbbf24', rgb: 'rgb(251, 191, 36)' },
      multi: { hex: '#ff00ff', rgb: 'rgb(255, 0, 255)' },
      rainbow: { hex: '#9333ea', rgb: 'rgb(147, 51, 234)' },
    };

    const color = colorMap[colorName.toLowerCase()];
    if (color) {
      // Extraer valores RGB del hex para crear rgba
      const hex = color.hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      return {
        hex: color.hex,
        rgb: color.rgb,
        rgba: (opacity: number) => `rgba(${r}, ${g}, ${b}, ${opacity})`
      };
    }

    // Si el color viene en formato hex, usarlo directamente
    if (colorName.startsWith('#')) {
      const hex = colorName.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      return {
        hex: colorName,
        rgb: `rgb(${r}, ${g}, ${b})`,
        rgba: (opacity: number) => `rgba(${r}, ${g}, ${b}, ${opacity})`
      };
    }

    // Color por defecto si no se reconoce
    return {
      hex: '#00f0ff',
      rgb: 'rgb(0, 240, 255)',
      rgba: (opacity: number) => `rgba(0, 240, 255, ${opacity})`
    };
  };

  // ─── WebSocket events (via singleton context) ─────────────────────────────

  useWsEvent("like_updated", useCallback((data: any) => {
    setMedia(prev =>
      prev
        ? prev.map(video =>
          video.id === data.video_id
            ? { ...video, like_count: data.likes, liked: data.liked }
            : video
        )
        : prev
    );
  }, [setMedia]));

  useWsEvent("gift_received", useCallback((data: any) => {
    const giftEntry = {
      type: data.gift_type, giftId: data.gift_uuid, storyUuid: data.story_uuid,
      sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
    };
    const normalizeGiftList = (value: any) => (Array.isArray(value) ? value : []);
    if (user.id == data.from_user) {
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
    // Usar ref para evitar TDZ — currentStoryUuid se declara más abajo en el módulo
    if (currentStoryUuidRef.current === data.story_uuid) {
      setGiftRecived(prev => {
        const current = normalizeGiftList(prev);
        return current.some(g => g.uuid === data.gift_uuid) ? current : [...current, giftEntry];
      });
    }
  }, [user.id, setGiftAnimation, setIsGift, setGiftRecived]));

  useWsEvent("video_gift_received", useCallback((data: any) => {
    if (user.id == data.from_user || activeVideo !== null) {
      setGiftAnimation({
        type: data.gift_type, giftId: data.gift_uuid, videoId: data.video_id,
        sender: data.sender, amount: data.amount || 1, gift: data.gift_video,
        color_premiun: data.color_premiun,
      });
    } else {
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
    setMedia(prev =>
      prev ? prev.map(video =>
        video.id === data.video_id
          ? { ...video, comments_count: data.comments_count }
          : video
      ) : prev
    );
    if (currentVideoId?.toString() === data.video_id?.toString()) {
      setComments(prev => upsertComment(prev, data));
    }
  }, [currentVideoId, setMedia, upsertComment]));

  useWsEvent("new_view", useCallback((data: any) => {
    setMedia(prev =>
      prev ? prev.map(video =>
        video.id === data.video_id ? { ...video, view_acount: data.view_acount } : video
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

  // Reset scroll to top on mount so stories bar is always visible on reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = 0;
    }
    lastFeedScrollTopRef.current = 0;
    setShowStoriesBar(true);
  }, []);

  const hasFetchedStories = useRef(false);
  // Cargar stories solo una vez al montar el componente
  useEffect(() => {
    if (hasFetchedStories.current) return;
    hasFetchedStories.current = true;

    getActiveStories()(dispatch).then((res: any) => {
      setStories(Array.isArray(res) ? res : []);
    });
  }, [dispatch]); // Solo depende de dispatch que es estable

  const handleCommentClick = (index: number) => {
    if (mediaVideo && mediaVideo[index]) {
      const videoId = mediaVideo[index].id.toString();
      setCurrentVideoId(videoId);
      setComments(null); // Limpiar comentarios previos inmediatamente
      setShowCommentsModal(true);
      getComment({ video_id: mediaVideo?.[index]?.uuid?.toString() ?? "" })(dispatch).then((res: any) => {
        setComments(Array.isArray(res) ? res : [])
        console.log("Comentarios cargados:", res);
      })
    }
  }
  const handlePostComment = (parent_uuid?: string, audioBlob?: Blob, audioDuration?: number, imageFile?: File) => {
    if (!commentText.trim() && !audioBlob && !imageFile) return;
    if (!currentVideoId) return;

    // Record interaction for recommendation system
    const videoItem = mediaVideo?.find(v => v.id.toString() === currentVideoId);
    if (videoItem) {
      recordInteraction(videoItem.category?.id || videoItem.category || null);
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
      });
  };

  // Refs para throttling de actualizaciones de progreso de videos del grid
  const lastVideoProgressUpdate = useRef<Record<string, number>>({});
  const videoProgressUpdateInterval = 200; // Actualizar solo cada 200ms (5 veces por segundo)

  const handleVideoProgress = useCallback((e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoElement = e.currentTarget;
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;

    const now = Date.now();
    const lastUpdate = lastVideoProgressUpdate.current[videoId] || 0;

    // Throttle: solo actualizar si ha pasado el intervalo
    if (now - lastUpdate < videoProgressUpdateInterval) {
      return;
    }
    lastVideoProgressUpdate.current[videoId] = now;

    // Monetization tracking — 50% mark, min 10s for monetizable
    trackTimeUpdate(videoId, currentTime, duration);

    // Solo actualizar si el cambio es significativo (más de 0.5 segundos)
    const currentProgress = videoProgress[videoId] || 0;
    if (Math.abs(currentTime - currentProgress) > 0.5 || currentTime === 0) {
      setVideoProgress(prev => ({
        ...prev,
        [videoId]: currentTime
      }));
    }

    if (videoDuration[videoId] !== duration && isFinite(duration)) {
      setVideoDuration(prev => ({
        ...prev,
        [videoId]: duration
      }));
    }
    const viewThreshold = isFinite(duration) && duration > 0 && duration < 10
      ? duration * 0.8
      : 10;
    if (videoElement.currentTime >= viewThreshold && !viewedVideos.has(videoId)) {
      createView({ video_id: videoId })(dispatch)
        .then((res: any) => console.log("API View Response:", res))
        .catch((err: any) => console.error("API View Error:", err));
      setViewedVideos((prev) => {
        const newSet = new Set(prev instanceof Set ? prev : []);
        newSet.add(videoId);
        return newSet;
      });
    }
  }, [videoProgress, videoDuration, viewedVideos, dispatch, trackTimeUpdate]);
  const handleSeek = (videoId: string, newTime: number) => {
    const index = mediaVideo?.findIndex(v => v.id?.toString() === videoId);
    if (index === undefined || index === -1) return;
    const videoElement = videoRefs.current[index];
    if (videoElement) {
      videoElement.currentTime = newTime;
      setVideoProgress(prev => ({
        ...prev,
        [videoId]: newTime
      }));
    }
  };
  const handleFollowClick = (userIdToFollow: number, userIdAsString: string, actions: "create" | "delete") => {
    if (!userIdToFollow) {
      return;
    }
    createFollower({ follower_user_id: userIdToFollow.toString() })(dispatch)
      .then(() => {
        setFollowingState((prev) => ({
          ...prev,
          [userIdAsString]: actions == "delete" ? false : true,
        }));
      })
      .catch((err: any) => {
        console.error("❌ Error al crear el seguidor:", err);
      });
  };
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          const index = videoRefs.current.findIndex((ref) => ref === video)
          const videoItem = mergedFeed[index];

          if (entry.isIntersecting) {
            // Track intersection for recommendation system
            if (videoItem && videoItem.type === 'video') {
              onIntersectionChange(videoItem.id, true, videoItem.category?.id || videoItem.category || null);
            }

            // First video starts paused — user must tap to play
            if (index === 0 && !hasPlayedFirstVideo.current) {
              video.pause()
            } else if (activeAdIndex !== index) {
              video.play().catch(() => {/* Autoplay ignored */ })
            }
            setActiveVideo(index)
            // Reset loop count for this video when it comes into view
            const vidId = mergedFeed[index]?.type === 'video' ? mergedFeed[index].id?.toString() : `ad-${mergedFeed[index].id}`;
            if (vidId) {
              setVideoLoopCount(prev => ({ ...prev, [vidId]: 0 }));
              lastVideoTimeRef.current[vidId] = 0;
            }
          } else {
            // Track leaving view
            if (videoItem && videoItem.type === 'video') {
              onIntersectionChange(videoItem.id, false, videoItem.category?.id || videoItem.category || null);
            }
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
  }, [mergedFeed, activeAdIndex, onIntersectionChange])
  // --- New Effect to Pause Videos When Story Modal Opens ---
  useEffect(() => {
    if (viewingStoryUserIndex !== null) {
      // Pause all main videos when story modal opens
      videoRefs.current.forEach((video) => {
        if (video && !video.paused) {
          video.pause();
        }
      });
      setIsGridVideoPlaying({});
    }
  }, [viewingStoryUserIndex]);
  const handleVideoClick = (index: number) => {
    if (activeAdIndex !== null) return;
    const videoElement = videoRefs.current[index];
    if (!videoElement) return;
    if (videoElement.paused) {
      if (index === 0) hasPlayedFirstVideo.current = true;
      videoElement.play().catch(error => {
        console.error("Error al reproducir el video:", error);
      });
    } else {
      videoElement.pause();
    }
  };
  const handleLikeClick = (videoId: string, index: number) => {
    // Record interaction for recommendation system
    const videoItem = mediaVideo?.[index];
    if (videoItem) {
      recordInteraction(videoItem.category?.id || videoItem.category || null);
    }

    createLike({ video_id: videoId })(dispatch).then((res: any) => {
      console.log("Like action dispatched for video ID:", res);
    }).catch((error: any) => {
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
    }, 1000);
  };
  const iconTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleGridVideoToggle = (videoId: string, videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    const isActuallyPlaying = isGridVideoPlaying[videoId] ?? !videoElement.paused;
    if (iconTimeoutRef.current) {
      clearTimeout(iconTimeoutRef.current);
      iconTimeoutRef.current = null;
      setTransientIconState(null);
    }
    const newPlayingState = !isActuallyPlaying;
    const iconToShow = newPlayingState ? 'play' : 'pause';
    if (newPlayingState) {
      videoRefs.current.forEach((ref, index) => {
        const currentVideoId = mediaVideo?.[index]?.id?.toString();
        if (ref && currentVideoId && currentVideoId !== videoId && isGridVideoPlaying[currentVideoId]) {
          ref.pause();
          setIsGridVideoPlaying(prev => ({ ...prev, [currentVideoId]: false }));
        }
      });
    }
    if (newPlayingState) {
      videoElement.play().catch(error => {
        console.error("Error al reproducir el video:", error);
      });
    } else {
      videoElement.pause();
    }
    setIsGridVideoPlaying((prev) => ({
      ...prev,
      [videoId]: newPlayingState,
    }));
    setTransientIconState({ videoId: videoId, icon: iconToShow });
    iconTimeoutRef.current = setTimeout(() => {
      setTransientIconState(null);
    }, 1000);
  };
  const toggleMute = () => setIsMuted(!isMuted)
  // --- Logic for Create History ---
  const handleAddHistory = () => {
    // We click the hidden input element programmatically
    fileInputRef.current?.click();
  }
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo es demasiado grande (Max 50MB)");
      return;
    }
    // Open editor instead of uploading directly
    setStoryEditorFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleStoryPublish = async (
    file: File,
    caption: string,
    music?: any,
    filterCss?: string,
    textLayers: any[] = [],
    stickerLayers: any[] = [],
  ) => {
    setIsUploadingStory(true);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', caption || '');
    if (filterCss && filterCss !== "none") {
      formData.append('filter_css', filterCss);
    }
    formData.append('text_layers', JSON.stringify(textLayers));
    formData.append('sticker_layers', JSON.stringify(stickerLayers));
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
      alert("Error al subir la historia. Inténtalo de nuevo.");
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
  const closeStoryViewer = () => {
    stopStoryAudio(true);
    setViewingStoryUserIndex(null);
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
  };
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
    console.log(currentGroup.user, user)
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

        getRecivedGift(currentStoryUuid)(dispatch).then((res) => {
          setGiftRecived(Array.isArray(res) ? res : []);
        })

      }
      setShowViewersModal(true);
    }
  };

  const [storyLikedStates, setStoryLikedStates] = useState<{ [key: string]: boolean }>({});
  const [storyLikeCounts, setStoryLikeCounts] = useState<{ [key: string]: number }>({});
  const [showStoryLikeAnimation, setShowStoryLikeAnimation] = useState<{ [key: string]: boolean }>({});

  const [gifts, setGifts] = useState<GiftI[]>([]);

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
    }, 1000);
    // Dispatch action
    likeStory({ story_uuid: storyId })(dispatch).then((res: any) => {
      console.log("Like story action dispatched:", res);
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

  const handleGiftClick = () => {
    if (currentStoryUuid) {
      setIsStoryPaused(true);
      if (storyVideoRef.current && !storyVideoRef.current.paused) {
        storyVideoRef.current.pause();
      }
      setShowGiftMenu(true);
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
        video: gift.video ? `${getBaseUrl()}${gift.video}` : "",
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
            video: gift.video ? `${getBaseUrl()}${gift.video}` : "",
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
    const isMyStory = currentStory?.user?.id === user.id;

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
    let giftId: string | null = null
    let sound: string | null = null
    let cost: string | number | null = null
    if (typeof giftTypeOrGift === 'string') {
      // Legacy for category gifts
      giftId = giftTypeOrGift;
      type = giftTypeOrGift;
      cost = amount || 0;
    } else {
      // For full gifts
      giftId = giftTypeOrGift.slug;
      type = giftTypeOrGift.emoji;
      cost = giftTypeOrGift.token_price;
      sound = giftTypeOrGift.video
    }
    console.log(sound)
    console.log(giftId)

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
    setShowVideoGiftModal(true);
    console.log("==============")
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
      gift.sender === viewer.user_id
    ) || [];
  }, [giftRecived]);

  console.log(giftRecived, isGifts, "===2==")

  const showGiftRecived = (viewer: any) => {
    console.log("1", viewer, giftRecived)
    const gifts = giftRecived?.filter((gift: any) => {
      if (gift.sender === viewer.user_id) {
        return gift;
      }
    }
    ) || [];
    // Asegúrate de que haya al menos un regalo

    if (gifts && gifts.length > 0) {
      const firstGiftId = gifts[0].id;
      // Usar Redux si ya tenemos el gift, sino hacer la llamada
      if (oneActiveGift && oneActiveGift.length > 0) {
        // Ya tenemos el gift en Redux

        // gifts.splice(0, 1);
      } else {
        getOneActiveGift(firstGiftId, currentStoryUuid)(dispatch).then(() => {
          //   setGifts((gift)=>{
          //   return [...gift, res]
          // })
        });
      }
    } else {
      console.log("Este viewer no ha enviado regalos aún");
    }
  }

  const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const previousScrollTop = lastFeedScrollTopRef.current;
    const scrollDelta = currentScrollTop - previousScrollTop;

    if (currentScrollTop <= 8) {
      setShowStoriesBar(true);
    } else if (scrollDelta > 6) {
      setShowStoriesBar(false);
    } else if (scrollDelta < -6) {
      setShowStoriesBar(true);
    }

    lastFeedScrollTopRef.current = currentScrollTop;
  };


  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white font-sans">
      {/* Story Editor */}
      <AnimatePresence>
        {storyEditorFile && (
          <StoryEditor
            file={storyEditorFile}
            onPublish={handleStoryPublish}
            onClose={() => setStoryEditorFile(null)}
            isUploading={isUploadingStory}
          />
        )}
      </AnimatePresence>

      {/* Hidden Input for File Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
      />
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black  opacity-80"></div>
        <div className="absolute inset-0 bg-black opacity-[0.03]"></div>
        <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div>
      </div>
      <main
        ref={mainRef}
        className="flex h-screen w-full flex-col overflow-hidden pt-24 pb-[calc(env(safe-area-inset-bottom)+3rem)]"
      >
        {/* Stories Bar */}
        <div
          className={`w-full transition-opacity duration-100 ${showStoriesBar ? "opacity-100" : "opacity-0 h-0 overflow-hidden pointer-events-none"}`}
        >
          <div>
            <div className="flex gap-2 px-2 py-2 snap-x ">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center gap-1 min-w-[52px] cursor-pointer snap-start relative group"
                onClick={handleAddHistory}
              >
                <div className="relative">
                  <div className={`relative h-[40px] w-[40px] rounded-full p-[2px] bg-[#0c1033] ${isUploadingStory ? 'animate-pulse' : ''}`}>
                    <img
                      src={getMediaUrl(user.profile_picture)}
                      className={`w-full h-full rounded-full object-cover filter ${isUploadingStory ? 'brightness-50' : 'brightness-90 group-hover:brightness-100'} transition-all`}
                      alt="Tu historia"
                    />
                    {isUploadingStory ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#00f0ff] animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 bg-[#00f0ff] text-[#050718] rounded-full p-0.5 border-2 border-[#0c1033] group-hover:scale-110 transition-transform shadow-lg shadow-[#00f0ff]/20">
                        <Plus size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-gray-300 font-medium truncate w-[52px] text-center group-hover:text-white">
                  {isUploadingStory ? t('common:actions.uploading') : t('videos:feed.yourStory')}
                </span>
              </motion.div>
              {/* Using groupedStories to display one bubble per User */}
              {groupedStories.map((story, i) => {

                const seen = false;
                // const username = `User ${story.user.username}`;
                return (
                  <motion.div
                    key={story.id || i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="flex flex-col items-center gap-1 min-w-[52px] cursor-pointer snap-start group"
                    onClick={() => handleStoryClick(i)}
                  >
                    <div className="relative">
                      {!seen ? (
                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#7000ff] via-[#ff0099] to-[#00f0ff] opacity-80 group-hover:opacity-100 blur-[0.5px] animate-spin-slow"></div>
                      ) : (
                        <div className="absolute inset-0 rounded-full border border-[#2a2f5e]"></div>
                      )}
                      <div className="relative h-[40px] w-[40px] rounded-full p-[2px] bg-[#050718]">
                        <img
                          src={getMediaUrl(story.user.profile_picture)}
                          className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={story.user.username}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-medium truncate w-[52px] text-center ${seen
                        ? "text-gray-500"
                        : "text-gray-300 group-hover:text-[#00f0ff] transition-colors"
                        }`}
                    >
                      {story.user.username}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        <section className="flex-1 min-h-0">
          <div
            ref={feedScrollRef}
            className="flex h-full flex-col overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory"
            onScroll={handleFeedScroll}
          >
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
              const isExpanded = expandedDescriptions[videoId];

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

              const { content: truncatedContent, needsTruncation } = renderDescriptionWithMentions(data.description || "", !isExpanded);
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
                <motion.div
                  key={videoId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="relative h-full min-h-full snap-start snap-always rounded-t-xl rounded-b-none border border-[#2a2f5e]/30 shadow-2xl shadow-black/50"
                >
                  <HorizontalCarousel
                    video={data}
                    feedIndex={index}
                    isActive={activeVideo === index}
                    isMuted={isMuted}
                    isExpanded={!!expandedDescriptions[videoId]}
                    feedScrollRef={feedScrollRef}
                    onLike={(_uuid, id) => createLike({ video_id: id })(dispatch)}
                    onComment={(uuid, id) => {
                      setComments(null)
                      setCurrentVideoId(String(id))
                      setShowCommentsModal(true)
                      getComment({ video_id: uuid })(dispatch).then((res: any) => {
                        setComments(Array.isArray(res) ? res : [])
                      })
                    }}
                    onGift={(id) => handleVideoGiftClick(id)}
                    onSlideChange={(idx, total) => setCarouselDots(prev => ({ ...prev, [videoId]: { index: idx, total } }))}
                  >
                    <div className="absolute inset-0 rounded-t-xl rounded-b-none overflow-hidden pt-0 group">

                      <div className="relative h-full w-full rounded-t-xl rounded-b-none overflow-hidden bg-black">
                        {data.media_type === 'image' ? (
                          <img
                            src={data.video}
                            className="h-full w-full object-cover border-[#00f0ff]/5"
                            alt="Feed Content"
                            onClick={() => handleVideoClick(index)}
                          />
                        ) : (
                          <video
                            ref={(el) => { if (el) videoRefs.current[index] = el }}
                            src={activeVideo === index || Math.abs((activeVideo ?? 0) - index) <= 1 ? (data.video?.startsWith("http") ? data.video : getMediaUrl(data.video)) : undefined}
                            poster={data.thumbnail_url?.startsWith("http") ? data.thumbnail_url : getMediaUrl(data.thumbnail_url)}
                            preload={activeVideo === index ? "auto" : "none"}
                            muted={isMuted || activeAdIndex === index}
                            loop
                            playsInline
                            className="h-full w-full object-cover border-[#00f0ff]/5"
                            onClick={() => handleVideoClick(index)}
                            onPlay={() => onVideoPlay(videoId)}
                            onEnded={() => resetVideo(videoId)}
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
                                  if (currentCount >= 3) {
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
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050718] via-[#050718]/10 to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={() => handleGridVideoToggle(videoId, videoRefs.current[index])}>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <AnimatePresence>
                            {transientIconState?.videoId === videoId && (
                              <motion.div
                                key={`transient-icon-${data.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                              >
                                <motion.div
                                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-md"
                                >
                                  {transientIconState.icon === 'play' ? (
                                    <Play className="h-6 w-6 text-white" fill="white" />
                                  ) : (
                                    <Pause className="h-6 w-6 text-white" fill="white" />
                                  )}
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {data.media_type === 'video' && data.audio_track_title && activeVideo === index && !isExpanded && (
                          <div className="pointer-events-none absolute z-40 top-3 left-0 right-0 flex justify-center px-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full max-w-[70%]"
                              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,240,255,0.18)', overflow: 'hidden' }}>
                              <Music2 className="h-3 w-3 text-cyan-400 shrink-0" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 truncate">
                                {clampWords(data.audio_track_title, 4)}
                              </span>
                              {data.audio_track_artist && (
                                <>
                                  <span className="text-cyan-400/50 text-[10px] shrink-0">·</span>
                                  <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-300/80 truncate">
                                    {clampWords(data.audio_track_artist, 3)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        {!isExpanded && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="h-9 w-9 flex items-center justify-center rounded-full text-white drop-shadow-lg pointer-events-auto absolute top-3 right-2 z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMute()
                            }}
                          >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </motion.button>
                        )}

                        {/* INICIO DEL CONTENEDOR DE METADATOS INFERIOR UNIFICADO */}
                        <div className={`absolute -bottom-6 left-0 right-0 px-1 pt-16 pb-[calc(env(safe-area-inset-bottom)+2.2rem)] pointer-events-none flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/20 to-transparent ${isExpanded ? 'z-[80]' : 'z-20'}`}>

                          <div className="flex flex-col gap-4 pointer-events-auto max-w-[100%]">
                            {/* DOTS carrusel — siempre 15px encima del nombre */}
                            {carouselDots[videoId] && carouselDots[videoId].total > 1 && (
                              <div className="flex justify-center gap-1.5 pointer-events-none mb-[-6px]">
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

                            {/* 2. PERFIL DE USUARIO */}
                            <div className="flex w-full items-center pr-14">
                              <div className="flex min-w-0 items-center">
                                <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 group">
                                  <img
                                    className="h-full w-full object-cover rounded-full border border-white/20"
                                    src={getMediaUrl(data.user_id?.profile_picture) || getMediaUrl("profile_pics/avatar.webp")}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${index}`;
                                    }}
                                    alt={data.user_id?.username}
                                  />
                                  <div className="absolute inset-0 rounded-full border-2 border-white/5 pointer-events-none" />

                                  {!isMuted && videoRefs.current[index]?.paused === false && (
                                    <motion.div
                                      className="absolute inset-0 rounded-full border-4 border-[#00f0ff]/60"
                                      animate={{
                                        boxShadow: [
                                          "0 0 0 0 rgba(0, 240, 255, 0)",
                                          "0 0 20px 4px rgba(0, 240, 255, 0.4)",
                                          "0 0 0 0 rgba(0, 240, 255, 0)",
                                        ],
                                        scale: [1, 1.05, 1],
                                      }}
                                      transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        repeatType: "loop",
                                        ease: "easeInOut",
                                      }}
                                    />
                                  )}
                                </div>
                                <Link
                                  className="ml-3 max-w-[20ch] flex-shrink-0 overflow-hidden whitespace-nowrap text-white font-bold text-shadow-md hover:text-[#00f0ff] transition-colors"
                                  to={`/profile/${data.user_id?.username}`}
                                >
                                  @{String(data.user_id?.username || "").slice(0, 20)}
                                </Link>
                                <AnimatePresence mode="wait">
                                  {data.user_id.username !== user.username && (
                                    (!followingState[data.user_id.id.toString()] && !data.current_user_followered) ? (
                                      <motion.button
                                        key="inline-follow"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                        whileTap={{ scale: 0.95 }}
                                        className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center text-white/95 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "create");
                                        }}
                                        aria-label={`${t('videos:actions.follow')} ${data.user_id?.username}`}
                                        title={t('videos:actions.follow')}
                                      >
                                        <UserPlus className="h-4 w-4 text-white" strokeWidth={2.4} />
                                      </motion.button>
                                    ) : (
                                      <motion.button
                                        key="inline-following"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                        className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center text-white/95 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "delete");
                                        }}
                                        aria-label={`${t('videos:actions.following')} ${data.user_id?.username}`}
                                        title={t('videos:actions.following')}
                                      >
                                        <UserCheck className="h-4 w-4 text-white" strokeWidth={2.4} />
                                      </motion.button>
                                    )
                                  )}
                                </AnimatePresence>
                              </div>

                            </div>

                            {/* 1. SECCIÓN DE DESCRIPCIÓN DEL VIDEO (Manejo de @mentions) */}
                            {data.description && (
                              <motion.div
                                className={`
                                 backdrop-blur-md border border-white/10 bg-white/5 shadow-2xl transition-all duration-500 ease-in-out
                                ${isExpanded
                                    ? 'p-4 max-h-[60vh] overflow-hidden shadow-2xl z-30 w-full'
                                    : 'p-2  max-h-[120px] overflow-hidden cursor-pointer hover:bg-white/10'
                                  }
                              `}
                                onClick={(e) => {
                                  if (!isExpanded) {
                                    e.stopPropagation();
                                    handleToggleDescription(videoId);
                                  }
                                }}
                                initial={false}
                                animate={{
                                  scale: isExpanded ? 1.02 : 1,
                                  y: isExpanded ? -5 : 0
                                }}
                              >
                                <div className="text-[13px] leading-relaxed text-white/95 drop-shadow-sm font-light">
                                  {isExpanded && (
                                    <div className="flex justify-center mb-3">
                                      <div
                                        className="w-10 h-1 bg-white/30 rounded-full cursor-pointer hover:bg-[#00f0ff]/60 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleDescription(videoId);
                                        }}
                                      ></div>
                                    </div>
                                  )}

                                  {isExpanded ? (
                                    <div className="flex flex-col gap-2">
                                      <p className="whitespace-pre-wrap">{fullContent}</p>
                                      <button
                                        className="text-[#00f0ff] text-xs font-semibold mt-2 self-start hover:underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleDescription(videoId);
                                        }}
                                      >
                                        Ocultar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center">
                                      <span>{truncatedContent}</span>
                                      {needsTruncation && (
                                        <span
                                          className="ml-1 text-[#00f0ff] font-bold text-[11px]"
                                        >
                                          ... ver más
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Hashtags */}
                                {data.tags && data.tags.tags && Array.isArray(data.tags.tags) && (
                                  <div className={`flex flex-wrap gap-2 mt-2 ${isExpanded ? 'opacity-100' : 'opacity-80'}`}>
                                    {data.tags.tags.map((tag: any, i: number) => (
                                      <span key={i} className="text-[11px] font-medium text-[#00f0ff] hover:text-white transition-colors">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
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
                                animate={{ scale: data.liked ? [1, 1.3, 1] : 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${data.liked
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-white/10 text-white"
                                  }`}
                              >
                                <Heart
                                  className={`h-5 w-5 ${data.liked ? "fill-red-900 text-red-500" : "text-white"
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
                                        initial={{
                                          opacity: 1,
                                          y: 0,
                                          x: 0,
                                          scale: 0.5,
                                        }}
                                        animate={{
                                          opacity: 0,
                                          y: -50 - Math.random() * 50,
                                          x: (Math.random() - 0.5) * 40,
                                          scale: 1.5,
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                          duration: 1 + Math.random() * 0.5,
                                        }}
                                        className="absolute text-red-500"
                                        style={{
                                          top: "50%",
                                          left: "50%",
                                          transform: "translate(-50%, -50%)",
                                        }}
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
                                  {activeVideo === index && (data.comments_count || 0) > 0 && (
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
                              whileHover={{ scale: 1.1 }}
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
                          <div className={`
                              absolute right-1 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] flex flex-col items-center gap-3
                              pb-[env(safe-area-inset-bottom)+50px]
                              transition-all duration-300
                              ${isExpanded ? 'pointer-events-none z-[65] opacity-0' : 'pointer-events-auto z-[70] opacity-100'}
                            `}>

                            {/* Like */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLikeClick((videoId || "1"), index)
                              }}
                              className="relative flex flex-col items-center gap-1"
                            >
                              <motion.div
                                animate={{ scale: data.liked ? [1, 1.3, 1] : 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${data.liked
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-white/10 text-white"
                                  }`}
                              >
                                <Heart
                                  className={`h-5 w-5 ${data.liked ? "fill-red-900 text-red-500" : "text-white"
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
                                        initial={{
                                          opacity: 1,
                                          y: 0,
                                          x: 0,
                                          scale: 0.5,
                                        }}
                                        animate={{
                                          opacity: 0,
                                          y: -50 - Math.random() * 50,
                                          x: (Math.random() - 0.5) * 40,
                                          scale: 1.5,
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                          duration: 1 + Math.random() * 0.5,
                                        }}
                                        className="absolute text-red-500"
                                        style={{
                                          top: "50%",
                                          left: "50%",
                                          transform: "translate(-50%, -50%)",
                                        }}
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

                            {/* Gift */}
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoGiftClick(data.id);
                              }}
                              className="flex flex-col items-center relative"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              animate={{
                                scale: [1, 1.04, 1],
                                rotate: [0, -4, 4, -4, 4, 0],
                              }}
                              transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                repeatDelay: 12,
                              }}
                            >
                              <div className={`
                                  flex h-7 w-8 items-center justify-center rounded-full
                                  bg-gradient-to-br from-pink-500/35 to-purple-500/25
                                  backdrop-blur-md border border-pink-400/40 shadow-md
                                `}>
                                {/* Tu SVG del gift (más pequeño) */}
                                <svg data-v-92f2660e width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox" data-v-92f2660e=""><g id="Base" data-v-92f2660e=""><g id="bottom" data-v-92f2660e=""><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)" data-v-92f2660e=""></path></g></g><g id="top" data-v-92f2660e=""><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white" data-v-92f2660e=""></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)" data-v-92f2660e=""></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black" data-v-92f2660e=""></path></g></g><defs data-v-92f2660e=""><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop data-v-92f2660e=""></stop><stop offset="1" stopOpacity="0" data-v-92f2660e=""></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop stopColor="#FF879D" data-v-92f2660e=""></stop><stop offset="0.326625" stopColor="#FF4F64" data-v-92f2660e=""></stop><stop offset="1" stopColor="#E54659" data-v-92f2660e=""></stop></linearGradient></defs></svg>
                              </div>
                              <span className="text-[10px] mt-0.5 text-pink-300/90 font-medium drop-shadow-md">
                                {t('videos:actions.sendGift')}
                              </span>
                            </motion.button>

                          </div>


                        </div>
                        {/* 4. BARRA DE PROGRESO DE VIDEO PEGADA ABAJO */}
                        {videoDuration[videoId] > 0 && (
                          (() => {
                            const progressPercentage = ((videoProgress[videoId] || 0) / (videoDuration[videoId] || 1)) * 100;
                            const progressStyle = {
                              '--progress': `${progressPercentage}%`
                            } as React.CSSProperties;
                            return (
                              <div className="pointer-events-none absolute -bottom-1 left-1 right-1 z-30">
                                <input
                                  type="range"
                                  min="0"
                                  max={videoDuration[videoId] || 0}
                                  value={videoProgress[videoId] || 0}
                                  step="0.1"
                                  className="pointer-events-auto h-1.5 w-full appearance-none cursor-pointer range-slider !bg-transparent hover:h-2 transition-height duration-150"
                                  onChange={(e) => handleSeek(videoId, parseFloat(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  style={progressStyle}
                                />
                              </div>
                            );
                          })()
                        )}
                        {/* FIN DEL CONTENEDOR DE METADATOS INFERIOR UNIFICADO */}

                      </div>
                    </div>
                  </HorizontalCarousel>
                </motion.div>
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
            className={`fixed inset-0 z-50 bg-[#050718] flex flex-col ${(storyPremiumStates[currentStoryUuid || ""] || storyPremiumStatesSee[currentStoryUuid || ""]) ? 'story-premium' : ''}`} // Premium class
          >
            {/* Dynamic Story Content Background (Blurred) - Can use first frame of video or image */}
            {/* <div className="absolute inset-0 z-0 opacity-30 blur-3xl">
                 {isVideoContent(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file) ? (
                    <video
                        src={`${getBaseUrl()}${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                        className="w-full h-full object-cover"
                    />
                 ) : (
                    <img
                        src={`${getBaseUrl()}${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                 )}
            </div> */}
            {/* Premium Tag if active - Dynamic color (slightly stronger) */}
            {(storyPremiumStates[currentStoryUuid || ''] || storyPremiumStatesSee[currentStoryUuid || '']) && (() => {
              const premiumColor = currentStoryUuid ? (storyPremiumColors[currentStoryUuid] || undefined) : undefined;
              const colorValue = getColorValue(premiumColor);
              // Crear un color un poco más oscuro para el gradiente
              const hex = colorValue.hex.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const darkerR = Math.max(0, r - 40);
              const darkerG = Math.max(0, g - 40);
              const darkerB = Math.max(0, b - 40);
              const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

              return (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: `linear-gradient(to right, ${colorValue.hex}, ${darkerColor})`,
                    boxShadow: `0 0 25px ${colorValue.rgba(0.7)}`
                  }}
                  className="absolute top-4 left-4 z-30 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
                >
                  Story Premium ✨
                </motion.div>
              );
            })()}
            {/* Story Header & Progress Bars */}
            <div className={`relative z-20 px-2 bg-gradient-to-b from-black/80 to-transparent pb-8 ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-header' : ''}`}>
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
                            ? `${getBaseUrl()}${user.profile_picture}`
                            : "https://picsum.photos/100/100";
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{groupedStories[viewingStoryUserIndex].user.username}</span>
                    <span className="text-xs text-gray-300">Hace {groupedStories[viewingStoryUserIndex].formatted_created_at}</span>
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

              {/* Blackout Overlay */}
              <AnimatePresence>
                {isBlackout && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] bg-black pointer-events-none"
                  />
                )}
              </AnimatePresence>

            </div>
            {/* Story Main Content - With slide animation during user switch */}
            <motion.div
              className={`flex-1 relative z-10 flex items-center justify-center bg-transparent ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-content' : ''}`}
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
                const storyMediaSrc = `${getBaseUrl()}/media/${currentMediaItem.file}`;
                const textLayers = (storyForThisMedia?.text_layers ?? []) as StoryTextLayer[];
                const stickerLayers = (storyForThisMedia?.sticker_layers ?? []) as StoryStickerLayer[];
                return isVideoContent(currentMediaItem.file) ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={storyVideoRef}
                      key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`}
                      src={storyMediaSrc}
                      className={`absolute inset-0 w-full h-full object-contain ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-media' : ''}`}
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
                    {stickerLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="absolute z-20 pointer-events-none select-none"
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${layer.size}px`,
                        }}
                      >
                        {layer.emoji}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <motion.img
                      key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={storyMediaSrc}
                      className={`absolute inset-0 w-full h-full object-contain ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-media' : ''}`}
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
                    {stickerLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="absolute z-20 pointer-events-none select-none"
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${layer.size}px`,
                        }}
                      >
                        {layer.emoji}
                      </div>
                    ))}
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
              />
              {isOwner ?
                <motion.button
                  className="p-2  hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                  whileHover={{ scale: 1.1 }}
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
                className="relative p-2  hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                whileTap={{ scale: 0.95 }}
              >
                <Heart
                  className={`w-5 h-5 ${storyLikedStates[currentStoryUuid || ''] ? 'fill-red-500 text-red-500' : 'text-white'}`}
                />
                {showStoryLikeAnimation[currentStoryUuid || ''] && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute -top-2 left-1/2 transform -translate-x-1/2"
                    >
                      {[...Array(3)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ y: 0, opacity: 1 }}
                          animate={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className="text-red-500 text-lg absolute"
                          style={{ left: `${i * 10}px` }}
                        >
                          ❤️
                        </motion.span>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.button>
              {/* New Gift Button */}

              {!isOwner && (
                <motion.button
                  onClick={handleGiftClick}
                  className="p-2  hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                  whileHover={{ scale: 1.1 }}
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
                        onClick={() => handleCategoryClick('invest', 10)}
                        className="w-full bg-blue-500/20 text-blue-300 p-3 rounded-xl border border-blue-500/30"
                      >
                        💎 {t('videos:actions.giftInvest')}
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
                        src={`${getBaseUrl()}${incomingUser.profile_picture}`}
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
                initial={{ y: "100%", scale: 0.9 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: "100%", scale: 0.9 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
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
                        whileHover={{
                          scale: 1.02,
                          rotateY: 5,
                          boxShadow: "0 10px 30px rgba(0, 240, 255, 0.3)"
                        }}

                      >
                        <motion.div
                          className="relative w-12 h-12 rounded-full overflow-hidden"
                          whileHover={{ scale: 1.1 }}
                        >
                          <img
                            src={viewer.profile_picture?.startsWith('http') ? viewer.profile_picture : `${getBaseUrl()}${viewer.profile_picture}`}
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
                          whileHover={{
                            scale: 1.2,
                            backgroundColor: "#00f0ff"
                          }}
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
                              console.log(giftsSentByThisViewer(viewer), viewer, "9999999999999")
                              return hasGifts ? (
                                <div className="relative">
                                  <motion.div
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600/40 to-purple-600/40 
                                          rounded-full border border-pink-500/60 backdrop-blur-md shadow-lg shadow-pink-500/30"
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
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
      <ShowComments showCommentsModal={showCommentsModal} setShowCommentsModal={setShowCommentsModal} comments={comments} user={user} commentText={commentText} setCommentText={setCommentText} handlePostComment={handlePostComment} />

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

      {/* Gift Animation Overlay - Moved to top level to show in videos too */}
      <AnimatePresence>
        {giftAnimation && (
          <motion.div
            key="gift-animation-overlay"
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
                setGiftAnimation(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {
        (viewingStoryUserIndex !== null && groupedStories[viewingStoryUserIndex as number]) || selectedChat
          ? null
          : <BottomNavbar />
      }

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
            onClose={() => setShowVideoGiftModal(false)}
            onSendGift={handleSendVideoGift}
            gifts={Array.isArray(_fullGifts) ? _fullGifts : []}
            walletTokens={walletTokens}
            subscriptionStatus={
              (mediaVideo?.find(v => v.id == selectedVideoForGift)?.user_id as any)?.subscription_status
            }
          />
        )}
      </AnimatePresence>

      {/* CSS for premium effects - Dynamic styles based on color_premiun */}
      <style>{`
        ${(() => {
          // Obtener el color premium del story actual
          const currentColor = currentStoryUuid ? (storyPremiumColors[currentStoryUuid] || undefined) : undefined;
          const colorValue = getColorValue(currentColor);

          return `
        .story-premium {
          /* New background, frame, effects - Dynamic color visible but not full screen */
          background: linear-gradient(135deg, #0f0f3c, #1a1a4a);
          border: 3px solid ${colorValue.hex};
          box-shadow: 
            0 0 20px ${colorValue.rgba(0.4)},
            0 0 40px ${colorValue.rgba(0.3)},
            inset 0 0 20px ${colorValue.rgba(0.1)};
          animation: premiumGlow 2s ease-in-out infinite alternate;
        }
        @keyframes premiumGlow {
          0% {
            box-shadow: 
              0 0 20px ${colorValue.rgba(0.4)},
              0 0 40px ${colorValue.rgba(0.3)},
              inset 0 0 20px ${colorValue.rgba(0.1)};
          }
          100% {
            box-shadow: 
              0 0 30px ${colorValue.rgba(0.5)},
              0 0 60px ${colorValue.rgba(0.4)},
              inset 0 0 30px ${colorValue.rgba(0.15)};
          }
        }
        .premium-header {
          background: linear-gradient(to bottom, ${colorValue.rgba(0.2)}, transparent);
        }
        .premium-content {
          filter: brightness(1.05) contrast(1.05);
        }
        .premium-media {
          box-shadow: 0 0 25px ${colorValue.rgba(0.3)};
          border-radius: 20px;
        }
          `;
        })()}
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
  )
}
export default StreamingUI
