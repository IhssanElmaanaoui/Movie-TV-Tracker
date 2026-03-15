import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, userStorage } from '../services/authService';
import './Login.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value) {
  if (!value.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Password is required';
  return '';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const isFormValid = email.trim() && password.trim() && !validateEmail(email) && !validatePassword(password);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') setEmailError(validateEmail(email));
    if (field === 'password') setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setTouched({ email: true, password: true });
    if (eErr || pErr) return;

    setIsLoading(true);
    try {
      const result = await authService.login({ email, password });

      if (result.success) {
        userStorage.setUser(result.data);
        navigate('/');
      } else {
        // result.error can be: a string, an object with .message, or an object with .validationErrors
        const err = result.error;
        if (typeof err === 'string') {
          setError(err);
        } else if (err?.validationErrors) {
          setError(Object.values(err.validationErrors)[0]);
        } else if (err?.message) {
          setError(err.message);
        } else {
          setError('Login failed. Please try again.');
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

          {error && (
            <div className="login-error" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(error.toLowerCase().includes('ban') || error.toLowerCase().includes('deactivat')) && (
                <strong style={{ fontSize: '14px' }}>🚫 Account Banned</strong>
              )}
              <span>{error}</span>
            </div>
          )}


          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`form-input${touched.email && emailError ? ' input-error' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={() => handleBlur('email')}
              />
              {touched.email && emailError && <span className="field-error">{emailError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`form-input${touched.password && passwordError ? ' input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setPasswordError(validatePassword(e.target.value));
                }}
                onBlur={() => handleBlur('password')}
              />
              {touched.password && passwordError && <span className="field-error">{passwordError}</span>}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Logging in...' : 'Sign in'}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-google-btn"
              onClick={() => {
                /* Wire to backend OAuth: window.location.href = '/api/auth/google'; */
                alert('Google sign-in can be wired to your backend OAuth endpoint.');
              }}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
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
