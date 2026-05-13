import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import './AuthPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState('');

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) {
      setErrors((prev) => ({ ...prev, form: message }));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'email') {
      setShowResendVerification(false);
      setResendNote('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await authApi.login(formData.email, formData.password);
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody & {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!res.ok) {
        const code = (data as { code?: string }).code;
        if (res.status === 403 && code === 'EMAIL_NOT_VERIFIED') {
          localStorage.setItem('pendingVerificationEmail', formData.email);
          setShowResendVerification(true);
          setErrors({
            form:
              'This email is not activated yet. Open the link we sent you, or resend the verification email.',
          });
          return;
        }
        if (res.status === 400 && data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({
            form: data.error || 'Failed to sign in. Please check your credentials.',
          });
        }
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.removeItem('pendingVerificationEmail');
      }
      navigate('/dashboard');
    } catch {
      setErrors({ form: 'Failed to sign in. Please check your connection and try again.' });
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
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your Lumina account</p>
          </motion.div>

          {/* Form */}
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

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <div className="password-header">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <Link to="/forgot-password" className="auth-link-small">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                label=""
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
            </motion.div>

            {/* Form Error */}
            {errors.form && (
              <motion.div className="auth-error" variants={itemVariants}>
                {errors.form}
              </motion.div>
            )}

            {showResendVerification && (
              <>
                {resendNote ? (
                  <motion.div className="auth-notice auth-notice--info" variants={itemVariants}>
                    {resendNote}
                  </motion.div>
                ) : null}
                <motion.div variants={itemVariants}>
                  <Button
                    variant="secondary"
                    size="lg"
                    type="button"
                    loading={resendBusy}
                    onClick={async () => {
                      if (!formData.email) {
                        setResendNote('Enter your email above first.');
                        return;
                      }
                      setResendBusy(true);
                      setResendNote('');
                      try {
                        const r = await authApi.resendVerification(formData.email);
                        const body = (await r.json().catch(() => ({}))) as {
                          message?: string;
                          error?: string;
                        };
                        if (!r.ok) {
                          setResendNote(body.error || 'Could not resend.');
                        } else {
                          setResendNote(
                            body.message ||
                              'If the account is pending, a new verification email was sent.'
                          );
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
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Link to="/verify-email-otp">
                    <Button variant="secondary" size="lg" type="button">
                      Enter 6-digit code
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <Button variant="primary" size="lg" type="submit" loading={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </motion.div>
          </motion.form>

          {/* Divider */}
          <motion.div className="auth-divider" variants={itemVariants}>
            <span>or</span>
          </motion.div>

          {/* Google Sign-In */}
          <motion.div variants={itemVariants}>
            <GoogleAuthButton
              mode="signin"
              onError={(msg) => setErrors((prev) => ({ ...prev, form: msg }))}
            />
          </motion.div>

          {/* Sign Up Link */}
          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default LoginPage;
