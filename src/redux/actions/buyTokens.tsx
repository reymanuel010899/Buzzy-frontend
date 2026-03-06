import { SUCCEES_BUY_TOKENS, FAILED_BUY_TOKENS } from '../type'
import { apiClient } from '../client/api-client';

export const buyTokens = (tokens: number, cost: number) => async (dispatch: any) => {
    try {
        const response = await apiClient.post(`/api/buy-tokens/`, {
            tokens,
            cost
        });
        if (response.status === 200 || response.status === 201) {
            dispatch({
                type: SUCCEES_BUY_TOKENS,
                payload: response.data,
            });
            return response.data;
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_BUY_TOKENS,
            payload: error.response?.data || error.message
        });
        throw error;
    }
};
