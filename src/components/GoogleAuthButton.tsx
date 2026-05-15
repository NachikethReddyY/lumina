import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../utils/apiClient';

type Props = {
  /** Maps to Google button text variant */
  mode: 'signin' | 'signup';
  onError?: (message: string) => void;
};

export function GoogleAuthButton({ mode, onError }: Props) {
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="auth-hint">
        Set <code>VITE_GOOGLE_CLIENT_ID</code> in the repo root <code>.env</code> (same Web client ID
        as <code>GOOGLE_CLIENT_ID</code>)—Vite reads <code>envDir</code> one level up so both apps share one file.
      </p>
    );
  }

  return (
    <div className="auth-google-wrap">
      <GoogleLogin
        width={384}
        text={mode === 'signup' ? 'signup_with' : 'signin_with'}
        onSuccess={async (cred) => {
          if (!cred.credential) {
            onError?.('No credential returned from Google.');
            return;
          }
          const res = await authApi.google(cred.credential);
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            accessToken?: string;
            refreshToken?: string;
            code?: string;
            verificationEmail?: string;
          };
          if (!res.ok) {
            if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
              if (data.verificationEmail) {
                localStorage.setItem('pendingVerificationEmail', data.verificationEmail);
              }
              navigate('/verify-email-otp');
              return;
            }
            onError?.(data.error || 'Google sign-in failed.');
            return;
          }
          if (data.accessToken) {
            localStorage.setItem('authToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken || '');
            localStorage.removeItem('pendingVerificationEmail');
          }
          navigate('/dashboard');
        }}
        onError={() => onError?.('Google sign-in was cancelled or failed.')}
      />
    </div>
  );
}
