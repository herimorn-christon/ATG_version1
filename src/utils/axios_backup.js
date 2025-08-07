import axios from 'axios';

// Set baseURL depending on environment
const baseURL = import.meta.env.PROD
  ? 'https://nambis.advafuel.com'        // 🌐 Production backend (Cloudflare Tunnel)
  : 'http://192.168.1.102:3001';         // 🛠️ Development backend (on your LAN IP)

const instance = axios.create({ baseURL });

// Set token on instance creation if it exists
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add interceptor to keep token fresh on each request
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
