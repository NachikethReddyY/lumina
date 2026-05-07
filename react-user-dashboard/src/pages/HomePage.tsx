import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import './HomePage.css';

export function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="homepage">
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <Container maxWidth="xl">
          <motion.div
            className="hero-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div className="hero-badge" variants={itemVariants}>
              <span>New: Lumina v1.0</span>
            </motion.div>

            {/* Title */}
            <motion.h1 className="hero-title" variants={itemVariants}>
              Intelligent routing for{' '}
              <span className="text-gradient">higher velocity support.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p className="hero-subtitle" variants={itemVariants}>
              Lumina uses agentic AI to evaluate priority, admin load, and complexity, routing
              tickets to the right person, instantly.
            </motion.p>

            {/* CTAs */}
            <motion.div className="hero-ctas" variants={itemVariants}>
              <Link to="/signup">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Read Documentation
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* Terminal Showcase Section */}
      <section className="showcase-section">
        <Container maxWidth="lg">
          <motion.div
            className="glass-card terminal-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Terminal Header */}
            <div className="terminal-header">
              <div className="terminal-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="terminal-title">lumina-v1.0-orchestrator</span>
            </div>

            {/* Terminal Content */}
            <div className="terminal-content">
              {/* Left Sidebar */}
              <aside className="terminal-sidebar">
                <div className="sidebar-section">
                  <h3 className="sidebar-title">Active Queue</h3>
                  <ul className="queue-list">
                    <li>
                      <span className="status-dot open" />
                      Ticket #1025
                    </li>
                    <li className="active">
                      <span className="status-dot active" />
                      Ticket #1026
                    </li>
                    <li>
                      <span className="status-dot pending" />
                      Ticket #1027
                    </li>
                    <li>
                      <span className="status-dot resolved" />
                      Ticket #1028
                    </li>
                  </ul>
                </div>

                <div className="sidebar-section">
                  <h3 className="sidebar-title">Neural Confidence</h3>
                  <div className="confidence-metric">99.42%</div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" />
                  </div>
                </div>
              </aside>

              {/* Right Terminal Output */}
              <section className="terminal-output">
                <p className="command">&gt; lumina --evaluate-load</p>

                <div className="output-lines">
                  <p>
                    Analyzing Administrator <span className="highlight-user">"Sarah Miller"</span> ...
                  </p>
                  <p className="meta">
                    Current Workload Matrix: [P1: 2/5] [P2: 4/10] [P3: 6/15]
                  </p>
                  <div className="divider" />
                  <p className="result">
                    Routing Ticket #1029 to Sarah.Miller@lumina.ai
                  </p>
                  <p className="optimal">
                    Optimal Path Found: Lowest latency coefficient (0.84) detected.
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="metrics-grid">
                  <motion.div
                    className="metric-card"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4>P1 SLA Response</h4>
                    <div className="metric-value">2.4h</div>
                    <p className="metric-detail">↑ 14.2% Efficiency</p>
                  </motion.div>
                  <motion.div
                    className="metric-card"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4>Routing Precision</h4>
                    <div className="metric-value blue">98.2%</div>
                    <p className="metric-detail">Verified across 12k nodes</p>
                  </motion.div>
                </div>
              </section>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Container maxWidth="md">
          <motion.div
            className="cta-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta-content">
              <h2>Ready to Transform Your Support?</h2>
              <p>
                Join teams using Lumina's intelligent ticketing system to streamline support.
              </p>
              <Link to="/signup">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="footer">
        <Container maxWidth="xl">
          <div className="footer-content">
            <div className="footer-brand">
              <Logo size="sm" />
            </div>
            <div className="footer-copyright">
              <span>&copy; 2026 NACHITH REDDY. ALL RIGHTS RESERVED.</span>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}

export default HomePage;
