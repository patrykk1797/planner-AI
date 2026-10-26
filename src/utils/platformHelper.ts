/**
 * Platform Adaptive Helper for TREDA Running
 * Detects iOS (Human Interface Guidelines) vs Android (Material You / M3) vs Web.
 * Automatically injects data-os attribute and provides native mobile utilities.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import React, { useState, useEffect } from 'react';

export type PlatformType = 'ios' | 'android' | 'web';

const STORAGE_PLATFORM_OVERRIDE_KEY = 'treda_platform_override';

/**
 * Detect the current operating platform:
 * 1. Capacitor.getPlatform() if running in native wrapper ('ios' | 'android')
 * 2. Developer / User preview override from localStorage (if set)
 * 3. User-Agent inspection as fallback
 */
export function getPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'web';

  // 1. Check user override for cross-testing / preview
  try {
    const override = localStorage.getItem(STORAGE_PLATFORM_OVERRIDE_KEY) as PlatformType | null;
    if (override === 'ios' || override === 'android') {
      return override;
    }
  } catch {}

  // 2. Capacitor native platform detection
  try {
    if (typeof Capacitor !== 'undefined' && typeof Capacitor.getPlatform === 'function') {
      const capPlatform = Capacitor.getPlatform();
      if (capPlatform === 'ios') return 'ios';
      if (capPlatform === 'android') return 'android';
    }
  } catch {}

  // 3. User-Agent / Navigator detection fallback
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

  // Detect iOS: iPhone, iPad, iPod, or macOS with touch points (iPadOS)
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIos) return 'ios';

  // Detect Android
  const isAndroid = /android/i.test(ua);
  if (isAndroid) return 'android';

  return 'web';
}

/**
 * Returns true when the application is running inside a Capacitor native mobile container
 */
export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function') {
      return Capacitor.isNativePlatform();
    }
  } catch {}
  return false;
}

/**
 * Automatically sets the `data-os` attribute on <html> and <body> elements.
 * E.g. data-os="ios" or data-os="android"
 */
export function applyPlatformAttributes(): PlatformType {
  const platform = getPlatform();

  if (typeof document !== 'undefined') {
    // If on web desktop without override, we map to ios by default for premium glass design
    // while keeping data-os accurately as 'ios' or 'android'
    const osValue = platform === 'web' ? 'ios' : platform;

    document.documentElement.setAttribute('data-os', osValue);
    document.documentElement.setAttribute('data-platform', platform);
    if (document.body) {
      document.body.setAttribute('data-os', osValue);
      document.body.setAttribute('data-platform', platform);
    }
  }

  return platform;
}

/**
 * Set developer / user platform override ('ios' | 'android' | null to reset)
 */
export function setPlatformOverride(override: PlatformType | null): void {
  if (typeof window === 'undefined') return;
  if (!override || override === 'web') {
    localStorage.removeItem(STORAGE_PLATFORM_OVERRIDE_KEY);
  } else {
    localStorage.setItem(STORAGE_PLATFORM_OVERRIDE_KEY, override);
  }
  applyPlatformAttributes();
  window.dispatchEvent(new CustomEvent('treda-platform-changed', { detail: { platform: getPlatform() } }));
}

/**
 * Safe haptic feedback trigger (Capacitor Haptics with Web Vibration API fallback)
 */
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  try {
    if (typeof Haptics !== 'undefined' && typeof Haptics.impact === 'function') {
      await Haptics.impact({ style });
      return;
    }
  } catch {}

  // Web Vibration API fallback
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {}
}

/**
 * Dedicated haptics trigger for tab switching
 */
export function triggerTabHaptics(platform: PlatformType): void {
  if (platform === 'ios') {
    triggerHaptic(ImpactStyle.Light);
  } else if (platform === 'android') {
    triggerHaptic(ImpactStyle.Light);
  } else {
    triggerHaptic(ImpactStyle.Light);
  }
}

/**
 * React hook to listen for platform changes and adapt UI dynamically
 */
export function usePlatform() {
  const [platform, setPlatformState] = useState<PlatformType>(() => getPlatform());

  useEffect(() => {
    applyPlatformAttributes();

    const handlePlatformChange = () => {
      setPlatformState(getPlatform());
    };

    window.addEventListener('treda-platform-changed', handlePlatformChange);
    return () => {
      window.removeEventListener('treda-platform-changed', handlePlatformChange);
    };
  }, []);

  const isIOS = platform === 'ios' || (platform === 'web' && (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-os') === 'ios' : true));
  const isAndroid = platform === 'android' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-os') === 'android');
  const isNative = isNativeMobile();

  return {
    platform,
    isIOS,
    isAndroid,
    isNative,
    setOverride: setPlatformOverride,
    triggerTabHaptics: () => triggerTabHaptics(platform),
  };
}

// Immediately apply on script load in browser
if (typeof window !== 'undefined') {
  applyPlatformAttributes();
}
