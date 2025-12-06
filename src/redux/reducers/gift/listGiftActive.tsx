import { Gift } from "../../../components/index/main.interface";
import { FAILED_ACTIVE_GIFTS, SUCCEES_ACTIVE_GIFTS } from "../../type";

interface ActiveGiftState {
    gift: Gift[] | null;
    error: string | null;
}

const inicializerState: ActiveGiftState = {
    gift: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_ACTIVE_GIFTS;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_ACTIVE_GIFTS;
    payload: string;
}

type ActiveStoriesAction = SuccessAction | FailedAction;

const activeGiftReducer = (
    state: ActiveGiftState = inicializerState,
    action: ActiveStoriesAction
): ActiveGiftState => {
    switch (action.type) {
        case SUCCEES_ACTIVE_GIFTS:
            return {
                ...state,
                gift: action.payload,
                error: null,
            };
        case FAILED_ACTIVE_GIFTS:
            return {
                ...state,
                gift: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default activeGiftReducer;
