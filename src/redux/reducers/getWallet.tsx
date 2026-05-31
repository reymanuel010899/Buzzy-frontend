import { IUser } from "../../interfaces/auth";
import { SUCCEES_GET_WALLET, FAILED_GET_WALLLET, SUCCEES_BUY_TOKENS, SUCCEES_WITHDRAW } from "../type";

// --- 1. INTERFACES DE TIPOS ---

// Interfaz para el Payload de Éxito
// Define la estructura de los datos que vienen con la acción SUCCEES
interface SuccessPayload {
    user: IUser;
    balance: number;
    tokens: number;
    pass_code: string;
    wallet_type: string;
    token_value_usd: number;
    gift_fee_pct: number;
}

// Interfaz para la Acción de Éxito
interface SuccessAction {
    type: typeof SUCCEES_GET_WALLET | typeof SUCCEES_BUY_TOKENS;
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
    tokens: number | null;
    pass_code: string | null;
    wallet_type: string | null;
    token_value_usd: number | null;
    gift_fee_pct: number | null;
    error: any | null;
}

// --- 2. ESTADO INICIAL ---

const inicializerState: GetWalletState = {
    user: null,
    balance: null,
    tokens: null,
    pass_code: null,
    wallet_type: null,
    token_value_usd: null,
    gift_fee_pct: null,
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
        case SUCCEES_BUY_TOKENS: {
            // For BUY_TOKENS, payload contains { message, data: { wallet fields } }
            const payloadData = type === SUCCEES_BUY_TOKENS ? (action as any).payload.data : (action as SuccessAction).payload;
            return {
                ...state,
                user: payloadData.user,
                balance: payloadData.balance,
                tokens: payloadData.tokens,
                pass_code: payloadData.pass_code,
                wallet_type: payloadData.wallet_type,
                token_value_usd: payloadData.token_value_usd ?? state.token_value_usd,
                gift_fee_pct: payloadData.gift_fee_pct ?? state.gift_fee_pct,
                error: null
            };
        }
        case SUCCEES_GET_WALLET: {
            const successPayload = (action as SuccessAction).payload;

            return {
                ...state,
                user: successPayload.user || state.user,
                balance: successPayload.balance !== undefined ? successPayload.balance : state.balance,
                tokens: successPayload.tokens !== undefined ? successPayload.tokens : state.tokens,
                pass_code: successPayload.pass_code || state.pass_code,
                wallet_type: successPayload.wallet_type || state.wallet_type,
                token_value_usd: successPayload.token_value_usd ?? state.token_value_usd,
                gift_fee_pct: successPayload.gift_fee_pct ?? state.gift_fee_pct,
                error: null
            };
        }
        case SUCCEES_WITHDRAW: {
            // Payload might contain the new balance or a success message
            const payload = (action as any).payload;
            return {
                ...state,
                balance: payload.balance !== undefined ? payload.balance : state.balance,
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