import { SUCCEES_GET_USER, FAILED_GET_USER, USER_NOT_FOUND } from '../type'
import { apiClient } from '../client/api-client';

export const getUser = (username = '') => async (dispatch: any) => {
  try {
    const response = await apiClient.get(`/api/get-user/${username}/`);
    const data = response.data;

    if (data?.user?.is_owner) {
      dispatch({
        type: USER_NOT_FOUND,
        payload: { user: data.user, searchedUsername: username },
      });
    } else {
      dispatch({ type: SUCCEES_GET_USER, payload: data });
    }
  } catch (error: any) {
    dispatch({ type: FAILED_GET_USER, payload: error });
  }
};
