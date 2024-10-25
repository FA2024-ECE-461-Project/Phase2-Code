// src/services/api.js
import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication API calls
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userInfo) => api.post('/auth/register', userInfo);

// Package API calls
export const fetchPackages = () => api.get('/packages');
export const uploadPackage = (formData) => api.post('/packages/upload', formData);

// Add other API calls as needed

export default api;
