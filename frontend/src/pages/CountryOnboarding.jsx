import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService, userStorage } from "../services/authService";
import "../components/SignUp.css";

const COUNTRY_OPTIONS = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
    "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
    "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
    "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
    "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
    "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
    "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
    "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
    "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
    "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
    "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
    "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
    "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Korea", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
    "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
    "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
    "United Kingdom", "United States", "UAE", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

export default function CountryOnboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    const [country, setCountry] = useState(location.state?.suggestedCountry || "");
    const [isOpen, setIsOpen] = useState(false);
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [pendingUser] = useState(() => {
        try {
            const raw = localStorage.getItem("googleCountryPendingUser");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (!pendingUser?.id) {
            navigate("/signup", { replace: true });
        }
    }, [navigate, pendingUser?.id]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!dropdownRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const handleContinue = async () => {
        setError("");

        if (!country.trim()) {
            setTouched(true);
            setError("Please select your country to continue.");
            return;
        }

        if (!pendingUser?.id) {
            setError("Session expired. Please sign up with Google again.");
            return;
        }

        setIsSaving(true);
        try {
            const updateResult = await authService.updateProfile(pendingUser.id, {
                username: pendingUser.username,
                email: pendingUser.email,
                bio: pendingUser.bio || "",
                profilePictureUrl: pendingUser.profilePictureUrl || null,
                country,
            });

            if (!updateResult.success) {
                setError(updateResult.error?.message || "Failed to save your country. Please try again.");
                return;
            }

            const updatedUser = { ...pendingUser, ...updateResult.data, country };
            userStorage.setUser(updatedUser);
            navigate("/", { replace: true });
            localStorage.removeItem("googleCountryPendingUser");
        } catch (err) {
            console.error("Error while saving country onboarding:", err);
            setError("Failed to save your country. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-wrapper">
                <div className="signup-card">
                    <h1 className="signup-title">Almost There</h1>
                    <p className="signup-subtitle">Please select your country before we continue.</p>

                    {error && <div className="signup-error">{error}</div>}

                    <div className="signup-form">
                        <div className="form-group">
                            <label htmlFor="onboarding-country" className="form-label">Country</label>
                            <div className="country-select-wrapper" ref={dropdownRef}>
                                <button
                                    type="button"
                                    id="onboarding-country"
                                    className={`country-select-trigger${touched && !country ? " country-select-error" : ""}`}
                                    onClick={() => setIsOpen((open) => !open)}
                                    aria-haspopup="listbox"
                                    aria-expanded={isOpen}
                                >
                                    <span className={country ? "country-select-value" : "country-select-placeholder"}>
                                        {country || "Select your country"}
                                    </span>
                                    <span className={`country-select-arrow${isOpen ? " open" : ""}`}>v</span>
                                </button>

                                {isOpen && (
                                    <ul className="country-dropdown-menu" role="listbox" aria-label="Country options">
                                        {COUNTRY_OPTIONS.map((c) => (
                                            <li key={c} role="option" aria-selected={country === c}>
                                                <button
                                                    type="button"
                                                    className={`country-dropdown-option${country === c ? " selected" : ""}`}
                                                    onClick={() => {
                                                        setCountry(c);
                                                        setTouched(true);
                                                        setIsOpen(false);
                                                    }}
                                                >
                                                    {c}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {touched && !country && <span className="field-error">Please select your country</span>}
                        </div>

                        <button
                            type="button"
                            className="signup-button"
                            onClick={handleContinue}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Continue"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
