import React, { useState } from "react";

const SignUp = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log("Submitting signup with:", { name, email, password });

            const response = await fetch("/front_to_back_sender.php", { 
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "signup",
                    username: name,
                    email: email,
                    password: password,
                }),
            });

            console.log("Response status:", response.status);
            console.log("Response headers:", Object.fromEntries(response.headers.entries()));

            // Try to get response text before parsing JSON
            const responseText = await response.text();
            console.log("Raw response text:", responseText);

            try {
                const data = JSON.parse(responseText);
                console.log("Parsed response data:", data);

                if (data.message && data.message.includes("sent successfully")) {
                    setMessage("✅ You are all set, please login to your account");
                } else {
                    setMessage(`❌ Signup failed: ${data.message}`);
                }
            } catch (jsonError) {
                console.error("JSON Parsing Error:", jsonError);
                setMessage(`❌ Error parsing server response: ${responseText}`);
            }
        } catch (error) {
            console.error("Complete Signup Error:", error);
            setMessage(`❌ Unexpected error: ${error.message}`);
        }
    };

    return (
        <div>
            <h2>Sign Up</h2>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                />
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit">Sign Up</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default SignUp;