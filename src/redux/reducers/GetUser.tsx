import { SUCCEES_GET_USER, FAILED_GET_USER, USER_NOT_FOUND, CLEAR_USER } from "../type";

interface GetUserState {
    user: object | null;
    error: string | null;
    notFoundUsername: string | null;
    loading: boolean;
}

const inicializerState: GetUserState = {
    user: null,
    error: null,
    notFoundUsername: null,
    loading: false,
}

interface GetUserAction {
    type: string;
    payload: { user: object; searchedUsername?: string; type?: string }
}

const getUserDetail = (
    state: GetUserState = inicializerState,
    action: GetUserAction
): GetUserState => {
    const { type, payload } = action;
    switch (type) {
        case SUCCEES_GET_USER:
            return { ...state, user: payload?.user || null, error: null, notFoundUsername: null, loading: false };
        case USER_NOT_FOUND:
            return { ...state, user: payload?.user || null, error: null, notFoundUsername: payload?.searchedUsername || null, loading: false };
        case FAILED_GET_USER:
            return { ...state, user: null, error: '', notFoundUsername: null, loading: false };
        case CLEAR_USER:
            return { ...inicializerState, loading: false };
        default:
            return state;
    }
}

export default getUserDetail;