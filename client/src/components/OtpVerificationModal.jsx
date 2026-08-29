/**
 * @fileoverview OtpVerificationModal component.
 * Interactive 6-digit OTP entry dialog with automatic focus progression,
 * paste detection, resend timer, and clean verification flow.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mail, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

/**
 * OTP Verification Dialog Component.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} props.email - Recipient institutional email.
 * @param {Function} props.onClose
 * @param {Function} props.onVerify - Callback with completed 6-digit code.
 * @param {Function} props.onResend - Callback to request a new code.
 * @param {boolean} [props.isSubmitting]
 * @param {string} [props.error]
 * @returns {JSX.Element|null}
 */
export const OtpVerificationModal = ({
  isOpen,
  email,
  onClose,
  onVerify,
  onResend,
  isSubmitting = false,
  error = '',
  devOtp = '',
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const inputsRef = useRef([]);

  // Reset & focus on modal open
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setResendCooldown(45);
      setTimeout(() => {
        if (inputsRef.current[0]) {
          inputsRef.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next input
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const splitDigits = pasted.split('');
      setDigits(splitDigits);
      inputsRef.current[5]?.focus();
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      await onResend();
      setResendCooldown(45);
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.join('').length === 6;

  const handleSubmit = () => {
    if (!isComplete || isSubmitting) return;
    onVerify(digits.join(''));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100/80 text-primary-600 rounded-xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Verify Email Address</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter the 6-digit one-time code sent to your inbox</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600">
              We sent a 6-digit verification code to:
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-900 font-mono text-xs font-bold rounded-lg border border-primary-200/60">
              <Mail className="w-3.5 h-3.5 text-primary-600" />
              <span>{email}</span>
            </div>
          </div>

          {/* Dev/Test OTP Helper Banner */}
          {devOtp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Code: <strong className="font-mono text-sm tracking-widest font-bold text-amber-800">{devOtp}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const splitDigits = devOtp.split('');
                  setDigits(splitDigits);
                  inputsRef.current[5]?.focus();
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 on-paste" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                disabled={isSubmitting}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e.key)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-extrabold rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                  digit
                    ? 'border-primary-500 bg-primary-50/20 text-primary-900'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={!isComplete || isSubmitting}
            onClick={handleSubmit}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Code...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Verify & Continue
              </>
            )}
          </button>

          {/* Resend Code Section */}
          <div className="text-center pt-2 border-t border-gray-100">
            {resendCooldown > 0 ? (
              <p className="text-xs text-gray-500 font-medium">
                Didn't receive code? Resend in <strong className="text-gray-700">{resendCooldown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>Resend Verification Code</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
