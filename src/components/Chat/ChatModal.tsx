"use client"

import type React from "react"
import sendMessageSound from "../../assets/sounds/sendMessage.mp3";
import typingSound from "../../assets/sounds/whatsapp-typing.mp3";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  FileText, Image as ImageIcon, Camera, Headphones, User,
  Mic, Trash2, StopCircle, Search, X, Phone, Video, Plus, Send, Download, Play, MessageCircleMore,
  Sparkles, Shield, ChevronRight, Users, EyeOff, Inbox, UserCheck, Forward, CheckCheck, Check,
} from "lucide-react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { useNavigate } from "react-router-dom"
import FluidSearch from "../Layout/fluid-search"
import { useChat } from "../../context/ChatContext"
import { getSocialConnections } from "../../redux/actions/message/social"
import CustomAudioPlayer from "./CustomAudioPlayer"
import FullscreenMediaPreview from "./FullscreenMediaPreview"
import ContactSelectionModal from "./ContactSelectionModal"

import { useDispatch, useSelector } from 'react-redux';
import { listChatRooms } from "../../redux/actions/message/listChatRoom"
import { RootState } from "../../store"
import { loadChatMessages } from "../../redux/actions/message/chatMeesage"
import { getAvailabilityStatus } from "../../redux/actions/saveAvailability"
import { sendMessage } from "../../redux/actions/message/sendMessage"
import { useWsEvent, useWebSocketContext } from "../../context/WebSocketContext"
import { allEmojis } from "../comments/emojis";
import { startCall } from "../../redux/actions/subscriptionActions"
import { useTypingUsers } from "../../context/useTyping";
import { useUnreadMessages } from "../../context/UnreadAcount";
import { apiClient, getBaseUrl, getMediaUrl } from "../../redux/client/api-client";
import { isNotifEnabled } from "../../utils/notifPrefs";
import { useAgora } from "../../hooks/useAgora";
import { useCallStore } from "../../store/callStore";
import { completeUpload } from "../../redux/reducers/uploadProgressReducer";
import { useNotificationsStore } from "../../context/NotificationsStore";
import HiddenChatPinModal from "./HiddenChatPinModal";
import { getChatPrivacyStatus, verifyChatPin } from "../../redux/actions/chatPrivacy";

enum ChatFolderFilter {
  Friends = "standard",
  Known = "known",
  Requests = "request",
  Hidden = "hidden",
}

const ChatModal: React.FC = () => {
  const { t } = useTranslation(['common'])
  const [chatSearchTerm, setChatSearchTerm] = useState("")
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([])
  const chatSocketActiveRef = useRef(false);
  const selectedChatRef = useRef<string | null>(null);
  const showMessagesRef = useRef(false);
  const { selectedChat, setSelectedChat, showMessages, setShowMessages, pendingFolder, setPendingFolder } = useChat()
  const [chatAvailability, setChatAvailability] = useState<{
    is_available: boolean;
    can_voice: boolean;
    can_video: boolean;
    remaining_calls: number;
    remaining_video_calls: number;
    plan_name: string;
    upgrade_required: boolean;
  } | null>(null);

  const { join: joinAgora, leave: leaveAgora } = useAgora();
  void joinAgora; void leaveAgora;
  const {
    activeOutgoingCall,
    activeIncomingCall,
    setActiveOutgoingCall,
    setAgoraData,
  } = useCallStore();
  void activeOutgoingCall; void activeIncomingCall;
  const [callAlert, setCallAlert] = useState<string | null>(null);
  const callAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unreadCounts = useUnreadMessages((state) => state.unreadCounts);
  const notifUnreadCount = useNotificationsStore((state) => state.unreadCount);
  void notifUnreadCount;
  const [clickedMessage, setClickedMessage] = useState<string | null>(null)
  const clickedMessageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, string[]>>>({});
  const markAsRead = useUnreadMessages((state) => state.markAsRead);
  const setUnreadCount = useUnreadMessages((state) => state.setUnreadCount);
  const incrementUnread = useUnreadMessages((state) => state.incrementUnread);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { typingByChat, setTypingUser, removeTypingUser } = useTypingUsers();
  const [activePreview, setActivePreview] = useState<{ url: string; type: 'image' | 'video'; audioUrl?: string } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  // Search inside chat
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  // Forward message
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const [forwardRecipients, setForwardRecipients] = useState<number[]>([]);
  // Message action menu
  const [msgMenuTarget, setMsgMenuTarget] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Edit message
  const [editingMsgUuid, setEditingMsgUuid] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [chatFolder, setChatFolder] = useState<ChatFolderFilter>(ChatFolderFilter.Friends);
  const [chatPrivacy, setChatPrivacy] = useState<{ has_pin: boolean; hidden_verified: boolean; hidden_verified_at: string | null; updated_at: string | null } | null>(null);
  const [showHiddenPinModal, setShowHiddenPinModal] = useState(false);
  const [chatToast, setChatToast] = useState<{ message: string; error?: boolean } | null>(null);
  const chatToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showChatToast = useCallback((message: string, error = false) => {
    if (chatToastTimeoutRef.current) clearTimeout(chatToastTimeoutRef.current);
    setChatToast({ message, error });
    chatToastTimeoutRef.current = setTimeout(() => setChatToast(null), 3500);
  }, []);
  const { connections } = useSelector((state: RootState) => state.socialReducer);
  const [messageText, setMessageText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentOptions = [
    { icon: <ImageIcon className="text-blue-400" />, label: "Fotos y videos", type: "image/video" },
    { icon: <Camera className="text-pink-400" />, label: "Cámara", type: "camera" },
    { icon: <FileText className="text-indigo-400" />, label: "Documento", type: "file" },
    { icon: <Headphones className="text-orange-400" />, label: "Audio", type: "audio" },
    { icon: <User className="text-cyan-400" />, label: "Contacto", type: "contact" },
    { icon: <Shield className="text-cyan-400" />, label: "Ocultar chat", type: "hide_chat" },
    { icon: <UserCheck className="text-violet-400" />, label: "Conocido", type: "move_known" },
    { icon: <Users className="text-cyan-400" />, label: "Amigo", type: "move_standard" },
  ]

  const handleFileSelect = (type: string) => {
    const input = fileInputRef.current;
    if (!input) return;

    switch (type) {
      case "image/video":
      case "camera":
        input.accept = "image/*,video/*";
        if (type === "camera") input.capture = "environment";
        else input.removeAttribute("capture");
        input.click();
        break;
      case "file":
        input.accept = ".pdf,.doc,.docx,.txt,.zip";
        input.removeAttribute("capture");
        input.click();
        break;
      case "audio":
        input.accept = "audio/*";
        input.removeAttribute("capture");
        input.click();
        break;
      case "contact":
        getSocialConnections()(dispatch);
        setShowContactModal(true);
        break;
      case "poll":
      case "event":
      case "sticker":
        handleSystemMessage(type);
        break;
      default:
        input.accept = "*/*";
        input.removeAttribute("capture");
        input.click();
    }

    setShowAttachmentMenu(false);
  };

  const handleSendContact = (contact: any) => {
    if (!backendMessages?.other_user?.id) return;

    const contactInfo = {
      id: contact.id,
      username: contact.username,
      avatar: contact.profile_picture,
    };
    const content = JSON.stringify(contactInfo);

    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("message_type", "contact");
    formData.append("content", content);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      uuid: tempId,
      content: content,
      file: null,
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: "contact" as const,
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    sendMessage(formData)(dispatch).then((real: any) => {
      if (real?.uuid) {
        setRealtimeMessages(prev => prev.map(m => m.uuid === tempId ? { ...real } : m));
      }
    });
    setShowContactModal(false);
    setShowAttachmentMenu(false);
  };

  const handleSystemMessage = (type: string) => {
    if (!backendMessages?.other_user?.id) return;

    const tempId = `temp-${Date.now()}`;
    const content = `[${type.toUpperCase()} enviado]`;
    const optimisticMsg = {
      uuid: tempId,
      content: content,
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: type,
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("message_type", type);
    formData.append("content", content);

    sendMessage(formData)(dispatch).then((real: any) => {
      if (real?.uuid) {
        setRealtimeMessages(prev => prev.map(m => m.uuid === tempId ? { ...real } : m));
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !backendMessages?.other_user?.id) return;

    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("file", file);

    let messageType: "image" | "video" | "text" | "voice" | "gif" | "file" | "document" = "text";
    if (file.type.startsWith("image/")) messageType = "image";
    else if (file.type.startsWith("video/")) messageType = "video";
    else if (file.type.startsWith("audio/")) messageType = "voice";
    else if (file.type === "application/pdf" || file.type.includes("word") || file.type.includes("text/plain")) messageType = "document";
    else messageType = "file";

    formData.append("message_type", messageType);
    formData.append("content", "");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      uuid: tempId,
      content: "",
      file: URL.createObjectURL(file),
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: messageType,
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    sendMessage(formData)(dispatch).then((real: any) => {
      if (real?.uuid) {
        setRealtimeMessages(prev => prev.map(m => m.uuid === tempId ? { ...real } : m));
      }
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          handleVoiceUpload(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showChatToast("No se pudo acceder al micrófono.", true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleVoiceUpload = async (blob: Blob) => {
    if (!backendMessages?.other_user?.id) return;

    const file = new File([blob], "voice_message.webm", { type: "audio/webm" });
    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("file", file);
    formData.append("message_type", "voice");
    formData.append("content", "");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      uuid: tempId,
      content: "",
      file: URL.createObjectURL(blob),
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: "voice" as "voice",
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    sendMessage(formData)(dispatch).then((real: any) => {
      if (real?.uuid) {
        setRealtimeMessages(prev => prev.map(m => m.uuid === tempId ? { ...real } : m));
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [emojiTarget, setEmojiTarget] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useDispatch()

  const { chats: backendChats, loading } = useSelector((state: RootState) => state.listChatRoomsReducer)
  const loginState = useSelector((state: RootState) => state.LoginReducer);
  const user = loginState?.user || JSON.parse(localStorage.getItem("user") || "{}");
  const [lastMessageMap, setLastMessageMap] = useState<Record<string, string>>({});
  const [chatFolderMap, setChatFolderMap] = useState<Record<string, ChatFolderFilter>>({});

  useEffect(() => {
    if (!backendChats?.chats) return;
    setLastMessageMap(prev => {
      const next = { ...prev };
      for (const chat of backendChats.chats) {
        if (chat.last_message && !next[chat.uuid]) {
          next[chat.uuid] = chat.last_message.content;
        }
      }
      return next;
    });
    setChatFolderMap(prev => {
      const next = { ...prev };
      for (const chat of backendChats.chats) {
        next[chat.uuid] = chatFolder;
      }
      return next;
    });
  }, [backendChats, chatFolder]);

  const { messages: backendMessages, loading: messagesLoading } = useSelector(
    (state: RootState) => state.chatMessagesReducer
  )
  void messagesLoading;

  const currentBackendChat = backendChats?.chats.find(c => c.uuid === selectedChat) || null

  useEffect(() => {
    if (selectedChat && currentBackendChat?.other_user?.username) {
      getAvailabilityStatus(currentBackendChat.other_user.username)().then((data: any) => {
        setChatAvailability(data);
      }).catch(console.error);
    } else {
      setChatAvailability(null);
    }
  }, [selectedChat, currentBackendChat]);

  const handleStartChatCall = (callType: 'voice' | 'video' = 'voice') => {
    const targetUserId = currentBackendChat?.other_user?.id;
    if (!targetUserId) return;

    const showChatCallAlert = (message: string) => {
      setCallAlert(message);
      if (callAlertTimeoutRef.current) clearTimeout(callAlertTimeoutRef.current);
      callAlertTimeoutRef.current = setTimeout(() => setCallAlert(null), 2600);
    };

    startCall(targetUserId, callType)()
      .then((res: any) => {
        setActiveOutgoingCall(res?.call || null);
        if (res.token && res.app_id && res.call?.agora_uid_caller) {
          setAgoraData({
            appId: res.app_id,
            token: res.token,
            uid: res.call.agora_uid_caller
          });
        }
        showChatCallAlert(res.message);
      })
      .catch((err: string) => {
        showChatCallAlert(typeof err === "string" ? err : "No se pudo iniciar la llamada.");
      });
  };

  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  const unreadCountFromStore = useUnreadMessages((state) => state.unreadCounts);
  const totalGlobal = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
  }, [unreadCounts]);
  void totalGlobal;

  useEffect(() => {
    if (selectedChat) {
      markAsRead(selectedChat);
    }
  }, [selectedChat, markAsRead]);

  useEffect(() => {
    sendAudioRef.current = new Audio(sendMessageSound);
    typingAudioRef.current = new Audio(typingSound);
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      const tryUnlock = (audio: HTMLAudioElement | null) => {
        if (!audio) return;
        audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      };
      tryUnlock(sendAudioRef.current);
      tryUnlock(typingAudioRef.current);
      audioUnlockedRef.current = true;
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    if (!pendingFolder) return;
    const folder = pendingFolder as ChatFolderFilter;
    setPendingFolder(null);
    setChatFolder(folder);
    listChatRooms({ folder })(dispatch).then(() => {});
  }, [pendingFolder, setPendingFolder, dispatch]);

  const { send: wsSend } = useWebSocketContext();

  useEffect(() => {
    chatSocketActiveRef.current = !!selectedChat;
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    showMessagesRef.current = showMessages;
  }, [showMessages]);

  useWsEvent("send_message", useCallback((data: any) => {
    const msg = data.message;
    if (!msg) return;

    const msgPreview = (content: string, type?: string): string => {
      if (type === 'contact') { try { const c = JSON.parse(content); return `Contacto: @${c.username ?? ''}`; } catch { return 'Contacto compartido'; } }
      if (type === 'voice') return '🎤 Audio';
      if (type === 'image') return '📷 Imagen';
      if (type === 'video') return '🎥 Video';
      if (type === 'document' || type === 'file') return '📄 Documento';
      return content;
    };

    if (data.is_own_confirmation) {
      if (data.chat_uuid && msg.content) {
        setLastMessageMap(prev => ({ ...prev, [data.chat_uuid]: msgPreview(msg.content, msg.message_type) }));
      }
      if (data.chat_uuid === selectedChatRef.current) {
        setRealtimeMessages(prev => {
          if (prev.some(m => m.uuid === msg.uuid)) return prev;
          const lastTempIdx = [...prev].map((m, i) => ({ m, i }))
            .reverse()
            .find(({ m }) => String(m.uuid).startsWith("temp-") && m.sender_username === msg.sender_username)?.i;
          if (lastTempIdx !== undefined) {
            const next = [...prev];
            next[lastTempIdx] = msg;
            return next;
          }
          return prev;
        });
      }
      return; // Es confirmación propia — no sonar
    }

    // Solo procesar mensajes dirigidos a este usuario
    if (data.recipient_id !== undefined && data.recipient_id !== user.id) return;
    // Si el mensaje lo mandó este mismo usuario, no sonar
    if (msg.sender_id !== undefined && msg.sender_id === user.id) return;

    if (data.chat_uuid && msg.content) {
      setLastMessageMap(prev => ({ ...prev, [data.chat_uuid]: msgPreview(msg.content, msg.message_type) }));
    }

    if (data.chat_uuid && data.chat_uuid === selectedChatRef.current) {
      setRealtimeMessages(prev => {
        if (prev.some((m: any) => m.uuid === msg.uuid)) return prev;
        return [...prev, { ...msg, is_read: true }];
      });
      // Notify sender that we read it immediately
      wsSend({
        type: "messages_read",
        chat_uuid: data.chat_uuid,
        receiver_id: msg.sender_id ?? data.sender_id,
        reader: user.username,
      });
      apiClient.post(`/api/chats/${data.chat_uuid}/read-messages/`).catch(() => {});
    } else {
      if (data.unread_count_target !== undefined) {
        setUnreadCount(data.chat_uuid, data.unread_count_target);
      } else {
        incrementUnread(data.chat_uuid);
      }
    }

    if (audioUnlockedRef.current && sendAudioRef.current && !showMessagesRef.current && isNotifEnabled('notif_messages')) {
      sendAudioRef.current.currentTime = 0;
      sendAudioRef.current.play().catch(() => {});
    }
  }, [user.id, setUnreadCount, incrementUnread]));

  useWsEvent("typing", useCallback((data: any) => {
    if (data.user_id === user.id) return;
    if (data.chat_uuid && data.chat_uuid === selectedChatRef.current && isNotifEnabled('notif_messages')) {
      typingAudioRef.current?.play().catch(() => {});
    }
    if (data.is_typing) {
      setTypingUser(data.chat_uuid, data.user_id, data.username ?? "Alguien");
    } else {
      removeTypingUser(data.chat_uuid, data.user_id);
    }
  }, [user.id, setTypingUser, removeTypingUser]));

  useWsEvent("reaction", useCallback((data: any) => {
    if (!data.message_uuid || !data.emoji) return;
    setReactionsMap(prev => {
      const msgReactions = { ...(prev[data.message_uuid] || {}) };
      let users = [...(msgReactions[data.emoji] || [])];
      if (data.action === "removed") {
        users = users.filter((u: string) => u !== data.username);
        if (users.length === 0) delete msgReactions[data.emoji];
        else msgReactions[data.emoji] = users;
      } else {
        if (!users.includes(data.username)) users.push(data.username);
        msgReactions[data.emoji] = users;
      }
      return { ...prev, [data.message_uuid]: msgReactions };
    });
  }, []));

  useWsEvent("message_deleted", useCallback((data: any) => {
    if (!data.uuid) return;
    setRealtimeMessages(prev => prev.map(m => {
      if (m.uuid !== data.uuid) return m;
      if (data.for_all) return { ...m, content: "[Este mensaje fue eliminado]", deleted_for_all: true, file: null };
      return m; // for_all=false only hides for sender (already removed locally)
    }));
  }, []));

  useWsEvent("messages_read", useCallback((data: any) => {
    if (!data.chat_uuid) return;
    setRealtimeMessages(prev => prev.map(m =>
      m.sender_username === user.username ? { ...m, is_read: true } : m
    ));
  }, [user.username]));

  useWsEvent("message_edited", useCallback((data: any) => {
    if (!data.uuid || !data.content) return;
    setRealtimeMessages(prev => prev.map(m =>
      m.uuid === data.uuid ? { ...m, content: data.content, is_edited: true } : m
    ));
  }, []));

  useWsEvent("video_ready", useCallback(() => {
    dispatch(completeUpload('done'));
  }, [dispatch]));

  useWsEvent("video_blocked", useCallback((data: any) => {
    dispatch(completeUpload('blocked', data.safety_label || 'Contenido bloqueado por moderación'));
  }, [dispatch]));

  useWsEvent("notification", useCallback((data: any) => {
    const type: string = data?.notification_type ?? "";
    if (type === "follow" && !isNotifEnabled('notif_followers')) return;
    if (type === "gift" && !isNotifEnabled('notif_gifts')) return;
    useNotificationsStore.getState().pushRealtime(data);
  }, []));

  // ── Delete message ──────────────────────────────────────────────────
  const handleDeleteMessage = async (msgUuid: string, forAll: boolean) => {
    setMsgMenuTarget(null);
    setClickedMessage(null);
    if (forAll) {
      setRealtimeMessages(prev => prev.map(m =>
        m.uuid === msgUuid ? { ...m, content: "[Este mensaje fue eliminado]", deleted_for_all: true, file: null } : m
      ));
      // Notify other user in real-time
      const otherId = currentBackendChat?.other_user?.id ?? backendMessages?.other_user?.id;
      if (otherId && selectedChat) {
        wsSend({
          type: "message_deleted",
          uuid: msgUuid,
          for_all: true,
          chat_uuid: selectedChat,
          receiver_id: otherId,
        });
      }
    } else {
      setRealtimeMessages(prev => prev.filter(m => m.uuid !== msgUuid));
    }
    try {
      await apiClient.delete(`/api/messages/${msgUuid}/delete/?for_all=${forAll}`);
    } catch {
      showChatToast("No se pudo eliminar el mensaje.", true);
    }
  };

  const handleEditMessage = async (msgUuid: string, newContent: string) => {
    if (!newContent.trim()) return;
    setRealtimeMessages(prev => prev.map(m =>
      m.uuid === msgUuid ? { ...m, content: newContent.trim(), is_edited: true } : m
    ));
    const otherId = currentBackendChat?.other_user?.id ?? backendMessages?.other_user?.id;
    if (otherId && selectedChat) {
      wsSend({
        type: "message_edited",
        uuid: msgUuid,
        content: newContent.trim(),
        chat_uuid: selectedChat,
        receiver_id: otherId,
      });
    }
    setEditingMsgUuid(null);
    setEditingContent("");
    try {
      await apiClient.patch(`/api/messages/${msgUuid}/edit/`, { content: newContent.trim() });
    } catch {
      showChatToast("No se pudo editar el mensaje.", true);
    }
  };

  // ── Forward message ──────────────────────────────────────────────────
  const handleForwardMessage = async () => {
    if (!forwardMsg || forwardRecipients.length === 0) return;
    try {
      await apiClient.post('/api/messages/forward/', {
        message_uuid: forwardMsg.uuid,
        recipient_ids: forwardRecipients,
      });
      showChatToast("Mensaje reenviado.");
    } catch {
      showChatToast("No se pudo reenviar el mensaje.", true);
    }
    setForwardMsg(null);
    setForwardRecipients([]);
  };

  // ── Search messages ──────────────────────────────────────────────────
  const handleChatSearch = async (q: string) => {
    setChatSearchQuery(q);
    if (!q.trim() || !currentBackendChat) { setChatSearchResults([]); return; }
    setChatSearchLoading(true);
    try {
      const res = await apiClient.get(`/api/chats/${currentBackendChat.uuid}/search/?q=${encodeURIComponent(q)}`);
      setChatSearchResults(res.data.results || []);
    } catch { setChatSearchResults([]); }
    finally { setChatSearchLoading(false); }
  };

  // ── Mark read on open ────────────────────────────────────────────────
  const markChatMessagesRead = useCallback(async (chatUuid: string, otherUserId?: number) => {
    try {
      await apiClient.post(`/api/chats/${chatUuid}/read-messages/`);
    } catch { /* ignore */ }
    // Notify sender via WS so their ✓✓ updates in real-time
    const receiverId = otherUserId ?? currentBackendChat?.other_user?.id ?? backendMessages?.other_user?.id;
    if (receiverId) {
      wsSend({
        type: "messages_read",
        chat_uuid: chatUuid,
        receiver_id: receiverId,
        reader: user.username,
      });
    }
  }, [wsSend, currentBackendChat?.other_user?.id, backendMessages?.other_user?.id, user.username]);

  const handleTyping = () => {
    if (!chatSocketActiveRef.current || !selectedChat) return;

    setMessageText(inputRef.current?.value || "");

    const typingReceiverId = backendMessages?.other_user?.id;
    if (!typingReceiverId) return;

    wsSend({
      type: "typing",
      is_typing: true,
      receiver_id: typingReceiverId,
      chat_uuid: backendMessages?.chat_uuid,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      wsSend({
        type: "typing",
        is_typing: false,
        receiver_id: typingReceiverId,
        chat_uuid: backendMessages?.chat_uuid,
      });
    }, 1500);
  };

  const getUnreadAcount = (chatUUID: string) => {
    return unreadCountFromStore[chatUUID] || 0;
  }

  const getFolderUnread = useCallback((folder: ChatFolderFilter) => {
    return Object.entries(chatFolderMap).reduce((acc, [uuid, f]) => {
      if (f === folder) acc += (unreadCountFromStore[uuid] || 0);
      return acc;
    }, 0);
  }, [chatFolderMap, unreadCountFromStore]);

  const loadChatsForFolder = useCallback(async (folder: ChatFolderFilter = chatFolder, accessToken?: string) => {
    await listChatRooms({ folder, accessToken })(dispatch);
  }, [chatFolder, dispatch]);

  const refreshChatPrivacy = useCallback(async () => {
    try {
      const data = await getChatPrivacyStatus();
      setChatPrivacy(data);
      return data;
    } catch (error) {
      setChatPrivacy({ has_pin: false, hidden_verified: false, hidden_verified_at: null, updated_at: null });
      return null;
    }
  }, []);

  const handleFolderChange = useCallback(async (folder: ChatFolderFilter) => {
    setSelectedChat(null);
    setChatFolder(folder);
    if (folder === ChatFolderFilter.Hidden) {
      localStorage.removeItem("hiddenChatAccessToken");
      setShowHiddenPinModal(true);
      return;
    }

    await loadChatsForFolder(folder);
  }, [loadChatsForFolder]);

  const handleHiddenPinSubmit = useCallback(async (pin: string) => {
    const result = await verifyChatPin(pin);
    if (result?.access_token) {
      localStorage.setItem("hiddenChatAccessToken", result.access_token);
    }
    const refreshed = await refreshChatPrivacy();
    setShowHiddenPinModal(false);
    await loadChatsForFolder(ChatFolderFilter.Hidden, result?.access_token || localStorage.getItem("hiddenChatAccessToken") || undefined);
    if (refreshed) setChatPrivacy(refreshed);
  }, [loadChatsForFolder, refreshChatPrivacy]);

  const handleToggleHiddenCurrentChat = useCallback(async () => {
    if (!currentBackendChat) return;

    const nextFolder = currentBackendChat.folder_type === ChatFolderFilter.Hidden
      ? ChatFolderFilter.Friends
      : ChatFolderFilter.Hidden;

    try {
      await apiClient.patch(`/api/chats/${currentBackendChat.uuid}/folder/`, {
        folder_type: nextFolder,
      });

      if (nextFolder !== ChatFolderFilter.Hidden) {
        localStorage.removeItem("hiddenChatAccessToken");
      }

      await refreshChatPrivacy();
      setSelectedChat(null);
      setChatFolder(ChatFolderFilter.Friends);
      await loadChatsForFolder(ChatFolderFilter.Friends);
    } catch {
      showChatToast("No se pudo mover el chat.", true);
    }
  }, [currentBackendChat, loadChatsForFolder, refreshChatPrivacy, setSelectedChat, showChatToast]);

  const handleMoveChatToFolder = useCallback(async (targetFolder: ChatFolderFilter) => {
    if (!currentBackendChat) return;
    try {
      await apiClient.patch(`/api/chats/${currentBackendChat.uuid}/folder/`, {
        folder_type: targetFolder,
      });
      setSelectedChat(null);
      await loadChatsForFolder(chatFolder);
    } catch {
      showChatToast("No se pudo mover el chat.", true);
    }
  }, [currentBackendChat, chatFolder, loadChatsForFolder, setSelectedChat, showChatToast]);

  useEffect(() => {
    if (!showMessages) return;
    const load = async () => {
      await refreshChatPrivacy();
      if (chatFolder === ChatFolderFilter.Hidden) {
        return;
      }
      await loadChatsForFolder(chatFolder);
    };

    load();
  }, [showMessages, chatFolder, loadChatsForFolder, refreshChatPrivacy])

  useEffect(() => {
    if (!showMessages) {
      setChatFolder(ChatFolderFilter.Friends);
      setShowHiddenPinModal(false);
      localStorage.removeItem("hiddenChatAccessToken");
    }
  }, [showMessages]);

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat)(dispatch);
      markChatMessagesRead(selectedChat, currentBackendChat?.other_user?.id);
      // reset search on chat change
      setShowChatSearch(false);
      setChatSearchQuery("");
      setChatSearchResults([]);
    }
  }, [selectedChat, dispatch, markChatMessagesRead, currentBackendChat?.other_user?.id])

  const seededChatRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedChat) return;
    setRealtimeMessages([]);
    setReactionsMap({});
    seededChatRef.current = null;
  }, [selectedChat]);

  useEffect(() => {
    if (!backendMessages?.messages || !selectedChat) return;
    if (seededChatRef.current === selectedChat) return;
    seededChatRef.current = selectedChat;

    setRealtimeMessages(backendMessages.messages);
    const seeded: Record<string, Record<string, string[]>> = {};
    for (const msg of backendMessages.messages) {
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        seeded[msg.uuid] = msg.reactions;
      }
    }
    setReactionsMap(seeded);
  }, [backendMessages?.messages, selectedChat]);

  // Once backendMessages loads, notify sender so ✓✓ updates without reload
  useEffect(() => {
    if (!backendMessages?.other_user?.id || !selectedChat || !showMessages) return;
    wsSend({
      type: "messages_read",
      chat_uuid: selectedChat,
      receiver_id: backendMessages.other_user.id,
      reader: user.username,
    });
  }, [backendMessages?.other_user?.id, selectedChat, showMessages, wsSend, user.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [realtimeMessages.length])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    const input = inputRef.current
    if (!input?.value.trim() || !backendMessages?.other_user?.id) return

    const content = input.value.trim();
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      uuid: tempId,
      content: content,
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: "text" as "text",
    }

    setRealtimeMessages(prev => [...prev, optimisticMsg])

    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("content", content);
    formData.append("message_type", "text");

    sendMessage(formData)(dispatch).then((real: any) => {
      if (real?.uuid) {
        setRealtimeMessages(prev => prev.map(m => m.uuid === tempId ? { ...real } : m));
      }
    });
    input.value = ""
    setMessageText("")
  }

  const sendReaction = (messageUuid: string, emoji: string) => {
    wsSend({ type: "reaction", message_uuid: messageUuid, emoji });
    setReactionsMap(prev => {
      const msgReactions = { ...(prev[messageUuid] || {}) };
      let users = [...(msgReactions[emoji] || [])];

      if (users.includes(user.username)) {
        users = users.filter(u => u !== user.username);
        if (users.length === 0) delete msgReactions[emoji];
        else msgReactions[emoji] = users;
      } else {
        users.push(user.username);
        msgReactions[emoji] = users;
      }
      return { ...prev, [messageUuid]: msgReactions };
    });

    setEmojiTarget(null)
  }

  const typingContest = (chat: any) => {
    const chatTypingUsers = typingByChat[chat.uuid];
    if (!chatTypingUsers) return null;

    const users = Object.values(chatTypingUsers);

    return (
      <motion.div className="flex items-center gap-2 text-sm text-gray-400 px-2">
        <span className="text-green-500">
          {users.length > 1 ? "están escribiendo…" : "está escribiendo…"}
        </span>
      </motion.div>
    );
  };

  return (
    <>
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

      <AnimatePresence>
        {chatToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] rounded-2xl px-4 py-3 text-sm text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl border ${chatToast.error ? "bg-red-900/90 border-red-500/30" : "bg-[#08101f]/95 border-[#00f0ff]/20"}`}
          >
            {chatToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <FluidSearch onClose={() => setShowSearch(false)} searchTerm="" setSearchTerm={() => {}} />
        )}
      </AnimatePresence>

      <LayoutGroup>
        {/* LISTA DE CHATS */}
        <AnimatePresence>
          {showMessages && !selectedChat && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMessages(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 top-0 z-[60] mx-auto w-full max-w-md"
              >
                <div className="bg-gray-900/95 backdrop-blur-xl border-x border-b border-gray-700/60 rounded-b-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
                    <h3 className="text-xl font-bold text-white">{t('common:messages.title', 'Mensajes')}</h3>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15, rotate: 90 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMessages(false);
                      }}
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </motion.button>
                  </div>

                  <div className="px-2 pb-2 pt-2 ">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder={t('common:messages.searchPlaceholder', 'Buscar chat...')}
                        value={chatSearchTerm}
                        onChange={(e) => setChatSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-700/50 rounded-xl leading-5 bg-[#0c2033] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff]/50 sm:text-sm transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="h-[52vh] overflow-hidden relative">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={chatFolder}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="h-full overflow-y-auto pb-3"
                      >
                    {loading ? (
                      <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-gray-700" />
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-32 mb-2" />
                              <div className="h-3 bg-gray-600 rounded w-48" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : backendChats && backendChats.chats.length == 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-10 px-8 text-center">
                        {chatFolder === ChatFolderFilter.Hidden ? (
                          <>
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.05 }}
                              className="w-20 h-20 mb-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center"
                            >
                              <Shield className="w-10 h-10 text-cyan-300" />
                            </motion.div>
                            <motion.h3
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="text-lg font-semibold text-white mb-2"
                            >
                              No hay chats ocultos visibles
                            </motion.h3>
                            <motion.p
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.13 }}
                              className="text-sm text-gray-400 max-w-xs"
                            >
                              {chatPrivacy?.has_pin
                                ? "Cuando ocultes una conversación, aparecerá aquí protegida por tu PIN."
                                : "Primero debes crear tu PIN de chats para acceder a esta carpeta."}
                            </motion.p>
                            <motion.button
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.16 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (!chatPrivacy?.has_pin) {
                                  setShowHiddenPinModal(true);
                                  return;
                                }
                                setShowSearch(true);
                              }}
                              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-2.5 font-medium text-white shadow-lg shadow-cyan-500/15"
                            >
                              {chatPrivacy?.has_pin ? "Buscar personas" : "Configurar PIN"}
                              <ChevronRight className="h-4 w-4" />
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.05 }}
                              className="w-20 h-20 mb-5 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center"
                            >
                              <MessageCircleMore className="w-10 h-10 text-purple-400" />
                            </motion.div>
                            <motion.h3
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="text-lg font-semibold text-white mb-2"
                            >
                              {t('common:messages.empty', 'Aún no tienes mensajes')}
                            </motion.h3>
                            <motion.p
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.13 }}
                              className="text-sm text-gray-400 max-w-xs"
                            >
                              {t('common:messages.emptyHint', 'Empieza una conversación buscando a alguien en Buzzy 🚀')}
                            </motion.p>
                            <motion.button
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.16 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setShowMessages(false); setShowSearch(true); }}
                              className="mt-6 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full shadow-lg"
                            >
                              {t('common:messages.findPeople', 'Buscar personas')}
                            </motion.button>
                          </>
                        )}
                      </div>
                    ) : (
                      <ul>
                        {backendChats?.chats
                          .filter(chat => chat.other_user.username.toLowerCase().includes(chatSearchTerm.toLowerCase()) || chat.other_user.name?.toLowerCase().includes(chatSearchTerm.toLowerCase()))
                          .sort((a, b) => {
                            const planOrder: { [key: string]: number } = {
                              'FRIEND': 0,
                              'PLUS': 1,
                              'VIP': 2,
                              'NONE': 3
                            };
                            const aPlan = a.other_user.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
                            const bPlan = b.other_user.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
                            return (planOrder[aPlan as keyof typeof planOrder] ?? 4) - (planOrder[bPlan as keyof typeof planOrder] ?? 4);
                          })
                          .map((chat) => {
                            const planName = chat.other_user.subscription_status?.plan?.name?.toUpperCase();
                            let itemBg = "hover:bg-white/5";

                            if (planName === 'FRIEND') {
                              itemBg = "bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10";
                            } else if (planName === 'PLUS') {
                              itemBg = "bg-purple-800/5 hover:bg-purple-800/10";
                            } else if (planName === 'VIP') {
                              itemBg = "bg-amber-400/5 hover:bg-amber-400/10";
                            }

                            return (
                              <motion.li
                                key={chat.uuid}
                                onClick={() => setSelectedChat(chat.uuid)}
                                className={`p-4 mx-2 my-1 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border border-white/5 last:border-b-0 group relative overflow-hidden ${itemBg}`}
                                whileTap={{ scale: 0.98 }}
                              >
                                {(planName === 'FRIEND' || planName === 'PLUS' || planName === 'VIP') && (
                                  <>
                                    <motion.div
                                      initial={{ x: '-100%', opacity: 0 }}
                                      animate={{ x: '200%', opacity: [0, 0.5, 0] }}
                                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                                      className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-12 pointer-events-none"
                                    />
                                    <div className="absolute inset-0 border border-cyan-400/20 rounded-2xl z-0" />
                                  </>
                                )}
                                <div className="relative">
                                  <div
                                    className={`relative p-[1.5px] rounded-full transition-transform group-hover:scale-105 cursor-pointer ${planName === 'FRIEND' ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.4)]' : planName === 'VIP' ? 'bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200' : planName === 'PLUS' ? 'bg-gradient-to-tr from-purple-400 to-pink-500' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMessages(false);
                                      navigate(`/profile/${chat.other_user.username}`);
                                    }}
                                  >
                                    <img
                                      src={getMediaUrl(chat.other_user.avatar || "/profile_pics/avatar.webp")}
                                      alt={chat.other_user.username}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-[#0c1033]"
                                    />
                                  </div>
                                  {chat.other_user_online.is_online && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0c1033] rounded-full shadow-lg" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <p className={`font-semibold truncate ${planName === 'FRIEND' ? 'text-cyan-400' : planName === 'VIP' ? 'text-amber-100' : 'text-white'}`}>{chat.other_user.username}</p>
                                      {planName === 'FRIEND' && (
                                        <span className="text-[8px] bg-white/10 backdrop-blur-md text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-cyan-400/30 shadow-[0_0_10px_rgba(0,240,255,0.2)] flex items-center gap-1 group-hover:bg-cyan-400/20 transition-colors shrink-0">
                                          <Sparkles size={7} fill="currentColor" /> DIAMOND
                                        </span>
                                      )}
                                      {planName === 'PLUS' && (
                                        <span className="text-[9px] bg-gradient-to-r from-purple-400 to-pink-500 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter shrink-0">PLUS</span>
                                      )}
                                      {planName === 'VIP' && (
                                        <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-600 text-black px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter shadow-sm shrink-0">VIP</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap ml-2 shrink-0">
                                      {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <p className="text-xs text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                                      {typingContest(chat) || lastMessageMap[chat.uuid] || chat.last_message?.content || ""}
                                    </p>
                                    {getUnreadAcount(chat.uuid) > 0 && (
                                      <div className={`min-w-[20px] h-5 px-1 flex items-center justify-center text-[10px] text-white font-bold rounded-full shadow-lg shrink-0 ${planName === 'FRIEND' ? 'bg-gradient-to-br from-[#00f0ff] to-blue-600 shadow-[0_0_10px_rgba(0,240,255,0.3)]' :
                                        planName === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_10px_rgba(251,191,36,0.3)]' :
                                          'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                        }`}>
                                        {getUnreadAcount(chat.uuid)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.li>
                            );
                          })}
                      </ul>
                    )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Footer nav con iconos */}
                  <div className="border-t border-white/8 bg-gray-900/80 backdrop-blur-md px-1 py-1">
                    <div className="flex items-center justify-around">
                      {[
                        { key: ChatFolderFilter.Friends, icon: Users, label: "Amigos", gradient: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/40" },
                        { key: ChatFolderFilter.Known, icon: UserCheck, label: "Conocidos", gradient: "from-violet-400 to-fuchsia-500", glow: "shadow-violet-500/40" },
                        { key: ChatFolderFilter.Requests, icon: Inbox, label: "Solicitudes", gradient: "from-amber-400 to-orange-500", glow: "shadow-amber-500/40" },
                        { key: ChatFolderFilter.Hidden, icon: EyeOff, label: "Ocultos", gradient: "from-gray-400 to-gray-600", glow: "shadow-gray-500/30" },
                      ].map((item) => {
                        const active = chatFolder === item.key;
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.key}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleFolderChange(item.key)}
                            className="relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all"
                          >
                            {(() => { const fCount = getFolderUnread(item.key); return fCount > 0 ? (
                              <span className={`absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white rounded-full bg-gradient-to-br ${item.gradient} shadow-sm z-10`}>
                                {fCount > 99 ? "99+" : fCount}
                              </span>
                            ) : null; })()}
                            <motion.div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                active
                                  ? `bg-gradient-to-br ${item.gradient} shadow-md ${item.glow}`
                                  : "bg-white/5"
                              }`}
                              animate={{ scale: active ? 1 : 0.88 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <Icon className={`${active ? "text-white" : "text-white/40"}`} size={15} />
                            </motion.div>
                            <span className={`text-[8px] font-semibold tracking-wide transition-colors ${active ? "text-white" : "text-white/30"}`}>
                              {item.label}
                            </span>
                            {active && (
                              <motion.div
                                layoutId="chat-folder-dot"
                                className={`absolute -bottom-0.5 w-1 h-1 rounded-full bg-gradient-to-r ${item.gradient}`}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <HiddenChatPinModal
          isOpen={showHiddenPinModal}
          hasPin={!!chatPrivacy?.has_pin}
          onClose={() => {
            setShowHiddenPinModal(false);
            setChatFolder(ChatFolderFilter.Friends);
            loadChatsForFolder(ChatFolderFilter.Friends);
          }}
          onVerified={() => setShowHiddenPinModal(false)}
          onConfigurePin={() => {
            setShowHiddenPinModal(false);
            setShowMessages(false);
            navigate(`/profile/${user?.username || "user"}`);
          }}
          onSubmitPin={handleHiddenPinSubmit}
        />

        {/* CHAT INDIVIDUAL */}
        <AnimatePresence>
          {selectedChat && currentBackendChat && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedChat(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
                className="fixed inset-x-0 top-0 bottom-0 z-[60] mx-auto w-full max-w-md"
              >
                <div className="absolute inset-0 overflow-hidden rounded-none">
                  <img
                    src={getMediaUrl(currentBackendChat.other_user.avatar || "/profile_pics/avatar.webp")}
                    alt=""
                    className="w-full h-full object-cover scale-125"
                    style={{ filter: "blur(8px) brightness(0.18) saturate(1.6)" }}
                  />
                  <div className="absolute inset-0 bg-black/60" />
                </div>

                <div className="relative h-full flex flex-col">

                  <div className="absolute top-4 left-4 z-10">
                    <div
                      className={`relative p-[2px] rounded-full cursor-pointer ${
                        currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                          ? 'bg-gradient-to-br from-[#00f0ff] to-blue-500 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                          : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS'
                            ? 'bg-gradient-to-br from-purple-400 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.45)]'
                            : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                              ? 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                              : 'bg-white/20'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChat(null);
                        setShowMessages(false);
                        navigate(`/profile/${currentBackendChat.other_user.username}`);
                      }}
                    >
                      <img
                        src={getMediaUrl(currentBackendChat.other_user.avatar || "/profile_pics/avatar.webp")}
                        alt={currentBackendChat.other_user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {currentBackendChat.other_user_online.is_online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-black rounded-full shadow-[0_0_5px_rgba(74,222,128,0.9)]" />
                      )}
                    </div>
                  </div>

                  <motion.div
                    initial={{ x: -60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0 bg-[#1c2030]/85 backdrop-blur-xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleStartChatCall('voice')}
                      disabled={!chatAvailability?.can_voice}
                      className={`relative w-12 h-12 flex items-center justify-center transition-all ${
                        chatAvailability?.can_voice ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-white/25 cursor-not-allowed"
                      }`}
                    >
                      <Phone className="w-[18px] h-[18px]" />
                      {chatAvailability?.is_available && chatAvailability?.can_voice && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400/70 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
                        </span>
                      )}
                    </motion.button>
                    <div className="w-7 h-px bg-white/12 mx-auto" />
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleStartChatCall('video')}
                      disabled={!chatAvailability?.can_video}
                      className={`relative w-12 h-12 flex items-center justify-center transition-all ${
                        chatAvailability?.can_video ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-white/25 cursor-not-allowed"
                      }`}
                    >
                      <Video className="w-[18px] h-[18px]" />
                      {chatAvailability?.is_available && chatAvailability?.can_video && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400/70 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
                        </span>
                      )}
                    </motion.button>
                    <div className="w-7 h-px bg-white/12 mx-auto" />
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { setShowChatSearch(v => !v); setChatSearchQuery(""); setChatSearchResults([]); }}
                      className="w-12 h-12 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Search className="w-[18px] h-[18px]" />
                    </motion.button>
                    <div className="w-7 h-px bg-white/12 mx-auto" />
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChat(null);
                      }}
                      className="w-12 h-12 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <X className="w-[18px] h-[18px]" />
                    </motion.button>
                  </motion.div>

                  {/* Search bar */}
                  <AnimatePresence>
                    {showChatSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-16 left-16 right-4 z-20 bg-[#0c1033]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                          <Search size={14} className="text-gray-400 flex-shrink-0" />
                          <input
                            autoFocus
                            value={chatSearchQuery}
                            onChange={e => handleChatSearch(e.target.value)}
                            placeholder="Buscar en la conversación..."
                            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                          />
                          {chatSearchQuery && (
                            <button onClick={() => { setChatSearchQuery(""); setChatSearchResults([]); }} className="text-gray-500 hover:text-white">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {chatSearchLoading && <p className="text-xs text-gray-500 px-3 py-2">Buscando...</p>}
                          {!chatSearchLoading && chatSearchResults.length === 0 && chatSearchQuery && (
                            <p className="text-xs text-gray-500 px-3 py-2">Sin resultados</p>
                          )}
                          {chatSearchResults.map(msg => (
                            <div key={msg.uuid} className="px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer"
                              onClick={() => {
                                // scroll to message
                                const el = document.getElementById(`msg-${msg.uuid}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setShowChatSearch(false);
                              }}>
                              <p className="text-xs text-white/80 truncate">{msg.content}</p>
                              <p className="text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleString('es-DO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 overflow-y-auto pt-20 pb-2 px-4 space-y-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} onClick={() => { setMsgMenuTarget(null); }}>
                    {realtimeMessages.map((msg) => {
                      const isMe = msg.sender_username === user.username

                      return (
                        <motion.div
                          key={msg.uuid}
                          id={`msg-${msg.uuid}`}
                          initial={{ opacity: 0, y: 14, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button, a, input, video, audio')) return;
                            if (clickedMessageTimerRef.current) clearTimeout(clickedMessageTimerRef.current);
                            if (clickedMessage === msg.uuid) {
                              setClickedMessage(null);
                              setEmojiTarget(null);
                              setMsgMenuTarget(null);
                              return;
                            }
                            setEmojiTarget(null);
                            setMsgMenuTarget(null);
                            setClickedMessage(msg.uuid);
                            clickedMessageTimerRef.current = setTimeout(() => {
                              setClickedMessage(null);
                            }, 3000);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMsgMenuTarget(msg.uuid);
                            setClickedMessage(msg.uuid);
                          }}
                          onTouchStart={() => {
                            longPressTimerRef.current = setTimeout(() => {
                              setMsgMenuTarget(msg.uuid);
                              setClickedMessage(msg.uuid);
                            }, 500);
                          }}
                          onTouchEnd={() => {
                            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                          }}
                          onTouchMove={() => {
                            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                          }}
                          className="relative flex items-end justify-end gap-2"
                        >
                          <div className="relative flex items-center">

                            {clickedMessage === msg.uuid && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="mr-2 w-7 h-7 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-full shadow-xl border border-white/15 text-gray-300 hover:text-yellow-400 transition-all cursor-pointer flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (clickedMessageTimerRef.current) clearTimeout(clickedMessageTimerRef.current);
                                  setEmojiTarget(emojiTarget === msg.uuid ? null : msg.uuid);
                                }}
                              >
                                <span className="text-sm">😊</span>
                              </motion.button>
                            )}

                            <div
                              className={`max-w-[72vw] ${msg.message_type === 'text' ? 'px-4 py-3' : msg.message_type === 'contact' ? 'p-0 overflow-hidden' : 'p-[1px]'} ${isMe ? 'rounded-tl-[20px] rounded-tr-[20px] rounded-bl-[20px] rounded-br-[4px]' : 'rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[4px]'} shadow-xl transition-all duration-300 ${
                                isMe
                                  ? (msg.message_type === 'text' || msg.message_type === 'contact')
                                    ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                                      ? "bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-cyan-400/30"
                                      : user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                                        ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-black font-bold shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-amber-300/50"
                                        : user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS'
                                          ? "bg-gradient-to-br from-purple-600 via-pink-600 to-purple-800 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-purple-400/20"
                                          : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white shadow-lg border border-white/5"
                                    : "backdrop-blur-lg text-white"
                                  : (msg.message_type === 'text' || msg.message_type === 'contact')
                                    ? currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                                      ? "bg-[#0c1a2e]/90 text-cyan-50 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                                      : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                                        ? "bg-[#1f1a10]/95 text-amber-50 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                        : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS'
                                          ? "bg-[#1e0f2e]/90 text-purple-50 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                                          : "bg-[#1a1a1a] text-gray-100 border border-white/10 shadow-inner"
                                    : "backdrop-blur-lg text-gray-100"
                              }`}
                            >
                              {!isMe && (
                                <p className={`text-[10px] mb-0.5 font-semibold ${
                                  currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'text-cyan-400' :
                                  currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'text-amber-400' :
                                  currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? 'text-purple-400' : 'text-gray-400'
                                }`}>
                                  {msg.sender_username}
                                </p>
                              )}

                              {msg.deleted_for_all ? (
                                <div className="flex items-center gap-2 py-1 px-1 italic text-gray-500 text-sm select-none">
                                  <span>🚫</span>
                                  <span>Este mensaje fue eliminado</span>
                                </div>
                              ) : msg.message_type === "text" ? (
                                editingMsgUuid === msg.uuid ? (
                                  <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                                    <textarea
                                      autoFocus
                                      className="w-full bg-black/30 text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#7000ff]/50 focus:border-[#00f0ff]/60 resize-none"
                                      rows={2}
                                      value={editingContent}
                                      onChange={e => setEditingContent(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.uuid, editingContent); }
                                        if (e.key === 'Escape') { setEditingMsgUuid(null); setEditingContent(""); }
                                      }}
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => { setEditingMsgUuid(null); setEditingContent(""); }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancelar</button>
                                      <button onClick={() => handleEditMessage(msg.uuid, editingContent)} className="text-xs text-white bg-gradient-to-r from-[#7000ff] to-[#00f0ff] px-3 py-1 rounded-full">Guardar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm leading-relaxed break-words">
                                    {msg.content}
                                    {msg.is_edited && <span className="text-[10px] opacity-50 ml-1">editado</span>}
                                  </p>
                                )
                              ) : msg.message_type === "image" ? (
                                <div
                                  className="rounded-xl overflow-hidden mb-1 border border-white/10 shadow-2xl relative group p-[0.5px] bg-[#1a1a2e] cursor-pointer"
                                  onClick={() => setActivePreview({
                                    url: msg.file?.startsWith('http') || msg.file?.startsWith('blob:') ? msg.file : `${getBaseUrl()}media/${msg.file}`,
                                    type: 'image'
                                  })}
                                >
                                  <img
                                    src={msg.file?.startsWith('http') || msg.file?.startsWith('blob:') ? msg.file : `${getBaseUrl()}media/${msg.file}`}
                                    alt="Sent image"
                                    className="max-w-full h-auto object-cover rounded-[10px] transition-transform duration-300 group-hover:scale-[1.02]"
                                  />
                                  <div className="media-timestamp-overlay">
                                    {new Date(msg.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              ) : msg.message_type === "video" ? (
                                <div
                                  className="rounded-xl overflow-hidden mb-1 border border-white/10 shadow-2xl relative group p-[0.5px] bg-[#1a1a2e] cursor-pointer"
                                  onClick={() => setActivePreview({
                                    url: msg.file?.startsWith('http') || msg.file?.startsWith('blob:') ? msg.file : `${getBaseUrl()}media/${msg.file}`,
                                    type: 'video'
                                  })}
                                >
                                  <video
                                    src={msg.file?.startsWith('http') || msg.file?.startsWith('blob:') ? msg.file : `${getBaseUrl()}media/${msg.file}`}
                                    className="max-w-full h-auto rounded-[10px]"
                                  />
                                  <div className="media-timestamp-overlay">
                                    {new Date(msg.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                                      <Play className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                </div>
                              ) : msg.message_type === "voice" ? (
                                <div className="flex flex-col gap-1 relative">
                                  <CustomAudioPlayer
                                    src={msg.file?.startsWith('http') || msg.file?.startsWith('blob:') ? msg.file : `${getBaseUrl()}media/${msg.file}`}
                                    isMe={isMe}
                                    planName={isMe ? user.subscription_status?.plan?.name?.toUpperCase() : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase()}
                                  />
                                  <div className="flex items-center justify-between w-full mt-1 gap-4">
                                    <p className={`text-[10px] ${isMe ? "text-purple-200/70" : "text-gray-500"}`}>
                                      {new Date(msg.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                    {reactionsMap[msg.uuid] && Object.keys(reactionsMap[msg.uuid]).length > 0 && (
                                      <div className="flex items-center gap-1 z-10">
                                        {Object.entries(reactionsMap[msg.uuid]).map(([emoji, users]) => {
                                          const iMine = users.includes(user.username);
                                          return (
                                            <motion.button
                                              key={emoji}
                                              initial={{ scale: 0, opacity: 0 }}
                                              animate={{ scale: 1, opacity: 1 }}
                                              whileHover={{ scale: 1.25 }}
                                              whileTap={{ scale: 0.9 }}
                                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] shadow-lg border transition-all cursor-pointer ${iMine ? 'bg-purple-600/30 border-purple-500/40 text-white' : 'bg-[#1e1e35]/90 border-white/10 text-gray-200'}`}
                                              onClick={(e) => { e.stopPropagation(); sendReaction(msg.uuid, emoji); }}
                                            >
                                              <span>{emoji}</span>
                                              {users.length > 1 && <span className="font-semibold ml-0.5">{users.length}</span>}
                                            </motion.button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : msg.message_type === "document" || msg.message_type === "file" ? (
                                <div className={`flex items-center gap-3 py-2 px-1 min-w-[200px] rounded-xl border transition-all cursor-pointer ${isMe
                                  ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-cyan-500/30 hover:bg-cyan-500/40 text-white' :
                                    user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-gradient-to-br from-amber-400/30 to-orange-600/30 border-amber-500/30 hover:bg-amber-400/40 text-white' :
                                      'bg-purple-600/20 border-purple-500/20 hover:bg-purple-600/30 text-white border'
                                  : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-[#1a1a2e]/90 border-cyan-400/30 hover:bg-[#1a1a2e] border' :
                                    currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-[#1f1a10]/90 border-amber-400/30 hover:bg-[#1f1a10] border' :
                                      'bg-[#23233b] hover:bg-[#23233b]/80 border-transparent'
                                  }`}>
                                  <div className={`p-2 rounded-lg ${isMe
                                    ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-cyan-400 text-black' :
                                      user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-amber-400 text-black' :
                                        'bg-purple-600/40 text-purple-100'
                                    : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-cyan-500/20 text-cyan-400' :
                                      currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-[#1a1a2e] text-gray-300'
                                    }`}>
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-medium truncate text-gray-200">
                                      {msg.file?.split('/').pop() || 'Archivo adjunto'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 uppercase">{msg.message_type}</p>
                                  </div>
                                  <a
                                    href={msg.file?.startsWith('http') ? msg.file : `${getBaseUrl()}media/${msg.file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.file?.split('/').pop()}
                                    className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="w-4 h-4 text-gray-400" />
                                  </a>
                                </div>
                              ) : msg.message_type === "story_reply" ? (
                                <div
                                  className="rounded-xl overflow-hidden min-w-[180px] max-w-[240px] cursor-pointer group"
                                  onClick={() => {
                                    if (msg.story_media_url) {
                                      const url = msg.story_media_url.startsWith('http') ? msg.story_media_url : `${getBaseUrl()}media/${msg.story_media_url}`;
                                      const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(url);
                                      setActivePreview({ url, type: isVideo ? 'video' : 'image', audioUrl: msg.story_audio_url ?? undefined });
                                    }
                                  }}
                                >
                                  {msg.story_media_url ? (
                                    (() => {
                                      const url = msg.story_media_url.startsWith('http') ? msg.story_media_url : `${getBaseUrl()}media/${msg.story_media_url}`;
                                      const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(url);
                                      return isVideo ? (
                                        <video
                                          src={url}
                                          className="w-full h-36 object-cover rounded-t-xl opacity-80 group-hover:opacity-100 transition-opacity"
                                          muted
                                          playsInline
                                        />
                                      ) : (
                                        <img
                                          src={url}
                                          alt="Historia"
                                          className="w-full h-36 object-cover rounded-t-xl opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                      );
                                    })()
                                  ) : (
                                    <div className="w-full h-36 bg-white/5 rounded-t-xl flex items-center justify-center">
                                      <span className="text-2xl">📖</span>
                                    </div>
                                  )}
                                  <div className="px-3 py-2 bg-black/30 backdrop-blur-sm rounded-b-xl border-t border-white/10">
                                    <p className="text-[10px] text-white/50 uppercase font-semibold tracking-wide">Respondió a tu historia</p>
                                    {msg.content && (
                                      <p className="text-sm text-white/90 mt-0.5 break-words">{msg.content}</p>
                                    )}
                                  </div>
                                </div>
                              ) : msg.message_type === "contact" ? (
                                <div className="p-3 flex flex-col gap-3 min-w-[200px]">
                                  <div className="flex items-center gap-3">
                                    {(() => {
                                      try {
                                        const contact = JSON.parse(msg.content);
                                        return (
                                          <>
                                            <img
                                              src={contact.avatar?.startsWith('http') ? contact.avatar : `${getBaseUrl()}${contact.avatar?.startsWith('/') ? contact.avatar.slice(1) : contact.avatar}`}
                                              className="w-12 h-12 rounded-full object-cover border border-white/20"
                                              alt="Contact"
                                            />
                                            <div className="flex-1 overflow-hidden">
                                              <p className="text-sm font-bold text-white truncate">@{contact.username}</p>
                                              <p className="text-[10px] text-white/50">Contacto compartido</p>
                                            </div>
                                          </>
                                        );
                                      } catch (e) {
                                        return <p className="text-xs text-red-400">Error al cargar contacto</p>;
                                      }
                                    })()}
                                  </div>
                                  <button
                                    className="w-full py-2 text-xs font-semibold rounded-lg transition-colors bg-black/20 hover:bg-black/30 text-white border border-white/20"
                                    onClick={() => {
                                      try {
                                        const contact = JSON.parse(msg.content);
                                        window.location.href = `/profile/${contact.username}`;
                                      } catch (e) { }
                                    }}
                                  >
                                    Ver Perfil
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 py-1 px-2 bg-gray-900/20 rounded-lg italic text-gray-400 text-xs">
                                  <span className="opacity-70 text-[10px] uppercase font-bold">{msg.message_type}</span>
                                  <span>{msg.content || "[Contenido multimedia]"}</span>
                                </div>
                              )}

                              {msg.message_type !== 'image' && msg.message_type !== 'video' && msg.message_type !== 'voice' && (
                                <div className="flex items-center justify-between w-full mt-1.5 gap-4">
                                  <div className="flex items-center gap-1">
                                    <p className="text-[11px] text-white/40 font-normal">
                                      {new Date(msg.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                    {isMe && (
                                      msg.is_read
                                        ? <CheckCheck size={12} className="text-[#00f0ff]" />
                                        : <Check size={12} className="text-white/30" />
                                    )}
                                  </div>
                                  {reactionsMap[msg.uuid] && Object.keys(reactionsMap[msg.uuid]).length > 0 && (
                                    <div className="flex items-center gap-1 z-10">
                                      {Object.entries(reactionsMap[msg.uuid]).map(([emoji, users]) => {
                                        const iMine = users.includes(user.username);
                                        return (
                                          <motion.button
                                            key={emoji}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            whileHover={{ scale: 1.25 }}
                                            whileTap={{ scale: 0.9 }}
                                            title={users.join(', ')}
                                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] shadow-lg border transition-all cursor-pointer ${iMine ? 'bg-purple-600/30 border-purple-500/40 text-white' : 'bg-[#1e1e35]/90 border-white/10 text-gray-200'}`}
                                            onClick={(e) => { e.stopPropagation(); sendReaction(msg.uuid, emoji); }}
                                          >
                                            <span>{emoji}</span>
                                            {users.length > 1 && <span className="font-semibold ml-0.5">{users.length}</span>}
                                          </motion.button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <AnimatePresence>
                              {emojiTarget === msg.uuid && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.85, y: 8 }}
                                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                  className={`absolute -top-16 ${isMe ? 'right-10' : 'left-10'} bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
                                    {["❤️", "😂", "😮", "😢", "😡", "👍"].map((emoji) => (
                                      <motion.button
                                        key={emoji}
                                        whileHover={{ scale: 1.4, y: -4 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 400 }}
                                        className="text-2xl cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
                                        onClick={() => { sendReaction(msg.uuid, emoji); setEmojiTarget(null); setClickedMessage(null); }}
                                      >
                                        {emoji}
                                      </motion.button>
                                    ))}
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all text-sm font-bold"
                                      onClick={(e) => { e.stopPropagation(); setEmojiTarget(`${msg.uuid}-full`); }}
                                    >
                                      +
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <AnimatePresence>
                              {emojiTarget === `${msg.uuid}-full` && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                  className={`absolute -top-56 ${isMe ? 'right-10' : 'left-10'} bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 w-64 overflow-hidden`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                                    <span className="text-xs text-gray-400 font-semibold">Reaccionar</span>
                                    <button
                                      className="text-gray-500 hover:text-white text-xs"
                                      onClick={() => { setEmojiTarget(null); setClickedMessage(null); }}
                                    >✕</button>
                                  </div>
                                  <div className="grid grid-cols-8 gap-1 p-3 max-h-44 overflow-y-auto custom-scrollbar">
                                    {allEmojis.map((emoji) => (
                                      <motion.button
                                        key={emoji}
                                        whileHover={{ scale: 1.3 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="text-xl cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
                                        onClick={() => { sendReaction(msg.uuid, emoji); setEmojiTarget(null); setClickedMessage(null); }}
                                      >
                                        {emoji}
                                      </motion.button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Message action menu */}
                            <AnimatePresence>
                              {msgMenuTarget === msg.uuid && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  transition={{ type: "spring", damping: 20, stiffness: 350 }}
                                  className={`absolute -top-24 ${isMe ? 'right-0' : 'left-0'} z-50 bg-[#0c1033]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[140px]`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                    onClick={() => { setForwardMsg(msg); setMsgMenuTarget(null); setClickedMessage(null); }}
                                  >
                                    <Forward size={14} className="text-[#00f0ff]" />
                                    Reenviar
                                  </button>
                                  {isMe && !msg.deleted_for_all && msg.message_type === 'text' && (
                                    <>
                                      <div className="h-px bg-white/5 mx-3" />
                                      <button
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#a78bfa] hover:bg-white/5 transition-colors"
                                        onClick={() => { setEditingMsgUuid(msg.uuid); setEditingContent(msg.content); setMsgMenuTarget(null); setClickedMessage(null); }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        Editar
                                      </button>
                                    </>
                                  )}
                                  {isMe && !msg.deleted_for_all && (
                                    <>
                                      <div className="h-px bg-white/5 mx-3" />
                                      <button
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                                        onClick={() => handleDeleteMessage(msg.uuid, true)}
                                      >
                                        <Trash2 size={14} />
                                        Anular
                                      </button>
                                    </>
                                  )}
                                  <div className="h-px bg-white/5 mx-3" />
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors"
                                    onClick={() => handleDeleteMessage(msg.uuid, false)}
                                  >
                                    <Trash2 size={14} />
                                    Eliminar para mí
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                    })}

                    {Object.keys(typingByChat).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-sm text-gray-400 px-2"
                      >
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-300" />
                        </span>
                        <span className="italic">
                          {Object.keys(typingByChat).length > 1 ? "están escribiendo…" : "está escribiendo…"}
                        </span>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="px-4 pb-4 pt-1.5 bg-transparent relative">
                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-4 mb-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-2 grid grid-cols-4 gap-2 min-w-[280px] z-50"
                        >
                          {attachmentOptions.map((option, idx) => {
                            const isHideChat = option.type === "hide_chat";
                            const isMoveKnown = option.type === "move_known";
                            const isMoveStandard = option.type === "move_standard";
                            const isHidden = isHideChat && currentBackendChat?.folder_type === ChatFolderFilter.Hidden;
                            const isActiveKnown = isMoveKnown && currentBackendChat?.folder_type === ChatFolderFilter.Known;
                            const isActiveStandard = isMoveStandard && currentBackendChat?.folder_type === ChatFolderFilter.Friends;
                            const isDisabled = false;
                            return (
                            <motion.button
                              key={idx}
                              type="button"
                              whileHover={isDisabled ? {} : { scale: 1.05 }}
                              whileTap={isDisabled ? {} : { scale: 0.95 }}
                              onClick={() => {
                                if (isDisabled) return;
                                if (isHideChat) {
                                  handleToggleHiddenCurrentChat();
                                  setShowAttachmentMenu(false);
                                } else if (isMoveKnown) {
                                  handleMoveChatToFolder(ChatFolderFilter.Known);
                                  setShowAttachmentMenu(false);
                                } else if (isMoveStandard) {
                                  handleMoveChatToFolder(ChatFolderFilter.Friends);
                                  setShowAttachmentMenu(false);
                                } else {
                                  handleFileSelect(option.type);
                                }
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors gap-2 ${isDisabled ? 'cursor-not-allowed' : 'hover:bg-white/5'} ${isHidden || isActiveKnown || isActiveStandard ? 'bg-white/5' : ''}`}
                              disabled={isDisabled}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
                                isDisabled ? 'bg-gray-600'
                                : isHidden ? 'bg-cyan-500/20 border border-cyan-400/40'
                                : isActiveKnown ? 'bg-violet-500/20 border border-violet-400/40'
                                : isActiveStandard ? 'bg-cyan-500/20 border border-cyan-400/40'
                                : 'bg-gray-800/50'
                              }`}>
                                {option.icon}
                              </div>
                              <span className={`text-[10px] font-medium ${
                                isDisabled ? 'text-gray-500'
                                : isHidden ? 'text-cyan-300'
                                : isActiveKnown ? 'text-violet-300'
                                : isActiveStandard ? 'text-cyan-300'
                                : 'text-gray-400'
                              }`}>
                                {isHideChat ? (isHidden ? "Restaurar" : "Ocultar chat") : option.label}
                              </span>
                            </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,video/*"
                    />

                    <div className="flex gap-2 items-center bg-[#181b27]/75 backdrop-blur-xl rounded-full px-2.5 py-1.5 border border-white/8 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                      {!isRecording && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          className="text-white/50 hover:text-white transition-colors flex-shrink-0 pl-1"
                        >
                          <Plus className={`w-5 h-5 transition-transform duration-200 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
                        </motion.button>
                      )}

                      <div className="flex-1 flex items-center relative">
                        {isRecording ? (
                          <div className="flex-1 flex items-center gap-4 rounded-full px-2 py-1">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1, color: "#ef4444" }}
                              onClick={cancelRecording}
                              className="text-gray-400 p-2"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>

                            <div className="flex-1 flex items-center gap-2">
                              <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-2.5 h-2.5 bg-red-500 rounded-full"
                              />
                              <span className="text-white font-mono text-sm">{formatTime(recordingTime)}</span>
                            </div>

                            <span className="text-xs text-gray-400 animate-pulse">Grabando...</span>
                          </div>
                        ) : (
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder="Escribe un mensaje..."
                            value={messageText}
                            onChange={handleTyping}
                            className="flex-1 bg-transparent px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none text-sm"
                          />
                        )}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type={messageText.trim() ? "submit" : "button"}
                        onClick={() => {
                          if (isRecording) {
                            stopRecording();
                          } else if (!messageText.trim()) {
                            startRecording();
                          }
                        }}
                        className={`p-2.5 rounded-full shadow-xl transition-all duration-300 flex-shrink-0 ${
                          isRecording ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" :
                          currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/40" :
                          currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/40" :
                          currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? "bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/40" :
                          "bg-gradient-to-r from-purple-600 to-indigo-600"
                        }`}
                      >
                        {isRecording ? (
                          <StopCircle className="w-5 h-5 text-white" />
                        ) : messageText.trim() ? (
                          <Send className={`w-5 h-5 ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'text-black' : 'text-white'}`} />
                        ) : (
                          <Mic className={`w-5 h-5 ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'text-black' : 'text-white'}`} />
                        )}
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <FullscreenMediaPreview
          activePreview={activePreview}
          onClose={() => setActivePreview(null)}
        />

        <ContactSelectionModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          contacts={connections}
          onSelect={handleSendContact}
        />

        {/* Forward message modal */}
        <AnimatePresence>
          {forwardMsg && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-[200]"
                onClick={() => { setForwardMsg(null); setForwardRecipients([]); }}
              />
              <motion.div
                initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[201] bg-[#0c1033]/98 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-5"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-2 mb-4">
                  <Forward size={16} className="text-[#00f0ff]" />
                  <h3 className="text-white font-bold text-base">Reenviar mensaje</h3>
                </div>
                <p className="text-xs text-gray-400 bg-white/5 rounded-xl px-3 py-2 mb-4 truncate">
                  {forwardMsg.content || "[Multimedia]"}
                </p>
                <p className="text-xs text-gray-500 mb-2">Selecciona destinatarios:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {backendChats?.chats?.map((chat: any) => {
                    const other = chat.other_user;
                    const selected = forwardRecipients.includes(other.id);
                    return (
                      <button
                        key={chat.uuid}
                        onClick={() => setForwardRecipients(prev =>
                          selected ? prev.filter(id => id !== other.id) : [...prev, other.id]
                        )}
                        className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all ${selected ? 'bg-[#00f0ff]/15 border border-[#00f0ff]/30' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <img src={getMediaUrl(other.avatar)} className="w-8 h-8 rounded-full object-cover" alt={other.username} />
                        <span className="text-sm text-white">@{other.username}</span>
                        {selected && <CheckCheck size={14} className="text-[#00f0ff] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={forwardRecipients.length === 0}
                  onClick={handleForwardMessage}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                >
                  Reenviar a {forwardRecipients.length} chat{forwardRecipients.length !== 1 ? 's' : ''}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </LayoutGroup>
    </>
  )
}

export default ChatModal
