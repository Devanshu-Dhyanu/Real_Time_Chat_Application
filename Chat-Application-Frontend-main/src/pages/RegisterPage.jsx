import { useState } from "react";
import { registerApi } from "../api/auth";

const GoogleIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="social-btn-icon">
        <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2A9.8 9.8 0 0 0 2.2 12 9.8 9.8 0 0 0 12 21.8c5.7 0 9.5-4 9.5-9.6 0-.6-.1-1.1-.2-1.5H12Z"
        />
        <path
            fill="#4285F4"
            d="M3.3 7.4 6.5 9.8A6 6 0 0 1 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2c-3.8 0-7.1 2.2-8.7 5.2Z"
        />
        <path
            fill="#FBBC05"
            d="M2.2 12c0 1.5.4 2.9 1.1 4.2l3.9-3a5.8 5.8 0 0 1-.3-1.2c0-.4.1-.8.2-1.2l-3.8-3A9.7 9.7 0 0 0 2.2 12Z"
        />
        <path
            fill="#34A853"
            d="M12 21.8c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.7-1.7-5.5-4l-3.9 3c1.6 3.1 4.9 5.2 9.4 5.2Z"
        />
    </svg>
);

export default function RegisterPage({ onSwitchToLogin }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await registerApi({ email, username, password });
            alert("Registration successful! Please login.");
            onSwitchToLogin();
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (err.request
                    ? "Backend server is not reachable. Please make sure the backend is running on port 7000."
                    : "Registration failed. Please try again.");
            setError(message);
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = () => {
        window.alert("Continue with Google will be wired to real Google auth next.");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ color: 'var(--accent-green)', fontSize: '2rem' }}>Chat Application</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>Create your account</p>
                </div>

                <button className="social-btn" type="button" onClick={handleGoogleRegister}>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                </button>

                <div className="auth-divider" aria-hidden="true">
                    <span>or create an account with email</span>
                </div>
                
                <form onSubmit={handleRegister}>
                    {error && <p style={{ color: '#ff4b4b', fontSize: '0.8rem', marginBottom: '10px' }}>{error}</p>}
                    
                    <input
                        className="login-input"
                        placeholder="Username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        className="login-input"
                        placeholder="Email Address"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        className="login-input"
                        type="password"
                        placeholder="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button className="login-btn" type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "REGISTER"}
                    </button>
                </form>

                <div style={{ marginTop: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Already have an account?{" "}
                        <span 
                            onClick={onSwitchToLogin}
                            style={{ color: 'var(--accent-green)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Login
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
