import { Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useBatches } from './context/BatchContext';
import { AppShell } from './components/layout/AppShell';
import { LoadingIndicator } from './components/ui/LoadingIndicator';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateBatchPage } from './pages/CreateBatchPage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { BatchesPage } from './pages/BatchesPage';
import { HistoryPage } from './pages/HistoryPage';
import { BatchHistoryDetailPage } from './pages/BatchHistoryDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';

export default function App() {
  const { isLoggedIn, isOnboarded, farm, farmLoading, loadFarm } = useAuth();
  const { hasBatches, ready: batchesReady, error: batchesError, loadBatches } = useBatches();

  // Logged in, and the farm profile or batches haven't loaded for the first
  // time yet. Only that first load holds the app here: later reloads (after
  // creating a batch, a retry, coming back online) must not swap the page out
  // for this screen, or whatever it was showing is lost. That's what hid the
  // "batch created" confirmation.
  if (isLoggedIn && ((farmLoading && !farm) || !batchesReady)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingIndicator label="Loading your farm" />
      </div>
    );
  }

  const isSetupComplete = isOnboarded || hasBatches;

  // Signed in, but the batches couldn't load (offline with nothing saved on
  // this device, or the API is down), so whether this farm is set up is
  // unknown. Don't guess "not set up" and send them to onboarding.
  if (isLoggedIn && !isSetupComplete && batchesError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center" aria-hidden="true">
            <WifiOff size={26} strokeWidth={1.75} className="text-[#17191A]" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-[#142033] font-heading">Can't reach TrackFarm right now</h1>
          <p className="mt-2 text-sm text-[#70829B]">
            Your records will show once you're connected. Check your internet and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              loadFarm();
              loadBatches();
            }}
            className="mt-6 px-5 py-2.5 rounded-lg bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-sm font-semibold transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
        <Route
          path="/signup"
          element={
            isLoggedIn ? (
              isSetupComplete ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            ) : (
              <SignupPage />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />}
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
          {/* Notifications — the full list behind the header bell */}
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Route>

        {/* Catch-all → redirect home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
