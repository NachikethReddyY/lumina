import React from "react";
import "../styles/home.css";

const HomePage: React.FC = () => {
    return (
        <div className="home-container">
            <div className="home-card">
                <h1 className="home-title">Welcome to the User Dashboard</h1>
                <p className="home-description">Please log in to access your dashboard and manage your account.</p>
                <button className="login-button">Get Started</button>
            </div>
        </div>
    );
}
export default HomePage;