import { useRef, useCallback } from 'react';
import axios from 'axios';
import { getBaseUrl } from '../redux/client/api-client';

type EventType = 'video_start' | 'video_engagement' | 'video_view_valid' | 'video_view_monetizable';

// Minimum seconds the 50% mark must represent for a view to be monetizable.
// If 50% of the video is less than 10 s, the view counts but doesn't pay the creator.
const MIN_MONETIZABLE_SECONDS = 10;

/**
 * useVideoMetrics
 *
 * Tracks multi-stage video engagement events and sends them to the backend.
 * Each event type fires at most ONCE per video per browser session, preventing
 * request spam regardless of how many times onTimeUpdate is called.
 *
 * Events fired:
 *   - video_start              → on first play
 *   - video_engagement         → when playback reaches 3 seconds
 *   - video_view_valid         → when playback reaches 50% of total duration
 *   - video_view_monetizable   → same trigger, but only when 50% >= 10 s
 *                                (prevents monetization of very short videos)
 */
export function useVideoMetrics() {
    // Map<videoId, Set<eventType>> — tracks which events have already been sent
    const firedEvents = useRef<Map<string, Set<EventType>>>(new Map());

    const getToken = () => localStorage.getItem('accessToken') ?? '';

    const sendEvent = useCallback(async (videoId: string, eventType: EventType) => {
        const events = firedEvents.current.get(videoId) ?? new Set<EventType>();

        // Guard: fire each event only once per session per video
        if (events.has(eventType)) return;

        events.add(eventType);
        firedEvents.current.set(videoId, events);

        try {
            await axios.post(
                `${getBaseUrl()}api/videos/track-event/`,
                { video_id: videoId, event_type: eventType },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
        } catch (err) {
            console.error(`[VideoMetrics] Failed to send ${eventType} for video ${videoId}:`, err);
            // Roll back so a transient error doesn't permanently block the event
            events.delete(eventType);
        }
    }, []);

    /**
     * Call this from the video element's onPlay event (or when intersection starts play).
     */
    const onVideoPlay = useCallback((videoId: string) => {
        sendEvent(videoId, 'video_start');
    }, [sendEvent]);

    /**
     * Call this from the video element's onTimeUpdate event.
     * Fires video_engagement at 3 s, video_view_valid at 50%, and
     * video_view_monetizable at 50% only when that mark is >= 10 s.
     */
    const onTimeUpdate = useCallback(
        (videoId: string, currentTime: number, duration: number) => {
            if (!videoId || !isFinite(duration) || duration <= 0) return;

            // 3-second engagement
            if (currentTime >= 3) {
                sendEvent(videoId, 'video_engagement');
            }

            // 50% mark — always registers the view
            const fiftyPercent = duration * 0.5;
            if (currentTime >= fiftyPercent) {
                sendEvent(videoId, 'video_view_valid');

                // Monetizable only if 50% of the video is at least 10 real seconds
                if (fiftyPercent >= MIN_MONETIZABLE_SECONDS) {
                    sendEvent(videoId, 'video_view_monetizable');
                }
            }
        },
        [sendEvent]
    );

    /**
     * Interaction shortcut (like/comment): registers the view as valid but NOT
     * monetizable — we can't confirm the user actually watched enough.
     */
    const triggerViewFromInteraction = useCallback((videoId: string | null | undefined) => {
        if (!videoId) return;
        sendEvent(videoId, 'video_view_valid');
        // Deliberately does NOT send video_view_monetizable
    }, [sendEvent]);

    /**
     * Call this when a video leaves the viewport to reset session tracking,
     * so the next time the user watches the same video it counts as a fresh session.
     * (Optional — remove if you want once-per-page-load semantics instead.)
     */
    const resetVideo = useCallback((videoId: string) => {
        firedEvents.current.delete(videoId);
    }, []);

    return { onVideoPlay, onTimeUpdate, triggerViewFromInteraction, resetVideo };
}
