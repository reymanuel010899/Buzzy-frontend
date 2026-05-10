"use client"

import React, { useState } from "react"
import { Plus, Home, Wallet } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useSelector } from "react-redux"
import ProfileIconC from "./ProfileIcon";
import CreateActionModal from "../CreateVideo/components/create-action-modal";
import { useChat } from "../../context/ChatContext";

const BottomNavbar: React.FC = () => {
  const location = useLocation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { setShowMessages } = useChat()
  const currentUser = useSelector((state: { LoginReducer: { user?: { username?: string } } }) => state.LoginReducer?.user);
  const profilePath = `/profile/${currentUser?.username || 'user'}`;

  const isActive = (path: string | null) => {
    if (!path) return false
    return location.pathname === path
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: 'rgba(5,7,24,0.96)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(112,0,255,0.15)' }}
      >
        <div className="flex h-14 items-center justify-around px-4 max-w-lg mx-auto">

          {/* Home */}
          <Link to="/" className="relative flex flex-col items-center gap-0.5 group">
            <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-0.5">
              <Home className={`h-5 w-5 transition-colors duration-200 ${isActive("/") ? "text-[#00f0ff]" : "text-white/40 group-hover:text-white/70"}`} />
              <span className={`text-[9px] font-medium transition-colors duration-200 ${isActive("/") ? "text-[#00f0ff]" : "text-white/30"}`}>Home</span>
            </motion.div>
            <AnimatePresence>
              {isActive("/") && (
                <motion.div
                  layoutId="activeBar"
                  className="absolute -bottom-1 w-4 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7000ff, #00f0ff)' }}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                />
              )}
            </AnimatePresence>
          </Link>

          {/* Messages */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowMessages(true)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <svg fill="currentColor" className="h-5 w-5 text-white/40 group-hover:text-white/70 transition-colors duration-200" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M45.73 7A2 2 0 0 0 44 6H4a2 2 0 0 0-1.48 3.35l10.44 11.47a2 2 0 0 0 2.2.52l14.49-5.5c.17-.07.25-.04.28-.03.06.02.14.08.2.2.07.1.08.2.08.27 0 .04-.02.12-.16.23l-11.9 10.1a2 2 0 0 0-.62 2.12l4.56 14.51a2 2 0 0 0 3.64.4L45.73 9a2 2 0 0 0 0-2Z" />
            </svg>
            <span className="text-[9px] font-medium text-white/30 group-hover:text-white/50 transition-colors duration-200">Messages</span>
          </motion.button>

          {/* Create — centro elevado */}
          <div className="relative -mt-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => { setIsModalOpen(true); window.dispatchEvent(new Event('buzzy:pausefeed')) }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #7000ff, #00f0ff)', boxShadow: '0 0 20px rgba(112,0,255,0.6), 0 0 40px rgba(0,240,255,0.2)' }}
            >
              <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Wallet */}
          <Link to="/wallet" className="relative flex flex-col items-center gap-0.5 group">
            <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-0.5">
              <Wallet className={`h-5 w-5 transition-colors duration-200 ${isActive("/wallet") ? "text-[#00f0ff]" : "text-white/40 group-hover:text-white/70"}`} />
              <span className={`text-[9px] font-medium transition-colors duration-200 ${isActive("/wallet") ? "text-[#00f0ff]" : "text-white/30"}`}>Wallet</span>
            </motion.div>
            <AnimatePresence>
              {isActive("/wallet") && (
                <motion.div
                  layoutId="activeBar"
                  className="absolute -bottom-1 w-4 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7000ff, #00f0ff)' }}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                />
              )}
            </AnimatePresence>
          </Link>

          {/* Profile */}
          <Link to={profilePath} className="relative flex flex-col items-center gap-0.5 group">
            <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-0.5">
              <div className={`transition-all duration-200 ${isActive(profilePath) ? "ring-1 ring-[#00f0ff] rounded-full" : ""}`}>
                <ProfileIconC />
              </div>
              <span className={`text-[9px] font-medium transition-colors duration-200 ${isActive(profilePath) ? "text-[#00f0ff]" : "text-white/30"}`}>Profile</span>
            </motion.div>
          </Link>

        </div>
        {/* safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>

      <CreateActionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); window.dispatchEvent(new Event('buzzy:resumefeed')) }}
      />
    </>
  )
}

export default React.memo(BottomNavbar)
