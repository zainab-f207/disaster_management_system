import { useEffect } from 'react';
import AdminSources from './pages/AdminSources';
import CreateOfficialIncident from './pages/CreateOfficialIncident';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminResponders from './pages/AdminResponders';
import AdminCitizens from './pages/AdminCitizens';
import AdminAnalytics from './pages/AdminAnalytics';
import MyReports from './pages/MyReports';
import EmergencyContacts from './pages/EmergencyContacts';
import NearbySafePlaces from './pages/NearbySafePlaces';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useThemeStore, useAuthStore } from './store';
import { useSignalR } from './hooks/useSignalR';
import { usePushNotifications } from './hooks/usePushNotifications';
import Navbar from './components/layout/Navbar';
import OfflineBanner from './components/ui/OfflineBanner';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import SubmitReport from './pages/SubmitReport';
import AdminPanel from './pages/AdminPanel';
import ResponderDashboard from './pages/ResponderDashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import DisastersList from './pages/DisastersList';
import DisasterDetail from './pages/DisasterDetail';
import LiveMap from './pages/LiveMap';
import SOSPage from './pages/SOSPage';
import AIAssistant from './pages/AIAssistant';
import PreparednessCentre from './pages/PreparednessCentre';
import SafetyCheck from './pages/SafetyCheck';

function HomeRoute() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Dashboard />;
  if (user?.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'Responder') return <Navigate to="/responder" replace />;
  return <CitizenDashboard />;
}

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole)
    return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { isConnected } = useSignalR();
  const { initTheme } = useThemeStore();
  usePushNotifications();

  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <BrowserRouter>
      <Navbar isConnected={isConnected} />

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/disasters" element={<DisastersList />} />
        <Route path="/disasters/:id" element={<DisasterDetail />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/sos" element={<SOSPage />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/preparedness" element={<PreparednessCentre />} />
        <Route path="/safety-check" element={<SafetyCheck />} />

        <Route path="/report" element={
          <ProtectedRoute><SubmitReport /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="Admin"><AdminPanel /></ProtectedRoute>
        } />
        <Route path="/admin/sources" element={
          <ProtectedRoute requiredRole="Admin"><AdminSources /></ProtectedRoute>
        } />
        <Route path="/admin/organizations" element={
          <ProtectedRoute requiredRole="Admin"><AdminOrganizations /></ProtectedRoute>
        } />
        <Route path="/admin/responders" element={
          <ProtectedRoute requiredRole="Admin"><AdminResponders /></ProtectedRoute>
        } />
        <Route path="/admin/citizens" element={
          <ProtectedRoute requiredRole="Admin"><AdminCitizens /></ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute requiredRole="Admin"><AdminAnalytics /></ProtectedRoute>
        } />
        <Route path="/create-official-incident" element={
          <ProtectedRoute requiredRole="Admin"><CreateOfficialIncident /></ProtectedRoute>
        } />
        <Route path="/my-reports" element={
          <ProtectedRoute><MyReports /></ProtectedRoute>
        } />
        <Route path="/contacts" element={<EmergencyContacts />} />
        <Route path="/nearby" element={<NearbySafePlaces />} />
        <Route path="/responder" element={
          <ProtectedRoute requiredRole="Responder"><ResponderDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <OfflineBanner />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: '12px',
            fontSize: '13px', boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#27ae60', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e53e3e', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}