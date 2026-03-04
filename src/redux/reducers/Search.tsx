import {
    SEARCH_START,
    SEARCH_SUCCESS,
    SEARCH_FAIL,
    TRENDING_SUCCESS,
    RECENT_SEARCH_SUCCESS,
} from "../actions/Search";
import { SUCCEES_CREATE_FOLLOWER } from "../type";

const initialState = {
    loading: false,
    results: {
        users: [],
        videos: [],
    },
    trending: [],
    recent: [],
    error: false,
};

export const searchReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case SEARCH_START:
            return { ...state, loading: true, error: false };
        case SEARCH_SUCCESS:
            return { ...state, loading: false, results: action.payload };
        case SEARCH_FAIL:
            return { ...state, loading: false, error: true };
        case TRENDING_SUCCESS:
            return { ...state, trending: action.payload };
        case RECENT_SEARCH_SUCCESS:
            return { ...state, recent: action.payload };
        case SUCCEES_CREATE_FOLLOWER:
            return {
                ...state,
                results: {
                    ...state.results,
                    users: state.results.users.map((user: any) =>
                        user.id === action.payload.follower_user_id
                            ? { ...user, is_following: !user.is_following }
                            : user
                    ),
                },
            };
        default:
            return state;
    }
};
