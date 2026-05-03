// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface WsUserSummary {
  id: number;
  username: string;
  profile_picture: string | null;
}

export interface WsMessage {
  uuid: string;
  content: string;
  sender_username: string;
  sender_id: number;
  created_at: string;
  message_type: string;
  reactions?: Record<string, string[]>;
}

// ─── Eventos entrantes (servidor → cliente) ───────────────────────────────────

export type WsIncomingEvent =
  | WsRegistered
  | WsPing
  | WsLikeUpdated
  | WsNewComment
  | WsNewView
  | WsNewFollower
  | WsDeleteFollower
  | WsSendMessage
  | WsTyping
  | WsReaction
  | WsNotification
  | WsGiftReceived
  | WsVideoGiftReceived
  | WsGiftSee
  | WsNewStory
  | WsVideoReady
  | WsVideoBlocked
  | WsIncomingCall
  | WsCallAccepted
  | WsCallRejected
  | WsCallEnded
  | WsUserOffline;

export interface WsRegistered {
  type: "registered";
  user_id: number;
}

export interface WsPing {
  event: "ping";
}

export interface WsLikeUpdated {
  event: "like_updated";
  video_id: number;
  likes: number;
  liked: boolean;
  user_id: number;
  video_user_id: number;
}

export interface WsNewComment {
  event: "new_comment";
  video_id: number;
  video_user_id: number;
  comments_count: number;
  content: string;
  uuid: string;
  parent: string | null;
  user_id: WsUserSummary;
  is_priority_comment: boolean;
  priority_plan_name: string | null;
}

export interface WsNewView {
  event: "new_view";
  video_id: number;
  view_acount: number;
}

export interface WsNewFollower {
  event: "new_follower";
  channel_profile: number;
  current_user_followered: boolean;
  follower: WsUserSummary;
}

export interface WsDeleteFollower {
  event: "delete_follower";
  channel_profile: number;
  current_user_followered: boolean;
}

export interface WsSendMessage {
  event: "send_message";
  chat_uuid: string;
  recipient_id: number;
  sender_id: number;
  unread_count?: number;
  unread_count_target?: number;
  message: WsMessage;
}

export interface WsTyping {
  event: "typing";
  chat_uuid: string;
  user_id: number;
  username: string;
  is_typing: boolean;
  sender_id?: number;
}

export interface WsReaction {
  event: "reaction";
  message_uuid: string;
  emoji: string;
  user_id: number;
  username: string;
  action: "added" | "removed";
}

export interface WsNotification {
  event: "notification";
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor: WsUserSummary | null;
  video_thumbnail: string | null;
  video_uuid: string | null;
}

export interface WsGiftReceived {
  event: "gift_received";
  gift_type: string;
  gift_uuid: string;
  story_uuid: string;
  sender: WsUserSummary;
  amount: number;
  gift_video: string;
  from_user: number;
  to_user: number;
}

export interface WsVideoGiftReceived {
  event: "video_gift_received";
  gift_type: string;
  gift_uuid: string;
  video_id: number;
  sender: WsUserSummary;
  amount: number;
  gift_video: string;
  color_premiun: string;
  from_user: number;
  to_user: number;
}

export interface WsGiftSee {
  event: "gift_see";
  gift_uuid: string;
  story_uuid: string;
  gift_type: string;
  sender: WsUserSummary;
  amount: number;
  gift_video: string;
  to_user: number;
}

export interface WsNewStory {
  event: "new_story";
  story: unknown;
}

export interface WsVideoReady {
  event: "video_ready";
  video_id: number;
  status: "ready";
  category: string;
  safety_label: string;
}

export interface WsVideoBlocked {
  event: "video_blocked";
  video_id: number;
  status: "blocked";
  safety_label: string;
}

export interface WsIncomingCall {
  type: "incoming_call";
  call: unknown;
  recipient_id: number;
}

export interface WsCallAccepted {
  type: "call_accepted";
  uuid: string;
}

export interface WsCallRejected {
  type: "call_rejected";
  uuid: string;
}

export interface WsCallEnded {
  type: "call_ended";
  uuid: string;
}

export interface WsUserOffline {
  type: "user_offline";
  user_id: number;
}

// ─── Tipos salientes (cliente → servidor) ─────────────────────────────────────

export type WsOutgoingEvent =
  | { type: "REGISTER"; device_token: string | null }
  | { type: "typing"; is_typing: boolean; receiver_id: number; chat_uuid?: string }
  | { type: "pong" };

// ─── Estado de la conexión ────────────────────────────────────────────────────

export type WsConnectionStatus = "connecting" | "open" | "closed" | "reconnecting";
