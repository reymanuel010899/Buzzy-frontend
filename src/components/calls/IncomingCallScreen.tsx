import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, Clock, Volume2, VolumeX, Video, VideoOff } from "lucide-react";
import { getBaseUrl } from "../../redux/client/api-client";

type CallPayload = {
    uuid: string;
    channel_name: string;
    call_type: "voice" | "video";
    allowed_seconds: number;
    status?: string;
    caller: { id: number; username: string; profile_picture?: string };
};

type Props = {
    call: CallPayload | null;
    callerName: string;
    callerAvatar?: string | null;
    activeTime?: number;
    onAnswer: () => void;
    onReject: () => void;
    isMicMuted?: boolean;
    isSpeakerMuted?: boolean;
    toggleMic?: () => void;
    toggleSpeaker?: () => void;
};

const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function IncomingCallScreen({
    call,
    callerName,
    callerAvatar,
    activeTime = 0,
    onAnswer,
    onReject,
    isMicMuted,
    isSpeakerMuted,
    toggleMic,
    toggleSpeaker
}: Props) {
    const avatarSrc = callerAvatar
        ? callerAvatar.startsWith("http")
            ? callerAvatar
            : `${getBaseUrl()}${callerAvatar.replace(/^\//, "")}`
        : `${getBaseUrl()}media/profile_pics/avatar.webp`;

    const isActive = call?.status === 'active';

    return (
        <AnimatePresence>
            {call && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-3 bg-[#11121d]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {!isActive && (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute -inset-1 rounded-full bg-green-500/30 blur-sm"
                                />
                            )}
                            <img
                                src={avatarSrc}
                                alt={callerName}
                                className={`relative h-12 w-12 rounded-full object-cover border-2 ${isActive ? 'border-blue-500/50' : 'border-green-500/50'}`}
                            />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{callerName}</h3>
                            {isActive ? (
                                <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-medium">
                                    <Clock size={10} className="animate-pulse" />
                                    <span>{formatClock(activeTime)}</span>
                                </div>
                            ) : (
                                <p className="text-[10px] text-green-400 font-medium animate-pulse">
                                    {call.call_type === 'video' ? 'Videollamada entrante...' : 'Llamada entrante...'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isActive && (
                            <>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => toggleSpeaker && toggleSpeaker()}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all shadow-lg ${isSpeakerMuted ? 'bg-red-600/20 text-red-500 border-red-500/30' : 'bg-gray-600/20 text-gray-300 border-gray-500/30 hover:bg-gray-600 hover:text-white'}`}
                                >
                                    {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => toggleMic && toggleMic()}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all shadow-lg ${isMicMuted ? 'bg-red-600/20 text-red-500 border-red-500/30' : 'bg-gray-600/20 text-gray-300 border-gray-500/30 hover:bg-gray-600 hover:text-white'}`}
                                >
                                    {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                                </motion.button>
                            </>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onReject}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all shadow-lg"
                        >
                            {call.call_type === 'video' ? <VideoOff size={18} /> : <PhoneOff size={18} />}
                        </motion.button>

                        {!isActive && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onAnswer}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600/20 text-green-500 border border-green-500/30 hover:bg-green-600 hover:text-white transition-all animate-bounce-subtle shadow-lg shadow-green-500/20"
                            >
                                {call.call_type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                            </motion.button>
                        )}
                    </div>

                    <style>{`
            @keyframes bounce-subtle {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
            .animate-bounce-subtle {
              animation: bounce-subtle 2s infinite ease-in-out;
            }
          `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
