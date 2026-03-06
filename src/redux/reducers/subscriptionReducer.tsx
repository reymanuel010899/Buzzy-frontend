import {
    SUCCESS_GET_SUBSCRIPTIONS,
    FAILED_GET_SUBSCRIPTIONS,
    SUCCESS_CREATE_CHECKOUT,
    FAILED_CREATE_CHECKOUT
} from '../type'

const initialState = {
    plans: [],
    loading: false,
    error: null,
    checkoutUrl: null
}

export default function subscriptionReducer(state = initialState, action: any) {
    switch (action.type) {
        case SUCCESS_GET_SUBSCRIPTIONS:
            return {
                ...state,
                plans: action.payload,
                loading: false,
                error: null
            }
        case FAILED_GET_SUBSCRIPTIONS:
            return {
                ...state,
                loading: false,
                error: action.payload
            }
        case SUCCESS_CREATE_CHECKOUT:
            return {
                ...state,
                checkoutUrl: action.payload.url,
                loading: false,
                error: null
            }
        case FAILED_CREATE_CHECKOUT:
            return {
                ...state,
                loading: false,
                error: action.payload
            }
        default:
            return state
    }
}
