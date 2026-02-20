import axios from 'axios';

// Empty baseURL → requests go to same origin, proxied by Vite → no CORS preflight
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY ?? '',
  },
});

export default api;
