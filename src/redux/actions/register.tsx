import axios from 'axios'
import { IDataSignUp } from '../../components/auth/auth.interface';
import { SUCCEES_REGISTER, FAILED_REGISTER } from '../type'

export const register = (formData: IDataSignUp ) => async (dispatch: any) => {

    try {
      const response = await axios.post('http://localhost:8000/api/register/', formData);
      if (response.status == 201) {
        localStorage.setItem('refreshToken', response.data.refresh)
        localStorage.setItem('accessToken', response.data.access)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('user', JSON.stringify(response.data.user))
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
    }
  };

