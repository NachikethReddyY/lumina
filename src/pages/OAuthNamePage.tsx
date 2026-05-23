import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { SetupLoading } from '../components/SetupLoading';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/useToast';
import { usersApi, type ApiUser } from '../utils/apiClient';
import { getSetupStepNumber, isPlaceholderName } from '../utils/authFlow';
import { loadOnboardingDraft, saveOnboardingDraft } from '../utils/onboardingDraft';
import './OAuthNamePage.css';

export function OAuthNamePage() {
  const navigate = useNavigate();
  const { user, loading, setUser } = useCurrentUser();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const draft = loadOnboardingDraft(user.id);
    if (draft.firstName) {
      setFirstName(draft.firstName);
    } else if (user.first_name && !isPlaceholderName(user.first_name, user.last_name)) {
      setFirstName(user.first_name);
    }
    if (draft.lastName) {
      setLastName(draft.lastName);
    } else if (user.last_name && !isPlaceholderName(user.first_name, user.last_name)) {
      setLastName(user.last_name);
    }
    setDraftReady(true);
  }, [user?.id, user?.first_name, user?.last_name]);

  useEffect(() => {
    if (!user || !draftReady) return;
    saveOnboardingDraft(user.id, {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });
  }, [user?.id, firstName, lastName, draftReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      showToast('Please enter your first and last name', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await usersApi.updateName(trimmedFirst, trimmedLast);
      const data = (await res.json().catch(() => ({}))) as { user?: ApiUser; error?: string };
      if (!res.ok) {
        showToast(data.error || 'Failed to update name', 'error');
        return;
      }
      const nextUser = data.user;
      if (nextUser) {
        setUser(nextUser);
        saveOnboardingDraft(nextUser.id, {
          firstName: trimmedFirst,
          lastName: trimmedLast,
        });
      }
      navigate('/onboarding', { replace: true });
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <SetupLoading message="Preparing your profile…" />;
  }

  const step = getSetupStepNumber(user);

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
              {user.is_google_account
                ? 'Confirm the name we should use on your account. You\'ll set up your role next.'
                : 'Enter your name to continue. You\'ll choose your role on the next step.'}
            </p>
          </div>

          <p className="oauth-name-step">Step {step} of 3</p>

          <form onSubmit={handleSubmit} className="oauth-name-form">
            <div className="auth-form-row" style={{ marginTop: '18px' }}>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={saving}
                  className="form-input"
                  placeholder="John"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={saving}
                  className="form-input"
                  placeholder="Doe"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={saving}
                disabled={!firstName.trim() || !lastName.trim() || saving}
                className="w-full"
              >
                Continue to profile setup
              </Button>
            </div>
          </form>
        </motion.div>
      </Container>
    </div>
  );
}

export default OAuthNamePage;
