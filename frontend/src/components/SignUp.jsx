import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, userStorage } from "../services/authService";
import "./SignUp.css";

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

  // Check username availability when user types
  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim().length < 3) {
        setUsernameAvailable(null);
        setUsernameError("");
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
    usernameAvailable === true &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword &&
    password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Username Validation
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.trim().length > 50) {
      setError("Username must not exceed 50 characters");
      return;
    }

    if (usernameAvailable !== true) {
      setError("Please choose an available username");
      return;
    }

    // Email Validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password Validation
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Confirm Password
    if (!confirmPassword.trim()) {
      setError("Please confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="signup-button"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
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
