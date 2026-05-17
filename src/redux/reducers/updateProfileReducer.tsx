import {
    SUCCESS_UPDATE_PROFILE, FAILED_UPDATE_PROFILE
} from '../type'

const initialState = {
    loading: false,
    error: null,
    success: false,
    data: null
};

export default function updateProfileReducer(state = initialState, action: any) {
    switch (action.type) {
        case SUCCESS_UPDATE_PROFILE:
            return {
                ...state,
                loading: false,
                success: true,
                data: action.payload,
                error: null
            };
        case FAILED_UPDATE_PROFILE:
            return {
                ...state,
                loading: false,
                success: false,
                error: action.payload
            };
        case 'RESET_UPDATE_STATE':
            return initialState;
        default:
            return state;
    }
}
