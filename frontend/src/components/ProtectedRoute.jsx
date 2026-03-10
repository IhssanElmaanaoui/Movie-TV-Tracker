import { Navigate } from 'react-router-dom';
import { userStorage } from '../services/authService';

export default function ProtectedRoute({ children }) {
    return userStorage.isAuthenticated() ? children : <Navigate to="/login" replace />;
}
