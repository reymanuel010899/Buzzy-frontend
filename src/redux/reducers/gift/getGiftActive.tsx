// import { Gift } from "../../../components/index/main.interface";
import { GiftI } from "../../../interfaces/gift";
import { FAILED_GET_ONE_ACTIVE_GIFTS, SUCCEES_GET_ONE_ACTIVE_GIFTS } from "../../type";

interface GetOneActiveGiftState {
    gift: GiftI[] | null;
    error: string | null;
}

const inicializerState: GetOneActiveGiftState = {
    gift: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_GET_ONE_ACTIVE_GIFTS;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_GET_ONE_ACTIVE_GIFTS;
    payload: string;
}

type ActiveStoriesAction = SuccessAction | FailedAction;

const GetOneactiveGiftReducer = (
    state: GetOneActiveGiftState = inicializerState,
    action: ActiveStoriesAction
): GetOneActiveGiftState => {
    switch (action.type) {
        case SUCCEES_GET_ONE_ACTIVE_GIFTS:
            return {
                ...state,
                gift: action.payload,
                error: null,
            };
        case FAILED_GET_ONE_ACTIVE_GIFTS:
            return {
                ...state,
                gift: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default GetOneactiveGiftReducer;
