import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import apiClient from '../utils/apiClient';
import '../styles/auth.css';
import '../styles/home.css';

interface LoginFormInputs {
  email: string;
  password: string;
  remember: boolean;
}

const ATM_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6EM4rmtrwDUKg-f2KcWCnsjRQFhSs-LWU-vp7zLx5MdK4U73WmXx6ZhpWYmEJEEBTHtOxBsQSRvcSpskvYmnrhkZy8k4qyiTOdO9sIVCR2_ONvQHSjQRodZsKMN0IKso_OSqnomw-rz4r9SUsYu8OFnBE15Yv8wkHf9EbywG9wGXu_VCgg_QwFCnfBfQDFMtD4mUhg0ascukNTLVSnrxW3LvwuwldIo8pdYlh7rEino25ZJiLzM_0VbWzkeezQcZSb-VPumgw-tk';

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const response = await apiClient.post('/auth/login', data);
      interface LoginResponse {
        accessToken: string;
        refreshToken: string;
      }
      const { accessToken, refreshToken } = response.data as LoginResponse;
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Invalid email or password');
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
            Calm inboxes. Faster resolutions. Happier customers.
          </h1>
          <p className="auth-brand-sub">
            Lumina brings clarity to support — triage, collaborate, and resolve tickets with speed.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span className="auth-brand-rule" />
          <span className="auth-brand-tag">Secure Access</span>
        </div>
      </aside>

      {/* ── Right: Form Panel ── */}
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Sign in</h2>
          <p className="auth-subheading">
            Already have an access node? Authenticate here — or sign in with Google.
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

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
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

            {/* Remember me */}
            <div className="auth-check-row">
              <input id="remember" type="checkbox" {...register('remember')} />
              <label className="auth-check-label" htmlFor="remember">
                Keep me signed in on this device
              </label>
            </div>

            {/* Submit */}
            <div className="auth-submit-wrap">
              <button type="submit" className="auth-btn-primary">
                Authenticate
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

          <div className="auth-footer-links-row">
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default LoginPage;
