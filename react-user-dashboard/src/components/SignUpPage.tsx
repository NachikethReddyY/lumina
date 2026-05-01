import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import apiClient from '../utils/apiClient';
import '../styles/auth.css';

interface SignUpFormInputs {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}

const ATM_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6EM4rmtrwDUKg-f2KcWCnsjRQFhSs-LWU-vp7zLx5MdK4U73WmXx6ZhpWYmEJEEBTHtOxBsQSRvcSpskvYmnrhkZy8k4qyiTOdO9sIVCR2_ONvQHSjQRodZsKMN0IKso_OSqnomw-rz4r9SUsYu8OFnBE15Yv8wkHf9EbywG9wGXu_VCgg_QwFCnfBfQDFMtD4mUhg0ascukNTLVSnrxW3LvwuwldIo8pdYlh7rEino25ZJiLzM_0VbWzkeezQcZSb-VPumgw-tk';

const SignUpPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormInputs>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: SignUpFormInputs) => {
    try {
      await apiClient.post('/auth/signup', { email: data.email, password: data.password });
      alert('Sign up successful! Please log in.');
      navigate('/login');
    } catch (error) {
      console.error('Sign up failed:', error);
      alert('Failed to sign up. Please try again.');
    }
  };

  return (
    <div className="auth-root">
       <header className="home-header">
         <Link to="/" className="header-brand-link">
           <div className="header-brand-group">
             <span className="brand-wordmark">Lumina</span>
             <span className="brand-badge">Helpdesk</span>
           </div>
         </Link>
       </header>

      <div className="auth-container">
        {/* ── Left: Brand Panel ── */}
        <aside className="auth-brand-panel">
        <div className="auth-brand-bg">
          <div className="auth-brand-overlay" />
          <img src={ATM_IMG} alt="" className="auth-brand-img" />
        </div>

        <div className="auth-brand-body">
          <h1 className="auth-brand-quote">
            "Clarity of thought requires clarity of space."
          </h1>
          <p className="auth-brand-sub">
            Enter the premier environment for high-focus IT intelligence and precise operational control.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span className="auth-brand-rule" />
          <span className="auth-brand-tag">System Entry</span>
        </div>
      </aside>

      {/* ── Right: Form Panel ── */}
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Create an account</h2>
          <p className="auth-subheading">
            Begin your journey with the pro-grade IT management lab.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* First / Last name */}
            <div className="auth-field-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  className="auth-input"
                  {...register('firstName', { required: 'Required' })}
                />
                {errors.firstName && <p className="auth-error-msg">{errors.firstName.message}</p>}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  className="auth-input"
                  {...register('lastName', { required: 'Required' })}
                />
                {errors.lastName && <p className="auth-error-msg">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Professional Email</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="email"
                  type="email"
                  placeholder="jane@company.com"
                  className="auth-input has-icon-left"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="auth-error-msg">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Secure Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="auth-input has-icon-both"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  className="auth-input-icon-right"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="auth-error-msg">{errors.password.message}</p>}
            </div>

            {/* Terms */}
            <div className="auth-check-row">
              <input
                id="terms"
                type="checkbox"
                {...register('terms', { required: 'You must accept the terms' })}
              />
              <label className="auth-check-label" htmlFor="terms">
                I agree to the{' '}
                <a href="#">Terms of Service</a> and{' '}
                <a href="#">Privacy Policy</a>.
              </label>
            </div>
            {errors.terms && <p className="auth-error-msg">{errors.terms.message}</p>}

            {/* Submit */}
            <div className="auth-submit-wrap">
              <button type="submit" className="auth-btn-primary">
                Create Workspace
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="auth-google-row" style={{ marginTop: 12 }}>
              <button type="button" className="auth-google-blob" onClick={() => alert('Google auth not wired in this demo')} aria-label="Sign in with Google">
                <svg className="auth-google-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden>
                  <circle cx="24" cy="24" r="20" fill="url(#ggrad)" />
                  <defs>
                    <linearGradient id="ggrad" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#4285F4" />
                      <stop offset="25%" stopColor="#34A853" />
                      <stop offset="50%" stopColor="#FBBC05" />
                      <stop offset="75%" stopColor="#EA4335" />
                    </linearGradient>
                  </defs>
                  <text x="24" y="31" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="20" fill="#fff">G</text>
                </svg>
              </button>

              <button type="button" className="auth-btn-google" onClick={() => alert('Google auth not wired in this demo')}>
                Sign up with Google
              </button>
            </div>
          </form>

          <div className="auth-footer-link">
            Already have an access node?
            <Link to="/login">Authenticate here</Link>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default SignUpPage;
