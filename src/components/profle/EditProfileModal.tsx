import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Camera, Check, Loader2, Video } from 'lucide-react';
import { Button } from '../ui/button';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../../redux/actions/updateProfile';
import { getBaseUrl } from '../../redux/client/api-client';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        bio: user?.bio || ''
    });
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profileVideo, setProfileVideo] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profile_picture ? `${getBaseUrl()}${user.profile_picture}` : null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(user?.profile_video ? `${getBaseUrl()}${user.profile_video}` : null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };
    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validar duración del video (máximo 3 segundos)
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 3.5) { // Un pequeño margen
                    setError("El video de perfil no puede exceder los 3 segundos.");
                    return;
                }
                setProfileVideo(file);
                setVideoPreviewUrl(URL.createObjectURL(file));
                setError(null);
            };
            video.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        data.append('username', formData.username);
        data.append('first_name', formData.first_name);
        data.append('last_name', formData.last_name);
        data.append('bio', formData.bio);
        if (profilePicture) {
            data.append('profile_picture', profilePicture);
        }
        if (profileVideo) {
            data.append('profile_video', profileVideo);
        }

        const result: any = await dispatch(updateProfile(data) as any);
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } else {
            setError(result.error);
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
                        className="bg-[#0c0e1a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Profile MediaType Upload (Combined) */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-[#7000ff]/50 bg-zinc-900 shadow-xl">
                                    {videoPreviewUrl ? (
                                        <video src={videoPreviewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                    ) : previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={50} className="text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 cursor-pointer transition-colors cursor-pointer text-sm text-gray-300">
                                        <Camera size={16} className="text-[#00f0ff]" />
                                        <span>Subir Foto</span>
                                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                    </label>
                                    <label className="flex items-center gap-2 px-2 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 cursor-pointer transition-colors cursor-pointer text-sm text-gray-300">
                                        <Video size={16} className="text-[#7000ff]" />
                                        <span>Subir Video <span className="text-[10px] text-gray-500">(máx 3s)</span></span>
                                        <input type="file" className="hidden" onChange={handleVideoChange} accept="video/*" />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Nombre</label>
                                    <input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7000ff]/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Apellido</label>
                                    <input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7000ff]/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Username</label>
                                <input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7000ff]/50 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7000ff]/50 transition-colors resize-none"
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                            <Button
                                type="submit"
                                disabled={loading || success}
                                className={`w-full h-12 rounded-xl font-bold transition-all ${success ? 'bg-green-500 hover:bg-green-500' : 'bg-gradient-to-r from-[#7000ff] to-[#00f0ff] hover:opacity-90'
                                    }`}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : success ? <Check /> : 'Guardar Cambios'}
                            </Button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;
