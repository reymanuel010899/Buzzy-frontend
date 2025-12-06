import { 
    SUCCEES_ACTIVE_STORIES, 
    FAILED_ACTIVE_STORIES 
} from "../../type";

interface ActiveStoriesState {
    stories: any[] | null;
    error: string | null;
}

const inicializerState: ActiveStoriesState = {
    stories: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_ACTIVE_STORIES;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_ACTIVE_STORIES;
    payload: string;
}

type ActiveStoriesAction = SuccessAction | FailedAction;

const activeStories = (
    state: ActiveStoriesState = inicializerState,
    action: ActiveStoriesAction
): ActiveStoriesState => {
    switch (action.type) {
        case SUCCEES_ACTIVE_STORIES:
            return {
                ...state,
                stories: action.payload,
                error: null,
            };
        case FAILED_ACTIVE_STORIES:
            return {
                ...state,
                stories: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default activeStories;
