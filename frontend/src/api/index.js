import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://metagram-3.onrender.com/api/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

export default api;
