// types/chat.ts

export interface OtherUser {
  id: number;
  username: string;
  name: string;           // Nombre completo o username si no tiene
  avatar: string | null;  // URL completa de la foto de perfil o null
}

export interface OtherUserOnline {
  is_online: boolean;
  last_seen: string | null;  // ISO string solo si está offline
}

export interface LastMessage {
  content: string;     // Vista previa truncada (máx ~50 chars + "...")
  type: 'text' | 'image' | 'video' | 'voice' | 'gif';
  time: string;        // ISO string del created_at
}

export interface ChatRoom {
  uuid: string;                    // ID único del chat (ej: "a1b2c3d4")
  other_user: OtherUser;
  last_message: LastMessage | null; // null si no hay mensajes aún
  unread_count: number;            // Mensajes no leídos por TI
  updated_at: string;              // ISO string de la última actividad
  other_user_online: OtherUserOnline;
}

// Respuesta completa de la API /chats/
export interface ChatListResponse {
  chats: ChatRoom[];
}

// types/message.ts (o donde guardes tus interfaces)
export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'gif';  ;

export interface Message {
  uuid: string;                    // ID único del mensaje (ej: "a1b2c3d4")
  content: string;                 // Texto del mensaje
  sender_username: string;         // @username del que envía (ej: "@ana_22")
  sender_avatar: string | null;     // URL completa de la foto de perfil o null
  created_at: string;              // Fecha ISO (ej: "2026-01-08T15:30:45.123456Z")
  message_type: MessageType // Tipo de mensaje
}

