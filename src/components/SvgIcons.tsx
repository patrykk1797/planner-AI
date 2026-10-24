import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const SvgPlanIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="4" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
  </svg>
);

export const SvgSimulatorIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SvgRunIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="14" cy="4" r="2" />
    <path d="m11 8-2 6 3 2 1 5" />
    <path d="M17 12l-4-2-2 3" />
    <path d="m7 12 3-3 4 1 3 3" />
  </svg>
);

export const SvgStrengthIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6.5 6.5 11 11M3 8l3-3M8 3l3 3M13 18l3 3M18 13l3 3M4 11l7-7M13 20l7-7" />
  </svg>
);

export const SvgShoeIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 17h18a1 1 0 0 0 1-1v-2c-2-2-4-2-6-3l-5-4a4 4 0 0 0-3-1H6a3 3 0 0 0-3 3v7a1 1 0 0 0 1 1z" />
    <path d="M3 14h18M6 8v3M10 9v2M14 11v1" />
  </svg>
);

export const SvgPandaFace: React.FC<IconProps> = ({ className = '', size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Panda Ears */}
    <circle cx="5" cy="5.5" r="3.5" fill="currentColor" />
    <circle cx="19" cy="5.5" r="3.5" fill="currentColor" />
    {/* Panda Head Base */}
    <ellipse cx="12" cy="13" rx="8.5" ry="8" fill="white" stroke="currentColor" strokeWidth="1.8" />
    {/* Dark Eye Patches */}
    <ellipse cx="8.5" cy="12" rx="2.2" ry="2.6" transform="rotate(-18 8.5 12)" fill="#0f172a" />
    <ellipse cx="15.5" cy="12" rx="2.2" ry="2.6" transform="rotate(18 15.5 12)" fill="#0f172a" />
    {/* Sparkle White Catchlights */}
    <circle cx="9" cy="11.2" r="0.8" fill="white" />
    <circle cx="15" cy="11.2" r="0.8" fill="white" />
    {/* Cute Nose */}
    <ellipse cx="12" cy="15.2" rx="1.5" ry="1" fill="#0f172a" />
    {/* Cheerful Mouth */}
    <path d="M10.5 17.2c.9.7 2.1.7 3 0" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const SvgPandaIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="13" r="8" />
    <circle cx="6" cy="6" r="3" fill="currentColor" fillOpacity="0.2" />
    <circle cx="18" cy="6" r="3" fill="currentColor" fillOpacity="0.2" />
    <ellipse cx="9" cy="11.5" rx="1.5" ry="2" fill="currentColor" />
    <ellipse cx="15" cy="11.5" rx="1.5" ry="2" fill="currentColor" />
    <ellipse cx="12" cy="15" rx="1.5" ry="1" fill="currentColor" />
    <path d="M10.5 17c.5.5 2.5.5 3 0" />
  </svg>
);

export const SvgFuelIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M7 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
    <path d="M9 13h6M12 10v6" />
  </svg>
);

export const SvgPhysioIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M19 8v6M16 11h6" />
  </svg>
);

export const SvgVolumeIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const SvgSettingsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const SvgChatAiIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M12 8v6M9 11h6" />
  </svg>
);

export const SvgTrophyIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
    <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" />
  </svg>
);

export const SvgBodyGearIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 17h16a1 1 0 0 0 1-1v-2c-2-2-4-2-6-3l-5-4a4 4 0 0 0-3-1H6a3 3 0 0 0-3 3v7a1 1 0 0 0 1 1z" />
    <circle cx="16" cy="7" r="2.5" />
    <path d="M14 12v-2a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
  </svg>
);


