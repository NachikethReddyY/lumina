import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, RotateCcw } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import './PendingApprovalPage.css';

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, refetch } = useCurrentUser();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (user?.status === 'active') {
      navigate('/dashboard', { replace: true });
    }
  }, [user?.status, navigate]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await refetch();
      setLastChecked(new Date());
    } catch {
      // Error during refetch, continue
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-approval-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="pending-approval-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="pending-approval-logo" variants={itemVariants}>
            <Logo size="md" showText={true} vertical={true} />
          </motion.div>

          <motion.div className="pending-approval-header" variants={itemVariants}>
            <h1 className="pending-approval-title">Application Processed</h1>
            <p className="pending-approval-subtitle">
              Please wait for the administrator to give you access to Lumina.
            </p>
          </motion.div>

          <motion.div className="pending-approval-status" variants={itemVariants}>
            <div className="pending-approval-icon-wrapper">
              <motion.div
                className="pending-approval-icon"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Clock size={48} />
              </motion.div>
              <motion.div
                className="pending-approval-dot"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="pending-approval-info">
              <p className="pending-approval-info-label">Status</p>
              <p className="pending-approval-info-value">Pending Review</p>
            </div>
          </motion.div>

          <div className="pending-approval-actions">
            <Button
              onClick={handleManualCheck}
              disabled={isChecking}
              loading={isChecking}
              style={{ width: '100%' }}
            >
              {isChecking ? 'Checking…' : 'Check Status Now'}
              <RotateCcw size={16} style={{ marginLeft: '8px' }} />
            </Button>
          </div>

          {lastChecked && (
            <motion.div className="pending-approval-last-checked" variants={itemVariants}>
              <p>Last checked: {formatTime(lastChecked)}</p>
            </motion.div>
          )}

          <motion.div className="pending-approval-footer" variants={itemVariants}>
            <p className="pending-approval-step-counter">Step 3 of 3</p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default PendingApprovalPage;
