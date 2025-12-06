import { IUser } from "../../interfaces/auth";
import { SUCCEES_GET_WALLET, FAILED_GET_WALLLET } from "../type";

// --- 1. INTERFACES DE TIPOS ---

// Interfaz para el Payload de Éxito
// Define la estructura de los datos que vienen con la acción SUCCEES
interface SuccessPayload {
    user: IUser; 
    balance: number; // Asumo 'number', cámbialo a 'string' si es necesario
    pass_code: string;
    wallet_type: string;
}

// Interfaz para la Acción de Éxito
interface SuccessAction {
    type: typeof SUCCEES_GET_WALLET;
    payload: SuccessPayload;
}

// Interfaz para la Acción de Fallo
interface FailedAction {
    type: typeof FAILED_GET_WALLLET;
    payload: any; // El payload es el objeto o mensaje de error
}

// Tipo de Acción Combinado (incluye el caso por defecto sin payload)
type WalletAction = SuccessAction | FailedAction | { type: string };


// Interfaz del Estado del Reducer (Crucial para RootState)
export interface GetWalletState {
    user: IUser | null;         
    balance: number | null;      
    pass_code: string | null;
    wallet_type: string | null;  
    error: any | null;
}

// --- 2. ESTADO INICIAL ---

const inicializerState: GetWalletState = {
    user: null,
    balance: null, 
    pass_code: null,
    wallet_type: null,
    error: null,
}

// --- 3. FUNCIÓN REDUCER CORREGIDA ---

const getWalletReducer = (
    state: GetWalletState = inicializerState, 
    action: WalletAction
): GetWalletState => { 
    
    // Solo desestructuramos 'type', que siempre existe
    const { type } = action; 
    
    switch (type) {
        case SUCCEES_GET_WALLET: { 
            // Hacemos cast a SuccessAction para acceder a .payload de forma segura
            const successPayload = (action as SuccessAction).payload;
            
            return {
                ...state, 
                user: successPayload.user, 
                balance: successPayload.balance, 
                pass_code: successPayload.pass_code, 
                wallet_type: successPayload.wallet_type, 
                error: null
            };
        } 
        case FAILED_GET_WALLLET: {
            // Hacemos cast a FailedAction para acceder a .payload
            const errorPayload = (action as FailedAction).payload;

            return {
                ...state,
                error: errorPayload, 
                user: null, // Limpiamos la data en caso de fallo
                balance: null,
                pass_code: null,
                wallet_type: null,
            };
        }
        default:
            return state;
    }
}

export default getWalletReducer;