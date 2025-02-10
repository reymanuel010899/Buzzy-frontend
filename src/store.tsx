import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./redux/index"; // Suponiendo que rootReducer está correctamente configurado

const store = configureStore({
  reducer: rootReducer,

  devTools: true, // Habilita Redux DevTools automáticamente
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;


