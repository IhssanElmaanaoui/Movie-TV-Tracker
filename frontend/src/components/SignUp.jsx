import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUp.css";

export default function SignUp({ onClose }) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if form fields are filled
  const isFormValid =
    fullName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword &&
    password.length >= 6;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Full Name Validation
    if (!fullName.trim()) {
      setError("Full name is required");
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

    // Signup Success (Placeholder)
    console.log("Sign up attempt:", { fullName, email, password });
    setSuccess("Account created successfully!");

    // Reset Form
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    // Navigate after 1 second
    setTimeout(() => {
      navigate("/");
    }, 1000);
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
              <label htmlFor="fullName" className="form-label">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
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
              disabled={!isFormValid}
            >
              Create Account
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
