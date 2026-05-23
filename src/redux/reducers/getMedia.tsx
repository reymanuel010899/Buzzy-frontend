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
        case SUCCEES_MEDIA:
            // Usamos action.payload directamente ya que lo tipamos como Video[]
            return {
                ...state,
                media: action.payload as Video[], // TypeScript ahora lo entiende
                error: null,
            };
        case APPEND_MEDIA:
            return {
                ...state,
                media: state.media ? [...state.media, ...(action.payload as Video[])] : (action.payload as Video[]),
                error: null,
            };
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
                // Conservar los videos existentes — no borrar el feed del usuario por un error de red
                media: state.media,
            };
        default:
            return { ...state };
    }
}

export default getMedia;