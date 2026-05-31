import { SUCCEES_MEDIA, FAILED_MEDIA, APPEND_MEDIA, RESET_MEDIA } from "../type";
// Importa el tipo Video que usaste antes (debe ser accesible aquí)
import { Video } from "../../components/index/main.interface"; // Ejemplo de ruta

// 1. **Definir la Interfaz del Estado** (Crucial)
interface GetMediaState {
    // Definimos 'media' como un array de Video o null.
    media: Video[] | null;
    error: string | null;
}

// 2. **Tipar el Estado Inicial**
const inicializerState: GetMediaState = {
    media: null, // Inicialmente null, pero TypeScript sabe que será Video[]
    error: null,
}

// 3. **Tipar la Acción de Éxito**
// La acción de éxito debe llevar el array de Video en el payload.
interface SuccessAction {
    type: typeof SUCCEES_MEDIA;
    payload: Video[]; // El payload es el array de videos
}

interface AppendAction {
    type: typeof APPEND_MEDIA;
    payload: Video[];
}

interface ResetAction {
    type: typeof RESET_MEDIA;
}

// 4. **Tipar la Acción de Error**
// La acción de fallo debe llevar la información del error.
interface FailedAction {
    type: typeof FAILED_MEDIA;
    payload: any;
}

// 5. **Combinar los tipos de acción**
type MediaAction = SuccessAction | FailedAction | AppendAction | ResetAction;


// 6. **Tipar la Función Reducer**
const getMedia = (
    state: GetMediaState = inicializerState,
    action: MediaAction
): GetMediaState => {

    switch (action.type) {
        case SUCCEES_MEDIA: {
            const payload = action.payload as Video[];
            const seen = new Set<number>();
            const deduped = payload.filter((v) => seen.has(v.id) ? false : (seen.add(v.id), true));
            return {
                ...state,
                media: deduped,
                error: null,
            };
        }
        case APPEND_MEDIA: {
            const existing = state.media ?? [];
            const existingIds = new Set(existing.map((v) => v.id));
            const fresh = (action.payload as Video[]).filter((v) => !existingIds.has(v.id));
            return {
                ...state,
                media: fresh.length > 0 ? [...existing, ...fresh] : existing,
                error: null,
            };
        }
        case RESET_MEDIA:
            return {
                ...state,
                media: null,
                error: null,
            };
        case FAILED_MEDIA:
            return {
                ...state,
                error: action.payload,
                // Sin internet: conservar los videos del cache — no mostrar pantalla vacía
                // Si ya había cache (APPEND_MEDIA corrió antes), lo mantenemos visible
                media: state.media ?? [],
            };
        default:
            return { ...state };
    }
}

export default getMedia;