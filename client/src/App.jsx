/**
 * @fileoverview Root React application component and base router layout.
 * Configures top-level navigation, AuthProvider wrapper, and role-protected routes.
 * Branded for Easwari Engineering College.
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, LogIn, UserPlus, LogOut, Home, ShieldAlert, LayoutDashboard, Building } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import ResourcesPage from './pages/Resources.jsx';
import BookingsPage from './pages/Bookings.jsx';
import AiAssistantDrawer from './components/AiAssistantDrawer.jsx';
import BookingModal from './components/BookingModal.jsx';
import { EaswariEmblem, EaswariBrandHeader } from './components/EaswariLogo.jsx';

/**
 * Landing Page Component
 * @returns {JSX.Element}
 */
const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <EaswariEmblem size={80} className="w-20 h-20 shadow-sm" />
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full mb-3 border border-primary-200">
        Easwari Engineering College • Autonomous • Ramapuram
      </div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight sm:text-5xl mb-3 max-w-3xl">
        Academic Event & Resource Booking Portal
      </h1>
      <p className="text-base sm:text-lg text-gray-600 max-w-2xl mb-8">
        Centralized, conflict-free reservation platform for campus seminar halls, labs, smart classrooms, and institutional equipment.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * 404 Not Found Component
 * @returns {JSX.Element}
 */
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
    <h2 className="text-3xl font-bold text-gray-900 mb-2">404 - Page Not Found</h2>
    <p className="text-gray-600 mb-6">The requested page does not exist or has moved.</p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
    >
      <Home className="w-4 h-4" />
      Return Home
    </Link>
  </div>
);

/**
 * Top Navigation Bar in signature Maroon Brown.
 * @returns {JSX.Element}
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-gradient-to-r from-[#5a1822] via-[#6b1d28] to-[#5a1822] text-white border-b border-[#4a121b] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <EaswariBrandHeader compact={true} onDark={true} />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                  isActive('/dashboard')
                    ? 'bg-white/20 text-white font-bold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/resources"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                  isActive('/resources')
                    ? 'bg-white/20 text-white font-bold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Resources</span>
              </Link>
              <Link
                to="/bookings"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                  isActive('/bookings')
                    ? 'bg-white/20 text-white font-bold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Bookings</span>
              </Link>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/25 rounded-lg text-xs font-medium text-white/90 border border-white/15">
                <span className="capitalize font-bold bg-white/20 px-2 py-0.5 rounded text-[10px]">{user?.role}</span>
                <span>•</span>
                <span>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-red-200 hover:text-white hover:bg-red-500/20 rounded-lg transition flex items-center gap-1.5 border border-red-300/20"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 text-sm font-bold bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-lg transition shadow-sm"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

/**
 * Main Application Layout Content with AI Assistant Drawer and Modal integration.
 * @returns {JSX.Element}
 */
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [prefillBookingData, setPrefillBookingData] = useState(null);
  const [isPrefillModalOpen, setIsPrefillModalOpen] = useState(false);

  const handlePrefillBooking = (payload) => {
    setPrefillBookingData(payload);
    setIsPrefillModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {isAuthenticated && (
        <>
          <AiAssistantDrawer onPrefillBooking={handlePrefillBooking} />
          {isPrefillModalOpen && (
            <BookingModal
              isOpen={isPrefillModalOpen}
              onClose={() => {
                setIsPrefillModalOpen(false);
                setPrefillBookingData(null);
              }}
              onSuccess={() => {
                setIsPrefillModalOpen(false);
                setPrefillBookingData(null);
              }}
              preselectedResource={
                prefillBookingData?.resourceId
                  ? { _id: prefillBookingData.resourceId, name: prefillBookingData.resourceName }
                  : null
              }
              initialData={prefillBookingData}
            />
          )}
        </>
      )}

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        Easwari Engineering College (Autonomous) • Ramapuram, Chennai &copy; {new Date().getFullYear()} — Double-Booking Structurally Prevented.
      </footer>
    </div>
  );
};

/**
 * Root Application Component.
 * @returns {JSX.Element}
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
