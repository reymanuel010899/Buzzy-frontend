// import apiClient from '../../client';
import { apiClient } from '../../client/api-client';
import {
    SUCCEES_SEND_GIFT_STORY,
    FAILED_SEND_GIFT_STORY,
    SUCCEES_GET_WALLET
} from '../../type';

interface SendVideoGiftBody {
    video_id: string | number;
    gift_type: string;
    vip_message?: string;
}

export const sendVideoGift = (body: SendVideoGiftBody) => async (dispatch: any) => {
    try {
        const response = await apiClient.post('/api/videos/send-video-gifted/', body);

        if (response.status === 200 || response.status === 201) {
            // Reusing SUCCEES_SEND_GIFT_STORY as it triggers the same UI logic usually
            dispatch({
                type: SUCCEES_SEND_GIFT_STORY,
                payload: response.data,
            });

            // Update wallet if returned
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
