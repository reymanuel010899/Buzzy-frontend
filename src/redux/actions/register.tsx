import axios from 'axios'
import { IDataSignUp } from '../../componets/auth/auth.interface';
import { SUCCEES_REGISTER, FAILED_REGISTER } from '../type'

export const register = (formData: IDataSignUp ) => async (dispatch: any) => {

    try {
      console.log("rey manuel3678979")
      const response = await axios.post('http://localhost:8000/api/register/', formData);
      console.log(response)
      
      // Si el registro es exitoso, despachar la acción con los datos del usuario y tokens
      dispatch({
        type: SUCCEES_REGISTER,
        payload: response.data, // Aquí enviamos la respuesta que contiene el usuario y tokens
      });
  
    } catch (error) {
      // Si ocurre un error, despachar la acción con el error
      dispatch({
        type: FAILED_REGISTER,
        payload: ''
      });
    }
  };

