import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import apiClient from '../utils/apiClient';
import '../styles/auth.css';
import '../styles/home.css';

interface ForgotPasswordFormInputs {
  email: string;
}

const ATM_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6EM4rmtrwDUKg-f2KcWCnsjRQFhSs-LWU-vp7zLx5MdK4U73WmXx6ZhpWYmEJEEBTHtOxBsQSRvcSpskvYmnrhkZy8k4qyiTOdO9sIVCR2_ONvQHSjQRodZsKMN0IKso_OSqnomw-rz4r9SUsYu8OFnBE15Yv8wkHf9EbywG9wGXu_VCgg_QwFCnfBfQDFMtD4mUhg0ascukNTLVSnrxW3LvwuwldIo8pdYlh7rEino25ZJiLzM_0VbWzkeezQcZSb-VPumgw-tk';

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormInputs>();
  const navigate = useNavigate();

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      alert('If this email is registered, you will receive a password reset link.');
      navigate('/login');
    } catch (error) {
      console.error('Forgot password request failed:', error);
      alert('Failed to process the request. Please try again.');
    }
  };

  return (
    <div className="auth-root">
      <header className="home-header">
        <div className="header-brand-group">
          <span className="brand-wordmark">Lumina</span>
          <span className="brand-badge">Helpdesk</span>
        </div>

        <div className="header-nav-group">
          <div>
            <button onClick={() => navigate('/login')} className="topbar-link">Login</button>
          </div>
        </div>
      </header>

      {/* ── Left: Brand Panel ── */}
      <aside className="auth-brand-panel">
        <div className="auth-brand-bg">
          <div className="auth-brand-overlay" />
          <img src={ATM_IMG} alt="" className="auth-brand-img" />
        </div>

        <div className="auth-brand-body">
          <h1 className="auth-brand-quote">
            Restore access to your workspace.
          </h1>
          <p className="auth-brand-sub">
            Follow the recovery protocol to reset your security credentials.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span className="auth-brand-rule" />
          <span className="auth-brand-tag">Recovery Mode</span>
        </div>
      </aside>

      {/* ── Right: Form Panel ── */}
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Reset password</h2>
          <p className="auth-subheading">
            Enter your email and we'll send you a link to get back into your account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="auth-input has-icon-left"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="auth-error-msg">{errors.email.message}</p>}
            </div>

            {/* Submit */}
            <div className="auth-submit-wrap">
              <button type="submit" className="auth-btn-primary">
                Send Reset Link
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
                Sign in with Google
              </button>
            </div>
          </form>

          <div className="auth-footer-link">
            Remember your credentials?
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
