import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { authApi } from '../utils/apiClient';
import { getNewPasswordError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordPolicy';
import './AuthPage.css';

type Step = 'email' | 'otp' | 'password' | 'done';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailWasSent, setEmailWasSent] = useState(true);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (otpCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setOtpCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [otpCooldown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setEmailError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Invalid email address'); return; }
    setEmailLoading(true);
    setEmailError('');
    try {
      const res = await authApi.forgotPassword(email);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        devOtp?: string;
        emailSent?: boolean;
        message?: string;
      };
      if (!res.ok) {
        if (res.status === 429) {
          setEmailError(data.error || 'Too many attempts. Please wait and try again.');
          return;
        }
        if (data.code === 'OAUTH_ONLY_ACCOUNT') {
          setIsGoogleAccount(true);
          setStep('otp'); // reuse step to show the Google message
          return;
        }
        if (data.code === 'MAIL_FAILED') {
          setEmailError(data.error || 'Could not send the reset email. Check SMTP settings or try again.');
          return;
        }
        setEmailError(data.error || 'Failed to send code. Please try again.');
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      setEmailWasSent(data.emailSent !== false);
      setStep('otp');
      setOtpCooldown(30);
    } catch {
      setEmailError('Failed to send code. Check your connection and try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResend = async () => {
    if (otpCooldown > 0 || isGoogleAccount) return;
    setOtpError('');
    setOtp('');
    setEmailLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      const data = (await res.json().catch(() => ({}))) as {
        devOtp?: string;
        error?: string;
        code?: string;
        emailSent?: boolean;
      };
      if (!res.ok) {
        setOtpError(
          data.code === 'MAIL_FAILED'
            ? data.error || 'Could not send the reset email.'
            : data.error || 'Could not resend.'
        );
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      setEmailWasSent(data.emailSent !== false);
      setOtpCooldown(30);
    } catch {
      setOtpError('Could not resend. Check your connection.');
    } finally {
      setEmailLoading(false);
    }
  };

  const submitOtp = async (code: string) => {
    if (code.length !== 6 || otpLoading) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await authApi.verifyResetOtp(email, code);
      const data = (await res.json().catch(() => ({}))) as { resetToken?: string; error?: string };
      if (!res.ok) {
        setOtpError(data.error || 'Invalid or expired code.');
        setOtp('');
        return;
      }
      setResetToken(data.resetToken || '');
      setStep('password');
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6 && !otpLoading) submitOtp(value);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const pwErr = getNewPasswordError(password);
    if (pwErr) next.password = pwErr;
    if (password !== confirmPassword) next.confirm = 'Passwords do not match';
    setPasswordErrors(next);
    if (Object.keys(next).length > 0) return;

    setPasswordLoading(true);
    try {
      const res = await authApi.resetPassword(resetToken, password);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPasswordErrors({ form: data.error || 'Could not update password. Try again.' });
        return;
      }
      setStep('done');
    } catch {
      setPasswordErrors({ form: 'Network error. Try again.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  function stepTitle() {
    if (step === 'otp' && isGoogleAccount) return 'Sign in with Google';
    if (step === 'otp') return 'Enter reset code';
    if (step === 'password') return 'Set a new password';
    if (step === 'done') return 'Password updated';
    return 'Reset password';
  }

  function stepSubtitle() {
    if (step === 'otp' && isGoogleAccount)
      return 'This account was created with Google. Use the Google Sign-In button on the login page.';
    if (step === 'otp' && devOtp)
      return 'SMTP is not configured — use the dev code below (nothing was emailed).';
    if (step === 'otp' && !emailWasSent)
      return `If ${email} has a password-based account, check your inbox and spam for the reset email.`;
    if (step === 'otp')
      return `We sent a 6-digit code to ${email}. Check your inbox and spam, or use the reset link in the same email.`;
    if (step === 'password') return "Choose a strong password you haven't used elsewhere.";
    if (step === 'done') return 'Your password has been updated.';
    return "Enter your email and we'll send you a reset code.";
  }

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
            <Link to="/"><Logo size="md" showText vertical /></Link>
          </motion.div>

          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">{stepTitle()}</h1>
            <p className="auth-subtitle">{stepSubtitle()}</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 'email' && (
              <motion.form
                key="email"
                className="auth-form"
                onSubmit={handleEmailSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Input
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                  error={emailError}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <Button variant="primary" size="lg" type="submit" loading={emailLoading}>
                  {emailLoading ? 'Sending…' : 'Send code'}
                </Button>
              </motion.form>
            )}

            {/* Step 2a: Google-only account */}
            {step === 'otp' && isGoogleAccount && (
              <motion.div
                key="google"
                className="reset-success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="success-icon" style={{ background: '#f3f4f6', color: '#374151' }}>G</div>
                <p className="success-text">
                  The account for <strong>{email}</strong> was created with Google Sign-In and does not have a password.
                </p>
                <p className="success-subtext">
                  Use the "Sign in with Google" button on the login page to access your account.
                </p>
                <Link to="/login">
                  <Button variant="primary" size="lg">Go to Sign In</Button>
                </Link>
              </motion.div>
            )}

            {/* Step 2b: OTP entry */}
            {step === 'otp' && !isGoogleAccount && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {devOtp && (
                  <p className="auth-dev-link">
                    <span className="auth-dev-label">Dev only &mdash; code:</span> <strong>{devOtp}</strong>
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpChange}
                    pattern={REGEXP_ONLY_DIGITS}
                    disabled={otpLoading}
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
                {otpError && <p className="auth-error" style={{ margin: 0 }}>{otpError}</p>}
                {otpLoading && <p className="auth-notice auth-notice--info" style={{ margin: 0 }}>Verifying&hellip;</p>}
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                  Didn&apos;t receive it?{' '}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={handleResend}
                    disabled={otpCooldown > 0 || emailLoading}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: otpCooldown > 0 ? 'default' : 'pointer' }}
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                  </button>
                </p>
              </motion.div>
            )}

            {/* Step 3: New password */}
            {step === 'password' && (
              <motion.form
                key="password"
                className="auth-form"
                onSubmit={handlePasswordSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Input
                  id="password"
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordErrors((p) => ({ ...p, password: '' })); }}
                  error={passwordErrors.password}
                  placeholder="e.g. LuminaPass1"
                  helpText={PASSWORD_REQUIREMENTS_TEXT}
                  autoComplete="new-password"
                  required
                />
                <Input
                  id="confirmPassword"
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors((p) => ({ ...p, confirm: '' })); }}
                  error={passwordErrors.confirm}
                  autoComplete="new-password"
                  required
                />
                {passwordErrors.form && (
                  <p className="auth-error" style={{ margin: 0 }}>{passwordErrors.form}</p>
                )}
                <Button variant="primary" size="lg" type="submit" loading={passwordLoading}>
                  {passwordLoading ? 'Saving…' : 'Update password'}
                </Button>
              </motion.form>
            )}

            {/* Done */}
            {step === 'done' && (
              <motion.div
                key="done"
                className="reset-success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="success-icon">&#10003;</div>
                <p className="success-text">Your password was updated successfully.</p>
                <p className="success-subtext">You can now sign in with your new password.</p>
                <Link to="/login">
                  <Button variant="primary" size="lg">Sign In</Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              {step === 'otp' && !isGoogleAccount ? (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => { setStep('email'); setOtp(''); setOtpError(''); setDevOtp(null); setEmailWasSent(true); }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  &larr; Use a different email
                </button>
              ) : (
                <Link to="/login" className="auth-link">Back to Sign In</Link>
              )}
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default ForgotPasswordPage;
