import { useState } from "react";
import { registerApi } from "../api/auth";

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

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ color: 'var(--accent-green)', fontSize: '2rem' }}>Chat Application</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>Create your account</p>
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
