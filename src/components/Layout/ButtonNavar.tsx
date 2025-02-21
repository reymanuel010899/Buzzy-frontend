import React from "react";
import { FaHome, FaMoneyBill, FaPlusCircle, FaGamepad, FaStore } from "react-icons/fa";
import { Link } from "react-router-dom";

const BottomNavbar: React.FC = () => {
  return (
  <nav className="fixed bottom-0 left-0 w-full bg-gray-900/90 text-white flex justify-around items-center py-2 shadow-lg z-100">
  {/* Contenido del nav */}
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
     
        <span className="text-xs"><Link to={'/'}><FaHome size={24} style={{marginLeft: 5}}/>Home</Link></span>
      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
       
        <span className="text-xs"><Link to={'/game'}> <FaGamepad size={24}  style={{marginLeft: 5}}/>Game</Link></span>
      </button>
      <button className=" p-1 rounded-full text-white shadow-md hover:bg-purple-700">
        <FaPlusCircle size={29} />
        <span className="text-xs"><Link to={'/game'}>Buzzy</Link></span>

      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <Link to={'/marker'}><FaStore size={24}  style={{marginLeft: 1}}/><span className="text-xs">Store</span></Link>
      </button>
      <button className="flex flex-col items-center text-gray-400 hover:text-white">
        <Link to={'/wallet'}><FaMoneyBill size={24}  style={{marginLeft: 5}}/><span className="text-xs">Wallet</span></Link>
      </button>
    </nav>
  );
};

export default BottomNavbar;
