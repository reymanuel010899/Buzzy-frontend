import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, ShieldCheck, Landmark, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number | string;
    onAddFunds: (amount: number) => void;
    onWithdraw: (amount: number, bankAccountId?: string | number) => void;
    defaultTab?: 'deposit' | 'withdraw';
    bankAccounts: any[];
    onOpenBankAccounts: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, balance, onAddFunds, onWithdraw, defaultTab = 'deposit', bankAccounts, onOpenBankAccounts }) => {
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(defaultTab);

    React.useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);
    const [amount, setAmount] = useState<string>('');
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | number | undefined>(
        bankAccounts?.find(a => a.is_primary)?.id || bankAccounts?.[0]?.id
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedBankAccountId && bankAccounts?.length > 0) {
            const primary = bankAccounts.find(a => a.is_primary);
            setSelectedBankAccountId(primary ? primary.id : bankAccounts[0].id);
        }
    }, [bankAccounts, selectedBankAccountId]);

    const handleAddFunds = (amt?: number) => {
        const value = amt || parseFloat(amount);
        if (value > 0) {
            setLoading(true);
            onAddFunds(value);
        }
    };

    const handleWithdraw = async () => {
        const value = parseFloat(amount);
        if (value > 0 && value <= parseFloat(balance.toString())) {
            if (!selectedBankAccountId) return;
            setLoading(true);
            try {
                await onWithdraw(value, selectedBankAccountId);
            } finally {
                // If modal is commanded to close, component will unmount anyway.
                // If it fails, we need spinner to stop.
                setLoading(false);
            }
        }
    };

    const presets = [10, 20, 50, 100];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl z-10"
                    >
                        {/* Background Orbs */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 z-20 group"
                        >
                            <X size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>

                        <div className="p-8 md:p-10">
                            {/* Header / Balance Card */}
                            <div className="mb-8">
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-br from-blue-600/20 to-emerald-600/10 border border-white/10 rounded-3xl p-6 relative overflow-hidden group transition-all"
                                >
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Tu Balance Total</p>
                                            <h3 className="text-4xl font-black italic text-white tracking-tighter">
                                                ${parseFloat(balance.toString()).toFixed(2)}
                                            </h3>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                            <Wallet className="text-emerald-400" size={28} />
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 blur-3xl rounded-full" />
                                </motion.div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-8">
                                <button
                                    onClick={() => { setActiveTab('deposit'); setAmount(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'deposit' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <ArrowDownLeft size={14} /> Depositar
                                </button>
                                <button
                                    onClick={() => { setActiveTab('withdraw'); setAmount(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdraw' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <ArrowUpRight size={14} /> Retirar
                                </button>
                            </div>

                            {/* Forms */}
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                {activeTab === 'deposit' ? (
                                    <>
                                        <div className="grid grid-cols-4 gap-2">
                                            {presets.map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => handleAddFunds(p)}
                                                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                                                >
                                                    ${p}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-4">Monto Personalizado</label>
                                            <div className="relative">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                                    <DollarSign size={18} className="text-blue-400" />
                                                </div>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white font-black text-lg focus:outline-none focus:border-blue-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleAddFunds()}
                                            disabled={loading || !amount}
                                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black italic uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Continuar a Pago <ChevronRight size={16} />
                                                </>
                                            )}
                                        </motion.button>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-4">Monto a Retirar</label>
                                                <div className="relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                                        <DollarSign size={18} className="text-emerald-400" />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white font-black text-lg focus:outline-none focus:border-emerald-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-4">Cuenta de Destino</label>
                                                {bankAccounts && bankAccounts.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {bankAccounts.map((acc) => (
                                                            <div
                                                                key={acc.id}
                                                                onClick={() => setSelectedBankAccountId(acc.id)}
                                                                className={`relative group cursor-pointer p-4 rounded-2xl border transition-all ${selectedBankAccountId === acc.id
                                                                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedBankAccountId === acc.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                                            <Landmark size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-white">{acc.bank_name}</p>
                                                                            <p className="text-[10px] text-gray-500 font-mono tracking-widest">{acc.masked_account_number || acc.masked_number}</p>
                                                                        </div>
                                                                    </div>
                                                                    {selectedBankAccountId === acc.id && (
                                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                                                            <Check size={12} className="text-white" />
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-red-500/5 border border-dashed border-red-500/20 rounded-2xl text-center space-y-4">
                                                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
                                                            <AlertCircle size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white uppercase tracking-wider">No hay cuenta configurada</p>
                                                            <p className="text-[10px] text-gray-500 mt-1">Debes agregar una cuenta bancaria antes de retirar.</p>
                                                        </div>
                                                        <button
                                                            onClick={onOpenBankAccounts}
                                                            className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all"
                                                        >
                                                            Configurar Cuenta
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleWithdraw}
                                            disabled={loading || !amount || parseFloat(amount) > parseFloat(balance.toString()) || !selectedBankAccountId}
                                            className="w-full py-5 rounded-2xl bg-white text-black font-black italic uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Solicitar Retiro <ArrowUpRight size={16} />
                                                </>
                                            )}
                                        </motion.button>
                                    </>
                                )}
                            </motion.div>

                            {/* Footer / Safety Info */}
                            <div className="mt-8 flex items-center justify-center gap-4 py-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-gray-500" />
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Seguridad Stripe</span>
                                </div>
                                <div className="w-1 h-1 bg-white/10 rounded-full" />
                                <div className="flex items-center gap-2">
                                    <Landmark size={14} className="text-gray-500" />
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Retiros en 24-48h</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WalletModal;
