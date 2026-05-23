import { useCallback } from "react";

/**
 * Dispara el evento global "buzzy:refresh".
 * Cada página/componente se suscribe a ese evento y recarga sus propios datos.
 * El botón flotante solo necesita llamar triggerRefresh() sin saber nada del contexto.
 */
export const useRefreshPage = () => {
  const triggerRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent("buzzy:refresh"));
  }, []);

  return { triggerRefresh };
};
