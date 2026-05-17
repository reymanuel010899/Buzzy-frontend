import { SUCCEES_GET_USER, FAILED_GET_USER, USER_NOT_FOUND } from "../type";

interface GetUserState {
    user: object | null;
    error: string | null;
    notFoundUsername: string | null;
}

const inicializerState: GetUserState = {
    user: null,
    error: null,
    notFoundUsername: null,
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
            return { ...state, user: payload?.user || null, error: null, notFoundUsername: null };
        case USER_NOT_FOUND:
            return { ...state, user: payload?.user || null, error: null, notFoundUsername: payload?.searchedUsername || null };
        case FAILED_GET_USER:
            return { ...state, user: null, error: '', notFoundUsername: null };
        default:
            return state;
    }
}

export default getUserDetail;