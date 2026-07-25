import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

const formatAudioTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

interface CustomAudioPlayerProps {
    src: string;
    isMe: boolean;
    planName?: string;
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src, isMe, planName }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const onTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const onLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const getBgColor = () => {
        if (isMe) {
            if (planName === 'FRIEND') return 'bg-gradient-to-br from-cyan-500/25 to-cyan-600/15 border-cyan-400/40 text-cyan-50 shadow-[0_0_15px_rgba(0,240,255,0.15)]';
            if (planName === 'PLUS') return 'bg-gradient-to-br from-purple-600/25 to-purple-700/15 border-purple-500/40 text-purple-50 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
            if (planName === 'VIP') return 'bg-gradient-to-br from-amber-400/25 to-amber-600/15 border-amber-500/40 text-amber-50 shadow-[0_0_15px_rgba(251,191,36,0.15)]';
            return 'bg-gradient-to-br from-white/15 to-white/5 border-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]';
        } else {
            if (planName === 'FRIEND') return 'bg-gradient-to-br from-cyan-950/40 to-cyan-900/20 border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(0,240,255,0.1)]';
            if (planName === 'PLUS') return 'bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-purple-500/30 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
            if (planName === 'VIP') return 'bg-gradient-to-br from-amber-950/40 to-amber-900/20 border-amber-500/30 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.1)]';
            return 'bg-gradient-to-br from-purple-950/20 to-purple-900/10 border-white/10 text-gray-200 shadow-[0_0_10px_rgba(147,51,234,0.05)]';
        }
    };

    const getBtnColor = () => {
        if (isMe) {
            if (planName === 'FRIEND') return 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:shadow-[0_0_16px_rgba(0,240,255,0.5)]';
            if (planName === 'PLUS') return 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:shadow-[0_0_16px_rgba(168,85,247,0.5)]';
            if (planName === 'VIP') return 'bg-amber-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.4)] hover:shadow-[0_0_16px_rgba(251,191,36,0.5)]';
            return 'bg-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]';
        } else {
            if (planName === 'FRIEND') return 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:shadow-[0_0_16px_rgba(0,240,255,0.5)]';
            if (planName === 'PLUS') return 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:shadow-[0_0_16px_rgba(168,85,247,0.5)]';
            if (planName === 'VIP') return 'bg-amber-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.4)] hover:shadow-[0_0_16px_rgba(251,191,36,0.5)]';
            return 'bg-purple-600/30 text-white shadow-[0_0_10px_rgba(147,51,234,0.2)]';
        }
    };

    const getProgressColor = () => {
        if (planName === 'FRIEND') return 'from-cyan-500 to-cyan-400';
        if (planName === 'PLUS') return 'from-purple-600 to-purple-500';
        if (planName === 'VIP') return 'from-amber-500 to-amber-400';
        return 'from-white/40 to-white/20';
    };

    return (
        <div className={`flex items-center gap-3 py-3 px-4 rounded-[18px] min-w-60 backdrop-blur-xl border transition-all ${getBgColor()}`}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <motion.button
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                onClick={togglePlay}
                className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${getBtnColor()}`}
            >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </motion.button>
            <div className="flex-1 flex flex-col gap-2">
                <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                        className={`absolute inset-y-0 left-0 bg-linear-to-r ${getProgressColor()} transition-all rounded-full shadow-lg`}
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={onSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ WebkitAppearance: 'none' }}
                    />
                </div>
                <div className="flex justify-between text-xs font-medium tracking-tight">
                    <span className="opacity-80">{formatAudioTime(currentTime)}</span>
                    <span className="opacity-60">{duration ? formatAudioTime(duration) : "0:00"}</span>
                </div>
            </div>
        </div>
    );
};

export default CustomAudioPlayer;
