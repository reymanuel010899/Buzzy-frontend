import {
    SUCCESS_GET_BANK_ACCOUNTS, FAILED_GET_BANK_ACCOUNTS,
    SUCCESS_ADD_BANK_ACCOUNT, FAILED_ADD_BANK_ACCOUNT,
    SUCCESS_DELETE_BANK_ACCOUNT, FAILED_DELETE_BANK_ACCOUNT
} from '../type'
import { apiClient } from '../client/api-client';

export const getBankAccounts = () => async (dispatch: any) => {
    try {
        const response = await apiClient.get('/api/wallet/bank-accounts/');
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_GET_BANK_ACCOUNTS,
                payload: response.data,
            });
        }
    } catch (error) {
        dispatch({
            type: FAILED_GET_BANK_ACCOUNTS,
            payload: (error as any)?.message ?? 'error'
        });
    }
};

export const addBankAccount = (data: any) => async (dispatch: any) => {
    try {
        const response = await apiClient.post('/api/wallet/bank-accounts/', data);
        if (response.status === 201) {
            dispatch({
                type: SUCCESS_ADD_BANK_ACCOUNT,
                payload: response.data,
            });
            return response;
        }
    } catch (error) {
        dispatch({
            type: FAILED_ADD_BANK_ACCOUNT,
            payload: (error as any)?.message ?? 'error'
        });
        return false;
    }
};

export const deleteBankAccount = (id: number) => async (dispatch: any) => {
    try {
        const response = await apiClient.delete(`/api/wallet/bank-accounts/${id}/`);
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_DELETE_BANK_ACCOUNT,
                payload: id,
            });
            return true;
        }
    } catch (error) {
        dispatch({
            type: FAILED_DELETE_BANK_ACCOUNT,
            payload: (error as any)?.message ?? 'error'
        });
        return false;
    }
};
