import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { authApi } from '../utils/apiClient';
import './AuthPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function VerifyEmailOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = searchParams.get('email') || '';
  const storedEmail =
    typeof window !== 'undefined' ? localStorage.getItem('pendingVerificationEmail') || '' : '';
  const pendingEmail = emailFromQuery || storedEmail;

  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<Status>(pendingEmail ? 'idle' : 'error');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!pendingEmail) {
      setMessage('We could not find the email waiting for verification. Please sign up again or resend the code from login.');
    }
  }, [pendingEmail]);

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="auth-page">
      <div className="auth-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Enter verification code</h1>
            <p className="auth-subtitle">
              Check your email for a 6-digit code, then enter it here to activate your account.
            </p>
          </motion.div>

          {status === 'error' && message && (
            <p className="auth-notice auth-notice--error">{message}</p>
          )}
          {status === 'success' && message && (
            <p className="auth-notice auth-notice--success">{message}</p>
          )}

          <form
            className="auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus('loading');
              setMessage('');
              try {
                const res = await authApi.verifyEmailOtp(pendingEmail, otp);
                const data = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  message?: string;
                  accessToken?: string;
                };
                if (!res.ok) {
                  setStatus('error');
                  setMessage(data.error || 'Invalid or expired code.');
                  return;
                }
                if (data.accessToken) {
                  localStorage.setItem('authToken', data.accessToken);
                  localStorage.setItem('refreshToken', '');
                }
                localStorage.removeItem('pendingVerificationEmail');
                setStatus('success');
                setMessage(data.message || 'Your account is active.');
                navigate('/dashboard');
              } catch {
                setStatus('error');
                setMessage('Network error. Please try again.');
              }
            }}
          >
            {pendingEmail ? (
              <p className="auth-notice auth-notice--info">
                Verifying <strong>{pendingEmail}</strong>
              </p>
            ) : null}
            <div className="form-group">
              <label>6-digit code</label>
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                onChange={(value) => setOtp(value)}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button type="submit" size="lg" loading={status === 'loading'} disabled={!pendingEmail}>
              Verify
            </Button>
          </form>

          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              <Link to="/signup" className="auth-link">
                Back to Sign Up
              </Link>
              {' · '}
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default VerifyEmailOtpPage;
