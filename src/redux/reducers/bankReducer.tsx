import {
    SUCCESS_GET_BANK_ACCOUNTS, FAILED_GET_BANK_ACCOUNTS,
    SUCCESS_ADD_BANK_ACCOUNT, FAILED_ADD_BANK_ACCOUNT,
    SUCCESS_DELETE_BANK_ACCOUNT, FAILED_DELETE_BANK_ACCOUNT
} from '../type'

const initialState = {
    accounts: [],
    loading: false,
    error: null
};

export default function bankReducer(state = initialState, action: any) {
    switch (action.type) {
        case SUCCESS_GET_BANK_ACCOUNTS:
            return {
                ...state,
                accounts: action.payload,
                loading: false,
                error: null
            };
        case SUCCESS_ADD_BANK_ACCOUNT:
            return {
                ...state,
                accounts: [...state.accounts, action.payload],
                loading: false,
                error: null
            };
        case SUCCESS_DELETE_BANK_ACCOUNT:
            return {
                ...state,
                accounts: state.accounts.filter((acc: any) => acc.id !== action.payload),
                loading: false,
                error: null
            };
        case FAILED_GET_BANK_ACCOUNTS:
        case FAILED_ADD_BANK_ACCOUNT:
        case FAILED_DELETE_BANK_ACCOUNT:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        default:
            return state;
    }
}
