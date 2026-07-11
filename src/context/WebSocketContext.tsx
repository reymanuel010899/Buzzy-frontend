import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { getWsUrl } from "../utils/wsUrl";
import type {
  WsConnectionStatus,
  WsIncomingEvent,
  WsOutgoingEvent,
} from "../types/websocket";

// ─── Tipos del contexto ───────────────────────────────────────────────────────

type EventKey = string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (data: any) => void;

interface WebSocketContextValue {
  status: WsConnectionStatus;
  subscribe: (event: EventKey, handler: EventHandler) => () => void;
  send: (msg: WsOutgoingEvent) => void;
  socketRef: React.MutableRefObject<WebSocket | null>;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const WS_BASE = getWsUrl();

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: any) => state.LoginReducer?.user);

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<EventKey, Set<EventHandler>>>(new Map());
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingQueueRef = useRef<WsOutgoingEvent[]>([]);
  const shouldReconnectRef = useRef(true);
  const urlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<WsConnectionStatus>("closed");

  // ─── Emitir evento a todos los suscriptores ───────────────────────────────

  const emit = useCallback((data: WsIncomingEvent) => {
    const key = (data as any).event ?? (data as any).type;
    if (!key) return;
    const handlers = listenersRef.current.get(key);
    handlers?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[WS] Error en handler de "${key}":`, err);
      }
    });
  }, []);

  // ─── Heartbeat ────────────────────────────────────────────────────────────

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      const ws = socketRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // el socket se cerrará solo y onclose iniciará reconexión
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ─── Drenar cola pendiente ────────────────────────────────────────────────

  const drainQueue = useCallback((ws: WebSocket) => {
    while (pendingQueueRef.current.length > 0) {
      const msg = pendingQueueRef.current.shift()!;
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        pendingQueueRef.current.unshift(msg);
        break;
      }
    }
  }, []);

  // ─── Conectar ─────────────────────────────────────────────────────────────

  const connect = useCallback(
    (url: string) => {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }

      setStatus("connecting");
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        retryCountRef.current = 0;

        // Registrar dispositivo
        const deviceToken = localStorage.getItem("device_token");
        ws.send(
          JSON.stringify({ type: "REGISTER", device_token: deviceToken })
        );

        // Drenar mensajes que se quedaron pendientes durante desconexión
        drainQueue(ws);

        startHeartbeat();

        // Avisar a los consumidores (p.ej. el chat abierto resincroniza los
        // mensajes que pudieron perderse mientras el socket estuvo caído)
        emit({ type: "ws_open" } as unknown as WsIncomingEvent);
      };

      ws.onmessage = (event) => {
        try {
          const data: WsIncomingEvent = JSON.parse(event.data);

          // Responder a ping del servidor
          if ((data as any).event === "ping" || (data as any).type === "ping") {
            try {
              ws.send(JSON.stringify({ type: "pong" }));
            } catch {}
            return;
          }

          emit(data);
        } catch (err) {
          console.warn("[WS] Mensaje malformado ignorado:", event.data, err);
        }
      };

      ws.onerror = (err) => {
        console.warn("[WS] Error en socket:", err);
      };

      ws.onclose = () => {
        stopHeartbeat();
        socketRef.current = null;

        if (!shouldReconnectRef.current) {
          setStatus("closed");
          return;
        }

        const retries = retryCountRef.current;
        if (retries >= MAX_RETRIES) {
          setStatus("closed");
          console.error("[WS] Máximo de reintentos alcanzado.");
          return;
        }

        // Backoff exponencial con jitter
        const delay =
          Math.min(BASE_DELAY_MS * 2 ** retries, MAX_DELAY_MS) +
          Math.random() * 500;
        retryCountRef.current += 1;
        setStatus("reconnecting");

        retryTimerRef.current = setTimeout(() => {
          if (urlRef.current && shouldReconnectRef.current) {
            connect(urlRef.current);
          }
        }, delay);
      };
    },
    [drainQueue, emit, startHeartbeat, stopHeartbeat]
  );

  // ─── Reconexión inmediata al volver al frente o recuperar la red ──────────
  // El backoff con timer cubre las caídas normales, pero al volver del segundo
  // plano o recuperar conexión no hay que esperar el próximo reintento: si el
  // socket no está OPEN se fuerza la reconexión ya (reset del backoff).

  const forceReconnect = useCallback(() => {
    if (!shouldReconnectRef.current || !urlRef.current) return;
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    connect(urlRef.current);
  }, [connect]);

  useEffect(() => {
    const wake = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      forceReconnect();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    // En el APK, el evento `resume` de Capacitor es más fiable que visibilitychange
    let removeResume: (() => void) | undefined;
    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("resume", wake).then((h) => {
          removeResume = () => h.remove();
        })
      )
      .catch(() => {});
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      removeResume?.();
    };
  }, [forceReconnect]);

  // ─── Conectar / desconectar cuando cambia el usuario ─────────────────────

  useEffect(() => {
    if (!user?.id) {
      // Usuario deslogueado — cerrar todo
      shouldReconnectRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      setStatus("closed");
      urlRef.current = null;
      return;
    }

    const token = localStorage.getItem("accessToken") || "";
    const url = `${WS_BASE}?user_id=${user.id}&token=${token}`;
    urlRef.current = url;
    shouldReconnectRef.current = true;
    retryCountRef.current = 0;
    connect(url);

    return () => {
      shouldReconnectRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
    // Solo reconectar si cambia el user.id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ─── API pública ──────────────────────────────────────────────────────────

  const subscribe = useCallback(
    (event: EventKey, handler: EventHandler): (() => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(handler);

      return () => {
        listenersRef.current.get(event)?.delete(handler);
      };
    },
    []
  );

  const send = useCallback((msg: WsOutgoingEvent) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.warn("[WS] Error al enviar, encolando:", err);
        pendingQueueRef.current.push(msg);
      }
    } else {
      // Encolar para cuando reconecte
      pendingQueueRef.current.push(msg);
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ status, subscribe, send, socketRef }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error(
      "useWebSocketContext debe usarse dentro de <WebSocketProvider>"
    );
  }
  return ctx;
}

/**
 * Hook de conveniencia: suscribirse a un evento WS con limpieza automática.
 * El handler se actualiza en cada render sin re-suscribir.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWsEvent(event: EventKey, handler: (data: any) => void) {
  const { subscribe } = useWebSocketContext();
  // Usamos ref para que el handler siempre sea el último sin re-suscribir
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlerRef = useRef<(data: any) => void>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = subscribe(event, (data) => handlerRef.current(data));
    return unsub;
  }, [event, subscribe]);
}
