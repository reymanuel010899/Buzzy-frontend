"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Clapperboard, ImageIcon, Zap, ShoppingCart,
  CheckCircle2, Sparkles, Star, ChevronRight, AlertCircle
} from "lucide-react"
import {
  getAIPackages, createAICheckoutSession,
  type AIPackage, type PurchaseResult,
} from "@/services/aiService"
import { Browser } from '@capacitor/browser'

interface AIRechargeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: PurchaseResult) => void
  onGoToWallet: () => void
}

// Tasa personalizada — debe coincidir con el backend
// 3 videos por dólar | 2 imágenes por dólar (prioridad en videos)
const CUSTOM_VIDEOS_PER_DOLLAR = 3
const CUSTOM_IMAGES_PER_DOLLAR = 2

type Step = 'packages' | 'confirm' | 'processing' | 'success' | 'error'

const AIRechargeModal: React.FC<AIRechargeModalProps> = ({
  isOpen, onClose, onSuccess, onGoToWallet,
}) => {
  const [packages, setPackages] = useState<AIPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AIPackage | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [step, setStep] = useState<Step>('packages')
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [insufficientFunds, setInsufficientFunds] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getAIPackages()
        .then(setPackages)
        .catch(() => setPackages([]))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const handleClose = () => {
    setSelected(null)
    setCustomAmount('')
    setStep('packages')
    setResult(null)
    setErrorMsg('')
    setInsufficientFunds(false)
    onClose()
  }

  const customVideos = customAmount ? Math.floor(Number(customAmount) * CUSTOM_VIDEOS_PER_DOLLAR) : 0
  const customImages = customAmount ? Math.floor(Number(customAmount) * CUSTOM_IMAGES_PER_DOLLAR) : 0
  const customPrice = Number(customAmount) || 0

  const isCustomValid = customPrice >= 0.5

  const handlePurchase = async () => {
    setStep('processing')
    setErrorMsg('')
    setInsufficientFunds(false)
    try {
      const params = selected ? { package_id: selected.id } : { custom_amount: customPrice }
      const { url } = await createAICheckoutSession(params)
      await Browser.open({ url, windowName: '_blank' })
      handleClose()
    } catch (err: any) {
      const data = err?.response?.data
      setErrorMsg(data?.error || 'Error al iniciar el pago.')
      setStep('error')
    }
  }

  const selectedVideos = selected ? selected.videos_count : customVideos
  const selectedImages = selected ? selected.images_count : customImages
  const selectedPrice = selected ? Number(selected.price) : customPrice

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#0a0a12] rounded-t-[32px] overflow-hidden"
            style={{ maxHeight: '88vh' }}
          >
            {/* Glow effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <AnimatePresence mode="wait">

              {/* ─── PACKAGES STEP ─── */}
              {step === 'packages' && (
                <motion.div
                  key="packages"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="px-5 pb-8 overflow-y-auto"
                  style={{ maxHeight: '82vh' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-base leading-tight">Recargar Créditos IA</h2>
                        <p className="text-gray-500 text-xs">Elige un paquete o ingresa tu monto</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
                    >
                      <X size={18} className="text-white/70" />
                    </button>
                  </div>

                  {/* Packages */}
                  {loading ? (
                    <div className="space-y-3 mt-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3 mt-1">
                      {packages.map((pkg) => {
                        const isSelected = selected?.id === pkg.id
                        return (
                          <motion.button
                            key={pkg.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelected(isSelected ? null : pkg)}
                            className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden border ${
                              isSelected
                                ? 'border-amber-400/60 bg-amber-500/10'
                                : 'border-white/8 bg-white/4 hover:border-white/20'
                            }`}
                          >
                            {pkg.is_featured && (
                              <div className="absolute top-0 right-0">
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-bl-xl rounded-tr-2xl">
                                  <Star size={9} className="text-white fill-white" />
                                  <span className="text-white text-[9px] font-bold">POPULAR</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pr-16">
                              <div>
                                <span className="text-white font-bold text-sm">{pkg.name}</span>
                                {pkg.description && (
                                  <p className="text-gray-500 text-[10px] mt-0.5">{pkg.description}</p>
                                )}
                              </div>
                              <span className="text-white font-bold text-lg">${pkg.price}</span>
                            </div>

                            <div className="flex items-center gap-4 mt-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                  <Clapperboard size={11} className="text-cyan-400" />
                                </div>
                                <span className="text-cyan-300 text-xs font-semibold">{pkg.videos_count} videos</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                  <ImageIcon size={11} className="text-pink-400" />
                                </div>
                                <span className="text-pink-300 text-xs font-semibold">{pkg.images_count} imágenes</span>
                              </div>
                            </div>

                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"
                              >
                                <CheckCircle2 size={12} className="text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  )}

                  {/* Custom amount */}
                  <div className={`mt-3 p-4 rounded-2xl border transition-all ${
                    !selected && customPrice > 0
                      ? 'border-purple-400/50 bg-purple-500/8'
                      : 'border-white/8 bg-white/4'
                  }`}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                        <Sparkles size={14} className="text-purple-400" />
                      </div>
                      <div>
                        <span className="text-white text-sm font-semibold">Cantidad personalizada</span>
                        <p className="text-gray-500 text-[10px]">
                          $0.33 video · $0.50 imagen
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                      <input
                        type="number"
                        min="0.50"
                        step="0.50"
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelected(null) }}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 text-white text-sm outline-none transition-all placeholder-gray-600"
                      />
                    </div>

                    {customPrice >= 0.5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 mt-2.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clapperboard size={11} className="text-cyan-400" />
                          <span className="text-cyan-300 text-xs font-semibold">{customVideos} videos</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon size={11} className="text-pink-400" />
                          <span className="text-pink-300 text-xs font-semibold">{customImages} imágenes</span>
                        </div>
                        <span className="text-gray-500 text-xs ml-auto">Precio: ${customPrice.toFixed(2)}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Buy button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => (selected || isCustomValid) && setStep('confirm')}
                    disabled={!selected && !isCustomValid}
                    className={`w-full mt-4 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      selected || isCustomValid
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : 'bg-white/8 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart size={16} />
                    <span>Continuar</span>
                    {(selected || isCustomValid) && <ChevronRight size={16} />}
                  </motion.button>

                  {/* Secure payment note */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Zap size={12} className="text-gray-600" />
                    <span className="text-gray-600 text-[10px]">Pago seguro con Stripe · Tarjeta de crédito o débito</span>
                  </div>
                </motion.div>
              )}

              {/* ─── CONFIRM STEP ─── */}
              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="px-5 pb-8"
                >
                  <div className="flex items-center justify-between py-4">
                    <button
                      onClick={() => setStep('packages')}
                      className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
                    >
                      <ChevronRight size={18} className="text-white rotate-180" />
                    </button>
                    <h2 className="text-white font-bold">Confirmar compra</h2>
                    <div className="w-9" />
                  </div>

                  {/* Summary */}
                  <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-4 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Paquete</span>
                      <span className="text-white font-semibold text-sm">{selected?.name ?? 'Personalizado'}</span>
                    </div>
                    <div className="h-px bg-white/8" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clapperboard size={14} className="text-cyan-400" />
                        <span className="text-gray-400 text-sm">Videos</span>
                      </div>
                      <span className="text-cyan-300 font-bold">+{selectedVideos}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-pink-400" />
                        <span className="text-gray-400 text-sm">Imágenes</span>
                      </div>
                      <span className="text-pink-300 font-bold">+{selectedImages}</span>
                    </div>
                    <div className="h-px bg-white/8" />
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">Total</span>
                      <span className="text-white font-bold text-xl">${selectedPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 px-1">
                    <Zap size={12} className="text-amber-400 flex-shrink-0" />
                    <span className="text-gray-500 text-xs">Serás redirigido a Stripe para completar el pago</span>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePurchase}
                    className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} />
                    Pagar ${selectedPrice.toFixed(2)} con Stripe
                  </motion.button>
                </motion.div>
              )}

              {/* ─── PROCESSING ─── */}
              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 px-5 gap-6"
                >
                  <div className="relative w-24 h-24">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-amber-500/40"
                        animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
                      />
                    ))}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={28} className="text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Procesando pago...</p>
                    <p className="text-gray-500 text-sm mt-1">Estamos recargando tus créditos</p>
                  </div>
                </motion.div>
              )}

              {/* ─── SUCCESS ─── */}
              {step === 'success' && result && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-10 px-5 gap-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                  >
                    <CheckCircle2 size={40} className="text-white" />
                  </motion.div>

                  <div className="text-center">
                    <h3 className="text-white font-bold text-xl">¡Recarga exitosa!</h3>
                    <p className="text-gray-400 text-sm mt-1">{result.message}</p>
                  </div>

                  {/* New credits */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                      <Clapperboard size={18} className="text-cyan-400 mx-auto mb-1.5" />
                      <span className="text-white font-bold text-2xl">{result.video_credits}</span>
                      <p className="text-cyan-400/70 text-[10px] mt-0.5">Videos disponibles</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-center">
                      <ImageIcon size={18} className="text-pink-400 mx-auto mb-1.5" />
                      <span className="text-white font-bold text-2xl">{result.image_credits}</span>
                      <p className="text-pink-400/70 text-[10px] mt-0.5">Imágenes disponibles</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
                    <Wallet size={12} className="text-gray-400" />
                    <span className="text-gray-400 text-xs">Saldo wallet: <span className="text-white font-semibold">${result.wallet_balance}</span></span>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold shadow-lg shadow-cyan-500/20"
                  >
                    Listo, a crear
                  </button>
                </motion.div>
              )}

              {/* ─── ERROR ─── */}
              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-10 px-5 gap-5"
                >
                  <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <AlertCircle size={40} className="text-red-400" />
                  </div>

                  <div className="text-center">
                    <h3 className="text-white font-bold text-lg">
                      {insufficientFunds ? 'Saldo insuficiente' : 'Error en la compra'}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{errorMsg}</p>
                  </div>

                  <div className="w-full space-y-2.5">
                    {insufficientFunds && (
                      <button
                        onClick={() => { handleClose(); onGoToWallet() }}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <Wallet size={16} />
                        Ir a recargar wallet
                      </button>
                    )}
                    <button
                      onClick={() => setStep('packages')}
                      className="w-full py-3 rounded-2xl bg-white/8 text-white font-medium"
                    >
                      {insufficientFunds ? 'Elegir otro paquete' : 'Intentar de nuevo'}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AIRechargeModal
