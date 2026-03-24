import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { TourProvider } from './context/TourContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ProfileGate } from './components/layout/ProfileGate';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SetupPage } from './pages/SetupPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ResumeDetailPage } from './pages/ResumeDetailPage';
import { ResumeEditPage } from './pages/ResumeEditPage';
import { JobTrackerPage } from './pages/JobTrackerPage';
import { JobDetailPage } from './pages/JobDetailPage';

function RedirectJobPrep() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/jobs/${id}?tab=prep`} replace />;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <TourProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                {/* Accessible without a profile */}
                <Route path="/setup" element={<SetupPage />} />
                {/* All other routes require a profile */}
                <Route element={<ProfileGate />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/resumes/:id/edit" element={<ResumeEditPage />} />
                  <Route path="/resumes/:id" element={<ResumeDetailPage />} />
                  <Route path="/jobs" element={<JobTrackerPage />} />
                  <Route path="/jobs/:id" element={<JobDetailPage />} />
                  <Route path="/jobs/:id/prep" element={<RedirectJobPrep />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TourProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
