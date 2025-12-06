import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Eye, MessageCircle, Heart, Volume2, VolumeX, Play, Pause, Plus, Loader2, X, MoreVertical, Gift } from "lucide-react"
import BottomNavbar from "../Layout/ButtonNavar"
import { motion, AnimatePresence } from "framer-motion"
import { createStory } from "../../redux/actions/history/createHistory"
import { StoryList, Video as videoI, Video } from './main.interface';
import { useDispatch } from "react-redux"
import { getComment } from "../../redux/actions/getComment"
import { createComment } from "../../redux/actions/createComment"
import { createView } from "../../redux/actions/createView"
import { createFollower } from "../../redux/actions/createFollower"
import { createLike } from "../../redux/actions/createLike"
import { useWebSocket } from "../../hooks/useWebSocket"
import { getActiveStories } from "../../redux/actions/history/listActiveHistory"
import { viewStory } from "../../redux/actions/history/makeViewed"
import { getStoryViewers } from "../../redux/actions/history/getHIstoryViewers"
import { likeStory } from "../../redux/actions/history/likeHistory"
import { sendGift } from "../../redux/actions/gift/sendGift"
import { getActiveGift } from "../../redux/actions/gift/listGiftActive"
import { getRecivedGift } from "../../redux/actions/gift/listGiftRecived"
import { getOneActiveGift } from "../../redux/actions/gift/getGiftActive"
import { getRecivedGiftByUser } from "../../redux/actions/gift/getGiftsByUser"


const WS_URL = "ws://localhost:8001/ws";
interface StreamingUIProps {
  media: videoI[] | null
  getComment?: ({ video_id }: { video_id: string }) => any
}
interface CommentData {
  uuid: string;
  user_id: {
    username: string;
    profile_picture: string;
  };
  content: string;
  create_at: string;
}
const StreamingUI = ({ media }: StreamingUIProps) => {
  const dispatch = useDispatch();
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [isMuted, setIsMuted] = useState(true)
  const mainRef = useRef<HTMLDivElement>(null)
  const [showLikeAnimation, setShowLikeAnimation] = useState<Record<string, boolean>>({});
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoDuration, setVideoDuration] = useState<Record<string, number>>({});
  const [isGridVideoPlaying, setIsGridVideoPlaying] = useState<Record<string, boolean>>({})
  const [stories, setStories] = useState<StoryList>([]);
  const [transientIconState, setTransientIconState] = useState<{
    videoId: string
    icon: 'play' | 'pause'
  } | null>(null)
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [mediaVideo, setMedia] = useState<videoI[] | null>(media);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  // Mock user for demo purposes if localStorage is empty
  const defaultUser = { username: 'BuzzyUser', profile_picture: '/avatar.webp' };
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : defaultUser;
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<CommentData[] | null>(null)
  // New state for Story Upload
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- New State for Story Viewer ---
  const [viewingStoryUserIndex, setViewingStoryUserIndex] = useState<number | null>(null);
  const [currentStoryItemIndex, setCurrentStoryItemIndex] = useState(0);
  const [groupProgresses, setGroupProgresses] = useState<Record<string, number[]>>({});
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
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
  const [storyPremiumStatesSee, setStoryPremiumStatesSee] = useState<Record<string, boolean>>({});
  // Audio refs for sounds
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [fullGifts, setFullGifts] = useState<Gift[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(true);
  // --- R3F Scope for Gift3D ---
  console.log(giftRecived, "***-----------")
  const isVideoContent = (file: string) => /\.(mp4|webm|ogg|mov)$/i.test(file);
  const [isGifts, setIsGift] = useState([])
  const [giftAnimation, setGiftAnimation] = useState<{
    type: string;
    sender: string;
    storyUuid: string;
    giftId: string;
    gift: string;
    amount?: number;
    color_premiun?: string;
  } | null>(null);
  const groupedStories = useMemo(() => {
    if (!stories || !Array.isArray(stories)) return [];
    const groups = new Map();
    stories.forEach((story: any) => {
      const userId = story?.user?.id;
      if (!groups.has(userId)) {
        groups.set(userId, { ...story, media: story.media ? [...story.media] : [] });
      } else {
        const existing = groups.get(userId);
        if (story.media) existing.media.push(...story.media);
      }
    });
    return Array.from(groups.values());
  }, [stories]);


  const handleWSMessage = useCallback((data: any) => {
    if (data.event === "like_updated") {
      setMedia(prev =>
        prev ? prev.map((video) => {
          if (video.id === data.video_id) {
            return { ...video, like_count: data.likes, liked: data.liked };
          }
          return video;
        }) : prev
      );
    }
    if (data.event === "gift_received") {
      setGiftAnimation({
        type: data.gift_type,
        giftId: data.gift_uuid,
        storyUuid: data.story_uuid,
        sender: data.sender,
        amount: data.amount || 1,
        gift: data.gift_video,
        color_premiun: data.color_premiun
      });


      setTimeout(() => setGiftAnimation(null), 8000);
    }
    if (data.event === "new_comment") {
      console.log("Nuevo comentario recibido via WS:", data);
      setComments((prevComments) => {
        if (data && data.user_id) {
          setMedia(prev =>
            prev ? prev.map((video) => {
              if (video.id === data.video_id) {
                return { ...video, comments_count: data.comments_count };
              }
              return video;
            }) : prev
          );
          return [data, ...(prevComments || [])];
        }
        return prevComments;
      });
    }
    if (data.event === "new_view") {
      setMedia(prev =>
        prev ? prev.map((video) => {
          if (video.id === data.video_id) {
            return { ...video, view_acount: data.view_acount };
          }
          return video;
        }) : prev
      );
    }
    if (data.event === "new_follower") {
      setMedia(prev =>
        prev ? prev.map((video) => {
          if (video.user_id.id == data.channel_profile) {
            return { ...video, current_user_followered: data.current_user_followered };
          }
          return video;
        }) : prev
      );
    }
    if (data.event === "delete_follower") {
      setMedia(prev =>
        prev ? prev.map((video) => {
          if (video.user_id.id == data.channel_profile) {
            return { ...video, current_user_followered: data.current_user_followered };
          }
          return video;
        }) : prev
      );
    }
    if (data.event === "new_story") {
      console.log("Nueva historia recibida via WS:", data);
      setStories((prev) => {
        if (data.story) {
          return [...prev, data.story];
        }
        return prev;
      });
    }
     if (data.event === "gift_see") {
       if (data.amount > 20) {
        console.log(data)
          setStoryPremiumStatesSee(prev => ({ ...prev, [data.story_uuid]: true }));
      }
      setGiftAnimation({
        type: data.gift_type,
        giftId: data.gift_uuid,
        storyUuid: data.id,
        sender: data.sender,
        amount: data.amount || 1,
        gift: data.gift_video,
        color_premiun: data.color_premiun
      });

      
      setShowViewersModal(false);
      setTimeout(() => setGiftAnimation(null), 8000);
    }
  },
    [setMedia]);

  useEffect(() => {
    setMedia(media);
  }, [media]);

  useEffect(() => {
    getActiveStories()(dispatch).then((res: any) => {
      setStories(res)
    })
  }, []);

  const handleCommentClick = (index: number) => {
    if (mediaVideo && mediaVideo[index]) {
      const videoId = mediaVideo[index].id.toString();
      setCurrentVideoId(videoId);
      setShowCommentsModal(true);
      getComment({ video_id: mediaVideo?.[index]?.uuid?.toString() ?? "" })(dispatch).then((res: any) => {
        setComments(Array.isArray(res) ? res : [])
        console.log("Comentarios cargados:", res);
      })
    }
  }
  const handlePostComment = () => {
    if (!commentText.trim() || !currentVideoId) return;
    createComment({
      video_id: currentVideoId,
      content: commentText
    })(dispatch).then((res: any) => {
      console.log("Comentario publicado:", res);
      setCommentText("");
    }).catch((error: any) => {
      console.error("Error publicando comentario:", error);
    });
  }
  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoElement = e.currentTarget;
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;
    setVideoProgress(prev => ({
      ...prev,
      [videoId]: currentTime
    }));
    if (videoDuration[videoId] !== duration && isFinite(duration)) {
      setVideoDuration(prev => ({
        ...prev,
        [videoId]: duration
      }));
    }
    if (videoElement.currentTime >= 10 && !viewedVideos.has(videoId)) {
      createView({ video_id: videoId })(dispatch)
        .then((res: any) => console.log("API View Response:", res))
        .catch((err: any) => console.error("API View Error:", err));
      setViewedVideos((prev) => {
        const newSet = new Set(prev);
        newSet.add(videoId);
        return newSet;
      });
    }
  };
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
      .then((res) => {
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
          if (entry.isIntersecting) {
            video.play().catch(() => {/* Autoplay ignored */ })
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
  }, [mediaVideo])
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
    const videoElement = videoRefs.current[index];
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play().catch(error => {
        console.error("Error al reproducir el video:", error);
      });
    } else {
      videoElement.pause();
    }
  };
  const handleLikeClick = (videoId: string) => {
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
  useWebSocket(WS_URL, handleWSMessage);
  // --- Logic for Create History ---
  const handleAddHistory = () => {
    // We click the hidden input element programmatically
    fileInputRef.current?.click();
  }
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Optional: Check file type/size here
    if (file.size > 50 * 1024 * 1024) { // Example 50MB limit
      alert("El archivo es demasiado grande (Max 50MB)");
      return;
    }
    setIsUploadingStory(true);
    const formData = new FormData();
    // Assuming the backend expects a field named 'video' or 'file'
    formData.append('video', file);
    // You might want to add a default description or other metadata
    formData.append('description', 'New story');
    const data = Object.fromEntries(formData.entries())
    try {
      console.log("Subiendo historia...");
      await createStory(data)(dispatch);
      // Here you could refresh the stories list
    } catch (error) {
      console.error("Error creando la historia:", error);
      alert("Error al subir la historia. Inténtalo de nuevo.");
    } finally {
      setIsUploadingStory(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    console.log(index, "--")
    setViewingStoryUserIndex(index);
    setCurrentStoryItemIndex(0);
    setIsStoryPaused(false);
  };
  const closeStoryViewer = () => {
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

  const handleStoryVideoProgress = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isStoryPaused || isSwitchingUser) return;
    const video = e.currentTarget;
    const progress = video.currentTime / video.duration;
    if (!isNaN(progress) && viewingStoryUserIndex !== null) {
      const currentProgress = getCurrentProgress;
      const np = [...currentProgress];
      np[currentStoryItemIndex] = Math.min(progress, 1);
      updateProgress(np);
    }
  }, [viewingStoryUserIndex, currentStoryItemIndex, isStoryPaused, isSwitchingUser, getCurrentProgress, updateProgress]);

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

    // if (currentMediaUuid && !viewedItems[currentMediaUuid]) {}
    // getRecivedGiftByUser(currentMediaUuid)(dispatch)

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
    console.log("Report inappropriate");
    setShowOptionsModal(false);
  };
  const handleAboutAccount = () => {
    // Navigate to profile or something
    console.log("About this account");
    setShowOptionsModal(false);
  };
  const handleDelete = () => {
    // Dispatch delete story action here
    console.log("Delete story");
    setShowOptionsModal(false);
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

  const [gifts, setGifts] = useState<Gift[]>([]);

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

  const handleGiftClick = () => {
    if (currentStoryUuid) {
      setShowGiftMenu(true);
    }
  };

  useEffect(() => {
    const loadRealGifts = async () => {
      try {
        setGiftsLoading(true);
        const response = await getActiveGift()(dispatch);
        console.log(response)
        const giftsData = Array.isArray(response) ? response : response?.data || [];
        const mappedGifts = giftsData.map((gift: any) => ({
          id: gift.id?.toString(),
          name: gift.name,
          emoji: gift.emoji,
          cost: gift.token_price,
          color: "getColorFromSlug(gift.slug)",         
          animation: "getAnimationFromSlug(gift.slug)",
          video: gift.video ? `http://localhost:8000${gift.video}` : null,
          slug: gift.slug,
        }));
        console.log(mappedGifts, "**")
        setFullGifts(mappedGifts);
      } catch (error) {
        console.error("Error cargando regalos:", error);
      } finally {
        setGiftsLoading(false);
      }
    };

    loadRealGifts();
  }, [dispatch]);

    useEffect(()=>{
      if (currentStoryUuid) {
        getRecivedGiftByUser(currentStoryUuid)(dispatch).then((res)=>{
          setIsGift(res)
        })
      }
  }, [currentStoryUuid])

  console.log(giftAnimation, "**reyna**")
  const handleCategoryClick = (giftType: string, amount: number) => {
    if (giftType === 'support') {
      getActiveGift()(dispatch).then((res) => {
        setGifts(res)
      })
      setShowGiftMenu(false);
      setShowFullGiftMenu(true);
    } else {
      // For other categories, send the gift immediately
      handleSendGift(giftType, amount);
    }
  };
  const handleSendGift = async (giftTypeOrGift: string | { id: string; name: string; emoji: string; cost: number; color: string; animation: string }, amount?: number) => {
    let giftId, type, cost, sound;
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
    if (!currentStoryUuid) return;
    try {
      sendGift({ story_uuid: currentStoryUuid, gift_type: type })(dispatch).then((res)=>{
        if (cost > 20) {
          setStoryPremiumStates(prev => ({ ...prev, [currentStoryUuid]: true }));
        }
      }).catch(()=>{})
      // if (sound) sound.play();
      setGiftAnimation({ type, sender: user.username, storyUuid: currentStoryUuid, phase: 'initial', giftId });

      setTimeout(() => setGiftAnimation(prev => prev ? { ...prev, phase: 'crazy' } : null), 1500);
      setTimeout(() => setGiftAnimation(prev => prev ? { ...prev, phase: 'explode' } : null), 3000);
      setTimeout(() => setGiftAnimation(prev => prev ? { ...prev, phase: 'reward' } : null), 4000);
      setTimeout(() => setGiftAnimation(null), 5000);
      // If high value (e.g., cost > 20), update premium
      setShowFullGiftMenu(false);
    } catch (error) {
      console.error("Error sending gift:", error);
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
  // Variants for gift phases - unique per gift (kept for fallback 2D if needed)
  const giftsSentByThisViewer = (viewer) => {
    return giftRecived?.filter(gift => 
                            gift.sender === viewer.user_id  
                          );
                                
  }

  const showGiftRecived = (viewer: any) => {
      const gifts = giftsSentByThisViewer(viewer);
      // Asegúrate de que haya al menos un regalo
      if (gifts && gifts.length > 0) {
        const firstGiftId = gifts[0].id;
        getOneActiveGift(firstGiftId, currentStoryUuid)(dispatch).then((res)=>{
          gifts.splice(0, 1);
        }); 

      } else {
        console.log("Este viewer no ha enviado regalos aún");
        // Opcional: dispatch una acción para limpiar o mostrar mensaje
      }
    };
  const setHeaderColor = (classe: string, color: string) => {
  return (
    <>
     <style>{`
        .story-premium {
          /* New background, frame, effects */
          background: linear-gradient(135deg, #0f0f3c, #1a1a4a);
          border: 2px solid #00f0ff;
          box-shadow: 0 0 50px rgba(0, 240, 255, 0.5);
        }
        .premium-header {
          // background: linear-gradient(to bottom, rgba(0, 240, 255, 0.2), transparent);
        }
        .premium-content {
          filter: brightness(1.1) contrast(1.1);
        }
        .premium-media {
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
          border-radius: 20px;
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
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
    </>
  )
}
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050718] text-white font-sans">
      {/* Hidden Input for File Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
      />
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f3c] via-[#1a1a4a] to-[#0f0f3c] opacity-80"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03]"></div>
      </div>
      <main ref={mainRef} className="h-screen w-full overflow-y-auto pt-30 pb-10">
        {/* Search Bar Area */}
        <div className="w-full border-t border-[#2a2f5e]/50 ">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3 overflow-x-auto px-2 py-3 scrollbar-hide snap-x ">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-center gap-1.5 min-w-[64px] cursor-pointer snap-start relative group"
                onClick={handleAddHistory}>
                <div className="relative">
                  <div className={`relative h-[60px] w-[60px] rounded-full p-[2px] bg-[#0c1033] ${isUploadingStory ? 'animate-pulse' : ''}`}>
                    <img
                      src={user.profile_picture.startsWith('http') ? user.profile_picture : `http://localhost:8000${user.profile_picture}`}
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
                <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover:text-white">
                  {isUploadingStory ? "Subiendo..." : "Tu historia"}
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
                    transition={{ delay: i * 0.05 + 0.1 }}
                    className="flex flex-col items-center gap-1.5 min-w-[64px] cursor-pointer snap-start group"
                    onClick={() => handleStoryClick(i)}
                  >
                    <div className="relative">
                      {!seen ? (
                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#7000ff] via-[#ff0099] to-[#00f0ff] opacity-80 group-hover:opacity-100 blur-[0.5px] animate-spin-slow"></div>
                      ) : (
                        <div className="absolute inset-0 rounded-full border border-[#2a2f5e]"></div>
                      )}
                      <div className="relative h-[60px] w-[60px] rounded-full p-[2px] bg-[#050718]">
                        <img
                          src={`http://localhost:8000/media/${story.user.profile_picture}`}
                          className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={story.user.username}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium truncate w-16 text-center ${seen
                        ? "text-gray-500"
                        : "text-gray-300 group-hover:text-[#00f0ff] transition-colors"
                        }`}
                    >
                      - {story.user.username}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        <section className="px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ">
            {mediaVideo?.map((data, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[#2a2f5e]/30"
                style={{ height: "710px" }}
              >
                <div className="absolute inset-0 rounded-xl overflow-hidden pt-0 group">
                  <div className="relative h-[710px] w-full rounded-xl overflow-hidden bg-black">
                    <video
                      ref={(el) => { if (el) videoRefs.current[index] = el }}
                      muted={isMuted}
                      loop
                      playsInline
                      className="h-[710px] w-full object-cover border-[#00f0ff]/5"
                      onClick={() => handleVideoClick(index)}
                      onTimeUpdate={(e) => handleVideoProgress(e, data.id.toString())}
                    >
                      <source src={data.video} type="video/mp4" />
                      Tu navegador no soporta el formato de video.
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050718] via-[#050718]/10 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={() => handleGridVideoToggle(data.id.toString(), videoRefs.current[index])}>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <AnimatePresence>
                        <AnimatePresence>
                          {transientIconState?.videoId === data.id.toString() && (
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
                      </AnimatePresence>
                    </div>
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
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-xs font-medium"
                      onClick={() => handleVideoClick(index)}
                    >
                      <span>AR</span>
                    </motion.button>
                    <div className="absolute bottom-0 left-0 right-0 py-4 px-4 pr-3 z-10">
                      <div className="flex items-center mb-4">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0">
                          <img
                            className="h-full w-full object-cover rounded-full"
                            src={`${data.user_id?.profile_picture ? `http://localhost:8000/media/${data.user_id.profile_picture}` : "http://localhost:8000/media/profile_pics/avatar.webp"}`}
                            onError={(e) => {
                              // Fallback image if local server not running
                              (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${index}`;
                            }}
                            alt={data.user_id?.username}
                          />
                          <div className="absolute inset-0 rounded-full border-2 border-[#2a2f5e] pointer-events-none" />

                          {!isMuted && videoRefs.current[index]?.paused === false && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-4 border-[#00f0ff]"
                              animate={{
                                boxShadow: [
                                  "0 0 0 0 rgba(0, 240, 255, 0)",
                                  "0 0 20px 4px rgba(0, 240, 255, 0.8)",
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
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-[#00f0ff] transition-colors duration-300 pointer-events-none"
                          />
                        </div>
                        <Link
                          className="text-white font-medium hover:text-[#00f0ff] transition-colors ml-3 truncate max-w-[120px] flex-1"
                          to={`/profile/${data.user_id?.username}`}
                        >
                          @{data.user_id?.username}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLikeClick((data.id?.toString() || "1"))
                            }}
                            className="relative flex flex-col items-center"
                          >
                            <motion.div
                              animate={{ scale: data.liked ? [1, 1.3, 1] : 1 }}
                              transition={{ duration: 0.3 }}
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${data.liked ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"
                                }`}
                            >
                              <Heart className={`h-5 w-5 ${data.liked ? "fill-red-500" : ""}`} />
                            </motion.div>
                            <span className="text-xs mt-1">{data.like_count || 0}</span>
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
                            className="flex flex-col items-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCommentClick(index)
                            }}
                          >
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <MessageCircle className="h-5 w-5" />
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
                          
                            <motion.button
                              onClick={handleGiftClick}
                              className="p-2  bg-gradient-to-r mb-3 border-pink-500/60 border-2 from-[#ff0099] to-[#00f0ff]/50 hover:from-[#ff0099]/80 rounded-full bg-white/10 text-white shadow-lg shadow-pink-500/20"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              animate={{
                                rotate: [0, -12, 12, -12, 12, 0], // sacudida más intensa
                                x: [0, -8, 8, -8, 8, 0],         // también mueve un poco horizontalmente (opcional)
                              }}
                              transition={{
                                duration: 0.8,           // duración de una sacudida completa
                                ease: "easeInOut",
                                repeat: Infinity,     
                                repeatDelay: 9.2,        
                              }}
                            >
                              <svg data-v-92f2660e width="25" height="25" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="giftbox" data-v-92f2660e=""><g id="Base" data-v-92f2660e=""><g id="bottom" data-v-92f2660e=""><path id="Rectangle 15 Copy 2" d="M94 58H26V104H94V58Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 3 Copy" opacity="0.05" d="M94 101.294H26V104H94V101.294Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 5" opacity="0.1" d="M28.6842 58H26V104H28.6842V58Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 6" opacity="0.05" d="M94 58H91.3158V104H94V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 3" opacity="0.05" d="M73.8684 58H71.1842V104H73.8684V58Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle Copy" d="M71.1842 58H48.5921V104H71.1842V58Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 2" opacity="0.1" d="M94 58H26V63.8627H94V58Z" fill="url(#paint0_linear_740_3020)" data-v-92f2660e=""></path></g></g><g id="top" data-v-92f2660e=""><path id="Rectangle 15 Copy 3" d="M100 42.665H20V60.0001H100V42.665Z" fill="#FF4F64" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 7" opacity="0.05" d="M100 42.665H97.2881V60.0001H100V42.665Z" fill="black" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 4" opacity="0.1" d="M22.7119 42.665H20V59.775H22.7119V42.665Z" fill="white" data-v-92f2660e=""></path><path id="ribbon" d="M60.0077 31.2585C59.9498 31.1677 58.6909 29.2544 58.0916 28.4143C55.4283 24.6809 52.6562 21.6866 49.7588 19.6882C45.9232 17.0425 41.9395 16.2219 38.0786 17.8014C35.6247 18.8053 33.3914 20.7344 31.3719 23.5749C27.177 29.4752 27.4011 34.7531 31.83 38.2919C34.9369 40.7745 39.8498 42.1747 46.1869 42.8621C50.835 43.3663 55.0298 43.2435 59.6147 43.3624L60.0077 31.2585ZM46.7269 37.0423C41.3928 36.4628 37.3603 35.3117 35.3278 33.6852C34.4441 32.978 34.0493 32.2813 34.0144 31.4588C33.9664 30.3263 34.5486 28.7649 35.9595 26.7772C37.3893 24.7631 38.8028 23.5403 40.1691 22.9805C43.7795 21.5011 48.4661 24.7386 53.3703 31.624C54.6954 33.4844 55.9353 35.4716 57.0626 37.4757C53.6591 37.5264 50.0985 37.4086 46.7269 37.0423ZM66.6306 31.624C71.5348 24.7386 76.2213 21.5011 79.8318 22.9805C81.1981 23.5403 82.6115 24.7631 84.0413 26.7772C85.4522 28.7649 86.0344 30.3263 85.9864 31.4588C85.9515 32.2813 85.5567 32.978 84.673 33.6852C82.6406 35.3117 78.608 36.4628 73.2739 37.0423C69.9024 37.4086 66.3417 37.5264 62.9383 37.4757C64.0656 35.4716 65.3054 33.4844 66.6306 31.624ZM59.6147 43.3626C64.0607 43.3626 69.1658 43.3663 73.8139 42.8621C80.1511 42.1747 85.0639 40.7745 88.1708 38.2919C92.5997 34.7531 92.8238 29.4752 88.6289 23.5749C86.6095 20.7344 84.3761 18.8053 81.9222 17.8014C78.0613 16.2219 74.0777 17.0425 70.242 19.6882C67.3447 21.6866 64.5725 24.6809 61.9092 28.4143C61.2369 29.3568 60.6251 30.2764 60.0004 31.2585" fill="url(#paint1_linear_740_3020)" data-v-92f2660e=""></path><path id="Rectangle" d="M76.9491 42.665H42.8248V60.0001H76.9491V42.665Z" fill="#FFD4D9" data-v-92f2660e=""></path><path id="Rectangle 4 Copy 8" opacity="0.1" d="M100 42.665H20V45.3666H100V42.665Z" fill="white" data-v-92f2660e=""></path><path id="Rectangle 4 Copy" opacity="0.05" d="M79.661 42.665H76.9492V60.0001H79.661V42.665Z" fill="black" data-v-92f2660e=""></path></g></g><defs data-v-92f2660e=""><linearGradient id="paint0_linear_740_3020" x1="60" y1="58" x2="60" y2="63.8627" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop data-v-92f2660e=""></stop><stop offset="1" stopOpacity="0" data-v-92f2660e=""></stop></linearGradient><linearGradient id="paint1_linear_740_3020" x1="60.0004" y1="18.9264" x2="60.0004" y2="43.3626" gradientUnits="userSpaceOnUse" data-v-92f2660e=""><stop stopColor="#FF879D" data-v-92f2660e=""></stop><stop offset="0.326625" stopColor="#FF4F64" data-v-92f2660e=""></stop><stop offset="1" stopColor="#E54659" data-v-92f2660e=""></stop></linearGradient></defs></svg>
          
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
                              className="px-4 py-2 bg-gradient-to-r from-[#7000ff]/60 to-[#00f0ff]/60 hover:from-[#7000ff] hover:to-[#00f0ff] backdrop-blur-md border border-white/20 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-black/30 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "create");
                              }}
                            >
                              Suscribirse
                            </motion.button>
                          ) : (
                            <motion.button
                              key="followingButton"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                              className="px-4 py-2 bg-gradient-to-r from-[#00f0ff]/20 to-[#7000ff]/20 border border-white/10 text-white text-sm font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-black/20 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowClick(Number(data.user_id.id), data.user_id.id.toString(), "delete");
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Suscrito
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 z-10 px-1">
                  {videoDuration[data.id.toString()] > 0 && (
                    (() => {
                      const progressPercentage = ((videoProgress[data.id.toString()] || 0) / (videoDuration[data.id.toString()] || 1)) * 100;
                      const progressStyle = {
                        '--progress': `${progressPercentage}%`
                      } as React.CSSProperties;
                      return (
                        <div className="relative h-1">
                          <input
                            type="range"
                            min="0"
                            max={videoDuration[data.id.toString()] || 0}
                            value={videoProgress[data.id.toString()] || 0}
                            step="0.1"
                            className="w-full h-full appearance-none cursor-pointer range-slider !bg-transparent hover:h-2 transition-height duration-150"
                            onChange={(e) => handleSeek(data.id.toString(), parseFloat(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            style={progressStyle}
                          />
                        </div>
                      );
                    })()
                  )}
                </div>
              </motion.div>
            ))}
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
            className={`fixed inset-0 z-50 bg-[#050718] flex flex-col ${(storyPremiumStates[currentStoryUuid || ""] || storyPremiumStatesSee[currentStoryUuid || ""])  ? 'story-premium' : ''}`} // Premium class
          >
            {/* Dynamic Story Content Background (Blurred) - Can use first frame of video or image */}
            {/* <div className="absolute inset-0 z-0 opacity-30 blur-3xl">
                 {isVideoContent(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file) ? (
                    <video
                        src={`http://localhost:8000${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                        className="w-full h-full object-cover"
                    />
                 ) : (
                    <img
                        src={`http://localhost:8000${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                 )}
            </div> */}
            {/* Premium Tag if active */}
            {storyPremiumStates[currentStoryUuid || ''] && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 z-30 bg-gradient-to-r from-[#ff0099] to-[#00f0ff] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              >
                Story Premium ✨
              </motion.div>
            )}
            {/* Gift Animation Overlay - Now with R3F Canvas for 3D Immersive Effects */}
            <AnimatePresence>
              {giftAnimation && (
                <motion.div
                  initial={{ opacity: 0, y: 200, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 400, scale: 0.7 }}
                  transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
                  className={`fixed bottom-15 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[700px] max-w-lg  py-15`}
                >
                  <video
                    key={giftAnimation.giftId}
                    src={`http://localhost:8000${giftAnimation.gift}`}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full drop-shadow-2xl rounded-3xl"
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
                    onEnded={() => setGiftAnimation(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Story Header & Progress Bars */}
            <div className={`relative z-20 pt-4 px-2 bg-gradient-to-b from-black/80 to-transparent pb-8 ${storyPremiumStates[currentStoryUuid || ''] ?   'premium-header' : ''}`}>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-[#7000ff] to-[#00f0ff]" style={{
                        background: `linear-gradient(to top right #00f0ff)`
                    }}>
                    <img
                      src={`http://localhost:8000${groupedStories[viewingStoryUserIndex].user.profile_picture}`}
                      className="w-full h-full rounded-full object-cover border-2 border-[#050718]"
                      alt="User"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          user?.profile_picture
                            ? `http://localhost:8000${user.profile_picture}`
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
              {isVideoContent(groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file) ? (
                <video
                  ref={storyVideoRef}
                  key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`} // Key change forces remount/replay
                  src={`http://localhost:8000/media/${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                  className={`max-h-full max-w-full object-contain ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-media' : ''}`}
                  autoPlay={!isStoryPaused}
                  playsInline
                  onEnded={handleNextStory}
                  onTimeUpdate={handleStoryVideoProgress}
                />
              ) : (
                <motion.img
                  key={`${viewingStoryUserIndex}-${currentStoryItemIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={`http://localhost:8000/media/${groupedStories[viewingStoryUserIndex].media[currentStoryItemIndex].file}`}
                  className={`max-h-full max-w-full object-contain ${storyPremiumStates[currentStoryUuid || ''] ? 'premium-media' : ''}`}
                  alt="Story Content"
                />
              )}
            </motion.div>
            {/* Reply / Interactions (Bottom Overlay) - Added Gift Button */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-2 z-30">
              <input
                type="text"
                placeholder="Enviar mensaje..."
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white placeholder-gray-400 focus:outline-none focus:border-[#00f0ff] backdrop-blur-md"
              />
              {isOwner ?


                <motion.button
                  className="p-2 bg-gradient-to-r from-[#ff0099] to-[#00f0ff]/50 hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    x: [-2, 2, -2, 0],
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}

                  onClick={handleEyeClick}
                >
                  {isGifts && isGifts.length > 0  ? 
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
                className="relative p-2 bg-gradient-to-r from-[#ff0099] to-[#00f0ff]/50 hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
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
              <motion.button
                onClick={handleGiftClick}
                className="p-2 bg-gradient-to-r from-[#ff0099] to-[#00f0ff]/50 hover:from-[#ff0099]/80 rounded-full backdrop-blur-md text-white shadow-lg shadow-pink-500/20"
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
                    <h3 className="text-center font-bold mb-4 text-white">🎁 Enviar Regalo</h3>
                    <div className="space-y-3">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('support', 5)}
                        className="w-full bg-yellow-500/20 text-yellow-300 p-3 rounded-xl border border-yellow-500/30"
                      >
                        🎁 Apoyar (5 tokens)
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('invest', 10)}
                        className="w-full bg-blue-500/20 text-blue-300 p-3 rounded-xl border border-blue-500/30"
                      >
                        💎 Invertir en ti (10 tokens)
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('vip', 20)}
                        className="w-full bg-purple-500/20 text-purple-300 p-3 rounded-xl border border-purple-500/30"
                      >
                        👑 Fan VIP (20 tokens)
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryClick('unlock', 15)}
                        className="w-full bg-indigo-500/20 text-indigo-300 p-3 rounded-xl border border-indigo-500/30"
                      >
                        🔒 Desbloquear lo que viene (15 tokens)
                      </motion.button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-center">Buzzy retiene 10% de comisión</p>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            {/* Full Gift Menu Sub-Modal - 12 Gifts in 3x4 Grid, Floating Above Main */}
            <AnimatePresence>
              {showFullGiftMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black z-70"
                    onClick={() => setShowFullGiftMenu(false)}
                  />
                  <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 400 }}
                    className="fixed bottom-60 left-1/2 transform -translate-x-1/2 z-80 bg-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 w-[90vw] max-w-4xl  max-h-[70vh] overflow-hidden shadow-2xl shadow-[#ff0099]/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-white text-xl">✨ Regalos Especiales</h3>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowFullGiftMenu(false)}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pb-4">
                      {giftsLoading ? (
                        <div className="col-span-4 flex items-center justify-center py-12">
                          <Loader2 className="w-10 h-10 animate-spin text-white" />
                        </div>
                      ) : gifts.length === 0 ? (
                        <p className="col-span-4 text-center text-gray-400 py-8">No hay regalos disponibles</p>
                      ) : (
                        gifts.map((gift) => (
                          <motion.button
                            key={gift.slug}
                            whileHover={{ scale: 1.08, y: -8 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSendGift(gift)}
                            className="relative group rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 shadow-2xl transition-all duration-300"
                          >
                            {/* Video Preview del Regalo */}
                            <div className="relative aspect-square w-full">
                              <video
                                src={`http://127.0.0.1:8000${gift.video}`}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              // Opcional: efecto de brillo al hacer hover
                              />
                              {/* Overlay degradado para mejor legibilidad del texto */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                              {/* Brillo sutil al hacer hover */}
                              <motion.div
                                className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                initial={false}
                              />
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                              {/* <p className="text-white font-bold text-sm drop-shadow-lg">
            {gift.name}
          </p> */}
                              <p className="text-yellow-400 text-xs font-bold drop-shadow-md mt-1">
                                {gift.cost} tokens
                              </p>
                            </div>

                            {/* Efecto de pulso en el borde al hover */}
                            <motion.div
                              className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-yellow-400/60 pointer-events-none"
                              initial={false}
                              animate={{
                                boxShadow: [
                                  "0 0 0 0 rgba(250, 204, 21, 0)",
                                  "0 0 20px 4px rgba(250, 204, 21, 0.6)",
                                  "0 0 0 0 rgba(250, 204, 21, 0)"
                                ]
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          </motion.button>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
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
                        src={`http://localhost:8000${incomingUser.profile_picture}`}
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
          </motion.div>
        )}
      </AnimatePresence>
      {/* Viewers Modal - Surprise: Flip-in avatars with holographic effect */}
      <AnimatePresence>
        {showViewersModal && isOwner && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-60"
              onClick={handleCloseViewers}
            />
            <motion.div
              initial={{ y: "100%", scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.9 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[50vh] z-70 bg-gradient-to-b from-[#0c1033]/95 to-[#050718]/95 backdrop-blur-xl rounded-t-3xl overflow-hidden border-t border-white/10"
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
                  👁️ View By {realViewers.length} persona{realViewers.length > 1 ? 's' : ''}
                </h2>
                <AnimatePresence>
                  {realViewers.map((viewer, i) => (
                    <motion.div
                      key={viewer.id || i}
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
                      className={`flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border ${ giftsSentByThisViewer(viewer) && giftsSentByThisViewer(viewer).length > 0 ? "border-pink-500" : " border-white/10"} shadow-2xl shadow-[#00f0ff]/10 hover:shadow-[#00f0ff]/20 transition-all`}
                      whileHover={{
                        scale: 1.02,
                        rotateY: 5,
                        boxShadow: "0 10px 30px rgba(0, 240, 255, 0.3)"
                      }}
                      onClick={e=>showGiftRecived(viewer)}
                    >
                      <motion.div
                        className="relative w-12 h-12 rounded-full overflow-hidden"
                        whileHover={{ scale: 1.1 }}
                      >
                        <img
                          src={viewer.profile_picture?.startsWith('http') ? viewer.profile_picture : `http://localhost:8000${viewer.profile_picture}`}
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
                          console.log(hasGifts, "9999999999999")
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
              className="fixed inset-0 bg-black/70 z-60"
              onClick={() => setShowOptionsModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-auto z-70 bg-[#050718] rounded-t-3xl overflow-hidden max-h-[40vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-4 pb-4">
                <div className="w-12 h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={() => setShowOptionsModal(false)} />
              </div>
              <div className="px-6 pb-6 space-y-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left text-red-400 font-medium py-3 rounded-lg hover:bg-red-500/10 transition-colors"
                  onClick={handleReport}
                >
                  Report inappropriate
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left text-white font-medium py-3 rounded-lg hover:bg-white/10 transition-colors"
                  onClick={handleAboutAccount}
                >
                  About this account
                </motion.button>
                {isOwner && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left text-red-400 font-medium py-3 rounded-lg hover:bg-red-500/10 transition-colors"
                    onClick={handleDelete}
                  >
                    Delete
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left text-gray-400 font-medium py-3 rounded-lg hover:bg-white/10 transition-colors"
                  onClick={() => setShowOptionsModal(false)}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCommentsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowCommentsModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[50vh] z-50 flex flex-col bg-[#0c1033] rounded-t-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3" onClick={() => setShowCommentsModal(false)}>
                <div className="w-12 h-1.5 bg-white/30 rounded-full cursor-pointer" />
              </div>
              <h1 className="p-2 text-center font-bold text-white">Comentarios</h1>
              <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                {(!comments || comments.length === 0) && (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-[#a2b0ff] text-sm">No hay comentarios todavía</p>
                  </div>
                )}
                <AnimatePresence>
                  {comments?.map((comment) => (
                    <motion.div
                      key={comment.uuid}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-3 py-3 border-b border-[#2a2f5e]/50 last:border-b-0"
                    >
                      <img
                        src={`http://localhost:8000${comment.user_id.profile_picture || '/media/profile_pics/avatar.webp'}`}
                        onError={(e) => (e.target as HTMLImageElement).src = `https://picsum.photos/40/40?random=${comment.uuid}`}
                        alt={comment.user_id.username}
                        className="h-10 w-10 rounded-full object-cover border border-[#2a2f5e]"
                      />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold text-white mr-1">{comment.user_id.username}</span>
                          <span className="text-[#a2b0ff]">{comment.content}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#6a7199]">
                          <span>{comment.create_at}</span>
                          <button className="font-medium hover:text-white transition-colors">Responder</button>
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }} className="text-[#6a7199] hover:text-red-500 transition-colors">
                        <Heart size={16} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="sticky bottom-15 bg-[#0c1033] border-t border-[#2a2f5e] p-2 flex items-center gap-2 mb-4">
                <img
                  src={`http://127.0.0.1:8000${user.profile_picture}`}
                  alt="Tu perfil"
                  className="h-9 w-9 rounded-full object-cover border border-[#2a2f5e]"
                />
                <input
                  type="text"
                  placeholder="Añadir un comentario..."
                  className="flex-1 p-2 rounded-full bg-[#1a1f3a] border border-[#2a2f5e] text-white placeholder-[#6a7199] focus:outline-none focus:border-[#00f0ff]"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handlePostComment()
                    }
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className=" py-2 px-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white font-medium shadow-lg disabled:opacity-50"
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                >
                  Publicar
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {(viewingStoryUserIndex !== null && groupedStories[viewingStoryUserIndex]) ? "" : <BottomNavbar />}
      {/* CSS for premium effects - add to global styles or inline */}
      <style>{`
        .story-premium {
          /* New background, frame, effects */
          background: linear-gradient(135deg, #0f0f3c, #1a1a4a);
          border: 2px solid #00f0ff;
          box-shadow: 0 0 50px rgba(0, 240, 255, 0.5);
        }
        .premium-header {
          background: linear-gradient(to bottom, rgba(0, 240, 255, 0.2), transparent);
        }
        .premium-content {
          filter: brightness(1.1) contrast(1.1);
        }
        .premium-media {
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
          border-radius: 20px;
        }
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
    </div>
  )
}
export default StreamingUI

