"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Search, Bell, Megaphone } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import FluidSearch from "./fluid-search"
import NotificationPanel from "../notifications/NotificationPanel"
import { useNotificationsStore } from "../../context/NotificationsStore"
import { useCallStore } from "../../store/callStore"

const Navbar: React.FC = () => {
  const { t } = useTranslation(['common'])
  void t;
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const navigate = useNavigate()

  const notifUnreadCount = useNotificationsStore((state) => state.unreadCount);
  const { activeOutgoingCall, activeIncomingCall } = useCallStore();
  const [isCallMinimized] = useState(false);
  const [activeCallTime] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed w-full top-0 z-50 px-2 sm:px-6 transition-all duration-300 ${scrollPosition > 20 ? "bg-black backdrop-blur-lg" : "bg-black/80 backdrop-blur-2xl"}`}
      >
        <AnimatePresence>
          {isCallMinimized && (activeOutgoingCall || (activeIncomingCall && activeIncomingCall.status === 'active')) && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-cyan-500 to-purple-600 origin-left z-50"
            />
          )}
        </AnimatePresence>
        <div className="flex justify-between items-center mx-auto py-1">
          <div className="flex items-center justify-center gap-5 sm:gap-6">

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative text-gray-300 hover:text-cyan-400 transition-colors"
              onClick={() => navigate("/ads")}
            >
              <Megaphone className="h-7 w-7" />
            </motion.button>

          </div>

          <div className="hidden md:flex flex-grow max-w-lg items-center bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-4 py-2 mx-8 cursor-pointer hover:bg-gray-700/50 transition-all"
            onClick={() => setShowSearch(true)}>
            <span className="text-gray-400">{search || "Buscar en Buzzy..."}</span>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Search className="w-5 h-5 text-gray-400 ml-auto" />
            </motion.div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">

            {isCallMinimized && (activeOutgoingCall || (activeIncomingCall && activeIncomingCall.status === 'active')) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors border border-white/5"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-mono font-bold text-sm text-white">
                  {Math.floor(activeCallTime / 60)}:{(activeCallTime % 60).toString().padStart(2, '0')}
                </span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative text-gray-300 hover:text-purple-400 transition-colors"
              onClick={() => setShowNotifications(v => !v)}
            >
              <Bell className="w-10 h-7" />
              {notifUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        <div className="md:hidden pt-1">
          <div className="flex items-center bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-full px-2 py-1 cursor-pointer hover:bg-gray-700/50 transition-all"
            onClick={() => setShowSearch(true)}>
            <span className="text-gray-400 px-2">{search || "Buscar en Buzzy..."}</span>
            <Search className="w-5 h-5 text-gray-400 ml-auto mr-2" />
          </div>
        </div>
      </nav>

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

                  <div className="px-2 pb-2 pt-2 ">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar chat..."
                        value={chatSearchTerm}
                        onChange={(e) => setChatSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-700/50 rounded-xl leading-5 bg-[#0c1033] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff]/50 sm:text-sm transition-all shadow-inner"
                      />
                    </div>
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
                                layoutId={`chat-${chat.uuid}`}
                                onClick={() => setSelectedChat(chat.uuid)}
                                className={`p-4 mx-2 my-1 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border border-white/5 last:border-b-0 group relative overflow-hidden ${itemBg}`}
                                whileTap={{ scale: 0.98 }}
                              >
                                {planName === 'FRIEND' && (
                                  <>
                                    {/* Refractive Light Beam Animation */}
                                    <motion.div
                                      initial={{ x: '-100%', opacity: 0 }}
                                      animate={{
                                        x: '200%',
                                        opacity: [0, 0.5, 0]
                                      }}
                                      transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        repeatDelay: 2,
                                        ease: "easeInOut"
                                      }}
                                      className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-12 pointer-events-none"
                                    />
                                    {/* Subtle Edge Glow */}
                                    <div className="absolute inset-0 border border-cyan-400/20 rounded-2xl z-0" />
                                  </>
                                )}
                                {planName === 'PLUS' && (
                                  <>
                                    {/* Refractive Light Beam Animation */}
                                    <motion.div
                                      initial={{ x: '-100%', opacity: 0 }}
                                      animate={{
                                        x: '200%',
                                        opacity: [0, 0.5, 0]
                                      }}
                                      transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        repeatDelay: 2,
                                        ease: "easeInOut"
                                      }}
                                      className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-12 pointer-events-none"
                                    />
                                    {/* Subtle Edge Glow */}
                                    <div className="absolute inset-0 border border-cyan-400/20 rounded-2xl z-0" />
                                  </>
                                )}
                                {planName === 'VIP' && (
                                  <>
                                    {/* Refractive Light Beam Animation */}
                                    <motion.div
                                      initial={{ x: '-100%', opacity: 0 }}
                                      animate={{
                                        x: '200%',
                                        opacity: [0, 0.5, 0]
                                      }}
                                      transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        repeatDelay: 2,
                                        ease: "easeInOut"
                                      }}
                                      className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-12 pointer-events-none"
                                    />
                                    {/* Subtle Edge Glow */}
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
                                      src={`${getBaseUrl()}${chat.other_user.avatar || "/profile_pics/avatar.webp"}`}
                                      alt={chat.other_user.username}
                                      className={`w-12 h-12 rounded-full object-cover border-2 ${planName === 'FRIEND' ? 'border-[#0c1033]' : planName === 'VIP' ? 'border-[#0c1033]' : planName === 'PLUS' ? 'border-[#0c1033]' : 'border-[#0c1033]'}`}
                                    />
                                  </div>
                                  {chat.other_user_online.is_online && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0c1033] rounded-full shadow-lg" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className={`font-semibold truncate ${planName === 'FRIEND' ? 'text-cyan-400' : planName === 'VIP' ? 'text-amber-100' : 'text-white'}`}>{chat.other_user.username}</p>

                                      {planName === 'FRIEND' && (
                                        <span className="text-[8px] bg-white/10 backdrop-blur-md text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-cyan-400/30 shadow-[0_0_10px_rgba(0,240,255,0.2)] flex items-center gap-1 group-hover:bg-cyan-400/20 transition-colors">
                                          <Sparkles size={7} fill="currentColor" /> DIAMOND
                                        </span>
                                      )}
                                      {planName === 'PLUS' && (
                                        <span className="text-[9px] bg-gradient-to-r from-purple-400 to-pink-500 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">PLUS</span>
                                      )}
                                      {planName === 'VIP' && (
                                        <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-600 text-black px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter shadow-sm">VIP</span>
                                      )}

                                      <span className="text-[10px] text-gray-500 ml-auto font-medium">
                                        {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-sm text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                                      {typingContest(chat)}
                                    </p>
                                    {chat.unread_count > 0 && (
                                      <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-lg shadow-purple-500/20">
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
                      <div className="relative group">
                        <div
                          className={`relative p-[1.5px] rounded-full cursor-pointer transition-transform duration-500 group-hover:scale-110 ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                            ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                            : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS'
                              ? 'bg-gradient-to-tr from-purple-400 to-pink-500 border border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                              : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                                ? 'bg-gradient-to-tr from-amber-300 via-white to-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                                : ''
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChat(null);
                            setShowMessages(false);
                            navigate(`/profile/${currentBackendChat.other_user.username}`);
                          }}
                        >
                          <img
                            src={`${getBaseUrl()}${currentBackendChat.other_user.avatar || "/profile_pics/avatar.webp"}`}
                            alt={currentBackendChat.other_user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#0c1033]"
                          />

                          {/* Delicate Diamond/Premium Badge Overlay */}
                          <div className="absolute -top-1.5 -right-2 z-10 scale-90">
                            {currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' && (
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-[7px] bg-white/10 backdrop-blur-md text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-cyan-400/30 shadow-[0_0_10px_rgba(0,240,255,0.4)] flex items-center gap-1"
                              >
                                <Sparkles size={6} fill="currentColor" /> DIAMOND
                              </motion.span>
                            )}
                            {currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' && (
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-[7px] bg-white/10 backdrop-blur-md text-purple-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-purple-400/30"
                              >
                                PLUS
                              </motion.span>
                            )}
                            {currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' && (
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-[7px] bg-white/10 backdrop-blur-md text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-amber-400/30"
                              >
                                VIP
                              </motion.span>
                            )}
                          </div>
                        </div>
                        {currentBackendChat.other_user_online.is_online && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0c1033] rounded-full shadow-lg" />
                        )}

                        {/* Luxury Refractive Beam for the Header Avatar Area */}
                        {currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() !== 'NONE' && (
                          <motion.div
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '200%', opacity: [0, 0.4, 0] }}
                            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none rounded-full"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-col">
                          <p className={`font-bold text-lg leading-tight ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'text-cyan-400' :
                            currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? 'text-purple-400' :
                              currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'text-amber-400' : 'text-white'
                            }`}>
                            {currentBackendChat.other_user.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {currentBackendChat.other_user_online.is_online ? "En línea" : "Desconectado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={!chatAvailability?.can_voice}
                        className={`p-2 rounded-full transition-all ${chatAvailability?.can_voice
                          ? "bg-green-300/20 hover:bg-green-600/40 text-green-400 border border-green-500/30"
                          : "bg-gray-600/50 text-gray-500 opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <Phone className="w-5 h-5" />
                        {chatAvailability?.is_available && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={!chatAvailability?.can_video}
                        className={`p-2 rounded-full transition-all ${chatAvailability?.can_video
                          ? "bg-blue-300/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30"
                          : "bg-gray-600/50 text-gray-500 opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <Video className="w-5 h-5" />
                        {chatAvailability?.is_available && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                        )}
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
                            <div className={`relative p-[1px] rounded-full flex-shrink-0 ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.4)]' :
                              currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.2)]' :
                                currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? 'bg-gradient-to-tr from-purple-400 to-pink-500 border border-purple-500/30' : ''
                              }`}>
                              <img
                                src={
                                  msg.sender_avatar
                                    ? `${getBaseUrl()}media/${msg.sender_avatar}`
                                    : "/profile_pics/avatar.webp"
                                }
                                alt={msg.sender_username}
                                className="w-8 h-8 rounded-full object-cover border border-[#0c1033]"
                              />
                            </div>
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
                                  ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                                    ? "bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 text-white rounded-br-none shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                                    : user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                                      ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-black font-medium rounded-br-none shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                                      : "bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-br-none"
                                  : "backdrop-blur-lg text-white rounded-br-none"
                                : msg.message_type === 'text'
                                  ? currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND'
                                    ? "bg-[#1a1a2e]/90 text-cyan-50 border border-cyan-400/30 rounded-bl-none shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                                    : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP'
                                      ? "bg-[#1f1a10]/90 text-amber-50 border border-amber-400/30 rounded-bl-none shadow-[0_0_10px_rgba(251,191,36,0.1)]"
                                      : "bg-[#23233b] text-gray-100 rounded-bl-none border border-white/5 shadow-inner"
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
                                    planName={isMe ? user.subscription_status?.plan?.name?.toUpperCase() : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase()}
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
                                    <FileText className={`w-5 h-5`} />
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
                                <div className={`rounded-xl p-3 flex flex-col gap-3 min-w-[200px] ${isMe
                                  ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/30 border' :
                                    user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-gradient-to-br from-amber-400/20 to-orange-600/20 border-amber-500/30 border' :
                                      'bg-purple-600/20 border-purple-500/20 border'
                                  : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-[#1a1a2e]/90 border-cyan-400/30 shadow-[0_0_10px_rgba(0,240,255,0.1)] border' :
                                    currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-[#1f1a10]/90 border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.1)] border' :
                                      'bg-[#23233b] border-transparent'
                                  }`}>
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
                                    className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors border ${isMe
                                      ? user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-100 border-cyan-400/20' :
                                        user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border-amber-400/20' :
                                          'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                      : currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20' :
                                        currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20' :
                                          'bg-white/5 hover:bg-white/10 text-gray-300 border-transparent'
                                      }`}
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

                      <div className={`flex-1 flex items-center relative rounded-full p-[1.5px] transition-all duration-300 ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'bg-gradient-to-r from-cyan-500/50 via-white/50 to-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]' :
                        currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? 'bg-gradient-to-r from-purple-500/50 via-white/50 to-purple-500/50' :
                          currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'bg-gradient-to-r from-amber-400/50 via-white/50 to-amber-400/50' :
                            'bg-gray-700/50'
                        }`}>
                        {isRecording ? (
                          <div className="flex-1 flex items-center gap-4 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-2.5">
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
                            className={`flex-1 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-all ${currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? 'focus:ring-1 focus:ring-cyan-400/50' :
                              currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? 'focus:ring-1 focus:ring-purple-400/50' :
                                currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? 'focus:ring-1 focus:ring-amber-400/50' :
                                  'focus:border-purple-500'
                              }`}
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
                        className={`p-3.5 rounded-full shadow-xl transition-all duration-300 ${isRecording ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" :
                          currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'FRIEND' ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/40" :
                            currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'PLUS' ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/40" :
                              currentBackendChat.other_user.subscription_status?.plan?.name?.toUpperCase() === 'VIP' ? "bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/40 text-black" :
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

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />

      </LayoutGroup>
    </>
  )
}

export default Navbar
