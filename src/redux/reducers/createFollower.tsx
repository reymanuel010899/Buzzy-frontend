import {  FAILED_CREATE_FOLLOWER, SUCCEES_CREATE_FOLLOWER } from '../type'

const inicializerState = {
    follower_user_id: null ,
}

const createFollowerReducer = (state = inicializerState, action: {type: string, payload: {follower_user_id: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_CREATE_FOLLOWER:
            return {...state, follower_user_id: payload.follower_user_id};
        case FAILED_CREATE_FOLLOWER:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default createFollowerReducer;
