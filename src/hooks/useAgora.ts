import { useState, useCallback, useRef, useEffect } from "react";
import AgoraRTC, {
    IAgoraRTCClient,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

export const useAgora = () => {
    const [isJoined, setIsJoined] = useState(false);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
    const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);

    const updateRemoteUsers = (client: IAgoraRTCClient) => {
        setRemoteUsers(Array.from(client.remoteUsers));
    };

    const join = useCallback(async (appId: string, channel: string, token: string, uid: number, callType: 'voice' | 'video' = 'voice') => {
        if (clientRef.current) {
            console.warn("Already in a call");
            return;
        }

        try {
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            clientRef.current = client;

            // Handle remote users
            client.on("user-published", async (user, mediaType) => {
                console.log("📡 Remote user published:", user.uid, mediaType);
                await client.subscribe(user, mediaType);
                if (mediaType === "audio") {
                    console.log("🔊 Playing remote audio track");
                    user.audioTrack?.play();
                }
                updateRemoteUsers(client);
            });

            client.on("user-unpublished", (user, mediaType) => {
                console.log("📡 Remote user unpublished:", user.uid, mediaType);
                updateRemoteUsers(client);
            });

            client.on("user-joined", (user) => {
                console.log("📡 Remote user joined:", user.uid);
                updateRemoteUsers(client);
            });

            client.on("user-left", (user) => {
                console.log("📡 Remote user left:", user.uid);
                updateRemoteUsers(client);
            });

            await client.join(appId, channel, token, uid);
            console.log("🏠 Joined channel with UID:", uid);

            // Create tracks
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            localAudioTrackRef.current = audioTrack;
            console.log("🎙️ Local audio track created");

            if (callType === 'video') {
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                localVideoTrackRef.current = videoTrack;
                setLocalVideoTrack(videoTrack);
                await client.publish([audioTrack, videoTrack]);
                console.log("📹 Local audio & video tracks published");
            } else {
                await client.publish([audioTrack]);
                console.log("🎙️ Local audio track published");
            }

            setIsJoined(true);
            setIsMicMuted(false);
            setIsCameraOn(true);
            setIsSpeakerMuted(false);
            console.log("✅ Joined Agora channel:", channel);
        } catch (error) {
            console.error("❌ Failed to join Agora channel:", error);
            clientRef.current = null;
        }
    }, []);

    const leave = useCallback(async () => {
        if (!clientRef.current) return;

        try {
            if (localAudioTrackRef.current) {
                localAudioTrackRef.current.stop();
                localAudioTrackRef.current.close();
            }
            if (localVideoTrackRef.current) {
                localVideoTrackRef.current.stop();
                localVideoTrackRef.current.close();
            }

            await clientRef.current.leave();

            localAudioTrackRef.current = null;
            localVideoTrackRef.current = null;
            setLocalVideoTrack(null);
            clientRef.current = null;

            setIsJoined(false);
            setIsMicMuted(false);
            setIsCameraOn(true);
            setIsSpeakerMuted(false);
            setRemoteUsers([]);
            console.log("👋 Left Agora channel");
        } catch (error) {
            console.error("❌ Error leaving Agora channel:", error);
        }
    }, []);

    /** Toggle microphone mute — mutes/unmutes the local audio track */
    const toggleMic = useCallback(async () => {
        const track = localAudioTrackRef.current;
        if (!track) return;
        const newMuted = !isMicMuted;
        await track.setEnabled(!newMuted);
        setIsMicMuted(newMuted);
        console.log(newMuted ? "🔇 Mic muted" : "🎙️ Mic unmuted");
    }, [isMicMuted]);

    /** Toggle speaker — mutes the remote audio by setting volume to 0 */
    const toggleSpeaker = useCallback(() => {
        if (!clientRef.current) return;
        const newMuted = !isSpeakerMuted;
        const remoteUsers = clientRef.current.remoteUsers;
        remoteUsers.forEach(user => {
            if (user.audioTrack) {
                user.audioTrack.setVolume(newMuted ? 0 : 100);
            }
        });
        setIsSpeakerMuted(newMuted);
        console.log(newMuted ? "🔕 Speaker muted" : "🔊 Speaker unmuted");
    }, [isSpeakerMuted]);

    /** Toggle camera — enables/disables the local video track */
    const toggleCamera = useCallback(async () => {
        const track = localVideoTrackRef.current;
        if (!track) return;
        const newCameraOn = !isCameraOn;
        await track.setEnabled(newCameraOn);
        setIsCameraOn(newCameraOn);
        console.log(newCameraOn ? "📷 Camera turned ON" : "📷 Camera turned OFF");
    }, [isCameraOn]);

    useEffect(() => {
        return () => {
            leave();
        };
    }, [leave]);

    return { join, leave, isJoined, isMicMuted, isCameraOn, isSpeakerMuted, toggleMic, toggleCamera, toggleSpeaker, localVideoTrack, remoteUsers };
};
