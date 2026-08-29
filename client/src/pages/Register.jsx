/**
 * @fileoverview User Registration page component.
 * Supports institutional college email accounts with 6-digit OTP verification
 * and strict domain enforcement (@eec.srmrmp.edu.in for students/faculty, authorized admin for admin).
 * Branded for Easwari Engineering College.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { sendOtp } from '../services/authService.js';
import OtpVerificationModal from '../components/OtpVerificationModal.jsx';
import { UserPlus, AlertCircle, Loader2, Lock, Mail, User, Building, ShieldCheck, KeyRound } from 'lucide-react';
import { EaswariEmblem } from '../components/EaswariLogo.jsx';

const ALLOWED_ADMIN_EMAIL = 'keerthanaaruvi2008@gmail.com';
const INSTITUTIONAL_DOMAIN = '@eec.srmrmp.edu.in';

/**
 * Registration Page Component.
 * @returns {JSX.Element}
 */
export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: 'Computer Science and Engineering',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // OTP Verification Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const { register } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setOtpError('');

    const email = formData.email.toLowerCase().trim();
    const role = formData.role;

    if (role === 'admin') {
      if (email !== ALLOWED_ADMIN_EMAIL) {
        setFormError('Not a valid mail ID. Only authorized administrator email can register as Admin.');
        return;
      }
    } else {
      if (!email.endsWith(INSTITUTIONAL_DOMAIN)) {
        setFormError(`Not a valid mail ID. Student and faculty emails must end with ${INSTITUTIONAL_DOMAIN}`);
        return;
      }
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendOtp({
        email,
        name: formData.name.trim(),
        purpose: 'Account Registration',
      });

      setIsOtpModalOpen(true);
      showSuccess(`Verification code dispatched to ${email}`);
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtpAndRegister = async (enteredOtp) => {
    try {
      setIsVerifyingOtp(true);
      setOtpError('');

      await register({
        ...formData,
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim(),
        otp: enteredOtp,
      });

      setIsOtpModalOpen(false);
      showSuccess('🎉 Account registered and verified successfully! Welcome to Easwari Engineering College.');
      navigate('/dashboard', { replace: true });
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
        name: formData.name.trim(),
        purpose: 'Account Registration',
      });
      showSuccess('Fresh verification code dispatched to your email.');
    } catch (err) {
      setOtpError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 sm:my-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-2">
            <EaswariEmblem size={64} className="w-16 h-16 shadow-xs" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200 mb-1">
            Easwari Engineering College
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create an Account</h1>
          <p className="text-xs text-gray-500 mt-0.5">Register with your institutional college email</p>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{formError}</div>
          </div>
        )}

        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Keerthana or Alex Doe"
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
              {formData.role === 'admin' ? 'Administrator Email' : 'College / Institutional Email'}
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
                placeholder={
                  formData.role === 'admin' ? 'admin@domain.com' : '310625243103@eec.srmrmp.edu.in'
                }
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition font-medium"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {formData.role === 'admin' ? (
                <>Must be an authorized administrator email address.</>
              ) : (
                <>Must end with <code>{INSTITUTIONAL_DOMAIN}</code></>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="role">
                Account Role
              </label>
              <div className="relative">
                <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white transition capitalize"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="department">
                Department
              </label>
              <div className="relative">
                <Building className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. CSE / IT"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Verification Code...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Verify Email & Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        email={formData.email}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleVerifyOtpAndRegister}
        onResend={handleResendOtp}
        isSubmitting={isVerifyingOtp}
        error={otpError}
      />
    </div>
  );
};

export default RegisterPage;
