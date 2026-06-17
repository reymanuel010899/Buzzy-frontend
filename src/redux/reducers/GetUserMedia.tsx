import { SUCCEES_GET_MEDIA_USER, FAILED_GET_MEDIA_USER, RESET_MEDIA_USER } from "../type";

const inicializerState = {
    media_user: null,
    error: null,
}

const getMediaByUser = (state = inicializerState, action: {type: string, payload: any}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_GET_MEDIA_USER:
            return {
                ...state,
                media_user: payload,   
                error: null,          
            };
        case FAILED_GET_MEDIA_USER:
            return {
                ...state,
                error: payload,
            };
        case RESET_MEDIA_USER:
            return { ...inicializerState };
        default:
            return state;
    }
}

export default getMediaByUser;
