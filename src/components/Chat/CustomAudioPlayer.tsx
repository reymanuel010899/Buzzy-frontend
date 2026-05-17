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
            if (planName === 'FRIEND') return 'bg-cyan-500/20 border-cyan-400/30 text-white shadow-[0_0_10px_rgba(0,240,255,0.1)]';
            if (planName === 'PLUS') return 'bg-purple-600/20 border-purple-500/30 text-white';
            if (planName === 'VIP') return 'bg-amber-400/20 border-amber-500/30 text-white shadow-[0_0_10px_rgba(251,191,36,0.1)]';
            return 'bg-white/10 border-white/5 text-white';
        } else {
            if (planName === 'FRIEND') return 'bg-[#1a1a2e]/90 border-cyan-400/30 text-cyan-50 shadow-[0_0_10px_rgba(0,240,255,0.1)]';
            if (planName === 'PLUS') return 'bg-[#231a2e]/90 border-purple-400/30 text-purple-50 shadow-[0_0_10px_rgba(168,85,247,0.1)]';
            if (planName === 'VIP') return 'bg-[#1f1a10]/90 border-amber-400/30 text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.1)]';
            return 'bg-purple-600/10 border-white/5 text-gray-100 shadow-inner';
        }
    };

    const getBtnColor = () => {
        if (isMe) {
            if (planName === 'FRIEND') return 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]';
            if (planName === 'VIP') return 'bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.3)]';
            return 'bg-white text-purple-700 shadow-lg';
        } else {
            if (planName === 'FRIEND') return 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]';
            if (planName === 'VIP') return 'bg-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]';
            return 'bg-purple-600 text-white shadow-lg';
        }
    };

    return (
        <div className={`flex items-center gap-3 py-2 px-3 rounded-2xl min-w-[220px] backdrop-blur-md border transition-all ${getBgColor()}`}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${getBtnColor()}`}
            >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </motion.button>
            <div className="flex-1 flex flex-col gap-1">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={onSeek}
                    className="custom-audio-progress"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span>{duration ? formatAudioTime(duration) : "0:00"}</span>
                </div>
            </div>
        </div>
    );
};

export default CustomAudioPlayer;
