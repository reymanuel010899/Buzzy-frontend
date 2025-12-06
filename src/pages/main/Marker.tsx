"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Sun, Moon, Filter, ShoppingBag, Tag, MapPin, Sparkles } from "lucide-react"
import BottomNavbar from "../../components/Layout/ButtonNavar"

// Sample data
const categories = ["Electrónica", "Moda", "Hogar", "Juguetes", "Deportes", "Libros"]
const locations = ["Ciudad de México", "Guadalajara", "Monterrey", "Cancún"]
const products = [
  {
    id: 1,
    name: "Smartphone X",
    price: "$799",
    category: "Electrónica",
    location: "Ciudad de México",
    image: "https://via.placeholder.com/150",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Zapatillas Deportivas",
    price: "$120",
    category: "Moda",
    location: "Guadalajara",
    image: "https://via.placeholder.com/150",
    rating: 4.5,
  },
  {
    id: 3,
    name: "Laptop Pro",
    price: "$1299",
    category: "Electrónica",
    location: "Monterrey",
    image: "https://via.placeholder.com/150",
    rating: 4.9,
  },
  {
    id: 4,
    name: "Auriculares Bluetooth",
    price: "$199",
    category: "Electrónica",
    location: "Cancún",
    image: "https://via.placeholder.com/150",
    rating: 4.7,
  },
]

const Marketplace = () => {
  const [darkMode, setDarkMode] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const filteredProducts = products.filter(
    (product) =>
      (!selectedCategory || product.category.toLowerCase() === selectedCategory.toLowerCase()) &&
      (!selectedLocation || product.location.toLowerCase() === selectedLocation.toLowerCase()) &&
      (!search.trim() || product.name.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="min-h-screen text-white bg-[#050718]">
      {/* Dynamic background with animated gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f3c] via-[#1a1a4a] to-[#0f0f3c] opacity-80"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

        {/* Animated orbs in background */}
        <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div>
        <div className="absolute top-2/3 left-1/2 h-32 w-32 rounded-full bg-[#a200ff]/20 blur-3xl animate-float-slow"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pb-24">
        {/* Header */}
        <header
          className={`sticky top-0 z-30 transition-all duration-500 ease-in-out ${
            scrollPosition > 20 ? "bg-[#0c1033]/80 backdrop-blur-lg shadow-lg" : "bg-transparent"
          }`}
        >
          <div className="px-4 py-5">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7000ff] to-[#00f0ff] mb-4"
            >
              Marketplace
            </motion.h1>

            <div className="flex items-center justify-between gap-3">
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm"></div>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0c1033] border border-[#2a2f5e]">
                  <Plus className="h-6 w-6 text-[#00f0ff]" />
                </div>
              </motion.button>

              <motion.div
                initial={{ opacity: 0, width: "80%" }}
                animate={{ opacity: 1, width: isSearchFocused ? "100%" : "80%" }}
                transition={{ duration: 0.3 }}
                className="relative flex-1"
              >
                <div
                  className={`absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 ${
                    isSearchFocused ? "opacity-50" : ""
                  } blur-sm transition-opacity duration-300`}
                ></div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full px-4 py-3 pl-10 rounded-full bg-[#0c1033]/90 border border-[#2a2f5e] text-white placeholder-[#a2b0ff]/50 focus:outline-none focus:border-[#00f0ff] transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  <Search className="absolute left-3 text-[#a2b0ff]" size={18} />
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className="relative"
              >
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm"></div>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0c1033] border border-[#2a2f5e]">
                  {darkMode ? <Sun className="h-5 w-5 text-[#00f0ff]" /> : <Moon className="h-5 w-5 text-[#00f0ff]" />}
                </div>
              </motion.button>
            </div>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-4 py-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#00f0ff]" />
                <span className="text-sm font-medium text-[#a2b0ff]">Filtros</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-[#00f0ff] hover:text-white transition-colors"
              >
                {showFilters ? "Ocultar" : "Mostrar más"}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff]/50 to-[#00f0ff]/50 opacity-30 blur-sm"></div>
                <select
                  className="w-full px-4 py-2.5 rounded-full bg-[#0c1033]/90 border border-[#2a2f5e] text-white appearance-none focus:outline-none focus:border-[#00f0ff] transition-colors"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Todas las Categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Tag className="h-4 w-4 text-[#00f0ff]" />
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="relative mt-2">
                      <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#7000ff]/50 to-[#00f0ff]/50 opacity-30 blur-sm"></div>
                      <select
                        className="w-full px-4 py-2.5 rounded-full bg-[#0c1033]/90 border border-[#2a2f5e] text-white appearance-none focus:outline-none focus:border-[#00f0ff] transition-colors"
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                      >
                        <option value="">Todas las Ubicaciones</option>
                        {locations.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <MapPin className="h-4 w-4 text-[#00f0ff]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </header>

        {/* Products grid */}
        <div className="px-4 py-6">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-0 group-hover:opacity-70 blur-sm transition-opacity duration-300"></div>
                  <div className="relative bg-[#0c1033]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-[#2a2f5e] group-hover:border-transparent transition-colors">
                    <div className="relative h-48 overflow-hidden">
        
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        width={300}
                        height={150}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/10 to-[#00f0ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Category badge */}
                      <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-[#0c1033]/80 backdrop-blur-sm text-xs font-medium text-[#00f0ff] border border-[#2a2f5e]">
                        {product.category}
                      </div>

                      {/* Rating badge */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#0c1033]/80 backdrop-blur-sm text-xs font-medium text-white border border-[#2a2f5e] flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-[#ffcc00]" />
                        {product.rating}
                      </div>
                    </div>

                    <div className="p-4">
                      <h2 className="text-lg font-bold text-white group-hover:text-[#00f0ff] transition-colors">
                        {product.name}
                      </h2>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7000ff] to-[#00f0ff]">
                          {product.price}
                        </p>
                        <div className="flex items-center text-xs text-[#a2b0ff]">
                          <MapPin className="h-3 w-3 mr-1" />
                          {product.location}
                        </div>
                      </div>

                      {/* Buy button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full mt-4 relative group/btn"
                      >
                        <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative py-2 rounded-lg bg-[#0c1033] group-hover/btn:bg-[#161b4b] transition-colors flex items-center justify-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-[#00f0ff]" />
                          <span className="font-medium">Comprar</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md"></div>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
                  <ShoppingBag className="h-12 w-12 text-[#00f0ff]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No se encontraron productos</h3>
              <p className="text-[#a2b0ff] max-w-md">
                Intenta cambiar los filtros o buscar con otros términos para encontrar lo que estás buscando
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearch("")
                  setSelectedCategory("")
                  setSelectedLocation("")
                }}
                className="mt-6 relative"
              >
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-70 blur-sm"></div>
                <div className="relative px-6 py-2 rounded-lg bg-[#0c1033] hover:bg-[#161b4b] transition-colors">
                  Limpiar filtros
                </div>
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom navbar */}
      <BottomNavbar />
    </div>
  )
}

export default Marketplace
