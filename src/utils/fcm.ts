import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";
import { apiClient, getBaseUrl } from "../redux/client/api-client";

/**
 * Solicita permiso para notificaciones, obtiene el token de FCM
 * y lo envía al backend de Django para su registro.
 */
export const registerFCMToken = async () => {
    try {
        // 1. Solicitar permiso al usuario
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // 2. Obtener el token de Firebase
            // Usa el valor del .env o un placeholder limpio
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

            if (!vapidKey || vapidKey === "REEMPLAZAR_AQUI") {
                console.error("❌ VAPID Key no configurada en el .env (VITE_FIREBASE_VAPID_KEY)");
                return;
            }

            const token = await getToken(messaging, {
                vapidKey: vapidKey
            });

            if (token) {
                localStorage.setItem("device_token", token);

                await apiClient.post(`${getBaseUrl()}api/v1/users/update-device-token/`, {
                    device_token: token
                });
            }
        } else {
            console.warn("Permiso de notificaciones denegado.");
        }
    } catch (error) {
        console.error("Error en el flujo de registro de FCM:", error);
    }
};
