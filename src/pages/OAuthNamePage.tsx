import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import './OAuthNamePage.css';

export function OAuthNamePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    if (!user.email_is_verified) {
      navigate('/verify-email-otp', { replace: true });
    } else if (!user.onboarding_completed && user.role !== 'super_admin') {
      navigate('/onboarding', { replace: true });
    } else if (user.status !== 'active') {
      navigate('/pending-approval', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

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
            <p>
              {user && `${user.first_name} ${user.last_name}`}
            </p>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}

export default OAuthNamePage;
