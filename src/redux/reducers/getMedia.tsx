import { SUCCEES_MEDIA, FAILED_MEDIA } from "../type";
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

// 4. **Tipar la Acción de Error**
// La acción de fallo debe llevar la información del error.
interface FailedAction {
    type: typeof FAILED_MEDIA;
    payload: null;
}

// 5. **Combinar los tipos de acción**
type MediaAction = SuccessAction | FailedAction;


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
        case FAILED_MEDIA:
            return {
                ...state,
                // Usamos action.payload directamente, que contiene el error
                error: action.payload,
                media: null, // Resetear media en caso de error
            };
        default:
            return { ...state };
    }
}

export default getMedia;