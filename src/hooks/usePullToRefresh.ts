import { useState, useRef, useCallback, useEffect } from "react";

const THRESHOLD = 80;

function isOnline(): boolean {
  return navigator.onLine;
}

function dispatchOfflineToast() {
  window.dispatchEvent(new CustomEvent("buzzy:offline-toast"));
}

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  checkScrollTop?: () => boolean;
  /** Si es true escucha en window en lugar de retornar handlers para el DOM */
  global?: boolean;
  /** Si es false el hook ignora los gestos (ej: con el modal de chats abierto) */
  enabled?: boolean;
}

export const usePullToRefresh = ({ onRefresh, checkScrollTop, global: isGlobal = false, enabled = true }: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startYRef = useRef<number | null>(null);
  const deltaRef = useRef<number>(0);
  const onRefreshRef = useRef(onRefresh);
  const checkScrollTopRef = useRef(checkScrollTop);
  const enabledRef = useRef(enabled);
  onRefreshRef.current = onRefresh;
  checkScrollTopRef.current = checkScrollTop;
  enabledRef.current = enabled;

  const handleStart = useCallback((clientY: number) => {
    if (!enabledRef.current) return;
    const atTop = checkScrollTopRef.current ? checkScrollTopRef.current() : true;
    if (atTop) startYRef.current = clientY;
  }, []);

  const handleMove = useCallback((clientY: number) => {
    if (!enabledRef.current) return;
    if (startYRef.current === null) return;
    const delta = clientY - startYRef.current;
    if (delta > 0) {
      deltaRef.current = delta;
      setPullProgress(Math.min(delta / THRESHOLD, 1));
    }
  }, []);

  const handleEnd = useCallback(async () => {
    if (deltaRef.current >= THRESHOLD) {
      if (!isOnline()) {
        // Sin internet: cancelar silenciosamente y avisar
        dispatchOfflineToast();
        setPullProgress(0);
        startYRef.current = null;
        deltaRef.current = 0;
        return;
      }
      setIsPulling(true);
      setPullProgress(0);
      try {
        await onRefreshRef.current();
      } finally {
        setIsPulling(false);
      }
    } else {
      setPullProgress(0);
    }
    startYRef.current = null;
    deltaRef.current = 0;
  }, []);

  // Al deshabilitar a mitad de gesto, cancelar cualquier pull en curso
  useEffect(() => {
    if (!enabled) {
      startYRef.current = null;
      deltaRef.current = 0;
      setPullProgress(0);
      setIsPulling(false);
    }
  }, [enabled]);

  // Modo global: escucha directamente en window (pasa por encima de cualquier scroll)
  useEffect(() => {
    if (!isGlobal || !enabled) return;

    const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isGlobal, enabled, handleStart, handleMove, handleEnd]);

  // Handlers para uso en elementos del DOM (modo no-global)
  const onTouchStart = useCallback((e: React.TouchEvent) => handleStart(e.touches[0].clientY), [handleStart]);
  const onTouchMove = useCallback((e: React.TouchEvent) => handleMove(e.touches[0].clientY), [handleMove]);
  const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  return { isPulling, pullProgress, onTouchStart, onTouchMove, onTouchEnd };
};
