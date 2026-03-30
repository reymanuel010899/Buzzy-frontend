import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Minimize2, PhoneOff, Video, VideoOff, Volume2, VolumeX, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getBaseUrl } from "../../redux/client/api-client";
import { IAgoraRTCRemoteUser, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import AgoraVideoPlayer from "./AgoraVideoPlayer";

type CallPayload = {
  uuid: string;
  channel_name: string;
  call_type: "voice" | "video";
  allowed_seconds: number;
  status?: string;
  caller: { id: number; username: string };
  callee: { id: number; username: string };
};

type Props = {
  call: CallPayload | null;
  displayName: string;
  avatar?: string | null;
  localAvatar?: string | null;
  onHangUp: (reason?: string, consumedSeconds?: number) => void;
  isMinimized?: boolean;
  setIsMinimized?: (minimized: boolean) => void;
  isMicMuted?: boolean;
  isSpeakerMuted?: boolean;
  isCameraOn?: boolean;
  toggleMic?: () => void;
  toggleSpeaker?: () => void;
  toggleCamera?: () => void;
  localVideoTrack?: ICameraVideoTrack | null;
  remoteUsers?: IAgoraRTCRemoteUser[];
};

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function OutgoingCallScreen({
  call,
  displayName,
  avatar,
  localAvatar,
  onHangUp,
  isMinimized,
  setIsMinimized,
  isMicMuted,
  isSpeakerMuted,
  isCameraOn,
  toggleMic,
  toggleSpeaker,
  toggleCamera,
  localVideoTrack,
  remoteUsers
}: Props) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [consumedSeconds, setConsumedSeconds] = useState(0);
  const [ringingSeconds, setRingingSeconds] = useState(0);

  // Refs to avoid stale closures inside intervals
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onHangUpRef = useRef(onHangUp);
  onHangUpRef.current = onHangUp;
  const initCallIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);

  const clearAllTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (ringingTimerRef.current) { clearInterval(ringingTimerRef.current); ringingTimerRef.current = null; }
  };

  // Initialize state when a new call starts
  useEffect(() => {
    if (!call) {
      clearAllTimers();
      setRemainingSeconds(null);
      setRingingSeconds(0);
      setConsumedSeconds(0);
      initCallIdRef.current = null;
      isActiveRef.current = false;
      return;
    }

    if (initCallIdRef.current !== call.uuid) {
      clearAllTimers();
      initCallIdRef.current = call.uuid;
      setRemainingSeconds(call.allowed_seconds);
      setRingingSeconds(0);
      setConsumedSeconds(0);
      isActiveRef.current = false;
    }
  }, [call?.uuid]);

  // Ringing timer — runs when NOT active yet
  useEffect(() => {
    if (!call || call.status === 'active') {
      if (ringingTimerRef.current) { clearInterval(ringingTimerRef.current); ringingTimerRef.current = null; }
      return;
    }

    ringingTimerRef.current = setInterval(() => {
      setRingingSeconds(prev => {
        const next = prev + 1;
        if (next >= 35) {
          clearInterval(ringingTimerRef.current!);
          ringingTimerRef.current = null;
          onHangUpRef.current("no_answer", 0);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (ringingTimerRef.current) { clearInterval(ringingTimerRef.current); ringingTimerRef.current = null; }
    };
  }, [call?.uuid, call?.status]);

  // Active call countdown — starts ONLY when status becomes 'active'
  useEffect(() => {
    if (!call || call.status !== 'active') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    if (isActiveRef.current) return; // Already started
    isActiveRef.current = true;

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          onHangUpRef.current("expired", call.allowed_seconds);
          return 0;
        }
        const next = prev - 1;
        setConsumedSeconds(call.allowed_seconds - next);
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [call?.status, call?.uuid]);

  // Cleanup on unmount
  useEffect(() => () => clearAllTimers(), []);

  const isCallActive = call?.status === 'active';
  const isVideoCall = call?.call_type === 'video';

  const remoteUserWithVideo = remoteUsers?.find((u) => u.hasVideo);
  const remoteVideoTrack = remoteUserWithVideo?.videoTrack;

  const avatarSrc = avatar
    ? avatar.startsWith("http") ? avatar : `${getBaseUrl()}${avatar.replace(/^\//, "")}`
    : `${getBaseUrl()}media/profile_pics/avatar.webp`;

  const localAvatarSrc = localAvatar
    ? localAvatar.startsWith("http") ? localAvatar : `${getBaseUrl()}${localAvatar.replace(/^\//, "")}`
    : `${getBaseUrl()}media/profile_pics/avatar.webp`;

  // Only show the centered avatar view if it's NOT an active video call
  // Or if we decide to show avatars as fallbacks, the background will handle it in the video layout
  const showVideoLayout = isCallActive && isVideoCall;

  return (
    <AnimatePresence>
      {call && !isMinimized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] bg-black overflow-hidden"
        >
          {/* Background Layer */}
          {showVideoLayout ? (
            <div className="absolute inset-0 z-0 bg-gray-900 pointer-events-none">
              {remoteVideoTrack ? (
                <AgoraVideoPlayer videoTrack={remoteVideoTrack} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                  <img src={avatarSrc} alt={displayName} className="h-40 w-40 rounded-full object-cover opacity-60 border-4 border-white/10" />
                  <span className="mt-4 text-white/50 text-sm">{displayName} (Cámara apagada)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(112,0,255,0.16),transparent_40%),radial-gradient(circle_at_bottom,rgba(0,240,255,0.12),transparent_35%)] pointer-events-none" />
          )}

          {/* Picture-in-Picture Local Video (Only for Video Calls) */}
          {showVideoLayout && (
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={1}
              className="absolute top-24 right-4 w-28 h-40 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-[150] cursor-grab active:cursor-grabbing"
            >
              {localVideoTrack && isCameraOn !== false ? (
                <AgoraVideoPlayer videoTrack={localVideoTrack} isLocal={true} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <img src={localAvatarSrc} className="h-full w-full object-cover opacity-80" />
                </div>
              )}
            </motion.div>
          )}

          {/* UI Controls Layer */}
          <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-8 text-white pointer-events-none">
            {/* Top Bar */}
            <div className="flex w-full justify-between items-start pointer-events-auto mt-2">
              <div className="flex flex-col bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
                {!showVideoLayout && <h2 className="text-sm font-bold drop-shadow-md text-white/90">{displayName}</h2>}
                {isCallActive && remainingSeconds !== null ? (
                  <p className="text-sm text-green-400 font-bold tracking-wider">
                    {formatClock(remainingSeconds)}
                  </p>
                ) : (
                  <p className="text-sm text-white/80 font-medium">Llamando...</p>
                )}
              </div>

              <button
                onClick={() => setIsMinimized?.(true)}
                className="rounded-full bg-black/40 backdrop-blur-md p-3 text-white transition hover:bg-black/60 shadow-lg border border-white/10"
              >
                <Minimize2 size={20} />
              </button>
            </div>

            {/* Centered Avatar UI (Hidden in active video call) */}
            {!showVideoLayout && (
              <div className="flex flex-col items-center text-center mt-[-10vh]">
                <motion.div
                  animate={{ scale: isCallActive ? 1 : [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  className="relative mb-6"
                >
                  <div className={`absolute inset-0 rounded-full blur-2xl ${isCallActive ? 'bg-blue-500/20' : 'bg-fuchsia-500/20'}`} />
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className={`relative h-28 w-28 rounded-full object-cover border-4 shadow-xl transition-all duration-500 ${isCallActive ? 'border-blue-500/50 shadow-blue-500/20' : 'border-white/15'}`}
                  />
                </motion.div>

                <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg">{displayName}</h2>
                <p className="mt-2 text-white/90 font-medium drop-shadow-md">
                  {isCallActive
                    ? (isVideoCall ? "En videollamada" : "En llamada")
                    : (isVideoCall ? "Videollamando..." : "Llamando...")}
                </p>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="mb-4 flex items-center gap-4 pointer-events-auto">
              <button
                onClick={() => toggleSpeaker && toggleSpeaker()}
                className={`rounded-full p-4 transition-all shadow-xl backdrop-blur-md ${isSpeakerMuted ? 'bg-red-500 text-white border-2 border-red-400' : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'}`}
              >
                {isSpeakerMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              {isVideoCall && (
                <button
                  onClick={() => toggleCamera && toggleCamera()}
                  className={`rounded-full p-4 transition-all shadow-xl backdrop-blur-md ${isCameraOn === false ? 'bg-red-500 text-white border-2 border-red-400' : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'}`}
                >
                  {isCameraOn === false ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              )}

              <button
                onClick={() => toggleMic && toggleMic()}
                className={`rounded-full p-4 transition-all shadow-xl backdrop-blur-md ${isMicMuted ? 'bg-red-500 text-white border-2 border-red-400' : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'}`}
              >
                {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={() => onHangUp("ended_by_caller", consumedSeconds)}
                className="rounded-[2rem] bg-red-600 px-6 py-4 text-white shadow-[0_12px_35px_rgba(220,38,38,0.5)] transition-all hover:bg-red-500 hover:scale-105 active:scale-95 border-2 border-red-500/50"
              >
                <PhoneOff size={28} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
