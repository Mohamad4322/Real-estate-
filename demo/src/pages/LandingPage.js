import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1>Welcome to RealEstate SaaS</h1>
        <p>Find, analyze, and save properties with ease.</p>
        <div className="cta-buttons">
          <Link to="/signup" className="btn">Sign Up</Link>
          <Link to="/login" className="btn btn-secondary">Log In</Link>
        </div>
      </header>
    </div>
  );
};

export default LandingPage;
