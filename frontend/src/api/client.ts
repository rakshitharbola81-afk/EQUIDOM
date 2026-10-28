import axios, { AxiosError } from 'axios';

// Base API configuration with environment variable support
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // Scans can take Puppeteer 5-20s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    let errorMessage = 'An unexpected network error occurred';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  }
);
