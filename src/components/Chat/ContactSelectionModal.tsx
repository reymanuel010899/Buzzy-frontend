import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Send, User } from "lucide-react";
import { getBaseUrl } from "../../redux/client/api-client";

interface ContactSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: any[];
    onSelect: (contact: any) => void;
}

const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({
    isOpen,
    onClose,
    contacts,
    onSelect
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredContacts = contacts.filter(c =>
        c.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-[#1a1a2e] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Compartir contacto</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar seguidores..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
                                {filteredContacts.length > 0 ? (
                                    filteredContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => onSelect(contact)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors group"
                                        >
                                            <img
                                                src={contact.profile_picture?.startsWith('http') ? contact.profile_picture : `${getBaseUrl()}${contact.profile_picture}`}
                                                alt={contact.username}
                                                className="w-12 h-12 rounded-full object-cover border border-white/10"
                                            />
                                            <div className="flex-1 text-left">
                                                <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">@{contact.username}</p>
                                                <p className="text-xs text-gray-500">{contact.email}</p>
                                            </div>
                                            <Send className="w-5 h-5 text-gray-600 group-hover:text-purple-500 transition-colors" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-gray-500">
                                        <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No se encontraron contactos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ContactSelectionModal;
