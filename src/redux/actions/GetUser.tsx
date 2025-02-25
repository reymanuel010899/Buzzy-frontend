import axios from 'axios'
import { SUCCEES_GET_USER, FAILED_GET_USER } from '../type'

export const getUser = () => async (dispatch: any) => {
    try {
      const response = await axios.get('http://localhost:8000/api/get-user/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      });
      console.log(response)
      if (response.status == 200) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
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

