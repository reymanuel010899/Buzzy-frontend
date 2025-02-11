import { RouterProvider } from "react-router-dom";
import { router } from "./router/index";
import store from "./store";
import { Provider } from "react-redux";

function App() {
  return (
    <>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </>
  );
}

export default App;
