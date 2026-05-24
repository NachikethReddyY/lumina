import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; retrying: boolean };

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retrying: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, retrying: false };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      this.setState({ retrying: true });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.retrying) {
        return (
          <div className="setup-loading" role="status">
            <div className="setup-loading__card">
              <p className="setup-loading__message">Loading failed — retrying…</p>
              <div className="setup-loading__spinner" aria-hidden />
            </div>
          </div>
        );
      }
      return (
        <div className="setup-loading" role="alert">
          <div className="setup-loading__card">
            <p className="setup-loading__message">Something went wrong loading this page.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChunkErrorBoundary;
