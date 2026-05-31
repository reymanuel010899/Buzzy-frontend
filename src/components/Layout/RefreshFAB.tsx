import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useRefreshPage } from "../../hooks/useRefreshPage";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";

const RefreshFAB: React.FC = () => {
  const { triggerRefresh } = useRefreshPage();
  const { pathname } = useLocation();
  const [spinning, setSpinning] = useState(false);

  // El home (/) tiene su propio pull-to-refresh en el feed
  const isHome = pathname === "/";
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up" || pathname.startsWith("/register") || pathname.startsWith("/verify");

  const handleRefresh = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    triggerRefresh();
    setTimeout(() => setSpinning(false), 1000);
  }, [spinning, triggerRefresh]);

  // Modo global: escucha en window, funciona en cualquier página con scroll
  const { isPulling, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    global: !isHome && !isAuthPage,
  });

  const isActive = isPulling || pullProgress > 0;

  return (
    <>
      {/* Indicador visual del pull — solo fuera del home y auth */}
      <AnimatePresence>
        {!isHome && !isAuthPage && isActive && (
          <motion.div
            key="pull-indicator"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isPulling ? 1 : pullProgress, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[9100] flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15"
          >
            <motion.div
              animate={isPulling ? { rotate: 360 } : { rotate: pullProgress * 360 }}
              transition={isPulling ? { duration: 0.7, repeat: Infinity, ease: "linear" } : { duration: 0 }}
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" strokeWidth={2.5} />
            </motion.div>
            <span className="text-xs font-bold text-white/70">
              {isPulling ? "Actualizando..." : "Suelta para actualizar"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante — solo fuera del home y auth */}
      {!isHome && !isAuthPage && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.88 }}
          onClick={handleRefresh}
          aria-label="Refrescar página"
          className="fixed bottom-15 right-3 z-[9000] w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-md shadow-black/30 hover:bg-white/20 transition-colors"
        >
          <motion.div
            animate={spinning ? { rotate: 360 } : { rotate: 0 }}
            transition={spinning ? { duration: 0.7, ease: "easeInOut" } : { duration: 0 }}
          >
            <RefreshCw className="w-3 h-3 text-white/60" strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      )}
    </>
  );
};

export default RefreshFAB;
