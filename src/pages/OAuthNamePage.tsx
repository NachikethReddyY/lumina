import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/useToast';
import { usersApi, type ApiUser } from '../utils/apiClient';
import { getPostAuthPath } from '../utils/authFlow';
import './OAuthNamePage.css';

export function OAuthNamePage() {
  const navigate = useNavigate();
  const { refetch } = useCurrentUser();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast('Please enter your first and last name', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await usersApi.updateName(firstName.trim(), lastName.trim());
      const data = (await res.json().catch(() => ({}))) as { user?: ApiUser; error?: string };
      if (res.ok) {
        const nextUser = data.user ?? (await refetch());
        navigate(getPostAuthPath(nextUser), { replace: true });
      } else {
        showToast(data.error || 'Failed to update name', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oauth-name-page">
      <div className="oauth-name-page__glow" />
      <Container maxWidth="sm">
        <motion.div
          className="oauth-name-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="oauth-name-card__brand">
            <Logo size="md" showText vertical />
          </div>

          <div className="oauth-name-card__header">
            <h1>Welcome</h1>
            <p>Please enter your name to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="oauth-name-form">
            <div className="auth-form-row" style={{ marginTop: '18px' }}>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!firstName.trim() || !lastName.trim() || loading}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          </form>
        </motion.div>
      </Container>
    </div>
  );
}

export default OAuthNamePage;
