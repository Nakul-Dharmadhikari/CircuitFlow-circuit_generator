import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('CircuitFlow Uncaught React Exception:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetCanvas = (): void => {
    try {
      localStorage.removeItem('circuitflow_saved_circuits');
      sessionStorage.clear();
    } catch {
      // Ignore storage restrictions
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: 'var(--bg-app, #121417)',
            color: 'var(--text-primary, #f3f4f6)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: 'var(--bg-panel, #1a1d21)',
              border: '1px solid var(--border-strong, #3f4754)',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.65))',
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>⚡</div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--accent-copper, #d97736)',
                marginBottom: '12px',
              }}
            >
              CircuitFlow Studio Encountered an Unexpected Error
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary, #9ca3af)',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              An unexpected runtime exception was intercepted by the system error boundary.
              Your local projects remain preserved. You can safely reload the studio or reset to a fresh blank canvas.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle, #292e36)',
                  border: '1px solid var(--signal-x, #ef4444)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--signal-x, #ef4444)',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent-copper, #d97736)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                🔄 Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetCanvas}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary, #9ca3af)',
                  border: '1px solid var(--border-strong, #3f4754)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                📄 Reset to Clean Workbench
              </button>
            </div>

            {this.state.errorInfo && (
              <details style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-muted, #6b7280)' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>View Diagnostic Component Stack</summary>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-app, #121417)',
                    padding: '8px',
                    borderRadius: '4px',
                    overflowX: 'auto',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
