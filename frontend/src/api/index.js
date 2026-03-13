import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:8000/api/v1" 
    : "https://metagram-3.onrender.com/api/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Optional: Clear local storage if token is invalid
            // localStorage.removeItem('token');
            // Note: Redux state is cleared in App.jsx interceptor
        }
        return Promise.reject(error);
    }
);

export default api;
