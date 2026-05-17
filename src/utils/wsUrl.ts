/**
 * Returns the base WebSocket URL for the Buzzy socket server.
 * Uses VITE_WS_URL in dev/prod; auto-detects protocol in browser if not set.
 */
export function getWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL;
  if (env) return env;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:8001/ws`;
}
