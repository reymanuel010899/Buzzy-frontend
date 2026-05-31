import { SUCCEES_GET_WALLET, FAILED_GET_WALLLET } from '../type'
import { apiClient } from '../client/api-client';
// const user_seccion =  JSON.parse(localStorage.getItem('user') || '')

export const getWallet = () => async (dispatch: any) => {
  try {
      const response = await apiClient.get(`/api/get-wallet/`);
    if (response.status == 200) {
      dispatch({
        type: SUCCEES_GET_WALLET,
        payload: response.data,
      });
    }
  } catch (error: any) {
    dispatch({
      type: FAILED_GET_WALLLET,
      payload: error?.message ?? 'error',
    });
  }
};

