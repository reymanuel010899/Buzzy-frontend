import { useState, useRef, useCallback } from 'react';

interface EngagementData {
    view_time: number;
    has_interaction: boolean;
    category_id: number | null;
}

export const useVideoEngagement = () => {
    // Interest weights: { category_id: weight }
    const [interestWeights, setInterestWeights] = useState<Record<number, number>>({});
    const [viewHistory, setViewHistory] = useState<EngagementData[]>([]);
    const currentViewStartRef = useRef<number | null>(null);
    const activeVideoIdRef = useRef<string | number | null>(null);
    const activeVideoCategoryRef = useRef<number | null>(null);

    const updateWeights = useCallback((categoryId: number | null, viewTime: number, hasInteraction: boolean) => {
        if (categoryId === null) return;

        setInterestWeights(prev => {
            const currentWeight = prev[categoryId] || 0;
            let weightDelta = 0;

            if (viewTime >= 5000 || hasInteraction) {
                weightDelta = 2; // High engagement
            } else if (viewTime < 2000) {
                weightDelta = -1; // Fast skip
            }

            if (weightDelta === 0) return prev;

            const newWeights = { ...prev, [categoryId]: Math.max(0, currentWeight + weightDelta) };

            // Limit to top interests (optional, but requested Buffer of last 10)
            return newWeights;
        });
    }, []);

    const onIntersectionChange = useCallback((videoId: string | number, isIntersecting: boolean, categoryId: number | null) => {
        const now = Date.now();

        if (isIntersecting) {
            // New video in view
            currentViewStartRef.current = now;
            activeVideoIdRef.current = videoId;
            activeVideoCategoryRef.current = categoryId;
        } else if (activeVideoIdRef.current === videoId) {
            // Video left view
            if (currentViewStartRef.current) {
                const viewTime = now - currentViewStartRef.current;
                updateWeights(activeVideoCategoryRef.current, viewTime, false);

                // Add to history and keep last 10
                setViewHistory(prev => {
                    const newHistory = [...prev, { view_time: viewTime, has_interaction: false, category_id: activeVideoCategoryRef.current }];
                    return newHistory.slice(-10);
                });
            }
            currentViewStartRef.current = null;
            activeVideoIdRef.current = null;
            activeVideoCategoryRef.current = null;
        }
    }, [updateWeights]);

    const recordInteraction = useCallback((categoryId: number | null) => {
        if (categoryId === null) return;
        updateWeights(categoryId, 0, true);
    }, [updateWeights]);

    return {
        interestWeights,
        onIntersectionChange,
        recordInteraction,
        viewHistory
    };
};
