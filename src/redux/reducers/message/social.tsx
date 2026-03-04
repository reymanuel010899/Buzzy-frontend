import { SUCCESS_GET_CONNECTIONS, FAILED_GET_CONNECTIONS } from '../../type';

const initialState = {
    connections: [],
    loading: false,
    error: null
};

export default function socialReducer(state = initialState, action: any) {
    const { type, payload } = action;

    switch (type) {
        case SUCCESS_GET_CONNECTIONS:
            return {
                ...state,
                connections: payload,
                loading: false
            };
        case FAILED_GET_CONNECTIONS:
            return {
                ...state,
                connections: [],
                loading: false,
                error: payload
            };
        default:
            return state;
    }
}
