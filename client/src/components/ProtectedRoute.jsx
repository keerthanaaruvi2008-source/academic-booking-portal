/**
 * @fileoverview ProtectedRoute component for route-level authentication and RBAC guards.
 * Redirects unauthenticated users to /login and displays Access Denied for unauthorized roles.
 */

import React from 'react';
import { Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Route protection wrapper component.
 *
 * @param {object} props
 * @param {string[]} [props.allowedRoles] - Optional list of allowed roles.
 * @param {React.ReactNode} [props.children] - Child elements to render if authorized.
 * @returns {JSX.Element}
 */
export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-xl border border-red-200 shadow-sm text-center">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 text-sm mb-6">
          Your account role (<span className="font-semibold text-gray-800 capitalize">{user?.role}</span>) does not have permission to view this section.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
