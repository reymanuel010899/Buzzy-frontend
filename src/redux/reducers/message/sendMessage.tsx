import { FAILED_SEND_MESSAGE, SUCCEES_SEND_MESSAGE } from '../../type';

const inicializerState = {
    status: null,
    message: null ,
    chat_uuid: null,
}

const sendMessageReducer = (state = inicializerState, action: {type: string, payload: {message: null, status: string, chat_uuid: null}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_SEND_MESSAGE:
            return {...state, status: payload.status, message: payload.message, chat_uuid: payload.chat_uuid};
        case FAILED_SEND_MESSAGE:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default sendMessageReducer;
