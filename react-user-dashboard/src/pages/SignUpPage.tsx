import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import { getNewPasswordError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordPolicy';
import './AuthPage.css';

export function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    const pwErr = getNewPasswordError(formData.password);
    if (pwErr) newErrors.password = pwErr;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await authApi.signup({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        role: formData.role,
      });
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody & {
        accessToken?: string;
        refreshToken?: string;
        requiresEmailVerification?: boolean;
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({
            form:
              data.error ||
              (res.status === 503 && data.code === 'MAIL_FAILED'
                ? 'Account may exist but the verification email failed. Check SMTP in backend/.env.'
                : 'Failed to create account. Please try again.'),
          });
        }
        return;
      }
      if (data.requiresEmailVerification) {
        setPendingEmail(formData.email);
        setPendingMessage(
          data.message || 'Check your email and click the link to activate your account.'
        );
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        navigate('/dashboard');
        return;
      }
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch {
      setErrors({ form: 'Failed to create account. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

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
      {/* Background decoration */}
      <div className="auth-decoration" />

      <Container maxWidth="sm">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">
              {pendingEmail ? 'Check your email' : 'Create Your Account'}
            </h1>
            <p className="auth-subtitle">
              {pendingEmail
                ? pendingMessage
                : 'Join Lumina to streamline your support ticketing system'}
            </p>
          </motion.div>

          {pendingEmail ? (
            <motion.div
              className="reset-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="success-icon">✓</div>
              <p className="success-text">
                We sent an activation link to <strong>{pendingEmail}</strong>
              </p>
              <p className="success-subtext">
                After you activate, you can sign in. If you do not see the message, check spam or
                resend below.
              </p>
              <Link to={`/verify-email-otp?email=${encodeURIComponent(pendingEmail)}`}>
                <Button variant="secondary" size="lg" type="button">
                  Enter code instead
                </Button>
              </Link>
              {resendNote && <p className="auth-notice auth-notice--info">{resendNote}</p>}
              <Button
                variant="secondary"
                size="lg"
                type="button"
                loading={resendBusy}
                onClick={async () => {
                  setResendBusy(true);
                  setResendNote('');
                  try {
                    const r = await authApi.resendVerification(pendingEmail);
                    const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
                    if (!r.ok) {
                      setResendNote(body.error || 'Could not resend. Is SMTP configured on the server?');
                    } else {
                      setResendNote(body.message || 'If the account is pending, a new email was sent.');
                    }
                  } catch {
                    setResendNote('Network error. Try again.');
                  } finally {
                    setResendBusy(false);
                  }
                }}
              >
                Resend verification email
              </Button>
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          ) : null}

          {!pendingEmail ? (
          <motion.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <Input
                id="email"
                label="Email Address"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />
            </motion.div>

            {/* Name Row */}
            <div className="auth-form-row">
              <motion.div variants={itemVariants}>
                <Input
                  id="firstName"
                  label="First Name"
                  type="text"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Input
                  id="lastName"
                  label="Last Name"
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                  required
                />
              </motion.div>
            </div>

            {/* Role Selection removed for now */}

            {/* Password */}
            <motion.div variants={itemVariants}>
              <Input
                id="password"
                label="Password"
                type="password"
                name="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                helpText={PASSWORD_REQUIREMENTS_TEXT}
                required
              />
            </motion.div>

            {/* Confirm Password */}
            <motion.div variants={itemVariants}>
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
            </motion.div>

            {/* Form Error */}
            {errors.form && (
              <motion.div className="auth-error" variants={itemVariants}>
                {errors.form}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <Button variant="primary" size="lg" type="submit" loading={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </motion.div>
          </motion.form>
          ) : null}

          {!pendingEmail ? (
          <>
          {/* Divider */}
          <motion.div className="auth-divider" variants={itemVariants}>
            <span>or</span>
          </motion.div>

          {/* Google Sign-Up */}
          <motion.div variants={itemVariants}>
            <GoogleAuthButton
              mode="signup"
              onError={(msg) => setErrors((prev) => ({ ...prev, form: msg }))}
            />
          </motion.div>
          </>
          ) : null}

          {/* Sign In Link */}
          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default SignUpPage;
