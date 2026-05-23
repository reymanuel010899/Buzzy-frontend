import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Escucha deep links nativos (buzzy://join?code=TOKEN) y redirige
 * al signup con el código de referido pre-cargado en la URL.
 *
 * Solo activo en plataformas nativas (Android/iOS).
 * En web el router ya maneja /join?code= directamente.
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      // Parsear la URL del deep link: buzzy://join?code=TOKEN
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");

      if (parsed.hostname === "join" && code) {
        navigate(`/sign-up?code=${encodeURIComponent(code)}`);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate]);
}
