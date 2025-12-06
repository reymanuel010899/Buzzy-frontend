import { SUCCEES_GET_USER, FAILED_GET_USER } from "../type";

// 1. **Definir la Interfaz del Estado (Crucial)**
// Define la estructura exacta que tendrá el estado de este reducer.
interface GetUserState {
    // Es recomendable reemplazar 'object' con el tipo real de tu objeto User si lo tienes
    user: object | null; 
    error: string | null; 
}

const inicializerState: GetUserState = {
    user: null,
    error: null,
}

interface GetUserAction {
    type: string;
    payload: { user: object, type?: string }
}

const getUserDetail = (
    state: GetUserState = inicializerState, 
    action: GetUserAction
): GetUserState => { 
    
    const { type, payload } = action;
    
    switch (type) {
        case SUCCEES_GET_USER:
            return {...state, user: payload?.user || null, error: null}; 
        case FAILED_GET_USER:
            return {
                ...state,
                user: null,
                error: '',
            };
        default:
            return state;
    }
}

export default getUserDetail;