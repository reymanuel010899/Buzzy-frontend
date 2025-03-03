
import type React from "react"
import { useState } from "react"
import { Search, Video, Bell, MessageCircleMoreIcon } from "lucide-react"
import { Link } from "react-router-dom"

const Navbar: React.FC = () => {
  const [search, setSearch] = useState("")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  return (
    <nav className="bg-gray-900 shadow-lg fixed w-full top-0 z-50 px-4 md:px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto py-3">
        <div className="flex items-center space-x-30">
          <MessageCircleMoreIcon className="text-purple-400 w-8 h-8" />
          <Link to="/" className="text-2xl text-center font-bold text-white hover:text-purple-400 transition-colors space-x-23">
            Buzzy
          </Link>
        </div>

        <div className="hidden md:flex flex-grow max-w-lg items-center bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mx-4">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-white placeholder-gray-400"
          />
          <button className="text-gray-400 hover:text-purple-400 transition-colors">
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <button className="hidden md:flex text-gray-400 hover:text-purple-400 transition-colors">
            <Video className="text-purple-400 w-8 h-8" size={24} />
          </button>
          <button className="hidden md:flex text-gray-400 hover:text-purple-400 transition-colors">
            <Bell className="text-purple-400 w-8 h-8" size={24} />
          </button>
          <Link to={`/profile/${user.username}/`} className="relative group">
            <img
              className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
              src={`http://localhost:8000${user.profile_picture ? user.profile_picture : '/profile_pics/avatar.webp'}`}
              alt="Profile"
            />
            <div className="absolute inset-0 rounded-full bg-purple-400 opacity-0 group-hover:opacity-25 transition-opacity duration-300"></div>
          </Link>
        </div>
      </div>

      {/* Barra de Búsqueda en móviles */}
      <div className="md:hidden px-4 pb-4">
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-white placeholder-gray-400"
          />
          <button className="text-gray-400 hover:text-purple-400 transition-colors">
            <Search size={20} />
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

