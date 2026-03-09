import {
    SUCCESS_UPDATE_PROFILE, FAILED_UPDATE_PROFILE,
    SUCCEES_LOGIN // To reuse user data update pattern
} from '../type'
import { apiClient } from '../client/api-client';

export const updateProfile = (data: FormData) => async (dispatch: any) => {
    try {
        const response = await apiClient.put('/api/update-profile/', data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.status === 200) {
            dispatch({
                type: SUCCESS_UPDATE_PROFILE,
                payload: response.data,
            });

            // Also update the main user object in Login reducer to keep state consistent
            dispatch({
                type: SUCCEES_LOGIN,
                payload: {
                    access: localStorage.getItem('access'),
                    refresh: localStorage.getItem('refresh'),
                    user: response.data.user
                }
            });

            return { success: true, data: response.data };
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_UPDATE_PROFILE,
            payload: error.response?.data?.error || "Error al actualizar perfil"
        });
        return { success: false, error: error.response?.data?.error || "Error al actualizar perfil" };
    }
};
