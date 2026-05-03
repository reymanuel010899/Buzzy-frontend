import { combineReducers } from "redux";
import register from "./reducers/register";
import getMedia from "./reducers/getMedia";
import LoginReducer from "./reducers/Login";
import getUserDetail from "./reducers/GetUser";
import getMediaByUser from "./reducers/GetUserMedia";
import getWalletReducer from "./reducers/getWallet";
import createTransactionReducer from "./reducers/createTransactions";
import createCommentReducer from "./reducers/createComment";
import createLikeReducer from "./reducers/createLike";
import createViewReducer from "./reducers/createView";
import getCommentReducer from "./reducers/getComment";
import createFollowerReducer from "./reducers/createFollower";
import { createStory } from "./actions/history/createHistory";
import { deleteStory } from "./actions/history/deleteHistory";
import userStories from "./reducers/history/getHistoryFromUser";
import storyViewers from "./reducers/history/getHIstoryViewers";
import makeViewed from "./reducers/history/makeViewed";
import activeStories from "./reducers/history/listActiveHistory";
import makeLikeReducers from "./reducers/history/likeHistory";
import sendGiftReducers from "./reducers/gift/sendGift";
import activeGiftReducer from "./reducers/gift/listGiftActive";
import RecivedGiftReducer from "./reducers/gift/listGiftRecived";
import GetOneactiveGiftReducer from "./reducers/gift/getGiftActive";
import RecivedGiftReducerByUser from "./reducers/gift/getGiftsByUser";
import listChatRoomsReducer from "./reducers/message/listChatRoom";
import chatMessagesReducer from "./reducers/message/chatMeesage";
import sendMessageReducer from "./reducers/message/sendMessage";
import { searchReducer } from "./reducers/Search";
import socialReducer from "./reducers/message/social";
import subscriptionReducer from "./reducers/subscriptionReducer";
import availabilityReducer from "./reducers/availabilityReducer";
import socialAccountsReducer from "./reducers/socialAccountsReducer";
import bankReducer from "./reducers/bankReducer";
import { transactionReducer } from "./reducers/transactionReducer";
import updateProfileReducer from "./reducers/updateProfileReducer";
import socialConnections from "./reducers/socialConnectionsReducer";
import uploadProgressReducer from "./reducers/uploadProgressReducer";
import bannerReducer from "./reducers/bannerReducer";

export default combineReducers({
    register,
    getMedia,
    LoginReducer,
    getUserDetail,
    getMediaByUser,
    getWalletReducer,
    createTransactionReducer,
    createCommentReducer,
    createLikeReducer,
    createViewReducer,
    getCommentReducer,
    createFollowerReducer,
    createStory,
    deleteStory,
    userStories,
    storyViewers,
    makeViewed,
    activeStories,
    makeLikeReducers,
    sendGiftReducers,
    activeGiftReducer,
    RecivedGiftReducer,
    GetOneactiveGiftReducer,
    RecivedGiftReducerByUser,
    listChatRoomsReducer,
    chatMessagesReducer,
    sendMessageReducer,
    searchReducer,
    socialReducer,
    subscriptionReducer,
    availabilityReducer,
    socialAccountsReducer,
    bankReducer,
    updateProfileReducer,
    socialConnections,
    uploadProgress: uploadProgressReducer,
    transactionReducer,
    bannerReducer,
})