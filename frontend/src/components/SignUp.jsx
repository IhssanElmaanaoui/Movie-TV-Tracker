import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, userStorage } from "../services/authService";
import "./SignUp.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function validateEmail(value) {
  if (!value.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(value)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
  return '';
}

function validateConfirmPassword(value, password) {
  if (!value) return 'Please confirm your password';
  if (value !== password) return 'Passwords do not match';
  return '';
}

export default function SignUp({ onClose }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });

  // Check username availability when user types
  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim().length < 3) {
        setUsernameAvailable(null);
        setUsernameError("");
        return;
      }

      if (!USERNAME_REGEX.test(username.trim())) {
        setUsernameError("Only letters, numbers, and underscores are allowed");
        setUsernameAvailable(false);
        return;
      }

      if (username.trim().length > 50) {
        setUsernameError("Username must not exceed 50 characters");
        setUsernameAvailable(false);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const isAvailable = await authService.checkUsernameAvailability(username.trim());
        setUsernameAvailable(isAvailable);

        // Explicitly check: true = available, false = taken, null = error
        if (isAvailable === false) {
          setUsernameError("Username is already taken");
        } else if (isAvailable === true) {
          setUsernameError("");
        } else {
          // null case - API error, don't show "taken" message
          setUsernameError("Unable to verify username. Please try again.");
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameError("Unable to verify username. Please try again.");
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [username]);

  // Check if form fields are filled
  const isFormValid =
    username.trim() &&
    username.trim().length >= 3 &&
    username.trim().length <= 50 &&
    USERNAME_REGEX.test(username.trim()) &&
    usernameAvailable === true &&
    email.trim() &&
    !validateEmail(email) &&
    password.trim() &&
    !validatePassword(password) &&
    confirmPassword.trim() &&
    !validateConfirmPassword(confirmPassword, password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Trigger inline errors for all fields
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(confirmPassword, password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);
    setTouched({ email: true, password: true, confirmPassword: true });

    // Username Validation
    if (!username.trim() || username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.trim().length > 50) {
      setError("Username must not exceed 50 characters");
      return;
    }

    if (!USERNAME_REGEX.test(username.trim())) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (usernameAvailable !== true) {
      setError("Please choose an available username");
      return;
    }

    if (eErr || pErr || cErr) return;

    // Handle signup with API call
    setIsLoading(true);
    try {
      const result = await authService.signup({
        username: username.trim(),
        email,
        password,
      });

      if (result.success) {
        // Store user data in localStorage
        userStorage.setUser(result.data);
        setSuccess("Account created successfully!");
        console.log("Signup successful:", result.data);

        // Reset Form
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setUsernameAvailable(null);
        setUsernameError("");
        setEmailError("");
        setPasswordError("");
        setConfirmPasswordError("");
        setTouched({ email: false, password: false, confirmPassword: false });

        // Navigate after 1 second
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        // Handle error from API
        if (result.error.validationErrors) {
          const firstError = Object.values(result.error.validationErrors)[0];
          setError(firstError);
        } else {
          setError(result.error.message || "Signup failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <div className="signup-card">
          {/* title section */}
          <h1 className="signup-title">Projection</h1>
          <p className="signup-subtitle">Create your account</p>

          {error && <div className="signup-error">{error}</div>}
          {success && <div className="signup-success">{success}</div>}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                className={`form-input ${username.trim().length >= 3
                  ? usernameAvailable === true
                    ? 'input-success'
                    : usernameAvailable === false
                      ? 'input-error'
                      : ''
                  : ''
                  }`}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {isCheckingUsername && username.trim().length >= 3 && (
                <div className="input-status checking">Checking availability...</div>
              )}
              {!isCheckingUsername && username.trim().length >= 3 && usernameAvailable === true && (
                <div className="input-status available">✓ Username is available</div>
              )}
              {!isCheckingUsername && usernameAvailable === false && usernameError && (
                <div className="input-status taken">✗ {usernameError}</div>
              )}
            </div>

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
                onBlur={() => {
                  setTouched(prev => ({ ...prev, email: true }));
                  setEmailError(validateEmail(email));
                }}
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
                placeholder="Min. 8 chars, include a letter and number"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setPasswordError(validatePassword(e.target.value));
                  if (touched.confirmPassword) setConfirmPasswordError(validateConfirmPassword(confirmPassword, e.target.value));
                }}
                onBlur={() => {
                  setTouched(prev => ({ ...prev, password: true }));
                  setPasswordError(validatePassword(password));
                }}
              />
              {touched.password && passwordError && <span className="field-error">{passwordError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-input${touched.confirmPassword && confirmPasswordError ? ' input-error' : ''}`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (touched.confirmPassword) setConfirmPasswordError(validateConfirmPassword(e.target.value, password));
                }}
                onBlur={() => {
                  setTouched(prev => ({ ...prev, confirmPassword: true }));
                  setConfirmPasswordError(validateConfirmPassword(confirmPassword, password));
                }}
              />
              {touched.confirmPassword && confirmPasswordError && <span className="field-error">{confirmPasswordError}</span>}
            </div>

            <button
              type="submit"
              className="signup-button"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
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

          <div className="signup-footer">
            <p className="login-text">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="login-link"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
