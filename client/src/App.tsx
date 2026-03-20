import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ProfileGate } from './components/layout/ProfileGate';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SetupPage } from './pages/SetupPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ResumesPage } from './pages/ResumesPage';
import { ResumeDetailPage } from './pages/ResumeDetailPage';
import { ResumeEditPage } from './pages/ResumeEditPage';
import { JobTrackerPage } from './pages/JobTrackerPage';
import { JobDetailPage } from './pages/JobDetailPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Accessible without a profile */}
              <Route path="/setup" element={<SetupPage />} />
              {/* All other routes require a profile */}
              <Route element={<ProfileGate />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/resumes" element={<ResumesPage />} />
                <Route path="/resumes/:id/edit" element={<ResumeEditPage />} />
                <Route path="/resumes/:id" element={<ResumeDetailPage />} />
                <Route path="/jobs" element={<JobTrackerPage />} />
                <Route path="/jobs/:id" element={<JobDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
