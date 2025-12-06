import { SUCCEES_CREATE_TRANSACTIONS, FAILED_CREATE_TRANSACTIONS } from "../type";

const inicializerState = {
    transaction_type: null ,
    amount: null,
    description: null,
}

const createTransactionReducer = (state = inicializerState, action: {type: string, payload: {transaction_type: string, amount: string, description: string}}) => { 
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_CREATE_TRANSACTIONS:
            return {...state, transaction_type: payload.transaction_type, amount: payload.amount, description: payload.description};
        case FAILED_CREATE_TRANSACTIONS:
            return {
                ...state,
                error: payload,
            };
        default:
            return state;
    }
}

export default createTransactionReducer;
