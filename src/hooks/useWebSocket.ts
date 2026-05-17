import { useEffect, useRef } from "react";

export function useWebSocket(
  url: string | null,
  onMessage: (data: any) => void,
  tryConnect: boolean = true
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // ❌ No conectar si no hay URL o no se debe conectar
    if (!url || !tryConnect) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket conectado");
      const deviceToken = localStorage.getItem("device_token");
      ws.send(JSON.stringify({
        type: "REGISTER",
        device_token: deviceToken
      }));
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
      socketRef.current = null;
    };
  }, [url, tryConnect, onMessage]);

  return socketRef;
}
