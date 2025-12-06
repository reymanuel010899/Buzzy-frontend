import { Gift } from "../../../components/index/main.interface";
import {  FAILED_RECEVED_GIFTS, SUCCEES_RECIVED_GIFTS } from "../../type";

interface RecivedGiftState {
    gift: Gift[] | null;
    error: string | null;
}

const inicializerState: RecivedGiftState = {
    gift: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_RECIVED_GIFTS;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_RECEVED_GIFTS;
    payload: string;
}

type ActiveStoriesAction = SuccessAction | FailedAction;

const RecivedGiftReducer = (
    state: RecivedGiftState = inicializerState,
    action: ActiveStoriesAction
): RecivedGiftState => {
    switch (action.type) {
        case SUCCEES_RECIVED_GIFTS:
            return {
                ...state,
                gift: action.payload,
                error: null,
            };
        case FAILED_RECEVED_GIFTS:
            return {
                ...state,
                gift: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default RecivedGiftReducer;
