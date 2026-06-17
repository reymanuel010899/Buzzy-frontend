import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// La háptica solo existe en plataforma nativa (Android/iOS). En web es no-op.
const isNative = Capacitor.isNativePlatform();

/**
 * Vibración sutil de impacto. Úsala en acciones táctiles puntuales:
 * like, follow, enviar, abrir/cerrar modal, seleccionar tab.
 * `style`: Light (default) | Medium | Heavy.
 */
export async function tapHaptic(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNative) return;
  try {
    await Haptics.impact({ style });
  } catch {
    /* dispositivo sin motor háptico o permiso denegado: ignorar */
  }
}

/**
 * Patrón de notificación (éxito/aviso/error). Úsala en resultados:
 * pago aprobado, error de envío, etc.
 */
export async function notifyHaptic(type: NotificationType = NotificationType.Success) {
  if (!isNative) return;
  try {
    await Haptics.notification({ type });
  } catch {
    /* ignorar */
  }
}

export { ImpactStyle, NotificationType };
