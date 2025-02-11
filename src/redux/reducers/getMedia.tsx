import { SUCCEES_REGISTER, FAILED_REGISTER } from "../type";

const inicializerState = {
    media: null,
    error: null,
}

const getMedia = (state = inicializerState, action: {type: string, payload: any}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_REGISTER:
            // Al hacer el registro exitoso, guardamos el usuario y el token
            return {
                ...state,
                media: payload,    // Asegúrate de que 'user' y 'token' estén en el payload
                error: null,           // Limpiamos el error
            };
        case FAILED_REGISTER:
            // Si el registro falla, almacenamos el error
            return {
                ...state,
                error: payload,  // En caso de error, almacenamos el mensaje de error
            };
        default:
            return state;
    }
}

export default getMedia;
