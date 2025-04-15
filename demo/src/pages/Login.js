import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const attemptLogin = async (retryCount = 0) => {
        if (retryCount > 2) {
            setMessage("Login failed after multiple attempts.");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch("http://100.71.100.5:8000/front_to_back_sender.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "login",
                    email: email,
                    password: password
                }),
            });

            await new Promise(resolve => setTimeout(resolve, 250 * (retryCount + 1)));

            const data = await response.json();

            if (data.status === "success") {
                setMessage("Welcome back!");
                setTimeout(() => navigate("/search"), 1500);
            } else {
                if (retryCount < 2) {
                    console.log(`Login attempt ${retryCount + 1} failed. Retrying...`);
                    await attemptLogin(retryCount + 1);
                } else {
                    setMessage(`Login failed: ${data.message}`);
                }
            }
        } catch (err) {
            console.error("Login error:", err);

            if (retryCount < 2) {
                console.log(`Network error. Retry attempt ${retryCount + 1}`);
                await attemptLogin(retryCount + 1);
            } else {
                setMessage("Network error. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await attemptLogin();
    };

    return (
        <div className="auth-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    disabled={isLoading}
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                </button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Login;
