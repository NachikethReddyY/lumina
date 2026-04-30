import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container-custom">
            <div className="radial-glow" aria-hidden="true"></div>

            <header className="home-header">
                <div className="flex items-center gap-6">
                    <span className="brand-wordmark">Lumina</span>
                    <span className="brand-badge">Helpdesk</span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div>
                        <button onClick={() => navigate('/login')} className="topbar-link">Login</button>
                    </div>
                </div>
            </header>

            <main className="home-main">
                <section className="hero-shell">
                    <div className="hero-copy">
                        <div className="eyebrow-stack">
                            <span className="eyebrow-pill">Customer support</span>
                            <span className="eyebrow-note">Unified tickets, inboxes, and SLA tracking</span>
                        </div>

                        <h1 className="hero-title">
                            The calm workspace for support teams that resolve faster.
                        </h1>
                        <p className="hero-description">
                            Lumina gives helpdesk and ticketing teams a quiet workspace for triage, collaboration, and fast customer resolution.
                        </p>

                        <div className="hero-actions">
                            <button onClick={() => navigate('/signup')} className="btn-primary">
                                START YOUR JOURNEY
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                            <button className="btn-outline">VIEW DOCUMENTATION</button>
                        </div>
                    </div>

                    <div className="hero-canvas glass-panel">
                        <div className="window-bar">
                            <div className="window-dots" aria-hidden="true">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <div className="window-url">app.lumina.io</div>
                            <div className="window-status">Live queue</div>
                        </div>

                        <div className="dashboard-shell">
                            <aside className="queue-panel">
                                <div>
                                    <p className="panel-label">Priority queues</p>
                                    <h2 className="panel-title">Inbox</h2>
                                </div>

                                <div className="queue-list">
                                    <article className="queue-item active">
                                        <div>
                                            <p className="queue-meta">Billing · High</p>
                                            <h3>Refund request from Acme</h3>
                                        </div>
                                        <span className="queue-time">2m</span>
                                    </article>
                                    <article className="queue-item">
                                        <div>
                                            <p className="queue-meta">Technical · Medium</p>
                                            <h3>Login error on mobile</h3>
                                        </div>
                                        <span className="queue-time">8m</span>
                                    </article>
                                    <article className="queue-item">
                                        <div>
                                            <p className="queue-meta">Success · Low</p>
                                            <h3>Onboarding follow-up</h3>
                                        </div>
                                        <span className="queue-time">14m</span>
                                    </article>
                                </div>
                            </aside>

                            <section className="ticket-panel">
                                <div className="ticket-header">
                                    <div>
                                        <p className="panel-label">Active ticket</p>
                                        <h2 className="panel-title">#LUM-2048 · Refund request</h2>
                                    </div>
                                    <span className="status-pill">Awaiting customer</span>
                                </div>

                                <div className="ticket-summary-grid">
                                    <div className="summary-card">
                                        <span className="summary-label">SLA</span>
                                        <span className="summary-value success">14m left</span>
                                    </div>
                                    <div className="summary-card">
                                        <span className="summary-label">Owner</span>
                                        <span className="summary-value">Maya Chen</span>
                                    </div>
                                    <div className="summary-card">
                                        <span className="summary-label">Channel</span>
                                        <span className="summary-value">Email + chat</span>
                                    </div>
                                </div>

                                <div className="ticket-thread">
                                    <div className="thread-entry customer">
                                        <p>We were charged twice after upgrading. Can someone review the invoice?</p>
                                    </div>
                                    <div className="thread-entry agent">
                                        <p>We’ve checked the payment log and matched the duplicate authorization. I’m issuing a refund now.</p>
                                    </div>
                                </div>

                                <div className="ticket-actions">
                                    <button className="action-chip">Assign to billing</button>
                                    <button className="action-chip">Add internal note</button>
                                    <button className="action-chip primary">Send reply</button>
                                </div>
                            </section>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <div className="footer-inner">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <span className="footer-brand">Lumina</span>
                        <span className="footer-copy">© 2026 Lumina Support Labs. All rights reserved.</span>
                    </div>
                    <nav className="footer-links">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <a href="#">System Status</a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;
