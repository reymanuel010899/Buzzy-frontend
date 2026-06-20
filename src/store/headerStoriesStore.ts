import { create } from 'zustand';

/**
 * Store global para mostrar la fila de historias DENTRO del header (Navar),
 * que es un componente compartido entre pantallas.
 *
 * La lógica de historias vive en el home (index.tsx): grupos, avatar del
 * usuario, y los callbacks de "ver historia" / "agregar historia". El home
 * PUBLICA esos datos aquí (vía `setStoriesData`), y <HeaderStories/> (montado
 * en el Navar) los LEE y renderiza. Una sola fuente de verdad, sin duplicar
 * el estado del visor de historias.
 *
 * Cuando el home se desmonta (no estás en el feed), `enabled` es false y el
 * header no muestra historias.
 */

export interface HeaderUser {
    id: number | string;
    username: string;
    profile_picture?: string;
}

export interface HeaderStoryGroup {
    id?: number | string;
    user: HeaderUser;
    media: any[];
    hasSubscriberStory?: boolean;
}

interface HeaderStoriesState {
    /** Solo true cuando el home está montado y debe mostrar historias en el header. */
    enabled: boolean;
    /** Avatar del usuario actual (para el círculo "Tu historia / +"). */
    currentUser: HeaderUser | null;
    /** Está subiéndose una historia ahora mismo (spinner en el "+"). */
    isUploading: boolean;
    /** Grupos de historias (una burbuja por usuario). */
    groups: HeaderStoryGroup[];
    /** Abre el visor de historias del grupo en `index`. */
    onStoryClick: (index: number) => void;
    /** Dispara el flujo de agregar historia (selector → editor → publicar). */
    onAddStory: () => void;
    /** Abre la galería para seleccionar una historia. */
    onPickStoryFromLibrary: () => void;
    /** Abre la cámara para capturar una historia. */
    onCaptureStoryPhoto: () => void;

    /** El home publica/actualiza todos los datos de una vez. */
    setStoriesData: (data: Partial<Omit<HeaderStoriesState, 'setStoriesData' | 'reset'>>) => void;
    /** El home limpia el store al desmontarse. */
    reset: () => void;
}

const noop = () => {};

export const useHeaderStoriesStore = create<HeaderStoriesState>((set) => ({
    enabled: false,
    currentUser: null,
    isUploading: false,
    groups: [],
    onStoryClick: noop,
    onAddStory: noop,
    onPickStoryFromLibrary: noop,
    onCaptureStoryPhoto: noop,
    setStoriesData: (data) => set(data),
    reset: () =>
        set({
            enabled: false,
            currentUser: null,
            isUploading: false,
            groups: [],
            onStoryClick: noop,
            onAddStory: noop,
            onPickStoryFromLibrary: noop,
            onCaptureStoryPhoto: noop,
        }),
}));
