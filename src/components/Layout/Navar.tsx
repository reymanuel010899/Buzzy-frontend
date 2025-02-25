import React, { useState } from "react";
import { Search, Video, Bell, MessageCircleMoreIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  const [search, setSearch] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  console.log(user);
  // flex flex-col items-center p-4 text-white space-y-8 bg-gradient-to-r from-white-900 via-gray-800 to-gray-900 min-h-screen font-sans
  return (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50 px-4 md:px-6    ">
      <div className="flex justify-between text-black items-center max-w-7xl mx-auto py-3">
        
        <div className="flex items-center space-x-23">
          <MessageCircleMoreIcon className="z-100 w-10 h-7  rounded-2xl "/>
          <a href="/" className="text-2xl font-bold text-black">
            Buzzy
          </a>
        </div>
    
       
        <div className="hidden md:flex flex-grow max-w-lg items-center border border-black rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-white-700"
          />
          <button className="text-black">
            <Search size={20} />
          </button>
        </div>

      
        <div className="flex items-center space-x-8">
          <button className="hidden md:flex text-black ml-15 mr-15">
            <Video size={24} />
          </button>
          <button className="hidden md:flex text-black">
            <Bell size={24} />
          </button>
          <button className="text-black">
            <Link to={'/profile'}><img className="w-8 h-8 rounded-full object-cover" src={`http://localhost:8000/${user.profile_picture}`} alt="" /></Link>
          </button>
        </div>

      </div>

      {/* Barra de Búsqueda en móviles */}
      <div className="md:hidden px-4 pb-4">
        <div className="flex items-center border border-black rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-black"
          />
          <button className="text-black">
            <Search size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
