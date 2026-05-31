// import { rejects } from 'assert';
import { apiClient } from '../../client/api-client';
import { FAILED_SEND_GIFT_STORY, SUCCEES_SEND_GIFT_STORY, SUCCEES_GET_WALLET } from '../../type';


type SendGiftBody = {
  story_uuid: string;
  gift_type: string
};

export const sendGift = (body: SendGiftBody) => async (dispatch: any) => {
  try {
    const response = await apiClient.post('/api/stories/send-story-gifted/', body);
    if (response.status === 200 || response.status === 201) {
      dispatch({
        type: SUCCEES_SEND_GIFT_STORY,
        payload: response.data,
      });

      // Update wallet balance if returned by the backend
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

