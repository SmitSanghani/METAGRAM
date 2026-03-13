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
            localStorage.removeItem('token');
            // Check if we're already on the login page to avoid redirect loops
            if (window.location.pathname !== '/login') {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
