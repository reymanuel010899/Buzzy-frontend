import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./redux/index"; // Suponiendo que rootReducer está correctamente configurado

const store = configureStore({
  reducer: rootReducer,

  devTools: true, // Habilita Redux DevTools automáticamente
});

export default store;


