import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Usa localStorage por defecto
import rootReducer from "./redux/index"; // Tu raíz de reducers

// Configuración de persistencia
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["LoginReducer", "getMedia"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Crea el store con el reducer persistente
const store = configureStore({
  reducer: persistedReducer,
  devTools: true, // Mantén las herramientas de desarrollo
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Desactiva el chequeo de serialización para redux-persist
    }),
});

// Crea el persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;