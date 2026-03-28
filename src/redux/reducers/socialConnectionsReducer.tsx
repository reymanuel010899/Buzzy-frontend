import {
    SUCCESS_GET_FOLLOWERS,
    FAILED_GET_FOLLOWERS,
    SUCCESS_GET_FOLLOWING,
    FAILED_GET_FOLLOWING,
    SUCCESS_GET_SUBSCRIBERS,
    FAILED_GET_SUBSCRIBERS,
    SUCCESS_GET_SUGGESTIONS,
    FAILED_GET_SUGGESTIONS,
    SUCCEES_CREATE_FOLLOWER
} from '../type';

const updateFollowingInRecord = (record: Record<string, any[]>, targetUserId: number | string) => {
    const newRecord = { ...record };
    Object.keys(newRecord).forEach(username => {
        newRecord[username] = newRecord[username].map(item => {
            if (item.user && item.user.id.toString() === targetUserId.toString()) {
                return { ...item, is_following: !item.is_following };
            }
            return item;
        });
    });
    return newRecord;
};

const initialState = {
    followers: {} as Record<string, any[]>,
    following: {} as Record<string, any[]>,
    subscribers: {} as Record<string, any[]>,
    suggestions: {} as Record<string, any[]>,
    loading: false,
    error: null
};

export default function socialConnectionsReducer(state = initialState, action: any) {
    const { type, payload, username } = action;

    switch (type) {
        case SUCCESS_GET_FOLLOWERS:
            return {
                ...state,
                followers: { ...state.followers, [username]: payload },
                loading: false
            };
        case SUCCESS_GET_FOLLOWING:
            return {
                ...state,
                following: { ...state.following, [username]: payload },
                loading: false
            };
        case SUCCESS_GET_SUBSCRIBERS:
            return {
                ...state,
                subscribers: { ...state.subscribers, [username]: payload },
                loading: false
            };
        case SUCCESS_GET_SUGGESTIONS:
            return {
                ...state,
                suggestions: { ...state.suggestions, [username]: payload },
                loading: false
            };
        case SUCCEES_CREATE_FOLLOWER:
            const targetId = payload.follower_user_id || payload.id;
            if (!targetId) return state;
            return {
                ...state,
                followers: updateFollowingInRecord(state.followers, targetId),
                following: updateFollowingInRecord(state.following, targetId),
                subscribers: updateFollowingInRecord(state.subscribers, targetId),
                suggestions: updateFollowingInRecord(state.suggestions, targetId),
            };
        case FAILED_GET_FOLLOWERS:
        case FAILED_GET_FOLLOWING:
        case FAILED_GET_SUBSCRIBERS:
        case FAILED_GET_SUGGESTIONS:
            return {
                ...state,
                loading: false,
                error: payload
            };
        default:
            return state;
    }
}
