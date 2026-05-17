import { apiClient } from '../../client/api-client';
import { SUCCESS_GET_CONNECTIONS, FAILED_GET_CONNECTIONS } from '../../type';

export const getSocialConnections = () => async (dispatch: any) => {
    try {
        const response = await apiClient.get('/api/social/connections/', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access')}`
            }
        });
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_GET_CONNECTIONS,
                payload: response.data,
            });
        }
    } catch (error) {
        console.error("Error fetching social connections:", error);
        dispatch({
            type: FAILED_GET_CONNECTIONS,
            payload: []
        });
    }
};
