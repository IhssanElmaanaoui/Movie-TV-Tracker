import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, userStorage } from '../services/authService';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if form fields are filled
  const isFormValid = email.trim() && password.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Handle login with API call
    setIsLoading(true);
    try {
      const result = await authService.login({ email, password });

      if (result.success) {
        // Store user data in localStorage
        userStorage.setUser(result.data);
        console.log('Login successful:', result.data);

        // Navigate back to dashboard
        navigate('/');
      } else {
        // Handle error from API
        if (result.error.validationErrors) {
          const firstError = Object.values(result.error.validationErrors)[0];
          setError(firstError);
        } else {
          setError(result.error.message || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          {/* title section */}
          <h1 className="login-title">Projection</h1>
          <p className="login-subtitle">Sign in to your account</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="login-footer">
            <p className="signup-text">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="signup-link"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
