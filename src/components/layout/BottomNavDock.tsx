import React from 'react';
import {
  SvgPlanIcon,
  SvgRunIcon,
  SvgTrophyIcon,
  SvgBodyGearIcon,
  SvgSettingsIcon,
  SvgPandaFace,
} from '../icons/SvgIcons.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { usePlatform } from '../../utils/platformHelper.ts';

export const BottomNavDock: React.FC = () => {
  const { activeTab, handleSwitchTab, isInputFocused } = useUI();
  const { isAndroid, triggerTabHaptics } = usePlatform();

  if (isInputFocused) return null;

  const onTabClick = (tab: any) => {
    triggerTabHaptics();
    handleSwitchTab(tab);
  };

  // ----------------------------------------------------------------------
  // 1. ANDROID MATERIAL YOU (M3) NAVIGATION BAR
  // ----------------------------------------------------------------------
  if (isAndroid) {
    const tabs = [
      {
        id: 'plan',
        label: 'Plan',
        icon: <SvgPlanIcon size={20} />,
        badge: <SvgPandaFace size={13} />,
        isActive: activeTab === 'plan' || activeTab === 'panda',
      },
      {
        id: 'trainings',
        label: 'Treningi',
        icon: <SvgRunIcon size={20} />,
        isActive: activeTab === 'trainings' || activeTab === 'live',
      },
      {
        id: 'races',
        label: 'Starty',
        icon: <SvgTrophyIcon size={20} />,
        isActive: activeTab === 'races',
      },
      {
        id: 'body_gear',
        label: 'Ciało & Buty',
        icon: <SvgBodyGearIcon size={20} />,
        isActive: activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear',
      },
      {
        id: 'settings',
        label: 'Opcje',
        icon: <SvgSettingsIcon size={20} />,
        isActive: activeTab === 'settings',
      },
    ];

    return (
      <nav
        aria-label="Nawigacja Android Material You"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 pointer-events-none"
      >
        <div className="m3-navigation-bar pointer-events-auto">
          <div className="grid grid-cols-5 items-center w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabClick(tab.id)}
                aria-label={`Zakładka ${tab.label}`}
                aria-current={tab.isActive ? 'page' : undefined}
                className="m3-tab-button flex flex-col items-center justify-center min-h-[58px] py-1 px-0.5 w-full cursor-pointer"
              >
                {/* M3 Pill Indicator */}
                <div
                  className={`m3-pill-indicator ${
                    tab.isActive ? 'm3-pill-active' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                </div>

                {/* M3 Typography Label */}
                <span
                  className={`text-[10px] mt-1 flex items-center justify-center gap-0.5 leading-tight tracking-tight transition-colors ${
                    tab.isActive
                      ? 'font-black txt-main text-[11px]'
                      : 'font-semibold text-slate-400 dark:text-slate-400'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // ----------------------------------------------------------------------
  // 2. APPLE iOS HIG FLOATING GLASS DOCK
  // ----------------------------------------------------------------------
  const activeIndex =
    activeTab === 'plan' || activeTab === 'panda'
      ? 0
      : activeTab === 'trainings' || activeTab === 'live'
      ? 1
      : activeTab === 'races'
      ? 2
      : activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear'
      ? 3
      : 4;

  return (
    <nav
      aria-label="Nawigacja Apple iOS HIG"
      className="fixed bottom-3 left-3 right-3 max-w-md mx-auto z-50 pointer-events-none animate-ios"
    >
      <div className="holo-dock ios-dock p-1.5 pointer-events-auto">
        <div className="relative grid grid-cols-5 items-center w-full">
          {/* Iridescent Liquid Glass Active Lens Bubble */}
          <div
            className="holo-active-bubble"
            style={{
              width: '20%',
              transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
            }}
          />

          <button
            type="button"
            onClick={() => onTabClick('plan')}
            aria-label="Zakładka Plan i RunPanda"
            aria-current={activeTab === 'plan' || activeTab === 'panda' ? 'page' : undefined}
            className={`holo-tab-item flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-full transition-all w-full cursor-pointer ${
              activeTab === 'plan' || activeTab === 'panda' ? 'holo-tab-active' : 'hover:text-white'
            }`}
          >
            <SvgPlanIcon size={19} />
            <span className="text-[10px] mt-1 flex items-center justify-center gap-0.5 leading-none whitespace-nowrap">
              <span>Plan</span>
              <SvgPandaFace size={12} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabClick('trainings')}
            aria-label="Zakładka Treningi i Dziennik"
            aria-current={activeTab === 'trainings' || activeTab === 'live' ? 'page' : undefined}
            className={`holo-tab-item flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-full transition-all w-full cursor-pointer ${
              activeTab === 'trainings' || activeTab === 'live' ? 'holo-tab-active' : 'hover:text-white'
            }`}
          >
            <SvgRunIcon size={19} />
            <span className="text-[10px] mt-1 leading-none whitespace-nowrap">Treningi</span>
          </button>

          <button
            type="button"
            onClick={() => onTabClick('races')}
            aria-label="Zakładka Starty 2027 i Symulator"
            aria-current={activeTab === 'races' ? 'page' : undefined}
            className={`holo-tab-item flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-full transition-all w-full cursor-pointer ${
              activeTab === 'races' ? 'holo-tab-active' : 'hover:text-white'
            }`}
          >
            <SvgTrophyIcon size={19} />
            <span className="text-[10px] mt-1 leading-none whitespace-nowrap">Starty</span>
          </button>

          <button
            type="button"
            onClick={() => onTabClick('body_gear')}
            aria-label="Zakładka Ciało i Szafa"
            aria-current={
              activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear' ? 'page' : undefined
            }
            className={`holo-tab-item flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-full transition-all w-full cursor-pointer ${
              activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear'
                ? 'holo-tab-active'
                : 'hover:text-white'
            }`}
          >
            <SvgBodyGearIcon size={19} />
            <span className="text-[10px] mt-1 leading-none whitespace-nowrap">Ciało & Buty</span>
          </button>

          <button
            type="button"
            onClick={() => onTabClick('settings')}
            aria-label="Zakładka Opcje i Profil"
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={`holo-tab-item flex flex-col items-center justify-center min-h-[48px] py-1.5 px-1 rounded-full transition-all w-full cursor-pointer ${
              activeTab === 'settings' ? 'holo-tab-active' : 'hover:text-white'
            }`}
          >
            <SvgSettingsIcon size={19} />
            <span className="text-[10px] mt-1 leading-none whitespace-nowrap">Opcje</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
