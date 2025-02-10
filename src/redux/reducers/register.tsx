import { SUCCEES_REGISTER, FAILED_REGISTER } from "../type";

const inicializerState = {
    user: null,
    token: null, // Asegúrate de usar 'token' en lugar de 'toke'
    error: null, // Agregamos un estado para manejar los errores
}

const register = (state = inicializerState, action: {type: string, payload: any}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_REGISTER:
            // Al hacer el registro exitoso, guardamos el usuario y el token
            return {
                ...state,
                user: payload.user,    // Asegúrate de que 'user' y 'token' estén en el payload
                token: payload.token,  // Si el backend devuelve un token de acceso, lo agregamos aquí
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

export default register;
