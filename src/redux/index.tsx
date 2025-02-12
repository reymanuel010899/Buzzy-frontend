import { combineReducers } from "redux";
import register from "./reducers/register";
import getMedia from "./reducers/getMedia";
import LoginReducer from "./reducers/Login";

export default combineReducers({
    register,
    getMedia,
    LoginReducer
  
})