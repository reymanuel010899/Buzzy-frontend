"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Wallet, Plus, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import BottomNavbar from "../Layout/ButtonNavar"
import WalletModal from "./WalletModal";
import WithdrawSuccessModal from "./WithdrawSuccessModal";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from "../../store";
import { getBankAccounts } from "../../redux/actions/bankActions";
import BankAccountModal from "../profle/BankAccountModal";
import { IUser } from "../../interfaces/auth";
import WithdrawCancel from "./withdrawBad";
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
  createDepositSession: (amount: number) => any;
  withdrawFunds: (amount: number, bankAccountId?: string | number) => any;
}

const WalletComponent = ({ balances, getWallet, pass_code, wallet_type, user, createDepositSession, withdrawFunds }: WalletComponentProps) => {
  console.log(user)
  const dispatch = useDispatch();
  const [balance, setBalance] = useState(parseInt(balances?.toString() || "0"))
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [mesageError, setMessageError] = useState('')
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [activeFilter, setActiveFilter] = useState<"all" | "income" | "expense">("all")
  const [scrollPosition, setScrollPosition] = useState(0)

  const { accounts: bankAccounts } = useSelector((state: RootState) => state.bankReducer);
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
  useEffect(() => {
    // if(count.current >= 1) return;
    // count.current += 1
    getWallet()
    dispatch(getBankAccounts() as any)
    setBalance(balances ? parseInt(balances.toString()) : 0)
  }, [balances, dispatch])
  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleAddFunds = (amount: number) => {
    createDepositSession(amount)
      .catch(() => {
        alert("Error al crear la sesión de depósito");
      });
  }

  const handleWithdraw = async (amount: number, bankAccountId?: string | number) => {
    try {
      await withdrawFunds(amount, bankAccountId).then((res)=>{
        if ( !res?.active) {
          setMessageError(res?.message)
          setIsWalletModalOpen(false);
          setCancelModal(true)
          return
        
        };
        new Promise(r => setTimeout(r, 3000));
        setIsWalletModalOpen(false);
        setShowWithdrawSuccessModal(true);
        getWallet();
      });
      // Artificial delay so the spinner spins for exactly 3 seconds after success
      
    } catch (err: any) {
      
      // alert(err.error || "Error al solicitar retiro");
      // throw err;
    }
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
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDefaultTab('deposit'); setIsWalletModalOpen(true); }}
                  className="w-full relative group py-4 px-6 rounded-full bg-[#10b981] shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all duration-300 border border-white/20 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-3">
                    <Plus size={20} className="text-white" strokeWidth={3} />
                    <span className="text-white font-black italic tracking-widest uppercase text-sm">
                      Agregar Fondos
                    </span>
                  </div>
                  {/* Glowing line overlay */}
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 opacity-40 group-hover:animate-shine" />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDefaultTab('withdraw'); setIsWalletModalOpen(true); }}
                  className="w-full relative group py-4 px-6 rounded-full bg-[#ef4444] shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all duration-300 border border-white/10 overflow-hidden opacity-90"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-3">
                    <ArrowDown size={20} className="text-white" strokeWidth={3} />
                    <span className="text-white font-black italic tracking-widest uppercase text-sm">
                      Retirar
                    </span>
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
                className={`px-2 py-1 text-xs rounded-full transition-colors ${activeFilter === "all"
                  ? "bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white"
                  : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveFilter("income")}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${activeFilter === "income"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                  : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                  }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setActiveFilter("expense")}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${activeFilter === "expense"
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
                    className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300 ${tx.type === "income"
                      ? "bg-gradient-to-r from-green-500 to-[#00f0ff]"
                      : "bg-gradient-to-r from-red-500 to-[#ff00aa]"
                      }`}
                  ></div>
                  <div className="relative flex justify-between items-center bg-black p-4 rounded-xl border border-[#2a2f5e] group-hover:border-transparent transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${tx.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
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

      {/* Premium Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        balance={balance}
        onAddFunds={handleAddFunds}
        onWithdraw={handleWithdraw}
        defaultTab={defaultTab}
        bankAccounts={bankAccounts || []}
        onOpenBankAccounts={() => {
          setIsWalletModalOpen(false);
          setIsBankAccountModalOpen(true);
        }}
      />

      <BankAccountModal
        isOpen={isBankAccountModalOpen}
        onClose={() => setIsBankAccountModalOpen(false)}
      />

      <WithdrawSuccessModal
        isOpen={showWithdrawSuccessModal}
        onClose={() => setShowWithdrawSuccessModal(false)}
      />
      

      <WithdrawCancel
          isOpen={cancelModal}
          message={mesageError}
          onClose={() => setCancelModal(false)}
      />
      {/* Bottom navbar */}
      <BottomNavbar />
    </div>
  )
}

export default WalletComponent
