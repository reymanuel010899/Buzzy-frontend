import { SUCCEES_GET_USER, FAILED_GET_USER } from "../type";

const inicializerState = {
    user: null ,
    error: null,
}

const getUserDetail = (state = inicializerState, action: {type: string, payload: {type: string, user: object}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_GET_USER:
            return {...state, user: payload.user, error: null};
        case FAILED_GET_USER:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default getUserDetail;
