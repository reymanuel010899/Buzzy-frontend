import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useCallStore } from "../../store/callStore";
import { useRingtoneStore } from "../../store/ringtoneStore";
import { useWsEvent } from "../../context/WebSocketContext";
import { useAgora } from "../../hooks/useAgora";
import IncomingCallScreen from "./IncomingCallScreen";
import OutgoingCallScreen from "./OutgoingCallScreen";
import { endCall, acceptCall } from "../../redux/actions/subscriptionActions";

export const GlobalCallWrapper: React.FC = () => {
    const user = useSelector((state: any) => state.LoginReducer?.user);
    const {
        activeIncomingCall,
        activeOutgoingCall,
        setActiveIncomingCall,
        setActiveOutgoingCall,
        setAgoraData
    } = useCallStore();

    const { join: joinAgora, leave: leaveAgora, isMicMuted, isCameraOn, isSpeakerMuted, toggleMic, toggleCamera, toggleSpeaker, localVideoTrack, remoteUsers } = useAgora();

    const getFile = useRingtoneStore(s => s.getFile);
    const ringAudioRef = useRef<HTMLAudioElement | null>(null);

    const [activeCallTime, setActiveCallTime] = useState(0);

    const activeCallTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [isCallMinimized, setIsCallMinimized] = useState(false);


    const stopActiveCallTimer = useCallback(() => {
        if (activeCallTimerRef.current) {
            clearInterval(activeCallTimerRef.current);
            activeCallTimerRef.current = null;
        }
        setActiveCallTime(0);
    }, []);

    useEffect(() => {
        if (user?.id) return;

        // Si estamos saliendo de sesión, limpiamos cualquier llamada residual
        // para evitar que el wrapper siga leyendo un usuario nulo.
        setActiveIncomingCall(null);
        setActiveOutgoingCall(null);
        stopActiveCallTimer();
        setIsCallMinimized(false);
        setAgoraData(null);
    }, [user?.id, setActiveIncomingCall, setActiveOutgoingCall, stopActiveCallTimer, setAgoraData]);

    const startActiveCallTimer = useCallback(() => {
        stopActiveCallTimer();
        activeCallTimerRef.current = setInterval(() => {
            setActiveCallTime(prev => prev + 1);
        }, 1000);
    }, [stopActiveCallTimer]);

    const handleEndOutgoingCall = useCallback((reason = "ended_by_caller", consumedSeconds?: number) => {
        const callId = activeOutgoingCall?.uuid || activeIncomingCall?.uuid;
        if (!callId) {
            setActiveOutgoingCall(null);
            setActiveIncomingCall(null);
            stopActiveCallTimer();
            leaveAgora();
            setAgoraData(null);
            return;
        }

        endCall(callId, consumedSeconds || activeCallTime, reason)()
            .finally(() => {
                setActiveOutgoingCall(null);
                setActiveIncomingCall(null);
                stopActiveCallTimer();
                setIsCallMinimized(false);
                leaveAgora();
                setAgoraData(null);
            });
    }, [activeOutgoingCall, activeIncomingCall, activeCallTime, stopActiveCallTimer, leaveAgora, setAgoraData]);

    // ─── Ringtone: suena en loop mientras hay llamada entrante sin contestar ────
    useEffect(() => {
        const isRinging = !!activeIncomingCall && activeIncomingCall.status !== 'active';
        if (isRinging) {
            const audio = new Audio(getFile());
            audio.loop = true;
            audio.volume = 0.85;
            ringAudioRef.current = audio;
            audio.play().catch(() => {});
        } else {
            if (ringAudioRef.current) {
                ringAudioRef.current.pause();
                ringAudioRef.current.currentTime = 0;
                ringAudioRef.current = null;
            }
        }
        return () => {
            if (ringAudioRef.current) {
                ringAudioRef.current.pause();
                ringAudioRef.current = null;
            }
        };
    }, [activeIncomingCall?.status, activeIncomingCall?.uuid, getFile]);

    const handleAnswerCall = useCallback(() => {
        if (!activeIncomingCall?.uuid) return;

        acceptCall(activeIncomingCall.uuid)()
            .then((res: any) => {
                setActiveIncomingCall(prev => prev ? { ...prev, status: 'active' } : null);
                setActiveOutgoingCall(null);
                startActiveCallTimer();

                if (res.token && res.app_id && res.call?.agora_uid_callee) {
                    joinAgora(res.app_id, res.call.channel_name, res.token, res.call.agora_uid_callee, res.call.call_type);
                }
            })
            .catch(err => {
                console.error("Error answering call:", err);
                setActiveIncomingCall(null);
            });
    }, [activeIncomingCall, startActiveCallTimer, joinAgora]);

    const handleRejectCall = useCallback(() => {
        handleEndOutgoingCall("rejected", 0);
    }, [handleEndOutgoingCall]);

    // ─── Eventos de llamadas vía WebSocket singleton ─────────────────────────

    useWsEvent("incoming_call", useCallback((data: any) => {
        if (data.call && user?.id && Number(data.recipient_id) === Number(user.id)) {
            setActiveIncomingCall(data.call);
            setIsCallMinimized(false);
        }
    }, [user?.id, setActiveIncomingCall]));

    useWsEvent("call_accepted", useCallback((data: any) => {
        setActiveOutgoingCall((prev) => {
            if (prev && data.uuid === prev.uuid) {
                startActiveCallTimer();
                setIsCallMinimized(false);
                const currentAgoraData = useCallStore.getState().agoraDataRef;
                if (currentAgoraData) {
                    joinAgora(
                        currentAgoraData.appId,
                        prev.channel_name,
                        currentAgoraData.token,
                        currentAgoraData.uid,
                        prev.call_type
                    );
                }
                return { ...prev, status: 'active' };
            }
            return prev;
        });
    }, [setActiveOutgoingCall, startActiveCallTimer, joinAgora]));

    useWsEvent("call_rejected", useCallback((data: any) => {
        leaveAgora();
        setActiveOutgoingCall((prev) => (prev && data.uuid === prev.uuid ? (stopActiveCallTimer(), null) : prev));
        setActiveIncomingCall((prev) => (prev && data.uuid === prev.uuid ? (stopActiveCallTimer(), null) : prev));
        useCallStore.getState().setAgoraData(null);
    }, [leaveAgora, setActiveOutgoingCall, setActiveIncomingCall, stopActiveCallTimer]));

    useWsEvent("call_ended", useCallback((data: any) => {
        leaveAgora();
        setActiveOutgoingCall((prev) => (prev && data.uuid === prev.uuid ? (stopActiveCallTimer(), null) : prev));
        setActiveIncomingCall((prev) => (prev && data.uuid === prev.uuid ? (stopActiveCallTimer(), null) : prev));
        useCallStore.getState().setAgoraData(null);
    }, [leaveAgora, setActiveOutgoingCall, setActiveIncomingCall, stopActiveCallTimer]));

    useEffect(() => {
        return () => {
            if (activeCallTimerRef.current) clearInterval(activeCallTimerRef.current);
        };
    }, []);

    if (!user?.id) {
        return null;
    }

    const formatClock = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const activeCall = activeOutgoingCall || activeIncomingCall;
    const isCallActive = activeCall?.status === 'active';
    const remainingTime = activeCall ? Math.max(0, activeCall.allowed_seconds - activeCallTime) : 0;

    // The full-screen UI should show for:
    // 1. Any outgoing call (ringing or active)
    // 2. Any incoming call that has been ANSWERED (active)
    const fullScreenCall = activeOutgoingCall || (activeIncomingCall?.status === 'active' ? activeIncomingCall : null);

    // Determine the other person's name and avatar
    const otherUserName = (activeOutgoingCall
        ? activeOutgoingCall.callee?.username
        : activeIncomingCall?.caller?.username) || "Usuario";

    const otherUserAvatar = activeOutgoingCall
        ? activeOutgoingCall.callee?.profile_picture
        : activeIncomingCall?.caller?.profile_picture;

    return (
        <>
            {activeIncomingCall && activeIncomingCall.status !== 'active' && (
                <IncomingCallScreen
                    call={activeIncomingCall}
                    callerName={activeIncomingCall.caller?.username || "Usuario"}
                    callerAvatar={activeIncomingCall.caller?.profile_picture}
                    activeTime={activeCallTime}
                    onAnswer={handleAnswerCall}
                    onReject={handleRejectCall}
                    isMicMuted={isMicMuted}
                    isSpeakerMuted={isSpeakerMuted}
                    toggleMic={toggleMic}
                    toggleSpeaker={toggleSpeaker}
                />
            )}

            <OutgoingCallScreen
                call={fullScreenCall}
                displayName={otherUserName}
                avatar={otherUserAvatar}
                localAvatar={user?.profile_picture}
                onHangUp={handleEndOutgoingCall}
                isMinimized={isCallMinimized}
                setIsMinimized={setIsCallMinimized}
                isMicMuted={isMicMuted}
                isSpeakerMuted={isSpeakerMuted}
                isCameraOn={isCameraOn}
                toggleMic={toggleMic}
                toggleSpeaker={toggleSpeaker}
                toggleCamera={toggleCamera}
                localVideoTrack={localVideoTrack}
                remoteUsers={remoteUsers}
            />

            {/* Minimized Call Bar overlay over entire application */}
            {isCallMinimized && activeCall && (
                <div
                    onClick={() => setIsCallMinimized(false)}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-green-500 hover:bg-green-600 transition text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer animate-pulse border border-green-400"
                >
                    <div className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </div>
                    <span className="font-bold text-sm tracking-wide">
                        {isCallActive ? formatClock(remainingTime) : `Llamando...`}
                    </span>
                </div>
            )}
        </>
    );
};
