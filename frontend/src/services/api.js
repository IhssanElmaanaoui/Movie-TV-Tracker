import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            // Don't redirect if we're already on the login/signup page —
            // the 401 is from the login attempt itself (e.g. banned user)
            // and the component needs to display the error message.
            const onAuthPage = window.location.pathname === '/login'
                || window.location.pathname === '/signup';
            if (!onAuthPage) {
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

export default api;
