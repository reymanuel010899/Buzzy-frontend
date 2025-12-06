import { 
    SUCCEES_STORY_VIEWERS, 
    FAILED_STORY_VIEWERS 
} from "../../type";

interface StoryViewersState {
    viewers: any[] | null;
    error: string | null;
}

const inicializerState: StoryViewersState = {
    viewers: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_STORY_VIEWERS;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_STORY_VIEWERS;
    payload: string;
}

type StoryViewersAction = SuccessAction | FailedAction;

const storyViewers = (
    state: StoryViewersState = inicializerState,
    action: StoryViewersAction
): StoryViewersState => {
    switch (action.type) {
        case SUCCEES_STORY_VIEWERS:
            return {
                ...state,
                viewers: action.payload,
                error: null,
            };
        case FAILED_STORY_VIEWERS:
            return {
                ...state,
                viewers: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default storyViewers;
