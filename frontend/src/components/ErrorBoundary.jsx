import React from 'react';

function ErrorFallbackUI() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#111',
            color: '#fff',
            fontFamily: 'sans-serif',
            gap: '1rem',
        }}>
            <h1 style={{ fontSize: '2rem' }}>Something went wrong</h1>
            <p style={{ color: '#aaa' }}>An unexpected error occurred. Please try refreshing the page.</p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    marginTop: '1rem',
                    padding: '0.6rem 1.4rem',
                    backgroundColor: '#e50914',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                }}
            >
                Refresh Page
            </button>
        </div>
    );
}

class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught an error:', error, info);
    }

    render() {
        if (this.state.hasError) return <ErrorFallbackUI />;
        return this.props.children;
    }
}

export default ErrorBoundary;
