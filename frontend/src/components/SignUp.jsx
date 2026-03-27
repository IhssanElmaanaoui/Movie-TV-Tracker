import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, userStorage } from "../services/authService";
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from "../services/googleAuth";
import "./SignUp.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Korea",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Kingdom",
  "United States",
  "UAE",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

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
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryTouched, setCountryTouched] = useState(false);
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
  const countryDropdownRef = useRef(null);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!countryDropdownRef.current?.contains(event.target)) {
        setIsCountryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
    country.trim() &&
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

    if (!country.trim()) {
      setCountryTouched(true);
      setError("Please select your country");
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
        country: country.trim() || null,
      });

      if (result.success) {
        // Store user data in localStorage
        userStorage.setUser(result.data);
        setSuccess("Account created successfully!");
        console.log("Signup successful:", result.data);

        // Reset Form
        setUsername("");
        setEmail("");
        setCountry("");
        setIsCountryOpen(false);
        setCountryTouched(false);
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
                country: country.trim() || undefined,
              });

              if (result.success) {
                userStorage.setUser(result.data);

                if ((result.data?.country || "").trim()) {
                  setSuccess("Google account connected successfully!");
                  setTimeout(() => {
                    navigate("/");
                  }, 500);
                } else {
                  localStorage.setItem("googleCountryPendingUser", JSON.stringify(result.data));
                  navigate("/onboarding/country", {
                    state: {
                      suggestedCountry: country.trim() || "",
                    },
                  });
                }
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
              <label htmlFor="country" className="form-label">
                Country
              </label>
              <div className="country-select-wrapper" ref={countryDropdownRef}>
                <button
                  type="button"
                  id="country"
                  className={`country-select-trigger${countryTouched && !country ? " country-select-error" : ""}`}
                  onClick={() => setIsCountryOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isCountryOpen}
                  onBlur={() => setCountryTouched(true)}
                >
                  <span className={country ? "country-select-value" : "country-select-placeholder"}>
                    {country || "Select your country"}
                  </span>
                  <span className={`country-select-arrow${isCountryOpen ? " open" : ""}`}>v</span>
                </button>

                {isCountryOpen && (
                  <ul className="country-dropdown-menu" role="listbox" aria-label="Country options">
                    {COUNTRY_OPTIONS.map((c) => (
                      <li key={c} role="option" aria-selected={country === c}>
                        <button
                          type="button"
                          className={`country-dropdown-option${country === c ? " selected" : ""}`}
                          onClick={() => {
                            setCountry(c);
                            setCountryTouched(true);
                            setIsCountryOpen(false);
                          }}
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {countryTouched && !country && (
                <span className="field-error">Please select your country</span>
              )}
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
