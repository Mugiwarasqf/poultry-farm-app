import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BatchProvider } from './context/BatchContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { registerServiceWorker } from './lib/pwa';

import './styles/index.css';

// Installed-app support: offline start, saved records, update notice.
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BatchProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </BatchProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
