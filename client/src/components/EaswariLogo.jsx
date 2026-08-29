/**
 * @fileoverview Official Easwari Engineering College Logo Components.
 * Uses the official circular emblem image asset (with SRM Temple Gopuram,
 * "EASWARI ENGINEERING COLLEGE", "EDUCATE AND EXCEL").
 */

import React from 'react';
import easwariLogoImg from '../assets/easwari_logo.png';

/**
 * Easwari Engineering College Circular Crest Emblem
 *
 * @param {object} props
 * @param {string} [props.className]
 * @param {number} [props.size]
 * @returns {JSX.Element}
 */
export const EaswariEmblem = ({ className = 'w-10 h-10', size = 44 }) => {
  return (
    <img
      src={easwariLogoImg}
      alt="Easwari Engineering College Logo"
      width={size}
      height={size}
      className={`${className} object-contain rounded-full bg-white shadow-xs shrink-0 select-none`}
    />
  );
};

/**
 * Full Easwari Engineering College Brand Header with Emblem + Uniform Typography
 *
 * @param {object} props
 * @param {boolean} [props.compact]
 * @param {boolean} [props.onDark]
 * @returns {JSX.Element}
 */
export const EaswariBrandHeader = ({ compact = false, onDark = false }) => {
  return (
    <div className="flex items-center gap-3 group">
      <EaswariEmblem className={compact ? "w-10 h-10" : "w-11 h-11"} size={compact ? 40 : 46} />
      <div className="flex flex-col justify-center">
        <span
          className={`font-bold text-sm sm:text-base tracking-wide uppercase leading-tight whitespace-nowrap ${
            onDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Easwari Engineering College
        </span>
        <div
          className={`flex items-center gap-1.5 mt-0.5 text-[11px] font-medium ${
            onDark ? 'text-white/80' : 'text-gray-500'
          }`}
        >
          <span
            className={`px-1.5 py-0.2 rounded font-bold text-[10px] tracking-wider uppercase ${
              onDark
                ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                : 'bg-primary-50 text-primary-700 border border-primary-200/60'
            }`}
          >
            Autonomous
          </span>
          <span className="hidden sm:inline">• Ramapuram, Chennai</span>
          <span
            className={`font-semibold hidden md:inline ${
              onDark ? 'text-amber-200' : 'text-primary-600'
            }`}
          >
            • Resource Portal
          </span>
        </div>
      </div>
    </div>
  );
};

export default EaswariEmblem;
