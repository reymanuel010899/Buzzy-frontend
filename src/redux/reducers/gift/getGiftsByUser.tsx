import { Gift } from "../../../components/index/main.interface";
import { FAILED_RECEVED_GIFTS_BY_USER,  SUCCEES_RECIVED_GIFTS_BY_USER } from "../../type";



interface RecivedGiftStateByUser {
    gift: Gift[] | null;
    error: string | null;
}

const inicializerState: RecivedGiftStateByUser = {
    gift: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_RECIVED_GIFTS_BY_USER;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_RECEVED_GIFTS_BY_USER;
    payload: string;
}

type ActiveStoriesAction = SuccessAction | FailedAction;

const RecivedGiftReducerByUser = (
    state: RecivedGiftStateByUser = inicializerState,
    action: ActiveStoriesAction
): RecivedGiftStateByUser => {
    switch (action.type) {
        case SUCCEES_RECIVED_GIFTS_BY_USER:
            return {
                ...state,
                gift: action.payload,
                error: null,
            };
        case FAILED_RECEVED_GIFTS_BY_USER:
            return {
                ...state,
                gift: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default RecivedGiftReducerByUser;
