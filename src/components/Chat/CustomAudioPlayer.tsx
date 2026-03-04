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
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src, isMe }) => {
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

    return (
        <div className={`flex items-center gap-3 py-2 px-3 rounded-2xl min-w-[220px] ${isMe ? 'bg-white/10' : 'bg-purple-600/10'} backdrop-blur-md border border-white/5`}>
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
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'} shadow-lg`}
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
