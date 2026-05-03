import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Check, Loader2, Video, AtSign, Pencil, User } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../../redux/actions/updateProfile';
import { getMediaUrl } from '../../redux/client/api-client';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void;
    user: any;
}

const Field = ({
    icon, label, name, value, onChange, hint, type = 'input', maxLength,
}: {
    icon: React.ReactNode;
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    hint?: string;
    type?: 'input' | 'textarea';
    maxLength?: number;
}) => (
    <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-widest">
            <span className="text-[#7000ff]">{icon}</span>
            {label}
        </div>
        <div className="relative">
            {type === 'textarea' ? (
                <>
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        rows={3}
                        maxLength={maxLength}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7000ff]/60 focus:bg-white/[0.07] transition-all resize-none"
                        placeholder={`Tu ${label.toLowerCase()}...`}
                    />
                    {maxLength && (
                        <span className="absolute bottom-2.5 right-3 text-[10px] text-white/20">
                            {value.length} / {maxLength}
                        </span>
                    )}
                </>
            ) : (
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    autoComplete={name === 'username' ? 'username' : 'off'}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#7000ff]/60 focus:bg-white/[0.07] transition-all"
                    placeholder={`Tu ${label.toLowerCase()}...`}
                />
            )}
        </div>
        {hint && <p className="text-[11px] text-white/25 pl-1">{hint}</p>}
    </div>
);

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSaveSuccess, user }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        bio: user?.bio || ''
    });
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profileVideo, setProfileVideo] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(getMediaUrl(user?.profile_picture));
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(getMediaUrl(user?.profile_video));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                username: user.username || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                bio: user.bio || ''
            });
            setPreviewUrl(getMediaUrl(user.profile_picture));
            setVideoPreviewUrl(getMediaUrl(user.profile_video));
            setProfilePicture(null);
            setProfileVideo(null);
            setError(null);
        }
    }, [isOpen, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const normalizedValue = name === 'username'
            ? value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._]/g, '')
            : value;
        setFormData({ ...formData, [name]: normalizedValue });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
            setProfileVideo(null);
            setVideoPreviewUrl(null);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 3.5) {
                    setError("El video de perfil no puede exceder los 3 segundos.");
                    return;
                }
                setProfileVideo(file);
                setVideoPreviewUrl(URL.createObjectURL(file));
                setProfilePicture(null);
                setPreviewUrl(null);
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
        if (profilePicture) data.append('profile_picture', profilePicture);
        if (profileVideo) data.append('profile_video', profileVideo);

        const result: any = await dispatch(updateProfile(data) as any);
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            const nextUsername = result?.data?.user?.username || formData.username;
            setTimeout(() => {
                setSuccess(false);
                onClose();
                onSaveSuccess?.();
                if (nextUsername && nextUsername !== user?.username) {
                    navigate(`/profile/${nextUsername}`);
                }
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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-md bg-[#0a0a14] border border-white/8 rounded-3xl shadow-[0_0_60px_rgba(112,0,255,0.15)] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* top glow line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-[#7000ff]/60 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#7000ff]/15 flex items-center justify-center">
                                    <Pencil size={16} className="text-[#7000ff]" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white leading-tight">Editar Perfil</h2>
                                    <p className="text-[11px] text-white/30">Actualiza tu información</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={15} className="text-white/50" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-5 max-h-[80vh] overflow-y-auto">

                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative p-1">
                                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#7000ff] to-[#00f0ff] blur-lg opacity-30" />
                                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#7000ff]/50 bg-zinc-900 shadow-xl">
                                        {videoPreviewUrl ? (
                                            <video src={videoPreviewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                        ) : previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User size={36} className="text-white/20" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full">
                                    <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors">
                                        <div className="w-9 h-9 rounded-xl bg-[#00f0ff]/10 flex items-center justify-center shrink-0">
                                            <Camera size={18} className="text-[#00f0ff]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Subir Foto</span>
                                            <span className="text-[11px] text-white/30">JPG, PNG</span>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                    </label>
                                    <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors">
                                        <div className="w-9 h-9 rounded-xl bg-[#7000ff]/10 flex items-center justify-center shrink-0">
                                            <Video size={18} className="text-[#7000ff]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Subir Video</span>
                                            <span className="text-[11px] text-white/30">Máx. 3s</span>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleVideoChange} accept="video/*" />
                                    </label>
                                </div>
                            </div>

                            {/* divider */}
                            <div className="h-px bg-white/5" />

                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    icon={<User size={11} />}
                                    label="Nombre"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    maxLength={30}
                                />
                                <Field
                                    icon={<User size={11} />}
                                    label="Apellido"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    maxLength={30}
                                />
                            </div>

                            <Field
                                icon={<AtSign size={11} />}
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                hint="Solo letras, números, punto y guion bajo."
                                maxLength={30}
                            />

                            <Field
                                icon={<Pencil size={11} />}
                                label="Bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                type="textarea"
                                maxLength={150}
                            />

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || success}
                                className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                                    success
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'bg-[#0d0d1a] border-t-white/10 border-l-white/10 border-r-white/10 border-b-[#7000ff]/70 text-white hover:bg-white/5 active:scale-[0.98]'
                                }`}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : success ? (
                                    <>
                                        <Check size={18} />
                                        Guardado
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;
