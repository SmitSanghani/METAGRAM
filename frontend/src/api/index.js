import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:8000/api/v1" 
    : "https://metagram-3.onrender.com/api/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

export default api;
