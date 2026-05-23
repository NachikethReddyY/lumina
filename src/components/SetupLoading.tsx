import Logo from './Logo';
import './SetupLoading.css';

type Props = {
  message?: string;
};

export function SetupLoading({ message = 'Loading…' }: Props) {
  return (
    <div className="setup-loading" role="status" aria-live="polite">
      <div className="setup-loading__card">
        <Logo size="sm" showText vertical />
        <p className="setup-loading__message">{message}</p>
        <div className="setup-loading__spinner" aria-hidden />
      </div>
    </div>
  );
}

export default SetupLoading;
