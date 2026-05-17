"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Plus, ArrowDown, ArrowUp, Clock } from 'lucide-react'
import BottomNavbar from "../Layout/ButtonNavar"
import WalletModal from "./WalletModal"
import WithdrawSuccessModal from "./WithdrawSuccessModal"
import { useDispatch, useSelector } from 'react-redux'
import { apiClient } from '../../redux/client/api-client'
import { SUCCEES_GET_WALLET } from '../../redux/type'
import { RootState } from "../../store"
import { getBankAccounts } from "../../redux/actions/bankActions"
import BankAccountModal from "../profle/BankAccountModal"
import { IUser } from "../../interfaces/auth"
import WithdrawCancel from "./withdrawBad"
import WithdrawPinModal from "./WithdrawPinModal"
import ChatPrivacyModal from "../profle/ChatPrivacyModal"
import { getChatPrivacyStatus } from "../../redux/actions/chatPrivacy"
import { getTransactions, TxFilter } from "../../redux/actions/transactionActions"
import { WalletTransaction } from "../../redux/reducers/transactionReducer"
import { useTranslation } from 'react-i18next'

type WalletComponentProps = {
  user?: IUser | null
  balances?: string | number
  getWallet: () => void
  pass_code?: string
  wallet_type?: string
  tokens?: number
  token_value_usd?: number
  gift_fee_pct?: number
  createDepositSession: (amount: number) => Promise<{ url?: string }>
  withdrawFunds: (amount: number, bankAccountId?: string | number) => Promise<{ active?: boolean; balance?: number; message?: string }>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TRANSACTIONS_PER_PAGE = 4
const PAGINATION_WINDOW = 5

const WalletComponent = ({
  balances,
  getWallet,
  pass_code,
  tokens = 0,
  token_value_usd = 0.015,
  createDepositSession,
  withdrawFunds,
}: WalletComponentProps) => {
  const dispatch = useDispatch()
  const { t } = useTranslation('wallet')

  const [balance, setBalance] = useState(parseFloat(balances?.toString() || "0"))
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [mesageError, setMessageError] = useState('')
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<TxFilter>("all")
  const [converting, setConverting] = useState(false)
  const [convertedTokens, setConvertedTokens] = useState(tokens)

  useEffect(() => { setConvertedTokens(tokens) }, [tokens])

  const handleConvertTokens = async () => {
    if (convertedTokens <= 0 || converting) return
    setConverting(true)
    try {
      const res = await apiClient.post('/api/wallet/convert-tokens/')
      dispatch({ type: SUCCEES_GET_WALLET, payload: res.data.wallet })
      setBalance(parseFloat(res.data.wallet.balance))
      setConvertedTokens(0)
      getWallet()
    } catch {
      // silently ignore
    } finally {
      setConverting(false)
    }
  }

  const { accounts: bankAccounts } = useSelector((state: RootState) => state.bankReducer)
  const { transactions, loading: txLoading, count, page: currentPage } = useSelector(
    (state: RootState) => state.transactionReducer
  )

  const fetchTransactions = useCallback(
    (filter: TxFilter, pg = 1, append = false) => {
      dispatch(
        getTransactions(filter, pg, append, TRANSACTIONS_PER_PAGE) as unknown as ReturnType<
          typeof dispatch
        >
      )
    },
    [dispatch]
  )

  useEffect(() => {
    getWallet()
    dispatch(getBankAccounts() as unknown as ReturnType<typeof dispatch>)
    fetchTransactions("all")
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setBalance(parseFloat(balances?.toString() || "0"))
  }, [balances])

  const handleFilterChange = (f: TxFilter) => {
    if (f === activeFilter) return
    setActiveFilter(f)
    fetchTransactions(f, 1, false)
  }

  const handlePageChange = (targetPage: number) => {
    if (targetPage === currentPage || targetPage < 1) return
    const totalPages = Math.max(1, Math.ceil(count / TRANSACTIONS_PER_PAGE))
    if (targetPage > totalPages) return
    fetchTransactions(activeFilter, targetPage, false)
  }

  const handleAddFunds = (amount: number) => {
    createDepositSession(amount).catch(() => {
      alert(t('errors.depositSession'))
    })
  }

  const handleWithdraw = async (amount: number, bankAccountId?: string | number) => {
    try {
      const res = await withdrawFunds(amount, bankAccountId)
      if (!res?.active) {
        setMessageError(res?.message || t('errors.withdrawProcessing'))
        setIsWalletModalOpen(false)
        setCancelModal(true)
        return
      }
      setIsWalletModalOpen(false)
      setShowWithdrawSuccessModal(true)
      getWallet()
      fetchTransactions(activeFilter, 1, false)
    } catch {
      // error handled by redux
    }
  }

  const txIcon = (tx: WalletTransaction) =>
    tx.direction === 'income'
      ? <ArrowUp size={18} />
      : <ArrowDown size={18} />

  const filterLabels: Record<TxFilter, string> = {
    all: t('history.filter.all'),
    income: t('history.filter.income'),
    expense: t('history.filter.expense'),
  }

  const totalPages = Math.max(1, Math.ceil(count / TRANSACTIONS_PER_PAGE))
  const paginationStart = Math.min(
    Math.max(1, currentPage - Math.floor(PAGINATION_WINDOW / 2)),
    Math.max(1, totalPages - PAGINATION_WINDOW + 1)
  )
  const paginationEnd = Math.min(totalPages, paginationStart + PAGINATION_WINDOW - 1)
  const visiblePageNumbers = []
  for (let i = paginationStart; i <= paginationEnd; i += 1) {
    visiblePageNumbers.push(i)
  }

  return (
    <div className="min-h-screen text-white bg-black">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black opacity-80" />
      </div>

      <div className="relative z-10 flex flex-col items-center p-4 space-y-5 max-w-md mx-auto pt-6 pb-24">

        {/* ── Wallet Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full relative"
        >
          <div className="absolute -inset-1 bg-black rounded-3xl opacity-50 blur-md" />
          <div className="relative bg-black p-5 rounded-3xl border border-[#2a2f5e] overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#7000ff]/20 to-[#00f0ff]/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#7000ff]/20 to-[#00f0ff]/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
            <div className="flex flex-col items-center relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative mb-3"
              >
                <div className="absolute -inset-1 rounded-full bg-[#ffcc00] opacity-30 blur-md" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#0c1033] border-2 border-[#ffcc00]">
                  <Wallet size={20} className="text-[#ffcc00]" />
                </div>
              </motion.div>

              <h2 className="text-lg font-bold text-white mb-1">{t('title')}</h2>
              {pass_code && (
                <p className="text-xs text-gray-400">
                  {t('passcode', { code: pass_code.toUpperCase() })}
                </p>
              )}

              <p className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#00f0ff] my-3">
                ${balance.toFixed(2)}
              </p>

              {/* Tokens → USD */}
              <button
                onClick={handleConvertTokens}
                disabled={convertedTokens <= 0 || converting}
                className="flex items-center gap-2 mb-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 w-full justify-between hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-yellow-400 font-bold text-sm">🪙 {convertedTokens} tokens</span>
                {converting
                  ? <span className="text-white/40 text-xs animate-pulse">...</span>
                  : <ArrowUp size={14} className="text-[#00f0ff]" />
                }
                <span className="text-[#00f0ff] font-bold text-sm">
                  ${(convertedTokens * token_value_usd).toFixed(2)} USD
                </span>
              </button>

              <div className="flex flex-col gap-2 mt-2 w-full">
                <motion.button
                  whileHover={{ scale: 1.03, translateY: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDefaultTab('deposit'); setIsWalletModalOpen(true) }}
                  className="w-full relative group py-3 px-5 rounded-full bg-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_28px_rgba(16,185,129,0.55)] transition-all duration-300 border border-white/20 overflow-hidden"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <Plus size={16} className="text-white" strokeWidth={3} />
                    <span className="text-white font-black italic tracking-widest uppercase text-xs">{t('addFunds')}</span>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, translateY: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDefaultTab('withdraw'); setIsPinModalOpen(true) }}
                  className="w-full relative group py-3 px-5 rounded-full bg-[#ef4444] shadow-[0_0_16px_rgba(239,68,68,0.3)] hover:shadow-[0_0_24px_rgba(239,68,68,0.45)] transition-all duration-300 border border-white/10 overflow-hidden"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <ArrowDown size={16} className="text-white" strokeWidth={3} />
                    <span className="text-white font-black italic tracking-widest uppercase text-xs">{t('withdrawAction')}</span>
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Transaction History ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full"
        >
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a2b0ff]">
                {t('history.title')}
              </h3>

              <div className="flex gap-2">
                {(["all", "income", "expense"] as TxFilter[]).map((f) => {
                  const activeClass: Record<TxFilter, string> = {
                    all:     "bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white",
                    income:  "bg-gradient-to-r from-green-500 to-green-600 text-white",
                    expense: "bg-gradient-to-r from-red-500 to-red-600 text-white",
                  }
                  return (
                    <button
                      key={f}
                      onClick={() => handleFilterChange(f)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        activeFilter === f
                          ? activeClass[f]
                          : "bg-[#0c1033]/80 text-[#a2b0ff] hover:text-white"
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-[#a2b0ff]">
              {t('history.subtitle', { limit: TRANSACTIONS_PER_PAGE })}
            </p>
          </div>

          {/* Loading skeleton */}
          {txLoading && transactions.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#0c1033]/60 rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!txLoading && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="relative mb-4">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#7000ff] to-[#00f0ff] opacity-20 blur-md" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0c1033]/80">
                  <Clock className="h-8 w-8 text-[#00f0ff]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('history.empty')}</h3>
              <p className="text-[#a2b0ff] max-w-xs text-sm">
                {t('history.emptyHint')}
              </p>
            </div>
          )}

          {/* Transaction list */}
          <AnimatePresence mode="popLayout">
            <ul className="space-y-1">
              {transactions.map((tx, index) => (
                <motion.li
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.05 * Math.min(index, 6), duration: 0.25 }}
                  className="relative group"
                >
                  <div className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-40 blur-sm transition-opacity duration-300 ${
                    tx.direction === 'income'
                      ? "bg-gradient-to-r from-green-500 to-[#00f0ff]"
                      : "bg-gradient-to-r from-red-500 to-[#ff00aa]"
                  }`} />
                  <div className="relative flex justify-between items-center bg-black p-3 rounded-xl border border-[#2a2f5e] group-hover:border-transparent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        tx.direction === 'income' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {txIcon(tx)}
                      </div>
                      <div>
                        <span className="font-medium text-white text-sm">{tx.display_description}</span>
                        <p className="text-xs text-[#a2b0ff]">{formatDate(tx.created_at)}</p>
                        {tx.status === 'pending' && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                            {t('history.status.pending')}
                          </span>
                        )}
                        {tx.status === 'failed' && (
                          <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                            {t('history.status.failed')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.direction === 'income' ? "text-green-400" : "text-red-400"}`}>
                      {tx.direction === 'income' ? '+' : '-'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between px-1">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="relative flex h-9 w-9 items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#a2b0ff]" />
                </svg>
              </motion.button>

              <div className="flex items-center gap-[7px]">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                  const isActive = pageNumber === currentPage
                  const isAdjacent = Math.abs(pageNumber - currentPage) === 1
                  return (
                    <motion.button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      animate={{
                        width: isActive ? 28 : isAdjacent ? 8 : 5,
                        opacity: isActive ? 1 : isAdjacent ? 0.55 : 0.25,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className={`h-[5px] rounded-full ${
                        isActive ? "bg-gradient-to-r from-[#7000ff] to-[#00f0ff]" : "bg-white"
                      }`}
                    />
                  )
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="relative flex h-9 w-9 items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#a2b0ff]" />
                </svg>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <WithdrawPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => setIsWalletModalOpen(true)}
        onConfigurePin={async () => {
          setIsPinModalOpen(false)
          setIsPrivacyModalOpen(true)
        }}
      />

      <ChatPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={async () => {
          setIsPrivacyModalOpen(false)
          try {
            const data = await getChatPrivacyStatus()
            if (data.has_pin) setIsPinModalOpen(true)
          } catch { /* ignore */ }
        }}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        balance={balance}
        onAddFunds={handleAddFunds}
        onWithdraw={handleWithdraw}
        defaultTab={defaultTab}
        bankAccounts={bankAccounts || []}
        onOpenBankAccounts={() => {
          setIsWalletModalOpen(false)
          setIsBankAccountModalOpen(true)
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

      <BottomNavbar />
    </div>
  )
}

export default WalletComponent
