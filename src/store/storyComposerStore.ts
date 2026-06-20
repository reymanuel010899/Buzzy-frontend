import { create } from 'zustand';

/**
 * Store global del compositor de historias.
 *
 * Permite disparar el flujo de "agregar historia" (selector galería/foto →
 * editor → publicar) desde CUALQUIER pantalla (home, perfil, etc.), igual que
 * el chat se abre desde cualquier lado. La UI y la lógica viven en el
 * componente global <GlobalStoryComposer/> (montado en ProtectedRoute);
 * este store es solo la señal de apertura, una única fuente de verdad.
 */
interface StoryComposerState {
    /** Cuando true, el selector galería/foto debe abrirse. */
    pickerOpen: boolean;
    /** Pide abrir el selector para agregar una historia. */
    openComposer: () => void;
    /** Cierra el selector (no afecta al editor ya abierto). */
    closeComposer: () => void;
}

export const useStoryComposerStore = create<StoryComposerState>((set) => ({
    pickerOpen: false,
    openComposer: () => set({ pickerOpen: true }),
    closeComposer: () => set({ pickerOpen: false }),
}));
