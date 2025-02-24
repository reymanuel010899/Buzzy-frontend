import { SUCCEES_REGISTER, FAILED_REGISTER } from "../type";

const inicializerState = {
    user: null,
    access_token: null,
    refresh_token: null,
    error: null,
}

const register = (state = inicializerState, action: {type: string, payload: {user: object, access: string, refresh: string}} ) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_REGISTER:
            return {
                ...state,
                user: payload.user, 
                access_token: payload.access,
                refresh_token: payload.refresh, 
                error: null,     
            };
        case FAILED_REGISTER:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default register;
