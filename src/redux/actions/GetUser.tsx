import { SUCCEES_GET_USER, FAILED_GET_USER } from '../type'
import { apiClient } from '../client/api-client';
// const user_seccion =  JSON.parse(localStorage.getItem('user') || '')

export const getUser = (username = '') => async (dispatch: any) => {
  console.log("getUser thunk called with username:", username);

  try {
    const response = await apiClient.get(`/api/get-user/${username}/`);
    if (response.status == 200) {
      // localStorage.setItem('user', JSON.stringify(response.data.user))
      dispatch({
        type: SUCCEES_GET_USER,
        payload: response.data,
      });
    }
  } catch (error) {
    dispatch({
      type: FAILED_GET_USER,
      payload: error
    });
  }
};

