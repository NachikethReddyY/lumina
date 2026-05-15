import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../utils/apiClient';
import './OnboardingPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Customer Success',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Other',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { showToast } = useToast();

  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !department) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setStatus('loading');
    try {
      const res = await usersApi.saveOnboarding(jobTitle, department);
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!res.ok) {
        setStatus('error');
        showToast(data.error || 'Failed to save onboarding info', 'error');
        return;
      }

      setStatus('success');
      showToast(data.message || 'Profile updated successfully', 'success');
      navigate('/pending-approval');
    } catch {
      setStatus('error');
      showToast('Network error. Please try again.', 'error');
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="onboarding-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="onboarding-logo" variants={itemVariants}>
            <Logo size="md" showText={true} vertical={true} />
          </motion.div>

          <motion.div className="onboarding-header" variants={itemVariants}>
            <h1 className="onboarding-title">Let's get to know you</h1>
            <p className="onboarding-subtitle">
              Tell us a bit about yourself so we can personalize your experience
            </p>
          </motion.div>

          {user && (
            <motion.div className="onboarding-user-info" variants={itemVariants}>
              {user.avatar_url && (
                <img src={user.avatar_url} alt={user.first_name} className="onboarding-avatar" />
              )}
              <div>
                <p className="onboarding-user-name">
                  {user.first_name} {user.last_name}
                </p>
                <p className="onboarding-user-email">{user.email}</p>
              </div>
            </motion.div>
          )}

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="jobTitle">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                placeholder="e.g. Senior Engineer, Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={status === 'loading'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={status === 'loading'}
              >
                <option value="">Select a department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={status === 'loading'}
              disabled={!jobTitle.trim() || !department || status === 'loading'}
            >
              Continue to Approval
            </Button>
          </form>

          <motion.div className="onboarding-footer" variants={itemVariants}>
            <p className="onboarding-step-counter">Step 2 of 3</p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default OnboardingPage;
