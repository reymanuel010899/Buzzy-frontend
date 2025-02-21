import { useState } from "react";
import { Wallet, Plus, ArrowDown, ArrowUp } from "lucide-react";
import BottomNavbar from "../Layout/ButtonNavar";

const WalletComponent = () => {
  const [balance, setBalance] = useState(1250.0);

  const transactions = [
    { description: "Compra en Store", amount: 50, type: "income" },
    { description: "Pago recibido", amount: 100, type: "income" },
    { description: "Suscripción mensual", amount: -20, type: "expense" },
    { description: "Venta de producto", amount: 75, type: "income" },
  ];

  return (
    <div className="flex flex-col items-center p-4 text-white space-y-8 bg-gradient-to-r from-white-900 via-gray-800 to-gray-900 min-h-screen font-sans">
      {/* Tarjeta principal de la Wallet */}
      <div className="w-full max-w-md  from-indigo-800 via-purple-800 to-pink-800 p-6 rounded-3xl shadow-2xl transform hover:scale-105 transition duration-300">
        <div className="flex flex-col items-center">
          <Wallet size={50} className="mb-3 text-yellow-300" />
          <h2 className="text-2xl font-bold">Mi Wallet</h2>
          <p className="text-4xl font-extrabold mt-2">${balance.toFixed(2)}</p>
          <div className="flex flex-col md:flex-row gap-4 mt-6 w-full">
            <button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              onClick={() => {
                // Lógica para agregar fondos
                // Por ejemplo, podrías abrir un modal o incrementar el balance
                alert("Agregar fondos");
              }}
            >
              <Plus size={20} /> Agregar Fondos
            </button>
            <button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              onClick={() => {
                // Lógica para retirar fondos
                alert("Retirar fondos");
              }}
            >
              <ArrowDown size={20} /> Retirar
            </button>
          </div>
        </div>
      </div>

      {/* Historial de transacciones */}
      <div className="w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Historial de Transacciones</h3>
        <ul className="space-y-4">
          {transactions.map((tx, index) => (
            <li
              key={index}
              className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-md"
            >
              <div className="flex items-center gap-2">
                {tx.type === "income" ? (
                  <ArrowUp size={22} className="text-green-400" />
                ) : (
                  <ArrowDown size={22} className="text-red-400" />
                )}
                <span className="font-medium">{tx.description}</span>
              </div>
              <span
                className={`font-bold ${
                  tx.type === "income" ? "text-green-400" : "text-red-400"
                }`}
              >
                {tx.type === "income"
                  ? `+$${tx.amount.toFixed(2)}`
                  : `-$${Math.abs(tx.amount).toFixed(2)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default WalletComponent;
