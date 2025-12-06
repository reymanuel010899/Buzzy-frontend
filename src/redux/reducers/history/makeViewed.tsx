import { 
    SUCCEES_VIEW_STORY, 
    FAILED_VIEW_STORY 
} from "../../type";

interface MakeViewedState {
    viewed: boolean;
    error: string | null;
}

const inicializerState: MakeViewedState = {
    viewed: false,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_VIEW_STORY;
    payload: boolean;   // true cuando se registra la vista
}

interface FailedAction {
    type: typeof FAILED_VIEW_STORY;
    payload: string;    // mensaje de error
}

type MakeViewedAction = SuccessAction | FailedAction;

const makeViewed = (
    state: MakeViewedState = inicializerState,
    action: MakeViewedAction
): MakeViewedState => {
    switch (action.type) {
        case SUCCEES_VIEW_STORY:
            return {
                ...state,
                viewed: action.payload, // true
                error: null,
            };

        case FAILED_VIEW_STORY:
            return {
                ...state,
                viewed: false,
                error: action.payload,
            };

        default:
            return state;
    }
};

export default makeViewed;
