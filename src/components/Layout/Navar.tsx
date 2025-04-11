"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Search, Video, Bell, MessageCircleMoreIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import FluidSearch from "./fluid-search"

const Navbar: React.FC = () => {
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  // Track scroll position for navbar background effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed w-full top-0 z-40 px-4 md:px-6 transition-all duration-300 ${
          scrollPosition > 20 ? "border-t border-[#2a2f5e] bg-[#0c1033]/90 backdrop-blur-lg" : "border-t border-[#2a2f5e] bg-[#0c1033]/90 backdrop-blur-lg"
        }`}
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto py-3">
          <div className="flex items-center space-x-30">
            <motion.div whileHover={{ rotate: 10 }} whileTap={{ scale: 0.9 }} className="text-purple-400">
              <MessageCircleMoreIcon className="w-8 h-8" />
            </motion.div>
            <Link
              to="/"
              className="text-2xl text-center font-bold text-white hover:text-purple-400 transition-colors space-x-23"
            >
              Buzzy
            </Link>
          </div>

          <div
            className="hidden md:flex flex-grow max-w-lg items-center bg-gray-800/80 border border-gray-700 rounded-full px-4 py-2 mx-4 cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={() => setShowSearch(true)}
          >
            <div className="w-full text-gray-400">{search ? search : "Buscar"}</div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Search size={20} />
            </motion.button>
          </div>

          <div className="flex items-center space-x-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="hidden md:flex text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Video className="text-purple-400 w-8 h-8" size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="hidden md:flex text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Bell className="text-purple-400 w-8 h-8" size={24} />
            </motion.button>
            <Link to={`/profile/${user.username}/`} className="relative group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-400 opacity-0 group-hover:opacity-70 blur-md transition-opacity duration-300"></div>
                <img
                  className="relative w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
                  src={`http://localhost:8000${user.profile_picture ? user.profile_picture : "/profile_pics/avatar.webp"}`}
                  alt="Profile"
                />
              </div>
            </Link>
          </div>
        </div>

        {/* Barra de Búsqueda en móviles */}
        <div className="md:hidden px-4 pb-4">
          <div
            className="flex items-center bg-gray-800/80 border border-gray-700 rounded-full px-4 py-2 cursor-pointer"
            onClick={() => setShowSearch(true)}
          >
            <div className="w-full text-gray-400">{search ? search : "Buscar"}</div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Search size={20} />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Fluid search component */}
      <AnimatePresence>
        {showSearch && (
          <FluidSearch onClose={() => setShowSearch(false)} searchTerm={search} setSearchTerm={setSearch} />
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
