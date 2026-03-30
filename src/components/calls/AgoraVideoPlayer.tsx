import { ICameraVideoTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import { useEffect, useRef } from "react";

interface Props {
    videoTrack: ICameraVideoTrack | IRemoteVideoTrack | null | undefined;
    className?: string;
    isLocal?: boolean;
}

export default function AgoraVideoPlayer({ videoTrack, className, isLocal = false }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!videoTrack || !containerRef.current) return;

        videoTrack.play(containerRef.current, {
            fit: 'cover',
            mirror: isLocal
        });

        return () => {
            videoTrack.stop();
        };
    }, [videoTrack, isLocal]);

    return <div ref={containerRef} className={`agora-video-player w-full h-full overflow-hidden ${className || ""}`} />;
}
