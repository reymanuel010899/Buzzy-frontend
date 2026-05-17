import { apiClient } from '../../client/api-client';
import {
    SUCCEES_SEND_GIFT_STORY,
    FAILED_SEND_GIFT_STORY,
    SUCCEES_GET_WALLET
} from '../../type';

interface SendUserGiftBody {
    recipient_username: string;
    gift_type: string;
    vip_message?: string;
}

export const sendUserGift = (body: SendUserGiftBody) => async (dispatch: any) => {
    try {
        const response = await apiClient.post('/api/users/send-user-gift/', body);

        if (response.status === 200 || response.status === 201) {
            dispatch({
                type: SUCCEES_SEND_GIFT_STORY,
                payload: response.data,
            });

            if (response.data.wallet) {
                dispatch({
                    type: SUCCEES_GET_WALLET,
                    payload: response.data.wallet
                });
            }

            return response.data;
        }
    } catch (err) {
        dispatch({
            type: FAILED_SEND_GIFT_STORY,
            payload: ''
        });
        return Promise.reject(err);
    }
};
