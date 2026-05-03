import { RouterProvider } from "react-router-dom";

import { router } from "./router/index";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./store";
import './App.css';
import UploadProgressBar from "./components/Layout/UploadProgressBar";
import { WebSocketProvider } from "./context/WebSocketContext";

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WebSocketProvider>
          <UploadProgressBar />
          <RouterProvider router={router} />
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
