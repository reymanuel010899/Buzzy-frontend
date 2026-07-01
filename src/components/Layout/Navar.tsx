"use client"

import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import FluidSearch from "./fluid-search"
import NotificationPanel from "../notifications/NotificationPanel"
import { useNotificationsStore } from "../../context/NotificationsStore"
import { useCallStore } from "../../store/callStore"
import HeaderStories from "./HeaderStories"
import { useFeedModeStore } from "../../store/feedModeStore"

const Navbar: React.FC = () => {
  const { t } = useTranslation(['common'])
  void t;
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const notifUnreadCount = useNotificationsStore((state) => state.unreadCount);
  const { activeOutgoingCall, activeIncomingCall } = useCallStore();
  const [isCallMinimized] = useState(false);
  const [activeCallTime] = useState(0);
  const feedMode = useFeedModeStore((state) => state.feedMode);
  const setFeedMode = useFeedModeStore((state) => state.setFeedMode);

  return (
    <>
      <nav
        // Header con fondo NEGRO SÓLIDO y constante. Negro pleno hasta el 88% y solo
        // un breve desvanecido en el último tramo para que el borde inferior no sea un
        // corte duro contra el video.
        //
        // IMPORTANTE — SIN backdrop-blur ni transition: en modo ExoPlayer nativo el
        // video se dibuja en una capa de Android DETRÁS del WebView. El `backdrop-filter`
        // (blur) no puede leer esa capa nativa de forma fiable → el header "parpadeaba"
        // dejando ver los colores del video. Y `transition-all` animaba ese cambio.
        // Sin ambos + negro sólido, el color es SIEMPRE el mismo, sin flicker.
        className="fixed w-full top-0 z-50 px-2 sm:px-6"
        style={{
          background: 'linear-gradient(to bottom, #000 0%, #000 88%, rgba(0,0,0,0) 100%)',
        }}
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
        <div className="flex items-center gap-2 mx-auto ">
            {/* IZQUIERDA: Notificaciones (antes estaba el megáfono; el megáfono se
                movió al nav inferior). */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative shrink-0 text-gray-300 hover:text-purple-400 transition-colors"
              onClick={() => setShowNotifications(v => !v)}
            >
              <Bell className="h-7 w-7" />
              {notifUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
                </span>
              )}
            </motion.button>

          <HeaderStories inline showLabels={false} />

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
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

            {/* DERECHA: solo el ICONO de búsqueda (quitamos el input grande para
                ganar espacio de video). Al tocarlo abre el modal de búsqueda. */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative text-gray-300 hover:text-cyan-400 transition-colors"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-7 w-7" />
            </motion.button>
          </div>
        </div>

        {/* Tabs "Para ti / Seguidos" — segunda fila DENTRO del header, DEBAJO de la
            fila de iconos (campana/historia/búsqueda). */}
        <span className="flex items-center justify-center gap-6 -mt-0.5 pb-1">
          <button
            type="button"
            onClick={() => setFeedMode("for-you")}
            className={`bg-transparent p-0 text-[13px] font-semibold transition-colors ${feedMode === "for-you"
              ? "text-white"
              : "text-white/45 hover:text-white"
              }`}
          >
            Para ti
          </button>
          <button
            type="button"
            onClick={() => setFeedMode("following")}
            className={`bg-transparent p-0 text-[13px] font-semibold transition-colors ${feedMode === "following"
              ? "text-[#00f0ff]"
              : "text-white/45 hover:text-white"
              }`}
          >
            Seguidos
          </button>
        </span>
      </nav>

      <AnimatePresence>
        {showSearch && (
          <FluidSearch onClose={() => setShowSearch(false)} searchTerm={search} setSearchTerm={setSearch} />
        )}
      </AnimatePresence>

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  )
}

export default Navbar
