"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X, TrendingUp, Clock, Sparkles } from "lucide-react"
import "../../footer.css"
interface FluidSearchProps {
  onClose: () => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

export default function FluidSearch({ onClose, searchTerm, setSearchTerm }: FluidSearchProps) {
  const [isTyping, setIsTyping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Mock search data
  const trendingSearches = [
    "futuristic interfaces",
    "3D UI design",
    "spatial computing",
    "holographic displays",
    "neural interfaces",
  ]

  const recentSearches = ["liquid animations", "gesture navigation", "augmented reality UI", "voice interfaces"]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md pt-16 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl bg-black p-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-400/20 blur-md"></div>
          <div className="relative flex items-center overflow-hidden rounded-xl bg-white/10 backdrop-blur-md">
            <Search className="ml-3 h-5 w-5 text-white/70" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsTyping(true)
                setTimeout(() => setIsTyping(false), 1000)
              }}
              placeholder="Search for creators, videos, or topics"
              className="w-full bg-transparent py-3 pl-2 pr-10 text-white outline-none placeholder:text-white/50"
            />
            {searchTerm && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchTerm("")
                }}
                className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Fluid animation for typing indicator */}
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10 mb-4">
          <motion.div
            initial={{ width: "0%" }}
            animate={{
              width: isTyping ? ["0%", "100%", "0%"] : "0%",
              left: isTyping ? ["0%", "0%", "100%"] : "0%",
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-400"
          />
        </div>

        {/* Search content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!searchTerm ? (
            <>
              {/* Trending searches */}
              <div className="mb-6">
                <div className="mb-2 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-purple-400" />
                  <h3 className="font-medium text-white/90">Trending</h3>
                </div>
                <div className="space-y-2">
                  {trendingSearches.map((term, index) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-white/80 transition-colors hover:bg-white/10"
                      onClick={() => setSearchTerm(term)}
                    >
                      <Sparkles className="mr-3 h-4 w-4 text-blue-400" />
                      {term}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent searches */}
              <div className="mb-6">
                <div className="mb-2 flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-blue-400" />
                  <h3 className="font-medium text-white/90">Recent</h3>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((term, index) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-white/80 transition-colors hover:bg-white/10"
                      onClick={() => setSearchTerm(term)}
                    >
                      {term}
                      <button
                        className="ml-auto text-white/50 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Remove from recent searches logic
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Search results
            <div className="space-y-4">
              {/* Search results would go here */}
              <div className="py-2 px-3 rounded-lg bg-white/5">
                <p className="text-white/70 text-sm">Searching for "{searchTerm}"...</p>
              </div>

              {/* Example search results */}
              {searchTerm.length > 2 && (
                <div className="space-y-2">
                  {["Result 1", "Result 2", "Result 3"].map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <p className="text-white">
                        {result} for "{searchTerm}"
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
