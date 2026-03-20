import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, userStorage } from "../services/authService";
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from "../services/googleAuth";
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const googleButtonRef = useRef(null);
  const usernameRef = useRef("");

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

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

  useEffect(() => {
    let isCancelled = false;

    const initGoogleButton = async () => {
      if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
        return;
      }

      try {
        await loadGoogleIdentityScript();
        if (isCancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) return;
            setError("");
            setSuccess("");
            setIsGoogleLoading(true);

            try {
              const preferredUsername = usernameRef.current.trim().length >= 3 ? usernameRef.current.trim() : undefined;
              const result = await authService.googleAuth({
                idToken: response.credential,
                preferredUsername,
              });

              if (result.success) {
                userStorage.setUser(result.data);
                setSuccess("Google account connected successfully!");
                setTimeout(() => {
                  navigate("/");
                }, 500);
              } else {
                console.error("Google signup failed:", result.error?.raw || result.error);
                setError(result.error?.message || "Google signup failed. Please try again.");
              }
            } catch (err) {
              console.error("Google signup error:", err);
              setError("Google signup failed. Please try again.");
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "signup_with",
          shape: "pill",
        });
      } catch (err) {
        console.error("Failed to initialize Google Sign-Up:", err);
      }
    };

    initGoogleButton();
    return () => {
      isCancelled = true;
    };
  }, [navigate]);

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

            <div className="oauth-divider"><span>or</span></div>
            {GOOGLE_CLIENT_ID ? (
              <div className="google-auth-container" ref={googleButtonRef} />
            ) : (
              <p className="oauth-hint">Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-Up.</p>
            )}
            {isGoogleLoading && <p className="oauth-hint">Signing up with Google...</p>}
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
