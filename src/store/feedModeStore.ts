import { create } from "zustand";

export type FeedMode = "for-you" | "following";

interface FeedModeState {
  feedMode: FeedMode;
  setFeedMode: (mode: FeedMode) => void;
}

export const useFeedModeStore = create<FeedModeState>((set) => ({
  feedMode: "for-you",
  setFeedMode: (feedMode) => set({ feedMode }),
}));
