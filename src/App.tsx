import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";

import { router } from "./router/index";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./store";
import './App.css';
import UploadProgressBar from "./components/Layout/UploadProgressBar";
import { WebSocketProvider } from "./context/WebSocketContext";
import { usePushNotifications } from "./hooks/usePushNotifications";

function DeepLinkHandler() {
  useEffect(() => {
    const listener = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      // Handles both buzzy://app/path?q=1 and buzzy://some-path?q=1
      // Strip the scheme and optional host, keep /path?query
      let path = url.replace(/^buzzy:\/\/app/, "");          // buzzy://app/...
      path = path.replace(/^buzzy:\/\/[^/]+/, "");           // buzzy://host/...
      path = path.replace(/^buzzy:\/\//, "");                 // buzzy://path (no host)
      if (!path.startsWith("/")) path = "/" + path;
      if (path && path !== "/") router.navigate(path);
    });
    return () => { listener.then(h => h.remove()); };
  }, []);
  return null;
}

function PushNotificationInit() {
  const isAuthenticated = !!localStorage.getItem("accessToken");
  usePushNotifications(isAuthenticated);
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WebSocketProvider>
          <DeepLinkHandler />
          <PushNotificationInit />
          <UploadProgressBar />
          <RouterProvider router={router} />
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
