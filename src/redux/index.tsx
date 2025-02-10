import { combineReducers } from "redux";
import register from "./reducers/register";
import getMedia from "./reducers/getMedia";
export default combineReducers({
    register,
    getMedia
})