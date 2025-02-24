import { SUCCEES_LOGIN, FAILED_LOGIN } from "../type";

const inicializerState = {
    user: null,
    access_token: null,
    refresh_token: null,
    error: null,
}

const LoginReducer = (state = inicializerState, action: {type: string, payload: {user: object, access: string, refresh: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_LOGIN:
            return {
                ...state,
                user: payload.user, 
                access_token: payload.access,
                refresh_token: payload.refresh, 
                error: null,     
            };
        case FAILED_LOGIN:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default LoginReducer;
