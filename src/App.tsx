import { RouterProvider } from "react-router-dom";
import { router } from "./router/index";
import store from "./store"; // Importa el store creado
import { Provider } from "react-redux"; // Asegúrate de importar `Provider` de `react-redux`

function App() {
  return (
    <>
      {/* El Provider debe envolver la aplicación para proporcionar el store */}
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </>
  );
}

export default App;
