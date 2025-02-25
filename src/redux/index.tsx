import { combineReducers } from "redux";
import register from "./reducers/register";
import getMedia from "./reducers/getMedia";
import LoginReducer from "./reducers/Login";
import getUserDetail from "./reducers/GetUser";
import getMediaByUser from "./reducers/GetUserMedia";


export default combineReducers({
    register,
    getMedia,
    LoginReducer,
    getUserDetail,
    getMediaByUser
  
})