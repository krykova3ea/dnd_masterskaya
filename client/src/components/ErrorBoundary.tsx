import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
            Что-то пошло не так
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            {this.state.error?.message || 'Неожиданная ошибка'}
          </p>
          <button
            className="btn btn--primary"
            onClick={() => window.location.href = '/'}
          >
            На главную
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
