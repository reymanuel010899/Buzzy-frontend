import { create } from "zustand";
import { apiClient } from "../redux/client/api-client";

export interface BuzzyNotification {
  id: number;
  notification_type:
    | "follow"
    | "like"
    | "comment"
    | "comment_reply"
    | "profile_visit"
    | "story_like"
    | "gift"
    | "mention"
    | "earning"
    | "welcome";
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor: {
    id: number;
    username: string;
    profile_picture: string | null;
  } | null;
  video_thumbnail: string | null;
  video_uuid: string | null;
}

interface NotificationsState {
  notifications: BuzzyNotification[];
  unreadCount: number;
  loading: boolean;

  fetch: () => Promise<void>;
  pushRealtime: (n: BuzzyNotification) => void;
  markAllRead: () => Promise<void>;
  markRead: (ids: number[]) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get("api/notifications/");
      set({
        notifications: data.results,
        unreadCount: data.unread_count,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  pushRealtime: (n: BuzzyNotification) => {
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: async () => {
    const unread = get().notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) return;
    try {
      await apiClient.post("api/notifications/read/", { ids: unread });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent
    }
  },

  markRead: async (ids: number[]) => {
    try {
      await apiClient.post("api/notifications/read/", { ids });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - ids.length),
      }));
    } catch {
      // silent
    }
  },
}));
