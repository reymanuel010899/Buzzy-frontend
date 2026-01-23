"use client"

import React, { useState } from "react"
import {  Plus } from "lucide-react"
import {
  HomeIcon,
  ShoppingBagIcon,
  WalletIcon,
  MapIcon,
} from "@heroicons/react/24/solid";
import { Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import profileIconC from "./ProfileIcon";

const BottomNavbar: React.FC = () => {
  const location = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Navigation items
  const navItems = [
    { icon: HomeIcon, label: "Home", path: "/" },
      { icon: WalletIcon, label: "Wallet", path: "/wallet" },
    { icon: ShoppingBagIcon, label: "Store", path: "/marker" },
    { icon: Plus, label: "Create", path: null, isSpecial: true },
    { icon: MapIcon, label: "Game", path: "/game" },
    { icon: WalletIcon, label: "Wallet", path: "/wallet" },
    { icon: profileIconC, label: "Profile", path: "/profile" },
  ]

  // Check if a path is active
  const isActive = (path: string | null) => {
    if (!path) return false
    return location.pathname === path
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2a2f5e] bg-black">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <React.Fragment key={item.label}>
            {item.isSpecial ? (
              // Special center button
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setHoveredItem(item.label)}
                onHoverEnd={() => setHoveredItem(null)}
              >
                <div className="absolute -inset-3 rounded-full  opacity-70 blur-md"></div>
                <Link
                  to={item.path || "/create"}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] shadow-[0_0_15px_rgba(112,0,255,0.7)]"
                >
                  <item.icon className="h-5 w-5 text-white" />
                </Link>
                {hoveredItem === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0c1033] px-3 py-1 text-xs font-medium text-white shadow-lg"
                  >
                    {item.label}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              // Regular navigation items
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setHoveredItem(item.label)}
                onHoverEnd={() => setHoveredItem(null)}
              >
                <Link
                  to={item.path || ""}
                  className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
                    isActive(item.path) ? "text-[#00f0ff]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs">{item.label}</span>
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 h-1 w-10 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
                {hoveredItem === item.label && !isActive(item.path) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -bottom-1 h-1 w-10 rounded-full bg-white/20"
                  />
                )}
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  )
}

export default BottomNavbar
