import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";
import { apiClient, getBaseUrl } from "../redux/client/api-client";

export const registerFCMToken = async () => {
    try {
        const resolvedMessaging = await messaging;
        if (!resolvedMessaging) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            if (!vapidKey || vapidKey === "REEMPLAZAR_AQUI") return;

            const token = await getToken(resolvedMessaging, { vapidKey });
            if (token) {
                localStorage.setItem("device_token", token);
                await apiClient.post(`${getBaseUrl()}api/v1/users/update-device-token/`, {
                    device_token: token
                });
            }
        }
    } catch (error) {
        console.error("Error en el flujo de registro de FCM:", error);
    }
};
