import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container-refined">
            {/* Background Layer */}
            <div className="home-background" aria-hidden="true">
                <div className="home-background-overlay"></div>
                <img
                    alt="Server Room Background"
                    className="home-background-image"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuALOU4IbBBsCix_nUY7Gi2ifDOsPz1CfqnyFVwiigcsPR2k7R-wgB6QzYx8lmFO3aTcMLyqaA7M8rnaAIK04U_hv9wK37dsY-HWJ9ktJYtmocCh0PaCV5s-SDKhCOrKDI5_FL-7W10XxCxpiRJYrgwq9Nox-TifElvC3_G1U1aZ13yk_ElpYrNpjqrkleUu4PlHDMtY51UmYFvMzlBP80jV6J-W3zUeLNmpWgjZ6M86X-JOsVvf6wTPdtXyB7-mEVinsUTyzGoyOLs"
                />
                <div className="radial-glow"></div>
            </div>

            {/* Navigation */}
            <nav className="home-header">
                <div className="header-brand-group">
                    <span className="brand-wordmark">Lumina</span>
                    <span className="brand-badge">Helpdesk</span>
                </div>

                <button onClick={() => navigate('/login')} className="header-button">
                    Sign In
                </button>
            </nav>

            {/* Main Content */}
            <main className="home-main">
                <section className="hero-shell">
                    <div className="hero-copy">
                        {/* Intelligence Badge */}
                        <div className="eyebrow-stack">
                            <div className="eyebrow-pill">
                                <span className="eyebrow-pulse" aria-hidden="true"></span>
                                <span>Lumina brain active</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="hero-title">
                            Project Lumina: <br /> Intelligent IT Management
                        </h1>

                        {/* Subtext */}
                        <p className="hero-description">
                            Powered by the Lumina Brain engine. Automate triage, predict systemic failures, and streamline your operations with a precision-engineered intelligence layer designed for high-density environments.
                        </p>

                        {/* Action Buttons */}
                        <div className="hero-actions">
                            <button onClick={() => navigate('/signup')} className="btn-primary">
                                Access Terminal
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                            <button className="btn-outline">
                                View Documentation
                                <span className="material-symbols-outlined">description</span>
                            </button>
                        </div>
                    </div>

                    {/* Feature Grid */}
                    <div className="feature-grid">
                        <article className="feature-card feature-card-wide">
                            <div className="feature-glow" aria-hidden="true"></div>
                            <div className="feature-card-copy">
                                <span className="material-symbols-outlined feature-icon">troubleshoot</span>
                                <h3>Predictive Triage</h3>
                                <p>
                                    Lumina Brain analyzes incident patterns in real-time, routing critical issues before they cascade into systemic failures.
                                </p>
                            </div>
                            <div className="feature-radial" aria-hidden="true"></div>
                        </article>

                        <article className="feature-card feature-card-stats">
                            <div>
                                <span className="material-symbols-outlined feature-icon">speed</span>
                                <h3 className="feature-stat">99.9%</h3>
                                <p className="feature-meta">Uptime Target</p>
                            </div>
                            <div className="feature-meter">
                                <div className="feature-meter-fill"></div>
                            </div>
                        </article>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="home-footer">
                <p>© 2026 Nachiketh Reddy • YNR</p>
            </footer>
        </div>
    );
}

export default HomePage;
