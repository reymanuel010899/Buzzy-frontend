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

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  )
}

export default Navbar
