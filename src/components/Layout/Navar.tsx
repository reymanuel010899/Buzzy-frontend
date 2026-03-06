"use client"

import type React from "react"
import sendMessageSound from "../../assets/sounds/sendMessage.mp3";
import typingSound from "../../assets/sounds/whatsapp-typing.mp3";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  FileText, Image as ImageIcon, Camera, Headphones, User, BarChart2, Calendar, Smile,
  Mic, Trash2, StopCircle, Search, Bell, X, Phone, Video, Plus, Send, Download, Play, Pause, MessageCircleMore,
} from "lucide-react"
// import { Link } from "react-router-dom"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import FluidSearch from "./fluid-search"
import { useChat } from "../../context/ChatContext"
import { getSocialConnections } from "../../redux/actions/message/social"
import CustomAudioPlayer from "../Chat/CustomAudioPlayer"
import FullscreenMediaPreview from "../Chat/FullscreenMediaPreview"
import ContactSelectionModal from "../Chat/ContactSelectionModal"

import { useDispatch, useSelector } from 'react-redux';
import { listChatRooms } from "../../redux/actions/message/listChatRoom"
import { RootState } from "../../store"
import { loadChatMessages } from "../../redux/actions/message/chatMeesage"
import { sendMessage } from "../../redux/actions/message/sendMessage"
import { useWebSocket } from "../../hooks/useWebSocket"
import { allEmojis } from "../comments/emojis";
import { useTypingUsers } from "../../context/useTyping";
import { useUnreadMessages } from "../../context/UnreadAcount";
import { getBaseUrl } from "../../redux/client/api-client";

const WS_URL = "ws://localhost:8001/ws/chat/";
const Navbar: React.FC = () => {
  const [search, setSearch] = useState("")
  const total = useUnreadMessages((state) => state.getTotalUnread());
  const [showSearch, setShowSearch] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([])
  const chatSocketActiveRef = useRef(false);
  const { selectedChat, setSelectedChat, showMessages, setShowMessages } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unreadCounts = useUnreadMessages((state) => state.unreadCounts);
  const [clickedMessage, setClickedMessage] = useState<string | null>(null)
  const clickedMessageTimerRef = useRef<NodeJS.Timeout | null>(null);
  // reactions: { [messageUuid]: { [emoji]: string[] (usernames) } }
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, string[]>>>({});
  const markAsRead = useUnreadMessages((state) => state.markAsRead);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  (void setShowAttachmentMenu); // Fix unread warning
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { typingByChat, setTypingUser, removeTypingUser } = useTypingUsers();
  const [activePreview, setActivePreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const { connections } = useSelector((state: RootState) => state.socialReducer);
  const [messageText, setMessageText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentOptions = [
    { icon: <ImageIcon className="text-blue-400" />, label: "Fotos y videos", type: "image/video" },
    { icon: <Camera className="text-pink-400" />, label: "Cámara", type: "camera" },
    { icon: <FileText className="text-indigo-400" />, label: "Documento", type: "file" },
    { icon: <Headphones className="text-orange-400" />, label: "Audio", type: "audio" },
    { icon: <User className="text-cyan-400" />, label: "Contacto", type: "contact" },
    { icon: <BarChart2 className="text-yellow-400" />, label: "Encuesta", type: "poll", enable: true },
    { icon: <Calendar className="text-rose-400" />, label: "Evento", type: "event", enable: true },
    { icon: <Smile className="text-emerald-400" />, label: "Nuevo sticker", type: "sticker", enable: true },
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

    // Optimistic update: show contact card immediately without reloading
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

    sendMessage(formData)(dispatch);
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
      message_type: type as any,
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    const formData = new FormData();
    formData.append("recipient_id", backendMessages.other_user.id.toString());
    formData.append("message_type", type);
    formData.append("content", content);

    sendMessage(formData)(dispatch);
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
    formData.append("content", ""); // Optional for file messages

    // Optimistic update (optional, but good for UX)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      uuid: tempId,
      content: "",
      file: URL.createObjectURL(file), // Local preview
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: messageType,
    };
    setRealtimeMessages(prev => [...prev, optimisticMsg]);

    sendMessage(formData)(dispatch);
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
        if (audioBlob.size > 1000) { // Avoid sending empty/too short recordings
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
      alert("No se pudo acceder al micrófono.");
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
      mediaRecorderRef.current.onstop = null; // Don't trigger upload
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

    // Optimistic update
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

    sendMessage(formData)(dispatch);
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
  const { messages: backendMessages, loading: messagesLoading } = useSelector(
    (state: RootState) => state.chatMessagesReducer
  )

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const currentBackendChat = backendChats?.chats.find(c => c.uuid === selectedChat) || null
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);

  const unreadCountFromStore = useUnreadMessages((state) => state.unreadCounts);
  const totalGlobal = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
  }, [unreadCounts]);
  useEffect(() => {
    // Si hay un chat seleccionado y tiene un UUID válido
    if (selectedChat) {
      markAsRead(selectedChat);
    }
  }, [selectedChat, markAsRead]);
  useEffect(() => {
    sendAudioRef.current = new Audio(sendMessageSound);
    typingAudioRef.current = new Audio(typingSound);
  }, []);
  // ────────────────────────────────────────────────────────────────
  // WebSocket - conexión estable por chat
  // ────────────────────────────────────────────────────────────────
  const wsUrl = useMemo(() => {
    if (!selectedChat || !showMessages || messagesLoading || !backendMessages?.chat_uuid) {
      return null
    }
    const token = localStorage.getItem("accessToken") || ""
    return `${WS_URL}${backendMessages.chat_uuid}?token=${token}`
  }, [selectedChat, showMessages, messagesLoading, backendMessages?.chat_uuid])

  const shouldConnect = !!wsUrl && !!selectedChat
  useEffect(() => {
    chatSocketActiveRef.current = !!selectedChat;
  }, [selectedChat]);

  const handleWSMessage = useCallback((data: any) => {
    switch (data.event) {
      case "send_message": {
        if (data.chat_uuid !== selectedChat) return;

        // ⛔ Ignorar mensajes propios
        if (data.message?.sender_username === user.username) return;

        // 🔊 Sonido SOLO para el receptor
        // if (sendAudioRef.current && data.message?.sender_username !== user.username) {
        //   sendAudioRef.current.currentTime = 0;
        //   sendAudioRef.current
        //     .play()
        //     .catch(err => console.warn("Audio bloqueado:", err));
        // }


        setRealtimeMessages(prev => {
          if (prev.some(m => m.uuid === data.message?.uuid)) return prev;
          return [...prev, data.message];
        });

        break;
      }

      case "typing": {

        if (data.user_id === user.id) return;
        typingAudioRef.current
          ?.play()
          .catch(() => { });

        const chatUUID = data.chat_uuid;

        if (data.is_typing) {
          setTypingUser(
            chatUUID,
            data.user_id,
            data.username ?? "Alguien"
          );
        } else {
          removeTypingUser(
            chatUUID,
            data.user_id
          );
        }

        break;
      }

      case "reaction": {
        if (data.message_uuid && data.emoji) {
          setReactionsMap(prev => {
            const msgReactions = { ...(prev[data.message_uuid] || {}) };
            let users = [...(msgReactions[data.emoji] || [])];

            if (data.action === "removed") {
              users = users.filter(u => u !== data.username);
              if (users.length === 0) {
                delete msgReactions[data.emoji];
              } else {
                msgReactions[data.emoji] = users;
              }
            } else {
              if (!users.includes(data.username)) users.push(data.username);
              msgReactions[data.emoji] = users;
            }

            return { ...prev, [data.message_uuid]: msgReactions };
          });
        }
        break;
      }

      case "read_message": {
        // manejar leído
        break;
      }

      case "user_online": {
        // manejar online
        break;
      }

      default:
        break;
    }
  }, [selectedChat, user.username]);

  const socketRef = useWebSocket(wsUrl, handleWSMessage, shouldConnect)
  const handleTyping = () => {
    if (!wsUrl || !socketRef.current) return;

    const socket = chatSocketActiveRef.current;
    if (!socket) return;

    setMessageText(inputRef.current?.value || "")
    if (!selectedChat) return;
    socketRef?.current?.send(JSON.stringify({
      type: "typing",
      is_typing: true,
      receiver_id: backendMessages?.other_user?.id,
      chat_uuid: backendMessages?.chat_uuid
    }));


    // reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef?.current?.send(JSON.stringify({
        type: "typing",
        is_typing: false,
        receiver_id: backendMessages?.other_user?.id

      }));
    }, 1500);
  };
  const getUnreadAcount = (chatUUID: string) => {
    return unreadCountFromStore[chatUUID] || 0;
  }

  // Cargar chats iniciales cuando se abre la ventana de mensajes
  useEffect(() => {
    listChatRooms()(dispatch)
  }, [showMessages, dispatch])

  // Cargar mensajes del chat seleccionado
  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat)(dispatch)
    }
  }, [selectedChat, dispatch])

  // Sincronizar mensajes del backend cuando lleguen/cambien
  useEffect(() => {
    if (backendMessages?.messages && selectedChat) {
      setRealtimeMessages(backendMessages.messages);
      // Seed reactionsMap from persisted backend reactions
      const seeded: Record<string, Record<string, string[]>> = {};
      for (const msg of backendMessages.messages) {
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
          seeded[msg.uuid] = msg.reactions;
        }
      }
      setReactionsMap(seeded);
    }
  }, [backendMessages?.messages, selectedChat])

  // Resetear mensajes locales al cambiar de chat
  useEffect(() => {
    if (selectedChat) {
      setRealtimeMessages([]);
      setReactionsMap({});
    }
  }, [selectedChat])

  // Scroll automático cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [realtimeMessages.length])

  // Enfocar input al abrir chat
  useEffect(() => {
    if (selectedChat) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [selectedChat])

  // Scroll global (navbar)
  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Enviar mensaje con optimista update
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

    sendMessage(formData)(dispatch)
    input.value = ""
    setMessageText("")
  }
  const sendReaction = (messageUuid: string, emoji: string) => {
    if (!socketRef.current) return

    socketRef.current.send(
      JSON.stringify({
        type: "reaction",
        message_uuid: messageUuid,
        emoji
      })
    )

    console.log("****")
    // Optimistic update for better UX
    setReactionsMap(prev => {
      const msgReactions = { ...(prev[messageUuid] || {}) };
      let users = [...(msgReactions[emoji] || [])];

      if (users.includes(user.username)) {
        // Optimistic remove
        users = users.filter(u => u !== user.username);
        if (users.length === 0) delete msgReactions[emoji];
        else msgReactions[emoji] = users;
      } else {
        // Optimistic add
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
      {/* NAVBAR ORIGINAL - SIN CAMBIOS */}
      <nav
        className={`fixed w-full top-0 z-40 px-4 sm:px-6 transition-all duration-300 ${scrollPosition > 20 ? "bg-black backdrop-blur-lg" : "bg-black/80 backdrop-blur-2xl"
          }`}
      >
        <div className="flex justify-between items-center mx-auto py-5">
          <div className="flex items-center justify-center gap-5 sm:gap-6">

            <motion.button
              className="relative" // Importante: el botón debe ser relative
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMessages(true)}
            >
              {/* El SVG del avión de papel */}
              <svg
                fill="currentColor"
                className="cursor-pointer h-7 w-10 "
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
              >
                <path className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" d="M45.73 7A2 2 0 0 0 44 6H4a2 2 0 0 0-1.48 3.35l10.44 11.47a2 2 0 0 0 2.2.52l14.49-5.5c.17-.07.25-.04.28-.03.06.02.14.08.2.2.07.1.08.2.08.27 0 .04-.02.12-.16.23l-11.9 10.1a2 2 0 0 0-.62 2.12l4.56 14.51a2 2 0 0 0 3.64.4L45.73 9a2 2 0 0 0 0-2Z" />
              </svg>

              {/* El Badge con el número total global */}
              {totalGlobal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-black px-1 shadow-lg animate-in zoom-in duration-300">
                  {totalGlobal > 99 ? "99+" : totalGlobal}
                </span>
              )}
            </motion.button>

            {/* <Link to="/" className="text-2xl font-bold text-white hover:text-purple-400 transition-colors">
              Buzzy
            </Link> */}
          </div>

          <div className="hidden md:flex flex-grow max-w-lg items-center bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-4 py-2 mx-8 cursor-pointer hover:bg-gray-700/50 transition-all"
            onClick={() => setShowSearch(true)}>
            <span className="text-gray-400">{search || "Buscar en Buzzy..."}</span>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Search className="w-5 h-5 text-gray-400 ml-auto" />
            </motion.div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative text-gray-300 hover:text-purple-400 transition-colors"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-10 h-7" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </motion.button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-4 pt-1">
          <div className="flex items-center bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-700/50 transition-all"
            onClick={() => setShowSearch(true)}>
            <span className="text-gray-400 px-2">{search || "Buscar en Buzzy..."}</span>
            <Search className="w-5 h-5 text-gray-400 ml-auto mr-2" />
          </div>
        </div>
      </nav>

      {/* MODALES DE BÚSQUEDA Y NOTIFICACIONES (igual que antes) */}
      <AnimatePresence>
        {showSearch && (
          <FluidSearch onClose={() => setShowSearch(false)} searchTerm={search} setSearchTerm={setSearch} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-start justify-center  px-4"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute z-50 w-full max-w-md"
            >
              <div className="bg-gray-900/92 backdrop-blur-xl border border-gray-700/60 rounded-b-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
                  <h3 className="text-xl font-bold text-white">Notificaciones</h3>
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-white p-1 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  <ul className="divide-y divide-gray-700/30">
                    <li className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          M
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm leading-tight">
                            <span className="font-semibold">@marcelo</span> le gusta tu nuevo look
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">Hace 5 minutos</span>
                        </div>
                      </div>
                    </li>

                    <li className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          A
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm leading-tight">
                            <span className="font-semibold">@admin</span> comentó en tu publicación
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">Hace 12 minutos</span>
                        </div>
                      </div>
                    </li>

                    <li className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                          J
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm leading-tight">
                            <span className="font-semibold">@juan</span> empezó a seguirte
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">Hace 1 hora</span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 border-t border-gray-700/50 text-center">
                  <button className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                    Ver todas las notificaciones →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
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
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute inset-x-0 top-0 z-50 mx-auto w-full max-w-md"
              >
                <div className="bg-gray-900/95 backdrop-blur-xl border-x border-b border-gray-700/60 rounded-b-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
                    <h3 className="text-xl font-bold text-white">Mensajes</h3>
                    <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.92 }} onClick={() => setShowMessages(false)}>
                      <X className="w-6 h-6 text-gray-400" />
                    </motion.button>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto">
                    {loading ? (
                      // Skeleton loader
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
                      // Estado vacío
                      <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center"
                        >
                          <MessageCircleMore className="w-12 h-12 text-purple-400" />
                        </motion.div>
                        <h3 className="text-xl font-semibold text-white mb-3">Aún no tienes mensajes</h3>
                        <p className="text-sm text-gray-400 max-w-xs">Empieza una conversación buscando a alguien en Buzzy 🚀</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setShowMessages(false); setShowSearch(true); }}
                          className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full shadow-lg"
                        >
                          Buscar personas
                        </motion.button>
                      </div>
                    ) : (
                      // Lista real de chats desde el backend
                      <ul>
                        {backendChats?.chats.map((chat) => (
                          <motion.li
                            key={chat.uuid}
                            layoutId={`chat-${chat.uuid}`}
                            onClick={() => setSelectedChat(chat.uuid)}
                            className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer flex items-center gap-3 border-b border-gray-700/30 last:border-b-0"
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="relative">
                              <img
                                src={`${getBaseUrl()}${chat.other_user.avatar || "/profile_pics/avatar.webp"}`}
                                alt={chat.other_user.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {chat.other_user_online.is_online && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <p className="text-white font-medium truncate">{chat.other_user.username}</p>
                                <span className="text-xs text-gray-500 ml-2">
                                  {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 truncate">
                                {typingContest(chat)}
                              </p>
                            </div>

                            {chat.unread_count > 0 && total > 0 && (
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                {getUnreadAcount(chat.uuid)}
                                {/* {total  || chat.unread_count} */}
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-700/50 text-center">
                    <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                      Ver todos los mensajes →
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CHAT INDIVIDUAL - AHORA FUNCIONAL Y LLENO DE MENSAJES */}
        <AnimatePresence>
          {selectedChat && currentBackendChat && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedChat(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />

              <motion.div
                layoutId={`chat-${selectedChat}`}
                className="fixed inset-x-0 top-0 bottom-0 z-50 mx-auto w-full max-w-md"
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <div className="bg-gray-900/98 backdrop-blur-2xl h-full flex flex-col shadow-2xl">
                  {/* Header del chat */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedChat(null)} className="text-gray-300 hover:text-white text-2xl">←</button>
                      <div className="relative">
                        <img
                          src={`${getBaseUrl()}${currentBackendChat.other_user.avatar || "/profile_pics/avatar.webp"}`}
                          alt={currentBackendChat.other_user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {currentBackendChat.other_user_online.is_online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-3 border-gray-900 rounded-full ring-2 ring-gray-900" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{currentBackendChat.other_user.name}</p>
                        <p className="text-xs text-gray-400">
                          {currentBackendChat.other_user_online.is_online ? "En línea" : "Desconectado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 rounded-full bg-gray-800/50 hover:bg-purple-600/30">
                        <Phone className="w-5 h-5 text-purple-400" />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 rounded-full bg-gray-800/50 hover:bg-purple-600/30">
                        <Video className="w-5 h-5 text-purple-400" />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedChat(null); setShowMessages(false); }}>
                        <X className="w-6 h-6 text-gray-400" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/50 via-black to-gray-900">
                    {realtimeMessages.map((msg) => {
                      const isMe = msg.sender_username === user.username

                      return (
                        <motion.div
                          key={msg.uuid}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          onMouseEnter={undefined}
                          onMouseLeave={undefined}
                          onClick={(e) => {
                            // Don't trigger if clicking a button/link inside the message
                            if ((e.target as HTMLElement).closest('button, a, input, video, audio')) return;
                            // Clear existing timer
                            if (clickedMessageTimerRef.current) clearTimeout(clickedMessageTimerRef.current);
                            // If same message, toggle off
                            if (clickedMessage === msg.uuid) {
                              setClickedMessage(null);
                              setEmojiTarget(null);
                              return;
                            }
                            setEmojiTarget(null);
                            setClickedMessage(msg.uuid);
                            // Auto-hide after 3s if user doesn't interact
                            clickedMessageTimerRef.current = setTimeout(() => {
                              setClickedMessage(null);
                            }, 3000);
                          }}
                          className={`relative flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"
                            }`}
                        >
                          {/* Avatar */}
                          {!isMe && (
                            <img
                              src={
                                msg.sender_avatar
                                  ? `${getBaseUrl()}media/${msg.sender_avatar}`
                                  : "/profile_pics/avatar.webp"
                              }
                              alt={msg.sender_username}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          )}

                          {/* Bubble + Emoji */}
                          <div className="relative flex items-center">

                            {/* Emoji trigger (izquierda - otros) */}
                            {!isMe && clickedMessage === msg.uuid && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="mr-2 w-8 h-8 flex items-center justify-center bg-[#1e1e35] rounded-full shadow-xl border border-white/15 text-gray-300 hover:text-yellow-400 hover:border-yellow-400/30 transition-all cursor-pointer flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (clickedMessageTimerRef.current) clearTimeout(clickedMessageTimerRef.current);
                                  setEmojiTarget(emojiTarget === msg.uuid ? null : msg.uuid);
                                }}
                              >
                                <span className="text-base">😊</span>
                              </motion.button>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`max-w-xs ${msg.message_type === 'text' ? 'px-4 py-3' : 'p-[1px]'} rounded-2xl shadow-xl transition-all duration-300 ${isMe
                                ? msg.message_type === 'text'
                                  ? "bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-br-none"
                                  : "backdrop-blur-lg  text-white rounded-br-none"
                                : msg.message_type === 'text'
                                  ? "bg-[#23233b] text-gray-100 rounded-bl-none border border-white/5 shadow-inner"
                                  : "backdrop-blur-lg text-gray-100 rounded-bl-none"
                                }`}
                            >
                              {!isMe && (
                                <p className="text-xs text-gray-400 mb-1 font-medium">
                                  {msg.sender_username}
                                </p>
                              )}

                              {msg.message_type === "text" ? (
                                <p className="text-sm leading-relaxed break-words">
                                  {msg.content}
                                </p>
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
                                    {new Date(msg.created_at).toLocaleTimeString("es-DO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
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
                                    {new Date(msg.created_at).toLocaleTimeString("es-DO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
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
                                  />
                                  <div className="flex items-center justify-between w-full mt-1 gap-4">
                                    <p className={`text-[10px] ${isMe ? "text-purple-200/70" : "text-gray-500"}`}>
                                      {new Date(msg.created_at).toLocaleTimeString("es-DO", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>

                                    {/* Reactions for voice messages */}
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
                                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] shadow-lg border transition-all cursor-pointer
                                                ${iMine
                                                  ? 'bg-purple-600/30 border-purple-500/40 text-white'
                                                  : 'bg-[#1e1e35]/90 border-white/10 text-gray-200'
                                                }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                sendReaction(msg.uuid, emoji);
                                              }}
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
                                <div className="flex items-center gap-3 py-2 px-1 min-w-[200px] bg-gray-900/40 rounded-xl border border-white/5 hover:bg-gray-900/60 transition-all cursor-pointer">
                                  <div className={`p-2 rounded-lg ${isMe ? 'bg-purple-600/20' : 'bg-gray-700/50'}`}>
                                    <FileText className={`w-5 h-5 ${isMe ? 'text-purple-400' : 'text-gray-300'}`} />
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
                              ) : msg.message_type === "contact" ? (
                                <div className="bg-gray-900/40 rounded-xl p-3 border border-white/5 flex flex-col gap-3 min-w-[200px]">
                                  <div className="flex items-center gap-3">
                                    {(() => {
                                      try {
                                        const contact = JSON.parse(msg.content);
                                        return (
                                          <>
                                            <img
                                              src={contact.avatar?.startsWith('http') ? contact.avatar : `${getBaseUrl()}media/${contact.avatar}`}
                                              className="w-12 h-12 rounded-full object-cover border border-white/10"
                                              alt="Contact"
                                            />
                                            <div className="flex-1 overflow-hidden">
                                              <p className="text-sm font-bold text-white truncate">@{contact.username}</p>
                                              <p className="text-[10px] text-gray-500">Contacto compartido</p>
                                            </div>
                                          </>
                                        );
                                      } catch (e) {
                                        return <p className="text-xs text-red-400">Error al cargar contacto</p>;
                                      }
                                    })()}
                                  </div>
                                  <button
                                    className="w-full py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-semibold rounded-lg transition-colors border border-purple-600/10"
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
                                <div
                                  className="flex items-center justify-between w-full mt-2 gap-4"
                                >
                                  <p
                                    className={`text-xs ${isMe ? "text-purple-200" : "text-gray-500"
                                      }`}
                                  >
                                    {new Date(msg.created_at).toLocaleTimeString("es-DO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>

                                  {/* ── Reaction pills (inside) ── */}
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
                                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] shadow-lg border transition-all cursor-pointer
                                              ${iMine
                                                ? 'bg-purple-600/30 border-purple-500/40 text-white'
                                                : 'bg-[#1e1e35]/90 border-white/10 text-gray-200'
                                              }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              sendReaction(msg.uuid, emoji);
                                            }}
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

                            {/* Emoji trigger (derecha - yo) */}
                            {isMe && clickedMessage === msg.uuid && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: 8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="ml-2 w-8 h-8 flex items-center justify-center bg-[#1e1e35] rounded-full shadow-xl border border-white/15 text-gray-300 hover:text-yellow-400 hover:border-yellow-400/30 transition-all cursor-pointer flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (clickedMessageTimerRef.current) clearTimeout(clickedMessageTimerRef.current);
                                  setEmojiTarget(emojiTarget === msg.uuid ? null : msg.uuid);
                                }}
                              >
                                <span className="text-base">😊</span>
                              </motion.button>
                            )}

                            {/* Professional Emoji Picker */}
                            <AnimatePresence>
                              {emojiTarget === msg.uuid && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.85, y: 8 }}
                                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                  className={`
                                    absolute -top-16 ${isMe ? 'right-10' : 'left-10'}
                                    bg-[#1a1a2e]/95 backdrop-blur-xl
                                    border border-white/10
                                    rounded-2xl shadow-2xl
                                    z-50
                                    overflow-hidden
                                  `}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Quick reactions bar */}
                                  <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
                                    {["❤️", "😂", "😮", "😢", "😡", "👍"].map((emoji) => (
                                      <motion.button
                                        key={emoji}
                                        whileHover={{ scale: 1.4, y: -4 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 400 }}
                                        className="text-2xl cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
                                        onClick={() => {
                                          sendReaction(msg.uuid, emoji);
                                          setEmojiTarget(null);
                                          setClickedMessage(null);
                                        }}
                                      >
                                        {emoji}
                                      </motion.button>
                                    ))}
                                    {/* Divider + More button */}
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all text-sm font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEmojiTarget(`${msg.uuid}-full`);
                                      }}
                                    >
                                      +
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Full emoji grid (expanded) */}
                            <AnimatePresence>
                              {emojiTarget === `${msg.uuid}-full` && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                  className={`
                                    absolute -top-56 ${isMe ? 'right-10' : 'left-10'}
                                    bg-[#1a1a2e]/95 backdrop-blur-xl
                                    border border-white/10
                                    rounded-2xl shadow-2xl
                                    z-50 w-64
                                    overflow-hidden
                                  `}
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
                                        onClick={() => {
                                          sendReaction(msg.uuid, emoji);
                                          setEmojiTarget(null);
                                          setClickedMessage(null);
                                        }}
                                      >
                                        {emoji}
                                      </motion.button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                    })}

                    {/* Typing indicator */}
                    {/* {typingChat()} */}

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

                          {Object.keys(typingByChat).length > 1
                            ? "están escribiendo…"
                            : "está escribiendo…"}
                        </span>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700/50 bg-gray-900/95 relative">
                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-4 mb-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-2 grid grid-cols-4 gap-2 min-w-[280px] z-50"
                        >
                          {attachmentOptions.map((option, idx) => (
                            <motion.button
                              key={idx}
                              type="button"
                              whileHover={option.enable ? {} : { scale: 1.05 }}
                              whileTap={option.enable ? {} : { scale: 0.95 }}
                              onClick={() => !option.enable && handleFileSelect(option.type)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors gap-2 ${option.enable ? 'cursor-not-allowed' : 'hover:bg-white/5'}`}
                              disabled={option.enable}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${option.enable ? 'bg-gray-600' : 'bg-gray-800/50'}`}>
                                {option.icon}
                              </div>
                              <span className={`text-[10px] font-medium ${option.enable ? 'text-gray-500' : 'text-gray-400'}`}>{option.label}</span>
                            </motion.button>
                          ))}
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

                    <div className="flex gap-1 items-center">
                      {!isRecording && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          className={`p-2 rounded-full transition-colors ${showAttachmentMenu ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                        >
                          <Plus className={`w-6 h-6 transition-transform duration-200 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
                        </motion.button>
                      )}

                      {isRecording ? (
                        <div className="flex-1 flex items-center gap-4 bg-gray-800/60 backdrop-blur-md border border-red-500/30 rounded-full px-4 py-2">
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
                          className="flex-1 bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                        />
                      )}

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type={messageText.trim() ? "submit" : "button"}
                        onClick={() => {
                          if (isRecording) {
                            stopRecording();
                          } else if (!messageText.trim()) {
                            startRecording();
                          }
                        }}
                        className={`p-3.5 rounded-full shadow-lg ${isRecording
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600"
                          }`}
                      >
                        {isRecording ? (
                          <StopCircle className="w-5 h-5 text-white" />
                        ) : messageText.trim() ? (
                          <Send className="w-5 h-5 text-white" />
                        ) : (
                          <Mic className="w-5 h-5 text-white" />
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

      </LayoutGroup>
    </>
  )
}

export default Navbar