import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useBatches } from './context/BatchContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateBatchPage } from './pages/CreateBatchPage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { BatchesPage } from './pages/BatchesPage';
import { HistoryPage } from './pages/HistoryPage';
import { BatchHistoryDetailPage } from './pages/BatchHistoryDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { isLoggedIn, isOnboarded, farmLoading } = useAuth();
  const { hasBatches, loading: batchesLoading } = useBatches();

  // Logged in but still loading farm profile or batches
  if (isLoggedIn && (farmLoading || batchesLoading)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#FAFAF9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: '#6B7280',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #E5E7EB',
            borderTopColor: '#0D5C3A',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Loading your farm…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isSetupComplete = isOnboarded || hasBatches;

  return (
    <>
      {/* No offline overlay: losing connectivity must not block the farmer
          from recording anything. Writes made while offline still need a
          client-side queue to survive — see the note in api/client.js. */}
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              isSetupComplete ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              isSetupComplete ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Onboarding Route: existing/onboarded users go directly to dashboard */}
        <Route
          path="/onboarding"
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : isSetupComplete ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <OnboardingPage />
            )
          }
        />

        {/* Protected App Layout — all routes inside AppShell */}
        <Route
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : !isSetupComplete ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <AppShell />
            )
          }
        >
          {/* NOTE: no index route here. This layout route is pathless, so an
              index child would match "/" — the same path as the LandingPage
              route above — and React Router ranks an index route higher, so
              it would win and bounce every logged-out visitor to /login
              instead of ever showing the landing page. The "/" route above
              already redirects logged-in users to /dashboard. */}

          {/* Home / Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Batch Management */}
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/batches/new" element={<CreateBatchPage />} />
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />

          {/* Inventory (Feed, Vaccination, Multivitamins) */}
          <Route path="/inventory" element={<InventoryPage />} />

          {/* History — completed (closed) batches and their summaries.
              The :batchId route is the small-screen full-page detail view;
              on lg and up /history shows that same detail in a side panel. */}
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:batchId" element={<BatchHistoryDetailPage />} />

          {/* Settings — every section reuses the same two-column shell, so
              they share one component and differ only by :section. */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Route>

        {/* Catch-all → redirect home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
