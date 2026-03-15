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
