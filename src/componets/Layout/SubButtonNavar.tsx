import React from "react";
import { FaHome,  FaPlusCircle, FaGamepad, FaUser, FaStore } from "react-icons/fa";
// import { Link } from "react-router-dom";

const SubBottomNavbarGame: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-gray-900 text-white flex justify-around items-center py-3 shadow-lg">
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <FaHome size={24} />
        <span className="text-xs">Home</span>
      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <FaGamepad size={24} />
        <span className="text-xs">Game</span>
      </button>
      <button className="bg-purple-600 p-3 rounded-full text-white shadow-md hover:bg-purple-700">
        <FaPlusCircle size={28} />
      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <FaStore size={24} />
        <span className="text-xs">Store</span>
      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <FaUser size={24} />
        <span className="text-xs">Perfil</span>
      </button>
    </nav>
  );
};

export default SubBottomNavbarGame;
