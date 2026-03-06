import {
    SUCCEES_CREATE_DEPOSIT,
    FAILED_CREATE_DEPOSIT,
    SUCCEES_WITHDRAW,
    FAILED_WITHDRAW,
    SUCCEES_GET_WALLET
} from '../type';
import { apiClient } from '../client/api-client';

export const createDepositSession = (amount: number) => async (dispatch: any) => {
    try {
        const response = await apiClient.post(`/api/create-deposit-session/`, { amount });
        if (response.status === 200) {
            dispatch({
                type: SUCCEES_CREATE_DEPOSIT,
                payload: response.data,
            });
            if (response.data.url) {
                window.location.href = response.data.url;
            }
            return response.data;
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_CREATE_DEPOSIT,
            payload: error.response?.data || error.message
        });
        throw error;
    }
};

export const withdrawFunds = (amount: number) => async (dispatch: any) => {
    try {
        const response = await apiClient.post(`/api/withdraw-funds/`, { amount });
        if (response.status === 200) {
            dispatch({
                type: SUCCEES_WITHDRAW,
                payload: response.data,
            });
            // Update wallet balance in state
            dispatch({
                type: SUCCEES_GET_WALLET,
                payload: { balance: response.data.balance }
            });
            return response.data;
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_WITHDRAW,
            payload: error.response?.data || error.message
        });
        throw error;
    }
};
