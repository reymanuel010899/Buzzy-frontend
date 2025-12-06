import { FAILED_SEND_GIFT_STORY, SUCCEES_SEND_GIFT_STORY } from '../../type';

interface SendGiftdState {
    viewed: boolean;
    error: string | null;
}

const inicializerState: SendGiftdState = {
    viewed: false,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_SEND_GIFT_STORY;
    payload: boolean;   
}

interface FailedAction {
    type: typeof FAILED_SEND_GIFT_STORY;
    payload: string;   
}

type SendGiftdAction = SuccessAction | FailedAction;

const sendGiftReducers = (
    state: SendGiftdState = inicializerState,
    action: SendGiftdAction
): SendGiftdState => {
    switch (action.type) {
        case SUCCEES_SEND_GIFT_STORY:
            return {
                ...state,
                viewed: action.payload,
                error: null,
            };

        case FAILED_SEND_GIFT_STORY:
            return {
                ...state,
                viewed: false,
                error: action.payload,
            };

        default:
            return state;
    }
};

export default sendGiftReducers;
