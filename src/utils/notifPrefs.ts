// Lee las preferencias de notificación del usuario desde localStorage.
// Se guarda desde el modal de Notificaciones en profile.tsx.

export type NotifKey = 'notif_push' | 'notif_messages' | 'notif_gifts' | 'notif_followers';

export function isNotifEnabled(key: NotifKey): boolean {
  return localStorage.getItem(key) !== 'false';
}
