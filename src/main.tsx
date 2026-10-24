import React, { Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global guard for browser extension errors (e.g. MetaMask, web3 inpage scripts)
if (typeof window !== 'undefined') {
  const isExtensionErr = (msg?: unknown, filename?: string) => {
    const s = `${String(msg || '')} ${String(filename || '')}`;
    return (
      s.includes('MetaMask') ||
      s.includes('inpage.js') ||
      s.includes('chrome-extension://') ||
      s.includes('moz-extension://')
    );
  };

  window.addEventListener(
    'error',
    (e) => {
      if (isExtensionErr(e.message, e.filename) || isExtensionErr(e.error?.stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (e) => {
      if (isExtensionErr(e.reason?.message) || isExtensionErr(e.reason?.stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
}

// React Error Boundary to catch any unforeseen component tree crashes
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Captured component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#0b0e14] text-slate-300 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-4 font-mono font-bold text-lg">
            !
          </div>
          <h2 className="text-base font-bold text-white mb-2">Terminal Display Notice</h2>
          <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
            The workspace encountered an unexpected display event.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
          >
            Reload Terminal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
