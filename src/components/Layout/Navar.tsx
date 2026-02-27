"use client"

import type React from "react"
import sendMessageSound from "../../assets/sounds/sendMessage.mp3";
import typingSound from "../../assets/sounds/whatsapp-typing.mp3";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Search, Bell, MessageCircleMore, X, Phone, Video, Send, Plus,
} from "lucide-react"
// import { Link } from "react-router-dom"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import FluidSearch from "./fluid-search"
import { useChat } from "../../context/ChatContext"
import { useDispatch, useSelector } from 'react-redux';
import { listChatRooms } from "../../redux/actions/message/listChatRoom"
import { RootState } from "../../store"
import { loadChatMessages } from "../../redux/actions/message/chatMeesage"
import { sendMessage } from "../../redux/actions/message/sendMessage"
import { useWebSocket } from "../../hooks/useWebSocket"
import { allEmojis } from "../comments/emojis";
import { useTypingUsers } from "../../context/useTyping";
import { useUnreadMessages } from "../../context/UnreadAcount";

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
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const markAsRead = useUnreadMessages((state) => state.markAsRead);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  (void setShowAttachmentMenu); // Fix unread warning
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { typingByChat, setTypingUser, removeTypingUser } = useTypingUsers();
  // const attachmentOptions = [
  //   { icon: <FileText className="text-indigo-400" />, label: "Documento" },
  //   { icon: <ImageIcon className="text-blue-400" />, label: "Fotos y videos" },
  //   { icon: <Camera className="text-pink-400" />, label: "Cámara" },
  //   { icon: <Headphones className="text-orange-400" />, label: "Audio" },
  //   { icon: <User className="text-cyan-400" />, label: "Contacto" },
  //   { icon: <BarChart2 className="text-yellow-400" />, label: "Encuesta" },
  //   { icon: <Calendar className="text-rose-400" />, label: "Evento" },
  //   { icon: <Smile className="text-emerald-400" />, label: "Nuevo sticker" },
  // ]

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

    // enviar typing true
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
      setRealtimeMessages(backendMessages.messages)
    }
  }, [backendMessages?.messages, selectedChat])

  // Resetear mensajes locales al cambiar de chat
  useEffect(() => {
    if (selectedChat) {
      setRealtimeMessages([])
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

    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      uuid: tempId,
      content: input.value.trim(),
      sender_username: user.username,
      sender_avatar: user.profile_picture,
      created_at: new Date().toISOString(),
      message_type: "text",
    }

    // Mostrar mensaje inmediatamente (mejora UX)
    setRealtimeMessages(prev => [...prev, optimisticMsg])

    const payload = {
      recipient_id: backendMessages.other_user.id,
      content: input.value.trim(),
      message_type: "text" as "text",
    }

    sendMessage(payload)(dispatch)
    input.value = ""
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
                                src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${chat.other_user.avatar || "/profile_pics/avatar.webp"}`}
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
                          src={`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}${currentBackendChat.other_user.avatar || "/profile_pics/avatar.webp"}`}
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
                          onMouseEnter={() => setHoveredMessage(msg.uuid)}
                          onMouseLeave={() => {
                            setHoveredMessage(null)
                            setEmojiTarget(null)
                          }}
                          className={`relative flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"
                            }`}
                        >
                          {/* Avatar */}
                          {!isMe && (
                            <img
                              src={
                                msg.sender_avatar
                                  ? `${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}/media/${msg.sender_avatar}`
                                  : "/profile_pics/avatar.webp"
                              }
                              alt={msg.sender_username}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          )}

                          {/* Bubble + Emoji */}
                          <div className="relative flex items-center">

                            {/* Emoji (izquierda - otros) */}
                            {!isMe && hoveredMessage === msg.uuid && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileTap={{ scale: 1.2 }}
                                className="
                                          mr-2
                                          bg-[#1e1e2e]
                                          rounded-full
                                          p-1.5
                                          shadow-md
                                          border border-white/10
                                          text-sm
                                          cursor-pointer
                                        "
                                onClick={() => setEmojiTarget(msg.uuid)}
                              >
                                😊
                              </motion.button>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`max-w-xs px-4 py-3 rounded-2xl shadow-lg ${isMe
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none"
                                : "bg-gray-800/90 text-gray-100 rounded-bl-none border border-gray-700/50"
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
                              ) : (
                                <p className="text-sm italic text-gray-400">
                                  [ {msg.message_type.toUpperCase()} ]
                                </p>
                              )}

                              <p
                                className={`text-xs mt-2 ${isMe ? "text-purple-200" : "text-gray-500"
                                  }`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString("es-DO", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>

                            {/* Emoji (derecha - yo) */}
                            {isMe && hoveredMessage === msg.uuid && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileTap={{ scale: 1.2 }}
                                className="
                ml-2
                bg-[#1e1e2e]
                rounded-full
                p-1.5
                shadow-md
                border border-white/10
                text-sm
                cursor-pointer
              "
                                onClick={() => setEmojiTarget(msg.uuid)}
                              >
                                😊
                              </motion.button>
                            )}

                            {/* Emoji Picker */}
                            {emojiTarget === msg.uuid && (
                              <div
                                className={`
                absolute
                -top-44
                ${isMe ? "right-0" : "left-0"}
                bg-[#1e1e2e]
                p-3
                rounded-2xl
                grid grid-cols-6 gap-2
                shadow-2xl
                border border-white/10
                z-50
                max-h-48
                overflow-y-auto
              `}
                              >
                                {allEmojis.map((emoji) => (
                                  <span
                                    key={emoji}
                                    className="
                    cursor-pointer text-xl
                    hover:scale-125
                    transition-transform
                  "
                                    onClick={() => {
                                      sendReaction(msg.uuid, emoji)
                                      setEmojiTarget(null)
                                    }}
                                  >
                                    {emoji}
                                  </span>
                                ))}
                              </div>
                            )}
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
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700/50 bg-gray-900/95">
                    <div className="flex gap-3 items-center">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        // onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className={`p-2 rounded-full transition-colors ${showAttachmentMenu ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                      >
                        <Plus className={`w-6 h-6 transition-transform duration-200 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
                      </motion.button>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Escribe un mensaje..."
                        onChange={handleTyping}
                        className="flex-1 bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-5 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="submit"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 p-3.5 rounded-full shadow-lg"
                      >
                        <Send className="w-5 h-5 text-white" />
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </LayoutGroup>
    </>
  )
}

export default Navbar