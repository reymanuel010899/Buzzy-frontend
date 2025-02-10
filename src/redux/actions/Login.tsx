import axios from "axios";

export interface fetchWithAuthProps {
  email: string;
  password: string;
}

async function fetchWithAuth(options: fetchWithAuthProps) {
  let accessToken = localStorage.getItem("accessToken");
    let refreshToken = localStorage.getItem("refreshToken");
  // Verificar si existe accessToken
  if (!accessToken) {
    throw new Error("No access token found");
  }

  try {
    // Intentar la primera solicitud
    let response = await axios.post(
      'http://127.0.0.1:8000/api/login/',
      options,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    // Si la respuesta es 401 (No autorizado), intentar refrescar el token
    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      // Intentar refrescar el token
      const refreshResponse = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
        headers: { "Content-Type": "application/json" },
      });

      if (refreshResponse.ok) {
        const { access } = await refreshResponse.json();
        localStorage.setItem("accessToken", access);

        // Volver a intentar la solicitud con el nuevo accessToken
        return fetchWithAuth(options);
      } else {
        // Redirigir al login si no se puede refrescar el token
        window.location.href = "/login";
      }
    }

    // Si la respuesta no es 401, devolvemos la respuesta original
    return response;
  } catch (error) {
    console.error("Error in fetchWithAuth:", error);
    throw error;
  }
}

const Login = (options: fetchWithAuthProps) => {
  return fetchWithAuth(options);
};

export default Login;
