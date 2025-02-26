import React from "react";
import { Home, GamepadIcon, Plus, ShoppingBag, Wallet } from "lucide-react"
import { Link } from "react-router-dom";

const BottomNavbar: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center py-2 px-4 z-50">
        {[
          { icon: Home, label: "Home", path: "/" },
          { icon: GamepadIcon, label: "Game", path: "/game" },
          { icon: Plus, label: "Buzzy" },
          { icon: ShoppingBag, label: "Store", path: "/marker" },
          { icon: Wallet, label: "Wallet", path: "wallet" },
        ].map((item, index) => (
          <Link
          to={item.path}
            key={item.label}
            className={`flex flex-col items-center justify-center p-2 text-xs gap-1 ${
              index === 2 ? "text-purple-400" : "text-gray-400"
            } hover:text-white transition-colors`}
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
  );
};

export default BottomNavbar;
