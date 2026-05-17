import { 
    SUCCEES_DELETE_STORY, 
    FAILED_DELETE_STORY 
} from "../../type";

interface DeleteStoryState {
    deleted: boolean;
    error: string | null;
}

const inicializerState: DeleteStoryState = {
    deleted: false,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_DELETE_STORY;
    payload: boolean;
}

interface FailedAction {
    type: typeof FAILED_DELETE_STORY;
    payload: string;
}

type DeleteStoryAction = SuccessAction | FailedAction;

const deleteStory = (
    state: DeleteStoryState = inicializerState,
    action: DeleteStoryAction
): DeleteStoryState => {
    switch (action.type) {
        case SUCCEES_DELETE_STORY:
            return {
                ...state,
                deleted: action.payload,
                error: null,
            };
        case FAILED_DELETE_STORY:
            return {
                ...state,
                deleted: false,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default deleteStory;
