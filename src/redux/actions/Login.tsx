import axios from "axios";

export interface fetchWithAuthProps {
  email: string;
  password: string;
}

async function fetchWithAuth(options: fetchWithAuthProps) {
  let accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    throw new Error("No access token found");
  }

  try {
    let response = await axios.post(
      'http://127.0.0.1:8000/api/login/',
      options,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      const refreshResponse = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
        headers: { "Content-Type": "application/json" },
      });

      if (refreshResponse.ok) {
        const { access } = await refreshResponse.json();
        localStorage.setItem("accessToken", access);

        return fetchWithAuth(options);
      } else {
        window.location.href = "/login";
      }
    }
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
