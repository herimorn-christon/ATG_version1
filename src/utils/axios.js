import axios from 'axios';

// Dynamically use the API URL from Vite environment variables
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Set token on instance creation if it exists
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add interceptors
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;