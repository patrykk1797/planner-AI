import React from 'react';
import { IntegrationBrandLogo } from './IntegrationBrandLogo.tsx';

interface AppIconProps {
  appId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
}

const TREDA_LOGO_PATH = '/assets/aistudio/Gemini_Generated_Image_hfyazthfyazthfya_bec0c212.jpg';

export const AppIcon: React.FC<AppIconProps> = ({ appId, size = 'md', className = '' }) => {
  if (appId) {
    const mappedSize: 'xs' | 'sm' | 'md' | 'lg' =
      typeof size === 'string'
        ? size === 'xs' || size === 'sm' || size === 'md' || size === 'lg'
          ? size
          : 'md'
        : size <= 22
        ? 'xs'
        : size <= 30
        ? 'sm'
        : size <= 42
        ? 'md'
        : 'lg';
    return (
      <IntegrationBrandLogo
        appId={appId === 'google' ? 'google_fit' : appId}
        size={mappedSize}
        className={className}
      />
    );
  }

  const sizeMap: Record<string, string> = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-3xl',
    xl: 'w-20 h-20 rounded-[28px]',
  };
  const dimClass = typeof size === 'string' ? sizeMap[size] || sizeMap.md : sizeMap.md;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden shadow-xl select-none shrink-0 border border-white/20 bg-slate-950 ${dimClass} ${className}`}
      style={{
        boxShadow: '0 8px 24px -4px rgba(255, 90, 31, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
      }}
    >
      <img
        src={TREDA_LOGO_PATH}
        alt="Treda Logo"
        className="w-full h-full object-cover select-none"
        loading="eager"
      />
    </div>
  );
};
