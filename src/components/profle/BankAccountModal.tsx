import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Plus, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { getBankAccounts, addBankAccount, deleteBankAccount } from '../../redux/actions/bankActions';
import { RootState } from '../../store';

interface BankAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BankAccountModal: React.FC<BankAccountModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { accounts, loading, error } = useSelector((state: RootState) => state.bankReducer);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        routing_number: ''
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            dispatch(getBankAccounts() as any);
        }
    }, [isOpen, dispatch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setLocalError(null);

        const success = await dispatch(addBankAccount(formData) as any);
        setActionLoading(false);

        if (success) {
            setShowAddForm(false);
            setFormData({ bank_name: '', account_holder_name: '', account_number: '', routing_number: '' });
        } else {
            setLocalError("Error al agregar la cuenta. Verifica los datos.");
        }
    };

    const handleDeleteAccount = async (id: number) => {
        if (!window.confirm("¿Estás seguro de eliminar esta cuenta?")) return;

        setActionLoading(true);
        setLocalError(null);
        const success = await dispatch(deleteBankAccount(id) as any);
        setActionLoading(false);

        if (!success) {
            setLocalError("No puedes eliminar tu única cuenta bancaria.");
            setTimeout(() => setLocalError(null), 3000);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        className="bg-[#0c0e1a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Cuentas Bancarias</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {localError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    <AlertCircle size={16} />
                                    <span>{localError}</span>
                                </div>
                            )}

                            {showAddForm ? (
                                <form onSubmit={handleAddAccount} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Banco</label>
                                        <input
                                            name="bank_name"
                                            value={formData.bank_name}
                                            onChange={handleInputChange}
                                            placeholder="Ej: Banco Popular"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f0ff]/50 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre del Titular</label>
                                        <input
                                            name="account_holder_name"
                                            value={formData.account_holder_name}
                                            onChange={handleInputChange}
                                            placeholder="Nombre completo"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f0ff]/50 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Número de Cuenta / IBAN</label>
                                        <input
                                            name="account_number"
                                            value={formData.account_number}
                                            onChange={handleInputChange}
                                            placeholder="Ingresa los dígitos"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f0ff]/50 transition-colors"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex-1 rounded-xl text-gray-400 hover:text-white"
                                            onClick={() => setShowAddForm(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={actionLoading}
                                            className="flex-1 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] rounded-xl font-bold"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {accounts.length === 0 && !loading && (
                                            <div className="text-center py-8">
                                                <CreditCard className="mx-auto text-gray-700 mb-3" size={48} />
                                                <p className="text-gray-500">No tienes cuentas agregadas</p>
                                            </div>
                                        )}
                                        {accounts.map((acc: any) => (
                                            <div key={acc.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff]">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{acc.bank_name}</p>
                                                        <p className="text-xs text-gray-400 font-mono tracking-widest">{acc.masked_number}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {acc.is_primary && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">PRINCIPAL</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteAccount(acc.id)}
                                                        disabled={actionLoading}
                                                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 hover:bg-white/10 hover:border-white/40 text-white rounded-2xl py-6 transition-all"
                                    >
                                        <Plus size={20} />
                                        <span className="font-bold uppercase tracking-wider text-xs">Agregar Cuenta</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BankAccountModal;
