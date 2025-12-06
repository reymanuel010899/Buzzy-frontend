import {  FAILED_CREATE_TRANSACTIONS, SUCCEES_CREATE_TRANSACTIONS } from '../type'
import apiClient from '../client/api-client';

type CreateTransactionsBody = {
  amount: number;
  transaction_type: string;
  description: string;
};
export const createTransactions = (body: CreateTransactionsBody) => async (dispatch: any) => {
    try {
      const response = await apiClient.post('/wallet/api/create-transactions/', body);
      if (response.status === 200) {
        dispatch({
          type: SUCCEES_CREATE_TRANSACTIONS,
          payload: response.data,
        });
      }
  
    } catch {
      dispatch({
        type: FAILED_CREATE_TRANSACTIONS,
        payload: ''
      });
    }
  };

