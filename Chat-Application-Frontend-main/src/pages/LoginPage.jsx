import { useState } from "react";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ onSwitchToRegister }) {
    const { setUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await loginApi({ email, password });
            setUser(res.data.user);
        } catch (err) {
            alert("Login failed. Please check your credentials.");
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
                    <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>Web Socket Demo</p>
                </div>
                
                <form onSubmit={handleLogin}>
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
                        {loading ? "Connecting..." : "LOGIN TO CHAT"}
                    </button>
                </form>

                <div style={{ marginTop: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Don't have an account?{" "}
                        <span 
                            onClick={onSwitchToRegister}
                            style={{ color: 'var(--accent-green)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Register
                        </span>
                    </p>
                </div>

                <div style={{ marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Open different browsers/tabs to test real-time chat
                </div>
            </div>
        </div>
    );
}
