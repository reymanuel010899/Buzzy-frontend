import { IDataSignUp } from '../../components/auth/auth.interface';
import { SUCCEES_REGISTER, FAILED_REGISTER } from '../type'
import { apiClient } from '../client/api-client';
import type { AppDispatch } from '../../store';

export const register = (formData: IDataSignUp) => async (dispatch: AppDispatch) => {

  try {
    const response = await apiClient.post('/api/register/', formData);
    if (response.status == 201) {
      dispatch({
        type: SUCCEES_REGISTER,
        payload: response.data,
      });
    }
  } catch (error) {
    dispatch({
      type: FAILED_REGISTER,
      payload: error
    });
    throw error;
  }
};
