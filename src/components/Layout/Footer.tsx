import React, { useState } from "react";
import { Menu, Search, Video, Bell, UserCircle } from "lucide-react";

const Footer: React.FC = () => {
  const [search, setSearch] = useState("");

  return (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50 px-4 md:px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto py-3">
        
        {/* Menú y Logo */}
        <div className="flex items-center space-x-4">
          <button className="md:hidden text-white-700">
            <Menu size={24} />
          </button>
          <a href="/" className="text-2xl font-bold text-red-600">
            Buzzy
          </a>
        </div>

        {/* Barra de Búsqueda */}
        <div className="hidden md:flex flex-grow max-w-lg items-center border border-gray-300 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-white-700"
          />
          <button className="text-gray-600">
            <Search size={20} />
          </button>
        </div>

        {/* Íconos de acciones */}
        <div className="flex items-center space-x-4">
          <button className="hidden md:flex text-gray-700">
            <Video size={24} />
          </button>
          <button className="hidden md:flex text-gray-700">
            <Bell size={24} />
          </button>
          <button className="text-gray-700">
            <UserCircle size={32} />
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda en móviles */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center border border-gray-300 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-gray-700"
          />
          <button className="text-gray-600">
            <Search size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Footer;
