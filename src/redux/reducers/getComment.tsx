import { FAILED_GET_COMMENT, SUCCEES_GET_COMMENT } from "../type";

// 1. **Definir la Interfaz del Estado (GetCommentState)**
// Asumo que tu reducer devuelve la *lista* de comentarios, no solo uno,
// ya que el nombre es 'getCommentReducer'. Si solo devuelve uno, ajusta el 'comments: []'.

interface Comment {
    video_id: string;
    content: string;
    user: object; // O el tipo de tu objeto User
    uuid: string;
    created_at: string;
}

interface GetCommentState {
    // Si tu reducer *acumula* comentarios, debería ser un array.
    // Si solo guarda el último, debería ser Comment | null.
    // Basado en el nombre, asumiré que devuelve una lista.
    comments: Comment[]; // Cambiamos esto para reflejar que contendrá data real
    error: string | null;
}

// 2. **Tipar el Estado Inicial**
const inicializerState: GetCommentState = {
    // Lo inicializamos como array vacío, no null, si queremos una lista.
    comments: [], 
    error: null,
}

// 3. **Tipar las Acciones**
// El payload de la acción de éxito debería contener la lista de comentarios.
interface SuccessAction {
    type: typeof SUCCEES_GET_COMMENT;
    // Asumo que el payload de éxito es un array de Comments.
    payload: Comment[]; 
}

interface FailedAction {
    type: typeof FAILED_GET_COMMENT;
    payload: null;
}

type CommentAction = SuccessAction | FailedAction | { type: string };


// 4. **Tipar la Función Reducer**
const getCommentReducer = (
    state: GetCommentState = inicializerState, 
    action: CommentAction
): GetCommentState => { 
    
    switch (action.type) {
        case SUCCEES_GET_COMMENT:
            // Usamos action.payload directamente para actualizar la propiedad 'comments'
            return {
                ...state,
                // Le asignamos el array de comentarios completo (payload) a la propiedad 'comments'
                comments: (action as SuccessAction).payload, 
                error: null,          
            };
        case FAILED_GET_COMMENT:
            return {
                ...state,
                error: "",
            };
        default:
            return state;
    }
}

export default getCommentReducer;