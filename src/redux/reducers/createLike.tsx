import {  FAILED_CREATE_LIKE, SUCCEES_CREATE_LIKE } from '../type'

const inicializerState = {
    user_id: null ,
    video_id: null,
}

const createLikeReducer = (state = inicializerState, action: {type: string, payload: {user_id: string, video_id: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_CREATE_LIKE:
            return {...state, user_id: payload.user_id, video_id: payload.video_id};
        case FAILED_CREATE_LIKE:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default createLikeReducer;
