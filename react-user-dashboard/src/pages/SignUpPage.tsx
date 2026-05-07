import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

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
      // TODO: Call backend API to create account
      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to account review page (future)
      // For now, redirect to login
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (_error) {
      setErrors({ form: 'Failed to create account. Please try again.' });
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
              <Logo size="md" showText={true} />
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Create Your Account</h1>
            <p className="auth-subtitle">
              Join Lumina to streamline your support ticketing system
            </p>
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
                helpText="Must be at least 8 characters"
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

          {/* Divider */}
          <motion.div className="auth-divider" variants={itemVariants}>
            <span>or</span>
          </motion.div>

          {/* Google Sign-Up */}
          <motion.div variants={itemVariants}>
            <Button variant="secondary" size="lg" className="auth-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </Button>
          </motion.div>

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
