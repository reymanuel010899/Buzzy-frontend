import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, UserPlus, UserCheck, Loader2, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { getFollowers, getFollowing, getSubscribers, getSuggestions } from '../../redux/actions/socialConnections';
import { createFollower } from '../../redux/actions/createFollower';
import { getBaseUrl } from '../../redux/client/api-client';
import { useNavigate } from 'react-router-dom';

interface SocialConnectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    initialTab?: 'followers' | 'following' | 'subscribers';
}

const SocialConnectionsModal: React.FC<SocialConnectionsModalProps> = ({
    isOpen,
    onClose,
    username,
    initialTab = 'followers'
}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector((state: any) => state.LoginReducer.user);
    const isOwner = currentUser?.username === username;

    const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'subscribers' | 'suggestions'>(
        initialTab === 'subscribers' && !isOwner ? 'suggestions' : initialTab as any
    );

    // Redux selectors for social connections
    const socialData = useSelector((state: any) => state.socialConnections);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Derive list from Redux store based on activeTab and username
    const getListFromStore = () => {
        if (!username) return [];
        switch (activeTab) {
            case 'followers': return socialData.followers[username] || [];
            case 'following': return socialData.following[username] || [];
            case 'subscribers': return socialData.subscribers[username] || [];
            case 'suggestions': return socialData.suggestions[username] || [];
            default: return [];
        }
    };

    const list = getListFromStore();

    const fetchData = useCallback(async () => {
        const currentData = getListFromStore();
        // Only show loader if we don't have data cached
        if (currentData.length === 0) {
            setLoading(true);
        }

        if (activeTab === 'followers') {
            await dispatch(getFollowers(username) as any);
        } else if (activeTab === 'following') {
            await dispatch(getFollowing(username) as any);
        } else if (activeTab === 'subscribers') {
            await dispatch(getSubscribers(username) as any);
        } else if (activeTab === 'suggestions') {
            await dispatch(getSuggestions(username) as any);
        }
        setLoading(false);
    }, [activeTab, username, dispatch, socialData]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    const handleFollowToggle = async (targetUserId: string) => {
        await dispatch(createFollower({ follower_user_id: targetUserId }) as any);
        // The Redux reducer now handles updating the is_following status in the cached lists
    };

    const getMediaUrl = (path: string | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${getBaseUrl()}${path}`;
    };

    const filteredList = list.filter((item: any) => {
        const user = item.user;
        return user?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleUserClick = (targetUsername: string) => {
        onClose();
        navigate(`/profile/${targetUsername}`);
    };

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
                        className="bg-[#0c0e1a] border border-white/10 rounded-3xl w-full max-w-md h-[600px] flex flex-col overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-xl font-bold text-white tracking-tight">Social</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-4 py-2 gap-2 border-b border-white/5 bg-white/[0.02]">
                            {[
                                { id: 'followers', label: 'Seguidores' },
                                { id: 'following', label: 'Seguidos' },
                                isOwner
                                    ? { id: 'subscribers', label: 'Suscriptores' }
                                    : { id: 'suggestions', label: 'Sugerencias' }
                            ].map((tab: any) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-[#7000ff]/20 to-[#00f0ff]/20 text-white border border-[#7000ff]/30 shadow-[0_0_15px_rgba(112,0,255,0.1)]'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#7000ff]/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                                    <Loader2 className="animate-spin text-[#7000ff]" size={32} />
                                    <span className="text-sm">Cargando lista...</span>
                                </div>
                            ) : filteredList.length > 0 ? (
                                <div className="space-y-1 pb-4">
                                    {filteredList.map((item: any) => (
                                        <div
                                            key={item.user.id}
                                            className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
                                            onClick={() => handleUserClick(item.user.username)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-zinc-900 group-hover:border-[#7000ff]/30 transition-colors">
                                                    {item.user.profile_picture ? (
                                                        <img
                                                            src={getMediaUrl(item.user.profile_picture) || ''}
                                                            alt={item.user.username}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User size={20} className="text-gray-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-semibold text-sm group-hover:text-[#00f0ff] transition-colors">
                                                        {item.user.username}
                                                    </span>
                                                    {activeTab === 'subscribers' && item.plan_name && (
                                                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#7000ff]">
                                                            Plan {item.plan_name}
                                                        </span>
                                                    )}
                                                    {activeTab === 'suggestions' && item.score && (
                                                        <span className="text-[10px] uppercase font-medium tracking-tight text-white/40">
                                                            Sugerencia relevante
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {currentUser?.id !== item.user.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFollowToggle(item.user.id.toString());
                                                    }}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 ${item.is_following
                                                        ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                        : 'bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white shadow-lg shadow-[#7000ff]/20 hover:scale-105 active:scale-95'
                                                        }`}
                                                >
                                                    {item.is_following ? (
                                                        <>
                                                            <UserCheck size={14} />
                                                            <span>Siguiendo</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus size={14} />
                                                            <span>Seguir</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 opacity-60">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                        <Search size={32} />
                                    </div>
                                    <p className="text-sm">No se encontraron resultados</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SocialConnectionsModal;
