import { 
    SUCCEES_CREATE_STORY, 
    FAILED_CREATE_STORY 
} from "../../type";

interface CreateStoryState {
    story: any | null;
    error: string | null;
}

const inicializerState: CreateStoryState = {
    story: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_CREATE_STORY;
    payload: any;
}

interface FailedAction {
    type: typeof FAILED_CREATE_STORY;
    payload: string;
}

type CreateStoryAction = SuccessAction | FailedAction;

const createStory = (
    state: CreateStoryState = inicializerState,
    action: CreateStoryAction
): CreateStoryState => {
    switch (action.type) {
        case SUCCEES_CREATE_STORY:
            return {
                ...state,
                story: action.payload,
                error: null,
            };
        case FAILED_CREATE_STORY:
            return {
                ...state,
                story: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default createStory;
