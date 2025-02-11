import { SUCCEES_MEDIA, FAILED_MEDIA } from "../type";

const inicializerState = {
    media: null,
    error: null,
}

const getMedia = (state = inicializerState, action: {type: string, payload: any}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_MEDIA:
            return {
                ...state,
                media: payload,   
                error: null,          
            };
        case FAILED_MEDIA:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default getMedia;
