import { FAILED_LIKE_STORY, SUCCEES_LIKE_STORY } from "../../type";

interface MakeViewedState {
    viewed: boolean;
    error: string | null;
}

const inicializerState: MakeViewedState = {
    viewed: false,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_LIKE_STORY;
    payload: boolean;   
}

interface FailedAction {
    type: typeof FAILED_LIKE_STORY;
    payload: string;   
}

type MakeLikedAction = SuccessAction | FailedAction;

const makeLikeReducers = (
    state: MakeViewedState = inicializerState,
    action: MakeLikedAction
): MakeViewedState => {
    switch (action.type) {
        case SUCCEES_LIKE_STORY:
            return {
                ...state,
                viewed: action.payload, // true
                error: null,
            };

        case FAILED_LIKE_STORY:
            return {
                ...state,
                viewed: false,
                error: action.payload,
            };

        default:
            return state;
    }
};

export default makeLikeReducers;
