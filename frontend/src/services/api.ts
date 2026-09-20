import axios from "axios";

const api = axios.create({
baseURL:
  import.meta.env.VITE_API_URL || "https://ayush-3-yg21.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});



api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_id");
    }

    return Promise.reject(error);
  },
);

export default api;
