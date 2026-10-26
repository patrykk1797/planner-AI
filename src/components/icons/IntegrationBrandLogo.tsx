import React from 'react';

export type IntegrationAppId =
  | 'komoot'
  | 'huawei'
  | 'apple'
  | 'strava'
  | 'garmin'
  | 'zepp'
  | 'google_fit'
  | 'polar'
  | 'coros'
  | string;

interface IntegrationBrandLogoProps {
  appId: IntegrationAppId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const INTEGRATION_LOGO_CONFIG: Record<
  string,
  {
    name: string;
    logoUrl: string;
    borderColor: string;
    bgColor: string;
    isWide?: boolean;
  }
> = {
  zepp: {
    name: 'Zepp (Amazfit)',
    logoUrl: '/assets/integrations/zepp.svg',
    borderColor: '#00C389',
    bgColor: '#ffffff',
  },
  komoot: {
    name: 'Komoot',
    logoUrl: '/assets/integrations/komoot.svg',
    borderColor: '#6AA127',
    bgColor: '#ffffff',
  },
  huawei: {
    name: 'Huawei Health',
    logoUrl: '/assets/integrations/huawei.svg',
    borderColor: '#CF0A2C',
    bgColor: '#ffffff',
  },
  apple: {
    name: 'Apple Zdrowie',
    logoUrl: '/assets/integrations/apple.svg',
    borderColor: '#FF2D55',
    bgColor: '#ffffff',
  },
  strava: {
    name: 'Strava',
    logoUrl: '/assets/integrations/strava.svg',
    borderColor: '#FC4C02',
    bgColor: '#ffffff',
  },
  garmin: {
    name: 'Garmin Connect',
    logoUrl: '/assets/integrations/garmin.svg',
    borderColor: '#007CC3',
    bgColor: '#ffffff',
    isWide: true,
  },
  google_fit: {
    name: 'Google Zdrowie',
    logoUrl: '/assets/integrations/google_fit.svg',
    borderColor: '#4285F4',
    bgColor: '#ffffff',
  },
  polar: {
    name: 'Polar Flow',
    logoUrl: '/assets/integrations/polar.svg',
    borderColor: '#E71933',
    bgColor: '#ffffff',
    isWide: true,
  },
  coros: {
    name: 'COROS Hub',
    logoUrl: '/assets/integrations/coros.png',
    borderColor: '#F22C3D',
    bgColor: '#ffffff',
    isWide: true,
  },
};

export const IntegrationBrandLogo: React.FC<IntegrationBrandLogoProps> = ({
  appId,
  size = 'md',
  className = '',
}) => {
  const key = (appId || 'strava').toLowerCase();
  const cfg = INTEGRATION_LOGO_CONFIG[key] || INTEGRATION_LOGO_CONFIG.strava;

  const sizeMap = {
    xs: cfg.isWide ? 'w-7 h-5 p-0.5 rounded-md' : 'w-5 h-5 p-1 rounded-md',
    sm: cfg.isWide ? 'w-11 h-7 px-1.5 py-1 rounded-lg' : 'w-8 h-8 p-1.5 rounded-lg',
    md: cfg.isWide ? 'w-14 h-9 px-1.5 py-1.5 rounded-xl' : 'w-10 h-10 p-2 rounded-xl',
    lg: cfg.isWide ? 'w-18 h-12 px-2 py-2 rounded-2xl' : 'w-12 h-12 p-2.5 rounded-2xl',
  };

  return (
    <div
      className={`inline-flex items-center justify-center bg-white border shadow-sm shrink-0 overflow-hidden select-none ${sizeMap[size]} ${className}`}
      style={{ borderColor: `${cfg.borderColor}80` }}
      title={cfg.name}
    >
      <img
        src={cfg.logoUrl}
        alt={cfg.name}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};
