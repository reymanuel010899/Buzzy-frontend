import { 
    SUCCEES_USER_STORIES, 
    FAILED_USER_STORIES 
} from "../../type";

interface UserStoriesState {
    stories: any[] | null;
    error: string | null;
}

const inicializerState: UserStoriesState = {
    stories: null,
    error: null,
};

interface SuccessAction {
    type: typeof SUCCEES_USER_STORIES;
    payload: any[];
}

interface FailedAction {
    type: typeof FAILED_USER_STORIES;
    payload: string;
}

type UserStoriesAction = SuccessAction | FailedAction;

const userStories = (
    state: UserStoriesState = inicializerState,
    action: UserStoriesAction
): UserStoriesState => {
    switch (action.type) {
        case SUCCEES_USER_STORIES:
            return {
                ...state,
                stories: action.payload,
                error: null,
            };
        case FAILED_USER_STORIES:
            return {
                ...state,
                stories: null,
                error: action.payload,
            };
        default:
            return state;
    }
};

export default userStories;
