import { useEffect, useRef } from "react";

export function useWebSocket(
  url: string,
  onMessage: (data: any) => void
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket conectado");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      console.log("❌ WebSocket desconectado");
    };

    return () => {
      ws.close();
    };
  }, [url, onMessage]);

  return socketRef.current;
}
