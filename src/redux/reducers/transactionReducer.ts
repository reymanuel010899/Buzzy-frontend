import {
  SUCCESS_GET_TRANSACTIONS,
  FAILED_GET_TRANSACTIONS,
  LOADING_GET_TRANSACTIONS,
  APPEND_TRANSACTIONS,
} from '../type';

export interface WalletTransaction {
  id: number;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer';
  status: 'pending' | 'completed' | 'failed';
  amount: string;
  description: string | null;
  payment_id: string | null;
  direction: 'income' | 'expense';
  display_description: string;
  created_at: string;
}

export interface TransactionState {
  transactions: WalletTransaction[];
  count: number;
  page: number;
  has_next: boolean;
  loading: boolean;
  error: any;
}

const initialState: TransactionState = {
  transactions: [],
  count: 0,
  page: 1,
  has_next: false,
  loading: false,
  error: null,
};

export const transactionReducer = (
  state = initialState,
  action: any
): TransactionState => {
  switch (action.type) {
    case LOADING_GET_TRANSACTIONS:
      return { ...state, loading: true, error: null };

    case SUCCESS_GET_TRANSACTIONS:
      return {
        ...state,
        loading: false,
        transactions: action.payload.results,
        count: action.payload.count,
        page: action.payload.page,
        has_next: action.payload.has_next,
      };

    case APPEND_TRANSACTIONS:
      return {
        ...state,
        loading: false,
        transactions: [...state.transactions, ...action.payload.results],
        count: action.payload.count,
        page: action.payload.page,
        has_next: action.payload.has_next,
      };

    case FAILED_GET_TRANSACTIONS:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};
