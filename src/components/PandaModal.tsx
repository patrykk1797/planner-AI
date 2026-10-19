import React, { useState } from 'react';
import { RunnerProfile } from '../types.ts';

interface PandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  showToast: (msg: string) => void;
}

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: 'gear' | 'skin' | 'bg';
  desc: string;
}

const SHOP_ITEMS: ShopItem[] = [
  // Gear
  { id: 'gear-1', name: 'Koszulka RunPanda', icon: '🎽', cost: 0, category: 'gear', desc: 'Podstawowa oddychająca koszulka techniczna.' },
  { id: 'gear-2', name: 'Czapeczka Biegowa', icon: '🧢', cost: 50, category: 'gear', desc: 'Chroni przed promieniami słonecznymi i deszczem.' },
  { id: 'gear-3', name: 'Kurtka Wiatrówka Pro', icon: '🧥', cost: 120, category: 'gear', desc: 'Nieprzemakalna membrana z odblaskami 3M.' },
  { id: 'gear-4', name: 'Złoty Pas Finishera', icon: '🥇', cost: 200, category: 'gear', desc: 'Ekskluzywny pas mistrzowski dla wytrwałych biegaczy.' },

  // Skin
  { id: 'skin-1', name: 'Klasyczna Panda', icon: '🐼', cost: 0, category: 'skin', desc: 'Tradycyjny, czarno-biały niedźwiedź bambusowy.' },
  { id: 'skin-2', name: 'Ruda Panda', icon: '🦊', cost: 80, category: 'skin', desc: 'Zwinny himalajski biegacz o rudym futrze.' },
  { id: 'skin-3', name: 'Złota Panda Champion', icon: '🏆', cost: 250, category: 'skin', desc: 'Lśniąca złotem aura za rekordy życiowe i regularność.' },
  { id: 'skin-4', name: 'CyberPanda Neon', icon: '🤖', cost: 350, category: 'skin', desc: 'Futurystyczna syntetyczna powłoka z elementami LED.' },

  // Background
  { id: 'bg-1', name: 'Stadion Lekkoatletyczny', icon: '🏟️', cost: 0, category: 'bg', desc: 'Klasyczna tartanowa bieżnia 400m z oświetleniem.' },
  { id: 'bg-2', name: 'Park Leśny', icon: '🌲', cost: 60, category: 'bg', desc: 'Miękkie leśne dukty idealne dla kolan i stawów.' },
  { id: 'bg-3', name: 'Górska Przełęcz', icon: '🏔️', cost: 150, category: 'bg', desc: 'Alpejski szlak trailowy o rześkim powietrzu.' },
  { id: 'bg-4', name: 'Nocne Tokio', icon: '🌃', cost: 300, category: 'bg', desc: 'Tętniąca neonami trasa wzdłuż bulwaru metropolii.' },
];

export const PandaModal: React.FC<PandaModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  showToast,
}) => {
  const [tab, setTab] = useState<'gear' | 'skin' | 'bg'>('gear');
  const [unlockedItems, setUnlockedItems] = useState<string[]>(['gear-1', 'skin-1', 'bg-1', 'gear-2']);

  if (!isOpen) return null;

  const currentEquipped =
    tab === 'gear'
      ? profile.activePandaGear.gear
      : tab === 'skin'
      ? profile.activePandaGear.skin
      : profile.activePandaGear.bg;

  const handleEquipOrBuy = (item: ShopItem) => {
    const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

    if (isUnlocked) {
      const nextGear = { ...profile.activePandaGear };
      if (item.category === 'gear') nextGear.gear = item.name;
      if (item.category === 'skin') nextGear.skin = item.name;
      if (item.category === 'bg') nextGear.bg = item.name;

      onUpdateProfile({ activePandaGear: nextGear });
      showToast(`Założono: ${item.name}! 🐼`);
      return;
    }

    if (profile.bamboos < item.cost) {
      showToast(`Brakuje Ci ${item.cost - profile.bamboos} 🎋 bambusów! Wykonaj bieg.`);
      return;
    }

    // Purchase
    const newBamboos = profile.bamboos - item.cost;
    setUnlockedItems((prev) => [...prev, item.id]);
    const nextGear = { ...profile.activePandaGear };
    if (item.category === 'gear') nextGear.gear = item.name;
    if (item.category === 'skin') nextGear.skin = item.name;
    if (item.category === 'bg') nextGear.bg = item.name;

    onUpdateProfile({ bamboos: newBamboos, activePandaGear: nextGear });
    showToast(`Odblokowano i założono: ${item.name}! -${item.cost} 🎋`);
  };

  const filteredItems = SHOP_ITEMS.filter((i) => i.category === tab);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/75 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-ios"
    >
      <div className="liquid-glass w-full max-w-sm p-5 space-y-4 animate-ios-modal max-h-[88vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase accent-text">
              Wirtualny Towarzysz • RunPanda
            </span>
            <h3 className="text-base font-bold txt-main">Garderoba i Świat Pandy</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-1 rounded-full accent-badge ios-num">
              {profile.bamboos} 🎋
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij szafę pandy"
              className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Panda Avatar preview */}
        <div className="liquid-pill p-4 flex items-center gap-4 border border-[var(--accent)]/30">
          <div className="w-16 h-16 rounded-2xl liquid-glass flex items-center justify-center text-4xl panda-float">
            {profile.activePandaGear.skin.includes('Ruda') ? '🦊' : profile.activePandaGear.skin.includes('Cyber') ? '🤖' : '🐼'}
          </div>
          <div>
            <div className="text-xs font-black txt-main">
              {profile.activePandaGear.skin}
            </div>
            <div className="text-[11px] accent-text font-bold">
              Ubiór: {profile.activePandaGear.gear}
            </div>
            <div className="text-[10px] txt-muted">
              Otoczenie: {profile.activePandaGear.bg}
            </div>
          </div>
        </div>

        <p className="text-[11px] txt-sub leading-relaxed">
          Zdobywaj <strong>🎋 Bambusy</strong> za zsynchronizowane i wpisane biegi, utrzymanie optymalnej kadencji (175–185 spm) oraz realizację planu treningowego.
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 liquid-pill">
          <button
            type="button"
            onClick={() => setTab('gear')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'gear' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            Ubiór 🎽
          </button>
          <button
            type="button"
            onClick={() => setTab('skin')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'skin' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            Kolor 🐼
          </button>
          <button
            type="button"
            onClick={() => setTab('bg')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'bg' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            Wystrój 🏟️
          </button>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isEquipped = currentEquipped === item.name;
            const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

            return (
              <div
                key={item.id}
                className={`liquid-pill p-3 flex items-center justify-between border ${
                  isEquipped ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold txt-main">{item.name}</span>
                      {isEquipped && (
                        <span className="text-[9px] accent-text font-black uppercase">
                          • Założono
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] txt-muted line-clamp-1">{item.desc}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleEquipOrBuy(item)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
                    isEquipped
                      ? 'bg-white/10 text-white cursor-default'
                      : isUnlocked
                      ? 'liquid-active'
                      : 'accent-bg text-black font-black'
                  }`}
                >
                  {isEquipped
                    ? 'Aktywny'
                    : isUnlocked
                    ? 'Wybierz'
                    : `${item.cost} 🎋 Kup`}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full liquid-active font-bold py-3 rounded-full text-xs hover:brightness-110"
        >
          ✓ Gotowe
        </button>
      </div>
    </div>
  );
};
