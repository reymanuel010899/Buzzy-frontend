import {
    SUCCESS_SAVE_AVAILABILITY,
    FAILED_SAVE_AVAILABILITY,
    SUCCESS_GET_AVAILABILITY,
    FAILED_GET_AVAILABILITY,
} from '../type'

interface AvailabilityState {
    availability: any | null
    loading: boolean
    saving: boolean
    error: string | null
    saved: boolean
}

const initialState: AvailabilityState = {
    availability: null,
    loading: false,
    saving: false,
    error: null,
    saved: false,
}

export default function availabilityReducer(state = initialState, action: any): AvailabilityState {
    switch (action.type) {
        case SUCCESS_GET_AVAILABILITY:
            return {
                ...state,
                availability: action.payload,
                loading: false,
                error: null,
            }
        case FAILED_GET_AVAILABILITY:
            return {
                ...state,
                loading: false,
                error: action.payload,
            }
        case SUCCESS_SAVE_AVAILABILITY:
            return {
                ...state,
                saving: false,
                saved: true,
                error: null,
            }
        case FAILED_SAVE_AVAILABILITY:
            return {
                ...state,
                saving: false,
                saved: false,
                error: action.payload,
            }
        default:
            return state
    }
}
