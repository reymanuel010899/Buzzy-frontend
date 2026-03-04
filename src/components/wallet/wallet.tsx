"use client"

import { useState, useEffect} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Plus, ArrowDown, ArrowUp, Clock, DollarSign } from 'lucide-react';
import BottomNavbar from "../Layout/ButtonNavar"
import { createTransactions } from "../../redux/actions/createTransactions";
import { useDispatch } from 'react-redux';
import { IUser } from "../../interfaces/auth";
interface Transaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  date: string
}

type WalletComponentProps = {
  user?: IUser | null;
  balances?: string | number;
  getWallet: () => void;
  pass_code?: string;
  wallet_type?: string;
}

const WalletComponent = ({ balances, getWallet, pass_code, wallet_type, user}: WalletComponentProps) => {
  console.log(user)
  const dispatch = useDispatch(); 
  const [balance, setBalance] = useState(parseInt(balances?.toString() || "0"))
  const [showAddFundsModal, setShowAddFundsModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "income" | "expense">("all")
  const [scrollPosition, setScrollPosition] = useState(0)
  // let count = useRef(0)
  console.log(scrollPosition)
  // Sample transactions data
  const [transactions] = useState<Transaction[]>([
    {
      id: "tx1",
      description: "Compra en Store",
      amount: 50,
      type: "income",
      date: "2025-04-10",
    },
    {
      id: "tx2",
      description: "Pago recibido",
      amount: 100,
      type: "income",
      date: "2025-04-09",
    },
    {
      id: "tx3",
      description: "Suscripción mensual",
      amount: -20,
      type: "expense",
      date: "2025-04-08",
    },
    {
      id: "tx4",
      description: "Venta de producto",
      amount: 75,
      type: "income",
      date: "2025-04-07",
    },
  ])
  useEffect(()=>{
    // if(count.current >= 1) return;
    // count.current += 1
    getWallet()
    setBalance(balances ? parseInt(balances.toString()) : 0)
  }, [balances])
  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleAddFunds = () => {
    if (!amount || isNaN(Number(amount))) return
    setIsLoading(true)
   
    // Simulate API call /wallet
    setTimeout(() => {
      createTransactions({
      amount: Number(amount),
      transaction_type: "deposit",
      description: "Fondos agregados"
    })(dispatch).then(()=> {
      setAmount("")
      setShowAddFundsModal(false)
      setIsLoading(false)
      getWallet()
      setBalance(balances ? parseInt(balances.toString()) : 0)
    })
    }, 1500)
  }

  const handleWithdraw = () => {
    if (!amount || isNaN(Number(amount))) return
    const amountNum = Number(amount)

    if (amountNum > balance) {
      alert("No tienes suficiente saldo")
      return
    }

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      createTransactions({
      amount: Number(amount),
      transaction_type: "withdrawal",
      description: "Fondos retirados"
    })(dispatch).then(()=> {

      setAmount("")
      setShowAddFundsModal(false)
      setIsLoading(false)
      getWallet()
      setBalance(balances ? parseInt(balances.toString()) : 0)
    })
    }, 1500)
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === "all") return true
    return tx.type === activeFilter
  })

  return (
    <div className="min-h-screen text-white bg-black">
      {/* Dynamic background with animated gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black opacity-80"></div>
        <div className="absolute inset-0 bg-black opacity-[0.03] mix-blend-overlay"></div>

        {/* Animated orbs in background */}
        {/* <div className="absolute top-1/4 left-1/4 h-40 w-40 rounded-full bg-[#7000ff]/20 blur-3xl animate-float"></div> */}
        {/* <div className="absolute top-2/3 left-1/2 h-32 w-32 rounded-full bg-[#a200ff]/20 blur-3xl animate-float-slow"></div> */}
        {/* <div className="absolute bottom-1/3 right-1/3 h-60 w-60 rounded-full bg-[#00f0ff]/20 blur-3xl animate-float-delayed"></div> */}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center p-4 space-y-8 max-w-md mx-auto pt-10 pb-24">
        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full relative"
        >
          <div className="absolute -inset-1 bg-black rounded-3xl opacity-50 blur-md"></div>
          <div className="relative bg-black p-8 rounded-3xl border border-[#2a2f5e] overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#7000ff]/20 to-[#00f0ff]/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#7000ff]/20 to-[#00f0ff]/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
              <span className="wallet-badge">{wallet_type?.toUpperCase()}</span>
           
            <div className="flex flex-col items-center relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative mb-4"
              >
                <div className="absolute -inset-1 rounded-full bg-[#ffcc00] opacity-30 blur-md"></div>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033] border-2 border-[#ffcc00]">
                  <Wallet size={32} className="text-[#ffcc00]" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Mi Wallet
              </motion.h2>
              <p>{pass_code?.toUpperCase()}</p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative"
              >
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff]/30 to-[#00f0ff]/30 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300"></div>
                <p className="text-5xl font-extrabold bg-clip-text  bg-gradient-to-r from-white to-[#00f0ff] my-4">
                  ${balance.toFixed(2)}
                </p>
              </motion.div>

              <div className="flex flex-col gap-3 mt-4 w-full">
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddFundsModal(true)}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">
                    <Plus size={20} /> Agregar Fondos
                  </div>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowWithdrawModal(true)}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-red-600 rounded-xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">
                    <ArrowDown size={20} /> Retirar
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a2b0ff]">
              Historial de Transacciones
            </h3>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === "all"
                    ? "bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white"
                    : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveFilter("income")}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === "income"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setActiveFilter("expense")}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === "expense"
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                    : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                }`}
              >
                Gastos
              </button>
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <ul className="space-y-3">
              {filteredTransactions.map((tx, index) => (
                <motion.li
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  className="relative group"
                >
                  <div
                    className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300 ${
                      tx.type === "income"
                        ? "bg-gradient-to-r from-green-500 to-[#00f0ff]"
                        : "bg-gradient-to-r from-red-500 to-[#ff00aa]"
                    }`}
                  ></div>
                  <div className="relative flex justify-between items-center bg-black p-4 rounded-xl border border-[#2a2f5e] group-hover:border-transparent transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          tx.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {tx.type === "income" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                      </div>
                      <div>
                        <span className="font-medium text-white">{tx.description}</span>
                        <p className="text-xs text-[#a2b0ff]">{tx.date}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {tx.type === "income" ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="relative mb-4">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md"></div>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033]/80 backdrop-blur-md">
                  <Clock className="h-8 w-8 text-[#00f0ff]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No hay transacciones</h3>
              <p className="text-[#a2b0ff] max-w-xs">
                Las transacciones aparecerán aquí cuando realices movimientos en tu wallet
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {showAddFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isLoading && setShowAddFundsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-2xl opacity-50 blur-md"></div>
              <div className="relative bg-black p-6 rounded-2xl border border-[#2a2f5e]">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Agregar Fondos</h3>

                <div className="mb-6">
                  <label className="block text-[#a2b0ff] mb-2 text-sm">Cantidad</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-[#a2b0ff]" />
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0c1033] border border-[#2a2f5e] rounded-xl py-3 pl-10 pr-3 text-white placeholder-[#a2b0ff]/50 focus:outline-none focus:border-[#00f0ff] transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => !isLoading && setShowAddFundsModal(false)}
                    disabled={isLoading}
                    className="flex-1 bg-[#0c1033] hover:bg-[#161b4b] border border-[#2a2f5e] text-white py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleAddFunds} disabled={isLoading} className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      {isLoading ? (
                        <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      ) : (
                        <>
                          <Plus size={18} /> Agregar
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isLoading && setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-2xl opacity-50 blur-md"></div>
              <div className="relative bg-black backdrop-blur-md p-6 rounded-2xl border border-[#2a2f5e]">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Retirar Fondos</h3>

                <div className="mb-6">
                  <label className="block text-[#a2b0ff] mb-2 text-sm">Cantidad</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-[#a2b0ff]" />
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0c1033] border border-[#2a2f5e] rounded-xl py-3 pl-10 pr-3 text-white placeholder-[#a2b0ff]/50 focus:outline-none focus:border-[#00f0ff] transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-[#a2b0ff] mt-2">Balance disponible: ${balance.toFixed(2)}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => !isLoading && setShowWithdrawModal(false)}
                    disabled={isLoading}
                    className="flex-1 bg-[#0c1033] hover:bg-[#161b4b] border border-[#2a2f5e] text-white py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleWithdraw} disabled={isLoading} className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-red-600 rounded-xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      {isLoading ? (
                        <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      ) : (
                        <>
                          <ArrowDown size={18} /> Retirar
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navbar */}
      <BottomNavbar />
    </div>
  )
}

export default WalletComponent
