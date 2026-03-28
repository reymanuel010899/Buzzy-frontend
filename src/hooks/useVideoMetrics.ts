import { useRef, useCallback } from 'react';
import axios from 'axios';
import { getBaseUrl } from '../redux/client/api-client';

type EventType = 'video_start' | 'video_engagement' | 'video_view_valid';

/**
 * useVideoMetrics
 *
 * Tracks multi-stage video engagement events and sends them to the backend.
 * Each event type fires at most ONCE per video per browser session, preventing
 * request spam regardless of how many times onTimeUpdate is called.
 *
 * Events fired:
 *   - video_start         → on first play
 *   - video_engagement    → when playback reaches 3 seconds
 *   - video_view_valid    → when playback reaches 30% of total duration
 *                           (or immediately via triggerViewFromInteraction)
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
     * Automatically fires video_engagement at 3 s and video_view_valid at 30%.
     */
    const onTimeUpdate = useCallback(
        (videoId: string, currentTime: number, duration: number) => {
            if (!videoId || !isFinite(duration) || duration <= 0) return;

            // 3-second engagement
            if (currentTime >= 3) {
                sendEvent(videoId, 'video_engagement');
            }

            // 30% valid view
            const thirtyPercent = duration * 0.3;
            if (currentTime >= thirtyPercent) {
                sendEvent(videoId, 'video_view_valid');
            }
        },
        [sendEvent]
    );

    /**
     * Call this when the user likes or comments before reaching 30%.
     * Immediately fires video_view_valid as an interaction shortcut.
     */
    const triggerViewFromInteraction = useCallback((videoId: string | null | undefined) => {
        if (!videoId) return;
        sendEvent(videoId, 'video_view_valid');
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
