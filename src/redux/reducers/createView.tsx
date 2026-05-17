import {  FAILED_CREATE_VIEW, SUCCEES_CREATE_VIEW } from '../type'

const inicializerState = {
    user_id: null ,
    video_id: null,
}

const createViewReducer = (state = inicializerState, action: {type: string, payload: {user_id: string, video_id: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_CREATE_VIEW:
            return {...state, user_id: payload.user_id, video_id: payload.video_id};
        case FAILED_CREATE_VIEW:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default createViewReducer;
