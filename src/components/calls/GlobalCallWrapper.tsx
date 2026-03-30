import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useCallStore } from "../../store/callStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAgora } from "../../hooks/useAgora";
import IncomingCallScreen from "./IncomingCallScreen";
import OutgoingCallScreen from "./OutgoingCallScreen";
import { endCall, acceptCall } from "../../redux/actions/subscriptionActions";

const WS_URL = "ws://localhost:8001/ws";

export const GlobalCallWrapper: React.FC = () => {
    const { user } = useSelector((state: any) => state.LoginReducer);
    const {
        activeIncomingCall,
        activeOutgoingCall,
        agoraDataRef,
        setActiveIncomingCall,
        setActiveOutgoingCall,
        setAgoraData
    } = useCallStore();

    const { join: joinAgora, leave: leaveAgora, isJoined, isMicMuted, isCameraOn, isSpeakerMuted, toggleMic, toggleCamera, toggleSpeaker, localVideoTrack, remoteUsers } = useAgora();

    const [activeCallTime, setActiveCallTime] = useState(0);

    const activeCallTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [isCallMinimized, setIsCallMinimized] = useState(false);

    // Generar URL del websocket usando los mismos parámetros que Navbar
    const wsUrl = useMemo(() => {
        if (!user?.id) return null;
        const token = localStorage.getItem("accessToken") || "";
        return `${WS_URL}?user_id=${user.id}&token=${token}`;
    }, [user?.id]);

    const shouldConnect = !!wsUrl;

    const stopActiveCallTimer = useCallback(() => {
        if (activeCallTimerRef.current) {
            clearInterval(activeCallTimerRef.current);
            activeCallTimerRef.current = null;
        }
        setActiveCallTime(0);
    }, []);

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

    const handleWSMessage = useCallback((data: any) => {
        switch (data.type) {
            case "incoming_call": {
                if (data.call && Number(data.recipient_id) === Number(user.id)) {
                    setActiveIncomingCall(data.call);
                    setIsCallMinimized(false);
                }
                break;
            }
            case "call_accepted": {
                // En el estado global del store, obtén el current value en lugar del destructuring anterior si fuera closure atrapado,
                // pero Zustand muta o podemos usar el callback function.
                setActiveOutgoingCall((prev) => {
                    if (prev && data.uuid === prev.uuid) {
                        startActiveCallTimer();
                        setIsCallMinimized(false);

                        // Aquí usamos el snapshot que guardamos en agoraDataRef
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
                break;
            }
            case "call_rejected":
            case "call_ended": {
                console.log("------mai-----")
                leaveAgora();

                setActiveOutgoingCall((prevRef) => {
                    if (prevRef && data.uuid === prevRef.uuid) {
                        stopActiveCallTimer();
                        return null;
                    }
                    return prevRef;
                });

                setActiveIncomingCall((prevRef) => {
                    if (prevRef && data.uuid === prevRef.uuid) {
                        stopActiveCallTimer();
                        return null;
                    }
                    return prevRef;
                });

                useCallStore.getState().setAgoraData(null);
                break;
            }
        }
    }, [user.id, setActiveIncomingCall, setActiveOutgoingCall, startActiveCallTimer, joinAgora, leaveAgora, stopActiveCallTimer]);

    // Hook del websocket exclusivo para las llamadas
    // Nota: Dejamos el socket de Navbar intacto para los chats
    useWebSocket(wsUrl, handleWSMessage, shouldConnect);

    useEffect(() => {
        return () => {
            if (activeCallTimerRef.current) clearInterval(activeCallTimerRef.current);
        };
    }, []);

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
                    callerName={activeIncomingCall.caller_username || activeIncomingCall.caller?.username || "Usuario"}
                    callerAvatar={activeIncomingCall.caller_avatar || activeIncomingCall.caller?.profile_picture}
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
