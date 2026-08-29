/**
 * @fileoverview User Sign In page component.
 * Allows students, faculty, and administrators to log in using password or institutional email OTP
 * with domain validation (@eec.srmrmp.edu.in for students/faculty, authorized admin for admin).
 * Branded for Easwari Engineering College.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { sendOtp } from '../services/authService.js';
import OtpVerificationModal from '../components/OtpVerificationModal.jsx';
import { LogIn, AlertCircle, Loader2, Lock, Mail, KeyRound } from 'lucide-react';
import { EaswariEmblem } from '../components/EaswariLogo.jsx';

const ALLOWED_ADMIN_EMAIL = 'keerthanaaruvi2008@gmail.com';
const INSTITUTIONAL_DOMAIN = '@eec.srmrmp.edu.in';

const isAllowedEmail = (email) => {
  const norm = email.toLowerCase().trim();
  return (
    norm.endsWith(INSTITUTIONAL_DOMAIN) ||
    norm === ALLOWED_ADMIN_EMAIL ||
    norm === 'admin@university.edu'
  );
};

/**
 * Login Page Component.
 * @returns {JSX.Element}
 */
export const LoginPage = () => {
  const [authMode, setAuthMode] = useState('password'); // 'password' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // OTP Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const { login, loginWithOtp } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setFormError('');

    const email = formData.email.toLowerCase().trim();
    if (!email || !formData.password) {
      setFormError('Please enter both email and password.');
      return;
    }

    if (!isAllowedEmail(email)) {
      setFormError(`Not a valid mail ID. Please enter a valid institutional email (${INSTITUTIONAL_DOMAIN}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        email,
        password: formData.password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtpLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setOtpError('');

    const email = formData.email.toLowerCase().trim();
    if (!email) {
      setFormError('Please enter your institutional email address.');
      return;
    }

    if (!isAllowedEmail(email)) {
      setFormError(`Not a valid mail ID. Please enter a valid institutional email (${INSTITUTIONAL_DOMAIN}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await sendOtp({
        email,
        purpose: 'Sign In Verification',
      });

      setIsOtpModalOpen(true);
      showSuccess(`Verification code dispatched to ${email}`);
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (enteredOtp) => {
    try {
      setIsVerifyingOtp(true);
      setOtpError('');

      await loginWithOtp({
        email: formData.email.toLowerCase().trim(),
        otp: enteredOtp,
      });

      setIsOtpModalOpen(false);
      showSuccess('🎉 Successfully signed in via Email OTP!');
      navigate(from, { replace: true });
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const email = formData.email.toLowerCase().trim();
      await sendOtp({
        email,
        purpose: 'Sign In Verification',
      });
      showSuccess('Fresh verification code dispatched to your email.');
    } catch (err) {
      setOtpError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-2">
            <EaswariEmblem size={64} className="w-16 h-16 shadow-xs" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200 mb-1">
            Easwari Engineering College
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sign in to your campus booking portal</p>
        </div>

        {/* Auth Mode Switcher */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setFormError('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              authMode === 'password'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setFormError('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              authMode === 'otp'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Email OTP Sign In</span>
          </button>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{formError}</div>
          </div>
        )}

        {authMode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="310625243103@eec.srmrmp.edu.in"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendOtpLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="otp-email">
                College / Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="otp-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="310625243103@eec.srmrmp.edu.in"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition font-medium"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                We will send a 6-digit one-time code to your verified email.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send 6-Digit OTP
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Register with College Email
          </Link>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        email={formData.email}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        isSubmitting={isVerifyingOtp}
        error={otpError}
      />
    </div>
  );
};

export default LoginPage;
