import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";
import { apiClient } from "../redux/client/api-client";
import { useUnreadMessages } from "../context/UnreadAcount";

/**
 * Requests FCM permission, obtains the device token, and registers it with
 * the backend so the server can send push notifications when the app is closed.
 * Also syncs the app icon badge number with the total unread message count.
 */
export const usePushNotifications = (isAuthenticated: boolean) => {
  const getTotalUnread = useUnreadMessages((s) => s.getTotalUnread);
  const unreadCounts = useUnreadMessages((s) => s.unreadCounts);

  // Sync badge whenever unread count changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!Capacitor.isNativePlatform()) return;

    const total = getTotalUnread();
    Badge.set({ count: total }).catch(() => {});
  }, [unreadCounts, isAuthenticated, getTotalUnread]);

  // Register FCM token — requires google-services.json in android/app/
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!Capacitor.isNativePlatform()) return;

    let tokenHandle: any = null;
    let errorHandle: any = null;

    const register = async () => {
      try {
        // Check first — never request if already denied to avoid crash loop
        let permission = await PushNotifications.checkPermissions();

        if (permission.receive === "denied") {
          console.warn("[push] Permission denied by user");
          return;
        }

        if (permission.receive === "prompt") {
          // Small delay so the app is fully stable before showing the dialog
          await new Promise((r) => setTimeout(r, 1500));
          permission = await PushNotifications.requestPermissions();
        }

        if (permission.receive !== "granted") return;

        tokenHandle = await PushNotifications.addListener("registration", async (token) => {
          try {
            await apiClient.post("api/auth/register-device/", { token: token.value });
          } catch (err) {
            console.error("[push] Failed to register device:", err);
          }
        });

        errorHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.error("[push] Registration error:", err);
        });

        await PushNotifications.register();
      } catch (err) {
        // Never crash the app due to push notification setup
        console.error("[push] Setup failed (google-services.json missing?):", err);
      }
    };

    register();

    return () => {
      tokenHandle?.remove();
      errorHandle?.remove();
    };
  }, [isAuthenticated]);
};
