import {  FAILED_CREATE_COMMENT, SUCCEES_CREATE_COMMENT } from '../type'

const inicializerState = {
    user_id: null ,
    video_id: null,
    content: null,
}

const createCommentReducer = (state = inicializerState, action: {type: string, payload: {user_id: string, video_id: string, content: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_CREATE_COMMENT:
            return {...state, user_id: payload.user_id, video_id: payload.video_id, content: payload.content};
        case FAILED_CREATE_COMMENT:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default createCommentReducer;
