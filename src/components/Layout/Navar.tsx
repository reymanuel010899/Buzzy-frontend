"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Search, Bell, MessageCircleMoreIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import FluidSearch from "./fluid-search"

const Navbar: React.FC = () => {
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed w-full top-0 z-40 px-4 md:px-6 transition-all duration-300 border-t border-[#2a2f5e] ${
          scrollPosition > 20 ? "bg-black" : "bg-black backdrop-blur-lg"
        }`}
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto py-3">
          {/* Izquierda: Logo + Mensajes */}
          <div className="flex items-center gap-6">
            <motion.div whileHover={{ rotate: 15 }} whileTap={{ scale: 0.9 }}>
              <MessageCircleMoreIcon className="w-8 h-8 text-purple-400" />
            </motion.div>

            <Link
              to="/"
              className="text-2xl font-bold text-white hover:text-purple-400 transition-colors"
            >
              Buzzy
            </Link>
          </div>

          {/* Centro: Buscador (solo desktop) */}
          <div
            className="hidden md:flex flex-grow max-w-lg items-center bg-gray-800/80 border border-gray-700 rounded-full px-4 py-2 mx-8 cursor-pointer hover:bg-gray-700/60 transition-colors"
            onClick={() => setShowSearch(true)}
          >
            <span className="text-gray-400">{search || "Buscar"}</span>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Search className="w-5 h-5 text-gray-400 ml-auto" />
            </motion.div>
          </div>

          {/* Derecha: Campanita + Foto de perfil */}
          <div className="flex items-center gap-4">
            {/* Campanita justo al lado del avatar */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-300 hover:text-purple-400 transition-colors"
            >
              <Bell className="w-7 h-7" />
            </motion.button>

            {/* Avatar con efecto hover bonito */}
            <Link to={`/profile/${user.username}/`} className="relative group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-75 blur-lg transition-opacity duration-500" />
                <img
                  src={`http://localhost:8000${user.profile_picture || "/profile_pics/avatar.webp"}`}
                  alt="Perfil"
                  className="relative w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
                />
              </div>
            </Link>
          </div>
        </div>

        {/* Buscador móvil */}
        <div className="md:hidden px-4 pb-4 pt-2">
          <div
            className="flex items-center bg-gray-800/80 border border-gray-700 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-700/60 transition-colors"
            onClick={() => setShowSearch(true)}
          >
            <span className="text-gray-400 px-2">{search || "Buscar"}</span>
            <Search className="w-5 h-5 text-gray-400 ml-auto mr-3" />
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showSearch && (
          <FluidSearch
            onClose={() => setShowSearch(false)}
            searchTerm={search}
            setSearchTerm={setSearch}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar