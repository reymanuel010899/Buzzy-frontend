import { apiClient } from '../client/api-client';
import {
  SUCCESS_GET_TRANSACTIONS,
  FAILED_GET_TRANSACTIONS,
  LOADING_GET_TRANSACTIONS,
  APPEND_TRANSACTIONS,
} from '../type';

export type TxFilter = 'all' | 'income' | 'expense';

export const getTransactions =
  (filter: TxFilter = 'all', page = 1, append = false, pageSize = 5) =>
  async (dispatch: any) => {
    dispatch({ type: LOADING_GET_TRANSACTIONS });
    try {
      const { data } = await apiClient.get('/api/wallet/transactions/', {
        params: { type: filter, page, page_size: pageSize },
      });
      dispatch({
        type: append ? APPEND_TRANSACTIONS : SUCCESS_GET_TRANSACTIONS,
        payload: data,
      });
      return data;
    } catch (err: any) {
      dispatch({
        type: FAILED_GET_TRANSACTIONS,
        payload: err.response?.data || err.message,
      });
    }
  };
